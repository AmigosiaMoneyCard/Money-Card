import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { Role, TransactionType } from '@prisma/client';
import { balanceStreamService } from '../services/balanceStream.service.js';

export async function getKitchenOrders(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { status, branchId } = req.query;

  let effectiveBranchIds: string[] = [];

  if (req.user?.role === Role.STAFF) {
    const userBranches = await prisma.userBranch.findMany({
      where: { userId: req.user.id },
      select: { branchId: true },
    });
    effectiveBranchIds = userBranches.map((b) => b.branchId);

    if (effectiveBranchIds.length === 0) {
      return sendError(res, 403, 'FORBIDDEN', 'No branch assigned to your counter account');
    }

    if (branchId && typeof branchId === 'string') {
      if (!effectiveBranchIds.includes(branchId)) {
        return sendError(res, 403, 'FORBIDDEN', 'Cannot access orders for unassigned counter');
      }
      effectiveBranchIds = [branchId];
    }
  } else {
    if (branchId && typeof branchId === 'string') {
      effectiveBranchIds = [branchId];
    } else {
      const allBranches = await prisma.branch.findMany({
        where: { organizationId: orgId },
        select: { id: true },
      });
      effectiveBranchIds = allBranches.map((b) => b.id);
    }
  }

  // Look back 24 hours to capture active shift tickets
  const shiftCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const transactions = await prisma.transaction.findMany({
    where: {
      branchId: { in: effectiveBranchIds },
      type: TransactionType.PURCHASE,
      createdAt: { gte: shiftCutoff },
    },
    include: {
      branch: true,
      session: {
        include: { card: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = transactions
    .map((tx) => {
      const rawMeta = (tx.items as any) || {};
      const isCancelled = Boolean(rawMeta?.isCancelled);
      if (isCancelled) return null;

      const orderItems = Array.isArray(rawMeta?.items)
        ? rawMeta.items
        : Array.isArray(tx.items)
        ? tx.items
        : [];

      const currentStatus = rawMeta.orderStatus || 'PENDING';

      return {
        id: tx.id,
        transactionId: tx.id,
        orderNumber: rawMeta.orderNumber || 101,
        orderStatus: currentStatus,
        orderedAt: rawMeta.orderedAt || tx.createdAt,
        preparingAt: rawMeta.preparingAt || null,
        readyAt: rawMeta.readyAt || null,
        completedAt: rawMeta.completedAt || null,
        items: orderItems,
        cardDisplayNumber:
          rawMeta.cardDisplayNumber ||
          tx.session?.card?.physicalCardNumber ||
          tx.session?.sessionToken?.slice(-4) ||
          'CARD',
        customerName: rawMeta.customerName || null,
        counterName: tx.branch?.name || rawMeta.counterName || 'Counter',
        counterId: tx.branchId,
        amount: tx.amount,
        preparedByUserId: rawMeta.preparedByUserId || null,
        preparedByName: rawMeta.preparedByName || null,
      };
    })
    .filter(Boolean) as any[];

  if (status && typeof status === 'string' && status.trim()) {
    const filterStatus = status.trim().toUpperCase();
    const filtered = formatted.filter((o) => o.orderStatus === filterStatus);
    return sendSuccess(res, filtered);
  }

  return sendSuccess(res, formatted);
}

export async function getKitchenSummary(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { branchId } = req.query;
  let effectiveBranchIds: string[] = [];

  if (req.user?.role === Role.STAFF) {
    const userBranches = await prisma.userBranch.findMany({
      where: { userId: req.user.id },
      select: { branchId: true },
    });
    effectiveBranchIds = userBranches.map((b) => b.branchId);

    if (effectiveBranchIds.length === 0) {
      return sendError(res, 403, 'FORBIDDEN', 'No branch assigned to your counter account');
    }

    if (branchId && typeof branchId === 'string') {
      if (!effectiveBranchIds.includes(branchId)) {
        return sendError(res, 403, 'FORBIDDEN', 'Cannot access summary for unassigned counter');
      }
      effectiveBranchIds = [branchId];
    }
  } else {
    if (branchId && typeof branchId === 'string') {
      effectiveBranchIds = [branchId];
    } else {
      const allBranches = await prisma.branch.findMany({
        where: { organizationId: orgId },
        select: { id: true },
      });
      effectiveBranchIds = allBranches.map((b) => b.id);
    }
  }

  const shiftCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const transactions = await prisma.transaction.findMany({
    where: {
      branchId: { in: effectiveBranchIds },
      type: TransactionType.PURCHASE,
      createdAt: { gte: shiftCutoff },
    },
    select: {
      items: true,
    },
  });

  let pendingCount = 0;
  let preparingCount = 0;
  let readyCount = 0;
  let completedCount = 0;

  for (const tx of transactions) {
    const rawMeta = (tx.items as any) || {};
    if (rawMeta.isCancelled) continue;
    const st = (rawMeta.orderStatus || 'PENDING').toUpperCase();
    if (st === 'PENDING') pendingCount++;
    else if (st === 'PREPARING') preparingCount++;
    else if (st === 'READY') readyCount++;
    else if (st === 'COMPLETED') completedCount++;
  }

  return sendSuccess(res, {
    pendingCount,
    preparingCount,
    readyCount,
    completedCount,
    totalActive: pendingCount + preparingCount + readyCount,
  });
}

export async function updateOrderStatus(req: Request, res: Response) {
  const { transactionId } = req.params;
  const { status } = req.body;
  const orgId = req.user?.organizationId;

  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const allowedStatuses = ['PENDING', 'PREPARING', 'READY', 'COMPLETED'];
  if (!status || !allowedStatuses.includes(String(status).toUpperCase())) {
    return sendError(
      res,
      400,
      'VALIDATION_ERROR',
      `Valid order status is required: ${allowedStatuses.join(', ')}`,
    );
  }

  const newStatus = String(status).toUpperCase();

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      branch: true,
      session: {
        include: { card: true },
      },
    },
  });

  if (!transaction || transaction.type !== TransactionType.PURCHASE) {
    return sendError(res, 404, 'NOT_FOUND', 'Purchase order ticket not found');
  }

  if (transaction.branch.organizationId !== orgId) {
    return sendError(res, 403, 'FORBIDDEN', 'Cannot update orders for another organization');
  }

  if (req.user?.role === Role.STAFF) {
    const userBranches = await prisma.userBranch.findMany({
      where: { userId: req.user.id },
      select: { branchId: true },
    });
    const staffBranchIds = userBranches.map((b) => b.branchId);
    if (!staffBranchIds.includes(transaction.branchId)) {
      return sendError(res, 403, 'FORBIDDEN', 'Cannot update order outside your assigned counter');
    }
  }

  const rawMeta = (transaction.items as any) || {};
  if (rawMeta.isCancelled) {
    return sendError(res, 400, 'ORDER_CANCELLED', 'Cannot update status of a cancelled order');
  }

  const updatedMeta = {
    ...rawMeta,
    orderStatus: newStatus,
    updatedAt: new Date().toISOString(),
    ...(newStatus === 'PREPARING'
      ? {
          preparingAt: new Date().toISOString(),
          preparedByUserId: req.user?.id || null,
          preparedByName: req.user?.name || 'Kitchen Staff',
        }
      : {}),
    ...(newStatus === 'READY'
      ? {
          readyAt: new Date().toISOString(),
        }
      : {}),
    ...(newStatus === 'COMPLETED'
      ? {
          completedAt: new Date().toISOString(),
          completedByUserId: req.user?.id || null,
        }
      : {}),
  };

  const updatedTx = await prisma.transaction.update({
    where: { id: transactionId },
    data: { items: updatedMeta },
    include: {
      branch: true,
      session: {
        include: { card: true },
      },
    },
  });

  // Broadcast update to real-time streams
  try {
    balanceStreamService.broadcastBalanceUpdate(transaction.sessionId, {
      type: 'ORDER_STATUS_UPDATE',
      transactionId,
      orderStatus: newStatus,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Non-fatal
  }

  const orderItems = Array.isArray(updatedMeta.items)
    ? updatedMeta.items
    : Array.isArray(updatedTx.items)
    ? updatedTx.items
    : [];

  return sendSuccess(res, {
    id: updatedTx.id,
    transactionId: updatedTx.id,
    orderNumber: updatedMeta.orderNumber || 101,
    orderStatus: newStatus,
    orderedAt: updatedMeta.orderedAt || updatedTx.createdAt,
    preparingAt: updatedMeta.preparingAt || null,
    readyAt: updatedMeta.readyAt || null,
    completedAt: updatedMeta.completedAt || null,
    items: orderItems,
    cardDisplayNumber:
      updatedMeta.cardDisplayNumber ||
      updatedTx.session?.card?.physicalCardNumber ||
      updatedTx.session?.sessionToken?.slice(-4) ||
      'CARD',
    customerName: updatedMeta.customerName || null,
    counterName: updatedTx.branch?.name || updatedMeta.counterName || 'Counter',
    counterId: updatedTx.branchId,
    amount: updatedTx.amount,
    preparedByUserId: updatedMeta.preparedByUserId || null,
    preparedByName: updatedMeta.preparedByName || null,
  });
}
