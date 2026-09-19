import { Router } from 'express';
import {
  getPermissionsList,
  getStaffList,
  createStaffMember,
  getStaffById,
  updateStaffMember,
  updateStaffBranches,
  updateStaffPermissions,
  deleteStaffMember,
  changeStaffPassword,
} from '../controllers/staff.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { PermissionCode } from '@prisma/client';
import { validateRequest } from '../middlewares/validate.middleware.js';
import {
  createStaffMemberSchema,
  updateStaffMemberSchema,
  updateStaffBranchesSchema,
  updateStaffPermissionsSchema,
  changeStaffPasswordSchema,
} from '../validation/index.js';

export const permissionsRouter = Router();
permissionsRouter.get('/', getPermissionsList);

export const staffRouter = Router();
staffRouter.use(requireAuth);
staffRouter.get('/', getStaffList);
staffRouter.post(
  '/',
  requirePermission(PermissionCode.STAFF_MANAGE),
  validateRequest({ body: createStaffMemberSchema }),
  createStaffMember,
);
staffRouter.get('/:id', getStaffById);
staffRouter.patch(
  '/:id',
  requirePermission(PermissionCode.STAFF_MANAGE),
  validateRequest({ body: updateStaffMemberSchema }),
  updateStaffMember,
);
staffRouter.put(
  '/:id/branches',
  requirePermission(PermissionCode.STAFF_MANAGE),
  validateRequest({ body: updateStaffBranchesSchema }),
  updateStaffBranches,
);
staffRouter.put(
  '/:id/permissions',
  requirePermission(PermissionCode.STAFF_MANAGE),
  validateRequest({ body: updateStaffPermissionsSchema }),
  updateStaffPermissions,
);


staffRouter.patch(
  '/:id/password',
  requirePermission(PermissionCode.STAFF_MANAGE),
  validateRequest({ body: changeStaffPasswordSchema }),
  changeStaffPassword,
);

staffRouter.delete('/:id', requirePermission(PermissionCode.STAFF_MANAGE), deleteStaffMember);
