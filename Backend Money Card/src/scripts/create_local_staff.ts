import { prisma } from '../config/database.js';
import { Role, UserStatus, PermissionCode, BranchStatus, OrgStatus } from '@prisma/client';
import { hashPassword } from '../utils/crypto.js';

async function main() {
  console.log('--- Provisioning Localhost Staff Credentials ---');

  // 1. Ensure an Active Plan exists
  let plan = await prisma.plan.findFirst();
  if (!plan) {
    plan = await prisma.plan.create({
      data: {
        name: 'Enterprise Local Plan',
        priceMonthly: 0,
        priceYearly: 0,
        branchLimit: 50,
        staffLimit: 50,
        cardLimit: 5000,
        features: ['ALL'],
      },
    });
    console.log('Created default plan:', plan.name);
  }

  // 2. Ensure an Active Organization exists
  let org = await prisma.organization.findFirst({
    where: { status: OrgStatus.ACTIVE },
  });

  if (!org) {
    const existingOrg = await prisma.organization.findFirst();
    if (existingOrg) {
      org = await prisma.organization.update({
        where: { id: existingOrg.id },
        data: {
          status: OrgStatus.ACTIVE,
          planId: plan.id,
        },
      });
      console.log('Updated existing org to ACTIVE:', org.name);
    } else {
      org = await prisma.organization.create({
        data: {
          name: 'Money Card Cafeteria',
          status: OrgStatus.ACTIVE,
          planId: plan.id,
        },
      });
      console.log('Created new active org:', org.name);
    }
  }

  // 3. Ensure an Active Branch exists
  let branch = await prisma.branch.findFirst({
    where: { organizationId: org.id, status: BranchStatus.ACTIVE },
  });

  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: 'Counter 1',
        location: 'Ground Floor Food Court',
        organizationId: org.id,
        status: BranchStatus.ACTIVE,
      },
    });
    console.log('Created active branch:', branch.name);
  } else {
    console.log('Using existing branch:', branch.name);
  }

  // 4. Create or Update Staff User
  const staffPhone = '9876543210';
  const staffPassword = 'password123';
  const passwordHash = await hashPassword(staffPassword);

  let staff = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: staffPhone },
        { phone: `91${staffPhone}` },
        { phone: `+91${staffPhone}` },
      ],
    },
  });

  if (!staff) {
    staff = await prisma.user.create({
      data: {
        name: 'Counter Staff',
        phone: staffPhone,
        email: 'staff.local@moneycard.app',
        passwordHash,
        role: Role.STAFF,
        status: UserStatus.ACTIVE,
        mustChangePassword: false,
        organizationId: org.id,
      },
    });
    console.log('Created new staff user:', staff.name);
  } else {
    staff = await prisma.user.update({
      where: { id: staff.id },
      data: {
        name: 'Counter Staff',
        phone: staffPhone,
        passwordHash,
        role: Role.STAFF,
        status: UserStatus.ACTIVE,
        mustChangePassword: false,
        organizationId: org.id,
      },
    });
    console.log('Updated staff user:', staff.name);
  }

  // 5. Link Staff to Branch
  await prisma.userBranch.upsert({
    where: {
      userId_branchId: {
        userId: staff.id,
        branchId: branch.id,
      },
    },
    create: {
      userId: staff.id,
      branchId: branch.id,
    },
    update: {},
  });
  console.log('Linked staff to branch:', branch.name);

  // 6. Assign Full M0 Staff Permissions
  const permissions: PermissionCode[] = [
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
    PermissionCode.BRANCH_VIEW,
  ];

  for (const perm of permissions) {
    await prisma.userPermission.upsert({
      where: {
        userId_permission: {
          userId: staff.id,
          permission: perm,
        },
      },
      create: {
        userId: staff.id,
        permission: perm,
      },
      update: {},
    });
  }
  console.log('Granted all M0 staff permissions.');

  // 7. Ensure sample menu products exist for POS checkout testing
  const sampleProducts = [
    { itemName: 'Masala Dosa', price: 60, category: ['South Indian'] },
    { itemName: 'Filter Coffee', price: 25, category: ['Beverages'] },
    { itemName: 'Veg Biryani', price: 120, category: ['Meals'] },
  ];

  for (const prod of sampleProducts) {
    const existing = await prisma.product.findFirst({
      where: { organizationId: org.id, itemName: prod.itemName },
    });
    if (!existing) {
      await prisma.product.create({
        data: {
          itemName: prod.itemName,
          price: prod.price,
          category: prod.category,
          organizationId: org.id,
          branchId: branch.id,
          status: 'ACTIVE',
        },
      });
    }
  }
  console.log('Sample menu products verified.');

  console.log('\n=======================================');
  console.log('LOCAL STAFF CREDENTIALS READY FOR APK:');
  console.log('Mobile Number :', staffPhone);
  console.log('Password      :', staffPassword);
  console.log('Role          :', staff.role);
  console.log('Organization  :', org.name);
  console.log('Counter/Branch:', branch.name);
  console.log('Backend Base  : http://localhost:3000/api/v1');
  console.log('Android Emul. : http://10.0.2.2:3000/api/v1');
  console.log('=======================================\n');
}

main()
  .catch((e) => {
    console.error('Error creating staff credentials:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
