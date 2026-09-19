import { PrismaClient, Role, PermissionCode } from '@prisma/client';

const prisma = new PrismaClient();

async function patchCounterManagers() {
  console.log('🔄 Checking counter managers for missing STAFF_MANAGE / STAFF_VIEW permissions...');

  // Find all active STAFF users with assigned branches
  const staffWithBranches = await prisma.user.findMany({
    where: {
      role: Role.STAFF,
      assignedBranches: { some: {} },
    },
    include: {
      permissions: true,
      assignedBranches: { include: { branch: true } },
    },
  });

  console.log(`Found ${staffWithBranches.length} branch-assigned staff / counter manager(s).`);

  let updatedCount = 0;

  for (const staff of staffWithBranches) {
    const existingCodes = new Set(staff.permissions.map((p) => p.permission));
    const toAdd: PermissionCode[] = [];

    if (!existingCodes.has(PermissionCode.STAFF_VIEW)) {
      toAdd.push(PermissionCode.STAFF_VIEW);
    }
    if (!existingCodes.has(PermissionCode.STAFF_MANAGE)) {
      toAdd.push(PermissionCode.STAFF_MANAGE);
    }
    if (!existingCodes.has(PermissionCode.VIEW_ANALYTICS)) {
      toAdd.push(PermissionCode.VIEW_ANALYTICS);
    }
    if (!existingCodes.has(PermissionCode.VIEW_REPORTS)) {
      toAdd.push(PermissionCode.VIEW_REPORTS);
    }

    if (toAdd.length > 0) {
      for (const perm of toAdd) {
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
      console.log(`✅ Granted [${toAdd.join(', ')}] to: ${staff.name} (${staff.phone || staff.email})`);
      updatedCount++;
    }
  }

  console.log(`🎉 Completed! Updated ${updatedCount} counter manager(s).`);
}

patchCounterManagers()
  .catch((err) => {
    console.error('❌ Error patching counter managers:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
