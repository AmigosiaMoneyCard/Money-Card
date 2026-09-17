import crypto from 'crypto';
import { sendAccountActivationEmail } from '../services/email.service.js';
import { getEffectiveLimits } from '../utils/limits.js';
import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { hashPassword } from '../utils/crypto.js';
import { PermissionCode, Role, UserStatus } from '@prisma/client';

export const FROZEN_M0_PERMISSIONS = [
  { code: 'CARD_VIEW', label: 'View Cards', description: 'View card status and list', category: 'Cards' },
  { code: 'CARD_ISSUE', label: 'Issue Cards', description: 'Issue and activate cards for customers', category: 'Cards' },
  { code: 'CARD_RETURN', label: 'Return / Settle Cards', description: 'Settle active session and refund remaining balance', category: 'Cards' },
  { code: 'CARD_BLOCK', label: 'Block Cards', description: 'Block lost or damaged cards', category: 'Cards' },
  { code: 'CARD_UNBLOCK', label: 'Unblock Cards', description: 'Restore blocked cards', category: 'Cards' },
  { code: 'RECHARGE', label: 'Recharge Balance', description: 'Add funds via Cash or UPI', category: 'Sessions' },
  { code: 'PURCHASE', label: 'POS Purchase', description: 'Allows staff to add products to cart and checkout', category: 'Sessions' },
  { code: 'REFUND', label: 'Direct Refund', description: 'Process itemized transaction refunds', category: 'Sessions' },
  { code: 'SESSION_VIEW', label: 'View Active Sessions', description: 'View customer balance and session history', category: 'Sessions' },
  { code: 'PRODUCT_VIEW', label: 'View Products', description: 'Browse product catalog and prices', category: 'Products' },
  { code: 'PRODUCT_MANAGE', label: 'Manage Products', description: 'Create and edit products', category: 'Products' },
  { code: 'VIEW_ANALYTICS', label: 'View Analytics', description: 'Access branch revenue & sales KPIs', category: 'Analytics' },
  { code: 'VIEW_REPORTS', label: 'View Reports', description: 'Download PDF audit reports', category: 'Reports' },
  { code: 'STAFF_VIEW', label: 'View Staff', description: 'View staff members list', category: 'Staff' },
  { code: 'STAFF_MANAGE', label: 'Manage Staff', description: 'Create staff & manage permissions', category: 'Staff' },
  { code: 'BRANCH_VIEW', label: 'View Branches', description: 'View branch details', category: 'Branches' },
  { code: 'BRANCH_MANAGE', label: 'Manage Branches', description: 'Create and edit branches', category: 'Branches' },
];

export async function getPermissionsList(_req: Request, res: Response) {
  return sendSuccess(res, FROZEN_M0_PERMISSIONS);
}

export async function getStaffList(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const where: any = {
    organizationId: orgId,
    role: Role.STAFF,
  };

  const { search } = req.query;
  if (typeof search === 'string' && search.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }

  const staffMembers = await prisma.user.findMany({
    where,
    include: {
      permissions: true,
      assignedBranches: {
        include: { branch: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = staffMembers.map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    email: s.email,
    role: s.role,
    status: s.status,
    assignedBranchIds: s.assignedBranches.map((b) => b.branchId),
    assignedBranches: s.assignedBranches.map((b) => ({
      id: b.branch.id,
      name: b.branch.name,
    })),
    permissions: s.permissions.map((p) => p.permission),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));

  return sendSuccess(res, formatted);
}

export async function createStaffMember(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { name, phone, email, password, assignedBranchIds, branchIds, permissions, permissionCodes } = req.body;
  const resolvedBranchIds = assignedBranchIds ?? branchIds;
  const resolvedPermissions = permissions ?? permissionCodes;

  if (!name || !name.trim()) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Staff name is required');
  }

  const cleanPhone = String(phone || '').trim().replace(/\D/g, '');
  if (!cleanPhone || cleanPhone.length < 10) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Valid 10-digit phone number is required');
  }

  if (!password || password.trim().length < 4) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Password must be at least 4 characters long');
  }

  const existingPhoneUser = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: cleanPhone },
        { phone: cleanPhone.slice(-10) },
      ],
    },
  });

  if (existingPhoneUser) {
    return sendError(res, 400, 'VALIDATION_ERROR', `Account with phone number '${phone}' already exists`);
  }

  let cleanEmail: string | null = null;
  if (email && String(email).trim()) {
    cleanEmail = String(email).trim().toLowerCase();
    const existingEmailUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existingEmailUser) {
      return sendError(res, 400, 'VALIDATION_ERROR', `Account with email '${email}' already exists`);
    }
  }

  // Authoritative Effective Staff Limit Check
  const [effectiveLimits, currentStaffCount] = await Promise.all([
    getEffectiveLimits(orgId),
    prisma.user.count({ where: { organizationId: orgId, role: Role.STAFF } }),
  ]);

  if (currentStaffCount >= effectiveLimits.staffLimit) {
    return sendError(
      res,
      409,
      'STAFF_LIMIT_REACHED',
      `Your organization has reached its staff limit of ${effectiveLimits.staffLimit}. Please upgrade your plan or request a custom limit override to add more staff.`,
    );
  }

  const passwordHash = await hashPassword(password);

  const targetPermissions: PermissionCode[] = Array.isArray(resolvedPermissions) && resolvedPermissions.length > 0
    ? resolvedPermissions
    : [
        PermissionCode.CARD_VIEW,
        PermissionCode.CARD_ISSUE,
        PermissionCode.CARD_RETURN,
        PermissionCode.RECHARGE,
        PermissionCode.PURCHASE,
        PermissionCode.SESSION_VIEW,
        PermissionCode.PRODUCT_VIEW,
      ];

  const result = await prisma.$transaction(async (tx) => {
    const countInTx = await tx.user.count({ where: { organizationId: orgId, role: Role.STAFF } });
    if (countInTx >= effectiveLimits.staffLimit) {
      throw new Error('STAFF_LIMIT_REACHED');
    }

    const user = await tx.user.create({
      data: {
        name: name.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        passwordHash,
        role: Role.STAFF,
        organizationId: orgId,
        status: UserStatus.ACTIVE,
        mustChangePassword: false,
      },
    });

    for (const perm of targetPermissions) {
      await tx.userPermission.create({
        data: {
          userId: user.id,
          permission: perm,
        },
      });
    }

    if (Array.isArray(resolvedBranchIds)) {
      for (const branchId of resolvedBranchIds) {
        await tx.userBranch.create({
          data: {
            userId: user.id,
            branchId,
          },
        });
      }
    }

    return user;
  });

  return sendSuccess(
    res,
    {
      id: result.id,
      name: result.name,
      phone: result.phone,
      email: result.email,
      role: result.role,
      status: result.status,
      assignedBranchIds: resolvedBranchIds || [],
      permissions: targetPermissions,
      password: password,
      plaintextPassword: password,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    },
    201,
  );
}

export async function getStaffById(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;

  const staff = await prisma.user.findFirst({
    where: { id, organizationId: orgId || undefined },
    include: {
      permissions: true,
      assignedBranches: { include: { branch: true } },
    },
  });

  if (!staff) {
    return sendError(res, 404, 'NOT_FOUND', 'Staff member not found');
  }

  return sendSuccess(res, {
    id: staff.id,
    name: staff.name,
    phone: staff.phone,
    email: staff.email,
    role: staff.role,
    status: staff.status,
    assignedBranchIds: staff.assignedBranches.map((b) => b.branchId),
    assignedBranches: staff.assignedBranches.map((b) => ({ id: b.branch.id, name: b.branch.name })),
    permissions: staff.permissions.map((p) => p.permission),
    createdAt: staff.createdAt,
    updatedAt: staff.updatedAt,
  });
}

export async function updateStaffMember(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;
  const { name, phone, email, status, permissions, assignedBranchIds, branchIds } = req.body;

  const staff = await prisma.user.findFirst({
    where: { id, organizationId: orgId || undefined },
  });

  if (!staff) {
    return sendError(res, 404, 'NOT_FOUND', 'Staff member not found');
  }

  if (status === UserStatus.ACTIVE && staff.status === UserStatus.PENDING_ACTIVATION) {
    return sendError(
      res,
      400,
      'ACTIVATION_REQUIRED',
      'This staff account is pending activation.',
    );
  }

  const cleanPhone = phone ? String(phone).trim().replace(/\D/g, '') : undefined;
  const targetBranches = assignedBranchIds || branchIds;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(cleanPhone ? { phone: cleanPhone } : {}),
        ...(email ? { email: email.trim().toLowerCase() } : {}),
        ...(status ? { status } : {}),
        ...(status === UserStatus.DEACTIVATED ? { tokenVersion: { increment: 1 } } : {}),
      },
    });

    if (Array.isArray(permissions)) {
      await tx.userPermission.deleteMany({ where: { userId: id } });
      for (const perm of permissions) {
        await tx.userPermission.create({
          data: { userId: id, permission: perm as PermissionCode },
        });
      }
      await tx.user.update({
        where: { id },
        data: { tokenVersion: { increment: 1 } },
      });
    }

    if (Array.isArray(targetBranches)) {
      await tx.userBranch.deleteMany({ where: { userId: id } });
      for (const bId of targetBranches) {
        await tx.userBranch.create({
          data: { userId: id, branchId: bId },
        });
      }
    }
  });

  const fullStaff = await prisma.user.findUnique({
    where: { id },
    include: {
      permissions: true,
      assignedBranches: { include: { branch: true } },
    },
  });

  return sendSuccess(res, {
    id: fullStaff!.id,
    name: fullStaff!.name,
    phone: fullStaff!.phone,
    email: fullStaff!.email,
    role: fullStaff!.role,
    status: fullStaff!.status,
    assignedBranchIds: fullStaff!.assignedBranches.map((b) => b.branchId),
    assignedBranches: fullStaff!.assignedBranches.map((b) => ({ id: b.branch.id, name: b.branch.name })),
    permissions: fullStaff!.permissions.map((p) => p.permission),
    createdAt: fullStaff!.createdAt,
    updatedAt: fullStaff!.updatedAt,
    message: 'Staff member updated successfully.',
  });
}

export async function updateStaffBranches(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;
  const { branchIds, assignedBranchIds } = req.body;

  const targetBranchIds = branchIds || assignedBranchIds;
  if (!Array.isArray(targetBranchIds)) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'branchIds must be an array of branch IDs');
  }

  const staff = await prisma.user.findFirst({
    where: { id, organizationId: orgId || undefined },
  });

  if (!staff) {
    return sendError(res, 404, 'NOT_FOUND', 'Staff member not found');
  }

  await prisma.$transaction(async (tx) => {
    await tx.userBranch.deleteMany({ where: { userId: id } });
    for (const bId of targetBranchIds) {
      await tx.userBranch.create({
        data: { userId: id, branchId: bId },
      });
    }
  });

  const fullStaff = await prisma.user.findUnique({
    where: { id },
    include: { permissions: true, assignedBranches: { include: { branch: true } } },
  });

  return sendSuccess(res, {
    id,
    assignedBranchIds: fullStaff!.assignedBranches.map((b) => b.branchId),
    assignedBranches: fullStaff!.assignedBranches.map((b) => ({ id: b.branch.id, name: b.branch.name })),
    permissions: fullStaff!.permissions.map((p) => p.permission),
    message: 'Branch assignments updated successfully.',
  });
}

export async function updateStaffPermissions(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;
  const { permissions, permissionCodes } = req.body;
  const targetPermissions = permissions ?? permissionCodes;

  if (!Array.isArray(targetPermissions)) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'permissions must be an array of permission codes');
  }

  const staff = await prisma.user.findFirst({
    where: {
      id,
      ...(orgId && req.user?.role !== Role.SUPER_ADMIN ? { organizationId: orgId } : {}),
      role: Role.STAFF,
    },
  });

  if (!staff) {
    return sendError(res, 404, 'NOT_FOUND', 'Staff member not found');
  }

  const validPermissions = Object.values(PermissionCode);
  const uniquePerms = Array.from(new Set(targetPermissions)).filter((p) =>
    validPermissions.includes(p as PermissionCode),
  );

  await prisma.$transaction(async (tx) => {
    await tx.userPermission.deleteMany({ where: { userId: id } });
    for (const perm of uniquePerms) {
      await tx.userPermission.create({
        data: { userId: id, permission: perm as PermissionCode },
      });
    }
    // Invalidate old tokens on permission changes
    await tx.user.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
    });
  });

  const fullStaff = await prisma.user.findUnique({
    where: { id },
    include: { permissions: true, assignedBranches: { include: { branch: true } } },
  });

  return sendSuccess(res, {
    id,
    permissions: fullStaff!.permissions.map((p) => p.permission),
    assignedBranchIds: fullStaff!.assignedBranches.map((b) => b.branchId),
    assignedBranches: fullStaff!.assignedBranches.map((b) => ({ id: b.branch.id, name: b.branch.name })),
    message: 'Permissions updated successfully.',
  });
}


export async function deleteStaffMember(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;

  if (!orgId && req.user?.role !== Role.SUPER_ADMIN) {
    return sendError(res, 403, 'FORBIDDEN', 'No organization context found');
  }

  const user = await prisma.user.findFirst({
    where: {
      id,
      ...(orgId ? { organizationId: orgId } : {}),
    },
    include: {
      _count: {
        select: {
          recordedTransactions: true,
          issuedSessions: true,
          settledSessions: true,
        },
      },
    },
  });

  if (!user) {
    return sendError(res, 404, 'NOT_FOUND', 'Staff member not found');
  }

  if (user.role === Role.SUPER_ADMIN) {
    return sendError(
      res,
      403,
      'FORBIDDEN',
      'Super Admin accounts cannot be deleted.',
    );
  }

  const activeSessionsCount = await prisma.cardSession.count({
    where: {
      organizationId: user.organizationId || undefined,
      issuedByUserId: user.id,
      status: 'ACTIVE',
    },
  });

  if (activeSessionsCount > 0) {
    return sendError(
      res,
      400,
      'STAFF_HAS_ACTIVE_SESSIONS',
      `Cannot delete or deactivate staff member because they currently have ${activeSessionsCount} open card session(s). Settle all open sessions first.`,
    );
  }

  const hasHistory =
    user._count.recordedTransactions > 0 ||
    user._count.issuedSessions > 0 ||
    user._count.settledSessions > 0;

  if (hasHistory) {
    await prisma.$transaction(async (tx) => {
      await tx.userBranch.deleteMany({ where: { userId: user.id } });
      await tx.userPermission.deleteMany({ where: { userId: user.id } });
      await tx.user.update({
        where: { id: user.id },
        data: {
          status: UserStatus.DEACTIVATED,
          tokenVersion: { increment: 1 },
        },
      });
    });

    return sendSuccess(res, {
      deactivated: true,
      message: 'Staff member has historical transaction records and was safely deactivated. Login tokens revoked.',
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.userBranch.deleteMany({ where: { userId: user.id } });
    await tx.userPermission.deleteMany({ where: { userId: user.id } });
    await tx.user.delete({ where: { id: user.id } });
  });

  return sendSuccess(res, { deleted: true, message: 'Staff member permanently deleted.' });
}

export async function changeStaffPassword(req: Request, res: Response) {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!req.user) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
  }

  const staff = await prisma.user.findUnique({
    where: { id },
    include: {
      organization: true,
      assignedBranches: {
        include: { branch: true },
      },
      permissions: true,
    },
  });

  if (!staff) {
    return sendError(res, 404, 'NOT_FOUND', 'Staff member not found');
  }

  // Ensure target user is a staff member
  if (staff.role !== Role.STAFF) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Target user is not a staff member');
  }

  // Enforce multi-tenant organization boundary for Org Admin
  if (req.user.role !== Role.SUPER_ADMIN) {
    if (!req.user.organizationId || staff.organizationId !== req.user.organizationId) {
      return sendError(
        res,
        403,
        'FORBIDDEN',
        'You do not have permission to manage staff in another organization',
      );
    }
  }

  // Check account status
  if (staff.status === UserStatus.DEACTIVATED) {
    return sendError(
      res,
      400,
      'VALIDATION_ERROR',
      'Cannot change password for a deactivated staff account',
    );
  }

  const newHash = await hashPassword(newPassword);

  // Update password, increment tokenVersion (invalidating existing mobile & web sessions),
  // and ensure permanent password is set (mustChangePassword = false)
  const updatedStaff = await prisma.user.update({
    where: { id: staff.id },
    data: {
      passwordHash: newHash,
      tokenVersion: { increment: 1 },
      mustChangePassword: false,
      ...(staff.status === UserStatus.PENDING_ACTIVATION || staff.status === UserStatus.INACTIVE
        ? {
            status: UserStatus.ACTIVE,
            activationToken: null,
            activationTokenExpires: null,
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      mustChangePassword: true,
      organizationId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  console.log(
    `[AUTH_AUDIT_LOG] STAFF_PASSWORD_CHANGE targetUserId=${staff.id} targetEmail=${staff.email} changedByUserId=${req.user.id} organizationId=${req.user.organizationId} timestamp=${new Date().toISOString()}`,
  );

  return sendSuccess(res, {
    message: `Staff password changed successfully for ${staff.name}.`,
    staff: updatedStaff,
  });
}

