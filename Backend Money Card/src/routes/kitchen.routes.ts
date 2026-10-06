import { Router } from 'express';
import {
  getKitchenOrders,
  getKitchenSummary,
  updateOrderStatus,
} from '../controllers/kitchen.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireAnyPermission } from '../middlewares/permission.middleware.js';
import { PermissionCode } from '@prisma/client';

export const kitchenRouter = Router();
kitchenRouter.use(requireAuth);

kitchenRouter.get(
  '/orders',
  requireAnyPermission(PermissionCode.SESSION_VIEW, PermissionCode.PRODUCT_VIEW),
  getKitchenOrders,
);

kitchenRouter.get(
  '/summary',
  requireAnyPermission(PermissionCode.SESSION_VIEW, PermissionCode.PRODUCT_VIEW),
  getKitchenSummary,
);

kitchenRouter.patch(
  '/orders/:transactionId/status',
  requireAnyPermission(PermissionCode.SESSION_VIEW, PermissionCode.PRODUCT_VIEW),
  updateOrderStatus,
);
