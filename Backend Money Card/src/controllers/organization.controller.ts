import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { Role, UserStatus, PermissionCode } from '@prisma/client';
import { getEffectiveLimits, formatSubscription } from '../utils/limits.js';
import { hashPassword } from '../utils/crypto.js';

export async function getOrganizationProfile(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const [org, effectiveLimits, branchCount, staffCount, cardCount] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        plan: true,
        subscription: {
          include: { plan: true },
        },
        branches: true,
      },
    }),
    getEffectiveLimits(orgId),
    prisma.branch.count({ where: { organizationId: orgId } }),
    prisma.user.count({
      where: {
        organizationId: orgId,
        role: Role.STAFF,
        status: { not: UserStatus.DEACTIVATED },
      },
    }),
    prisma.card.count({ where: { organizationId: orgId } }),
  ]);

  if (!org) {
    return sendError(res, 404, 'NOT_FOUND', 'Organization not found');
  }

  const activePlan = org.subscription?.plan || org.plan;

  const formatted = {
    id: org.id,
    name: org.name,
    status: org.status,
    logoUrl: org.logoUrl,
    phone: org.phone,
    email: org.email,
    address: org.address,
    planId: org.subscription?.planId || org.planId,
    plan: activePlan,
    subscription: formatSubscription(org.subscription),
    usage: {
      branchCount,
      branchLimit: effectiveLimits.branchLimit,
      staffCount,
      staffLimit: effectiveLimits.staffLimit,
      cardCount,
      cardLimit: effectiveLimits.cardLimit,
    },
    branches: org.branches,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  };

  return sendSuccess(res, formatted);
}

export async function updateOrganizationProfile(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { name, phone, email, address, logoUrl } = req.body;

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(address !== undefined ? { address } : {}),
      ...(logoUrl !== undefined ? { logoUrl } : {}),
    },
  });

  return sendSuccess(res, org);
}

export async function getBranches(req: Request, res: Response) {
  const orgId = req.user?.organizationId || (req.query.organizationId as string);
  if (!orgId && req.user?.role !== Role.SUPER_ADMIN) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const where: any = {};
  if (orgId) {
    where.organizationId = orgId;
  }

  // Staff only see active branches in their organization
  if (req.user?.role === Role.STAFF) {
    where.status = 'ACTIVE';
  }

  const { search } = req.query;
  if (typeof search === 'string' && search.trim()) {
    where.name = { contains: search.trim(), mode: 'insensitive' };
  }

  const branches = await prisma.branch.findMany({
    where,
    include: {
      _count: {
        select: {
          staffAssignments: true,
          inventoryItems: true,
          cardSessions: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const formatted = branches.map((b) => ({
    id: b.id,
    organizationId: b.organizationId,
    name: b.name,
    location: b.location,
    status: b.status,
    staffCount: b._count.staffAssignments,
    inventoryCount: b._count.inventoryItems,
    sessionCount: b._count.cardSessions,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  }));

  return sendSuccess(res, formatted);
}

export async function createBranch(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { name, location, phone, password } = req.body;
  if (!name || !name.trim()) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Counter name is required');
  }

  const cleanPhone = phone ? phone.trim().replace(/\D/g, '') : undefined;
  if (cleanPhone && (cleanPhone.length < 10 || cleanPhone.length > 15)) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Phone number must be at least 10 digits');
  }

  if (password && (password.length < 6 || password.length > 30)) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Password must be between 6 and 30 characters');
  }

  // Authoritative Effective Branch Limit Check
  const [effectiveLimits, currentBranchCount] = await Promise.all([
    getEffectiveLimits(orgId),
    prisma.branch.count({ where: { organizationId: orgId } }),
  ]);

  if (currentBranchCount >= effectiveLimits.branchLimit) {
    return sendError(
      res,
      409,
      'BRANCH_LIMIT_REACHED',
      `Your organization has reached its counter limit of ${effectiveLimits.branchLimit}. Please upgrade your plan or request a custom limit override to create more counters.`,
    );
  }

  // Check if phone number is already registered by another organization
  if (cleanPhone) {
    const existingUser = await prisma.user.findUnique({
      where: { phone: cleanPhone },
    });
    if (existingUser && existingUser.organizationId && existingUser.organizationId !== orgId) {
      return sendError(
        res,
        409,
        'PHONE_IN_USE',
        'This phone number is already registered with another organization.',
      );
    }
  }

  const effectivePassword = password || '123456';
  const passwordHash = await hashPassword(effectivePassword);

  const result = await prisma.$transaction(async (tx) => {
    const countInTx = await tx.branch.count({ where: { organizationId: orgId } });
    if (countInTx >= effectiveLimits.branchLimit) {
      throw new Error('BRANCH_LIMIT_REACHED');
    }

    const created = await tx.branch.create({
      data: {
        organizationId: orgId,
        name: name.trim(),
        location: location?.trim(),
      },
    });

    // Auto-assign existing active staff in this organization to newly created branch
    const orgStaff = await tx.user.findMany({
      where: { organizationId: orgId, role: Role.STAFF, status: 'ACTIVE' },
      select: { id: true },
    });
    for (const staff of orgStaff) {
      await tx.userBranch.create({
        data: { userId: staff.id, branchId: created.id },
      }).catch(() => {});
    }

    // Provision or update counter manager account if phone is provided
    if (cleanPhone) {
      let counterUser = await tx.user.findUnique({
        where: { phone: cleanPhone },
      });

      if (!counterUser) {
        counterUser = await tx.user.create({
          data: {
            name: `${name.trim()} Counter Manager`,
            phone: cleanPhone,
            passwordHash,
            role: Role.STAFF,
            organizationId: orgId,
            status: UserStatus.ACTIVE,
          },
        });
      } else {
        await tx.user.update({
          where: { id: counterUser.id },
          data: {
            passwordHash,
            status: UserStatus.ACTIVE,
          },
        });
      }

      // Assign counter management permissions
      const defaultPermissions: PermissionCode[] = [
        PermissionCode.CARD_VIEW,
        PermissionCode.CARD_ISSUE,
        PermissionCode.CARD_RETURN,
        PermissionCode.CARD_BLOCK,
        PermissionCode.CARD_UNBLOCK,
        PermissionCode.SESSION_VIEW,
        PermissionCode.RECHARGE,
        PermissionCode.PURCHASE,
        PermissionCode.REFUND,
        PermissionCode.PRODUCT_VIEW,
        PermissionCode.PRODUCT_MANAGE,
        PermissionCode.INVENTORY_VIEW,
        PermissionCode.INVENTORY_MANAGE,
        PermissionCode.VIEW_ANALYTICS,
        PermissionCode.VIEW_REPORTS,
        PermissionCode.STAFF_VIEW,
        PermissionCode.STAFF_MANAGE,
      ];

      for (const perm of defaultPermissions) {
        await tx.userPermission.upsert({
          where: {
            userId_permission: {
              userId: counterUser.id,
              permission: perm,
            },
          },
          create: {
            userId: counterUser.id,
            permission: perm,
          },
          update: {},
        }).catch(() => {});
      }

      // Link counter user with this branch
      await tx.userBranch.upsert({
        where: {
          userId_branchId: {
            userId: counterUser.id,
            branchId: created.id,
          },
        },
        create: {
          userId: counterUser.id,
          branchId: created.id,
        },
        update: {},
      }).catch(() => {});
    }

    return created;
  });

  return sendSuccess(res, {
    ...result,
    credentials: cleanPhone ? {
      name: result.name,
      phone: cleanPhone,
      password: effectivePassword,
    } : undefined,
  }, 201);
}

export async function getBranchById(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;

  const branch = await prisma.branch.findFirst({
    where: { id, organizationId: orgId || undefined },
  });

  if (!branch) {
    return sendError(res, 404, 'NOT_FOUND', 'Branch not found');
  }

  return sendSuccess(res, branch);
}

export async function updateBranch(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;
  const { name, location, status } = req.body;

  const branch = await prisma.branch.findFirst({
    where: { id, organizationId: orgId || undefined },
  });

  if (!branch) {
    return sendError(res, 404, 'NOT_FOUND', 'Branch not found');
  }

  // Prevent disabling all branches - at least one active branch is strictly required per organization
  if (status && status !== 'ACTIVE' && branch.status === 'ACTIVE') {
    const activeBranchesCount = await prisma.branch.count({
      where: {
        organizationId: branch.organizationId,
        status: 'ACTIVE',
      },
    });

    if (activeBranchesCount <= 1) {
      return sendError(
        res,
        400,
        'MIN_ACTIVE_BRANCH_REQUIRED',
        'Cannot disable this branch. An organization must have at least one active branch.',
      );
    }
  }

  const updated = await prisma.branch.update({
    where: { id },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(status ? { status } : {}),
    },
  });

  return sendSuccess(res, updated);
}

export async function deleteBranch(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;
  const force = req.query.force === 'true' || req.query.archive === 'true';

  const branch = await prisma.branch.findFirst({
    where: { id, organizationId: orgId || undefined },
    include: {
      _count: {
        select: {
          cardSessions: true,
          transactions: true,
          inventoryItems: true,
          staffAssignments: true,
        },
      },
    },
  });

  if (!branch) {
    return sendError(res, 404, 'NOT_FOUND', 'Branch not found');
  }

  const remainingActiveCount = await prisma.branch.count({
    where: {
      organizationId: branch.organizationId,
      id: { not: id },
      status: 'ACTIVE',
    },
  });

  const hasFinancialRecords = branch._count.cardSessions > 0 || branch._count.transactions > 0;

  if (hasFinancialRecords) {
    if (force) {
      if (remainingActiveCount === 0 && branch.status === 'ACTIVE') {
        return sendError(
          res,
          400,
          'MIN_ACTIVE_BRANCH_REQUIRED',
          'Cannot deactivate this branch. An organization must have at least one active branch.',
        );
      }
      const updated = await prisma.branch.update({
        where: { id },
        data: { status: 'INACTIVE' },
      });
      return sendSuccess(res, {
        archived: true,
        message: 'Branch has historical session and transaction records and was safely deactivated.',
        branch: updated,
      });
    }

    return sendError(
      res,
      409,
      'DEPENDENT_RECORDS_EXIST',
      `Cannot permanently delete this branch because it contains ${branch._count.cardSessions} session(s) and ${branch._count.transactions} transaction(s). You can deactivate it instead.`,
      {
        canArchive: true,
        cardSessionsCount: branch._count.cardSessions,
        transactionsCount: branch._count.transactions,
      },
    );
  }

  if (branch.status === 'ACTIVE' && remainingActiveCount === 0) {
    return sendError(
      res,
      400,
      'MIN_ACTIVE_BRANCH_REQUIRED',
      'Cannot delete this branch. An organization must have at least one active branch.',
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.branchInventory.deleteMany({ where: { branchId: id } });
    await tx.userBranch.deleteMany({ where: { branchId: id } });
    await tx.branch.delete({ where: { id } });
  });

  return sendSuccess(res, { deleted: true, message: 'Branch deleted successfully.' });
}
