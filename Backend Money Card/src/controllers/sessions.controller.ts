import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { generateSessionToken } from '../utils/crypto.js';
import { CardStatus, SessionStatus, TransactionType } from '@prisma/client';
import { balanceStreamService } from '../services/balanceStream.service.js';

export async function listSessions(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { status, branchId, cardId, search, q, limit = 50, page = 1, offset } = req.query as Record<string, any>;

  const validStatuses = Object.values(SessionStatus);
  if (status && status !== 'ALL' && !validStatuses.includes(status as SessionStatus)) {
    return sendError(res, 400, 'VALIDATION_ERROR', `Invalid status filter. Allowed values: ${validStatuses.join(', ')}`);
  }

  const where: any = {
    organizationId: orgId,
  };

  if (status && status !== 'ALL') {
    where.status = status as SessionStatus;
  }

  if (branchId) {
    where.branchId = String(branchId);
  } else if (req.user?.role === 'STAFF' && req.user.assignedBranchIds && req.user.assignedBranchIds.length > 0) {
    where.branchId = { in: req.user.assignedBranchIds };
  }

  if (cardId) {
    where.cardId = String(cardId);
  }

  const searchTerm = String(search || q || '').trim();
  if (searchTerm) {
    where.OR = [
      { customerName: { contains: searchTerm, mode: 'insensitive' } },
      { customerPhone: { contains: searchTerm, mode: 'insensitive' } },
      { sessionCardNumber: { contains: searchTerm, mode: 'insensitive' } },
      { sessionToken: { contains: searchTerm, mode: 'insensitive' } },
      { card: { physicalCardNumber: { contains: searchTerm, mode: 'insensitive' } } },
    ];
  }

  const take = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
  const skip = offset ? parseInt(String(offset), 10) || 0 : (Math.max(1, parseInt(String(page), 10) || 1) - 1) * take;

  try {
    const [sessions, total] = await Promise.all([
      prisma.cardSession.findMany({
        where,
        include: {
          card: true,
          branch: true,
          issuedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { issuedAt: 'desc' },
        take,
        skip,
      }),
      prisma.cardSession.count({ where }),
    ]);

    const formattedSessions = sessions.map((s) => ({
      id: s.id,
      cardId: s.cardId,
      physicalCardNumber: s.card?.physicalCardNumber || (s.sessionCardNumber ? s.sessionCardNumber.replace(/_\d+$/, '') : null),
      sessionCardNumber: s.sessionCardNumber || (s.card?.physicalCardNumber ? `${s.card.physicalCardNumber}_${s.cycleNumber || 1}` : null),
      cycleNumber: s.cycleNumber || 1,
      branchId: s.branchId,
      branchName: s.branch?.name || null,
      status: s.status,
      balance: s.balance,
      customerName: s.customerName || null,
      customerPhone: s.customerPhone || null,
      startedAt: s.issuedAt.toISOString(),
      settledAt: s.settledAt ? s.settledAt.toISOString() : null,
      createdAt: s.issuedAt.toISOString(),
      updatedAt: s.settledAt ? s.settledAt.toISOString() : s.issuedAt.toISOString(),
      issuedBy: s.issuedBy,
    }));

    const pageNum = Math.floor(skip / take) + 1;
    return sendSuccess(res, formattedSessions, 200, {
      total,
      page: pageNum,
      limit: take,
      totalPages: Math.ceil(total / take) || 1,
    });
  } catch (err: any) {
    return sendError(res, 500, 'INTERNAL_ERROR', err?.message || 'Failed to list card sessions');
  }
}

export async function createSession(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { cardId, branchId, initialAmount = 0, paymentMethod = 'CASH', customerName, customerPhone, userName, phone } = req.body;
  const cleanCustomerName = (customerName || userName || '').trim() || null;
  const cleanCustomerPhone = (customerPhone || phone || '').trim() || null;
  if (!cardId || !branchId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'cardId and branchId are required');
  }

  const card = await prisma.card.findFirst({
    where: { id: cardId, organizationId: orgId },
  });

  if (!card) {
    return sendError(res, 404, 'NOT_FOUND', 'Card not found');
  }

  if (!card.physicalCardNumber || (card as any).assignmentStatus === 'UNASSIGNED') {
    await prisma.card.update({
      where: { id: card.id },
      data: {
        physicalCardNumber: card.physicalCardNumber || card.qrToken.toUpperCase(),
        assignmentStatus: 'ASSIGNED',
      },
    });
    (card as any).assignmentStatus = 'ASSIGNED';
    card.physicalCardNumber = card.physicalCardNumber || card.qrToken.toUpperCase();
  }

  if (card.status === CardStatus.BLOCKED) {
    return sendError(res, 400, 'CARD_BLOCKED', 'Card is blocked and cannot be issued');
  }

  if (card.status === CardStatus.ACTIVE) {
    return sendError(res, 400, 'CARD_ALREADY_ACTIVE', 'Card already has an active session');
  }

  if (req.user?.role === 'STAFF' && !req.user.assignedBranchIds.includes(branchId)) {
    return sendError(res, 403, 'BRANCH_ACCESS_DENIED', 'You are not assigned to this branch location');
  }

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, organizationId: orgId },
  });

  if (!branch) {
    return sendError(res, 404, 'NOT_FOUND', 'Branch not found in your organization');
  }

  if (branch.status !== 'ACTIVE') {
    return sendError(res, 403, 'BRANCH_INACTIVE', 'This branch location is currently disabled or inactive');
  }

  const initAmount = Math.max(0, parseFloat(initialAmount) || 0);
  const sessionToken = generateSessionToken();

  const session = await prisma.$transaction(async (tx) => {
    // Count existing cycles for this physical card to determine internal session cycle (e.g. MC-100_1, MC-100_2)
    const sessionCount = await tx.cardSession.count({
      where: { cardId: card.id },
    });
    const cycleNumber = sessionCount + 1;
    const sessionCardNumber = `${card.physicalCardNumber}_${cycleNumber}`;

    const createdSession = await tx.cardSession.create({
      data: {
        organizationId: orgId,
        branchId,
        cardId: card.id,
        sessionToken,
        balance: initAmount,
        status: SessionStatus.ACTIVE,
        cycleNumber,
        sessionCardNumber,
        customerName: cleanCustomerName,
        customerPhone: cleanCustomerPhone,
        issuedByUserId: req.user?.id,
      },
    });

    await tx.card.update({
      where: { id: card.id },
      data: { status: CardStatus.ACTIVE },
    });

    if (initAmount > 0) {
      await tx.transaction.create({
        data: {
          sessionId: createdSession.id,
          branchId,
          staffUserId: req.user?.id,
          type: paymentMethod === 'UPI' ? TransactionType.RECHARGE_UPI : TransactionType.RECHARGE_CASH,
          amount: initAmount,
          balanceBefore: 0.0,
          balanceAfter: initAmount,
          paymentMethod: paymentMethod === 'UPI' ? 'UPI' : 'CASH',
        },
      });
    }

    return createdSession;
  });

  balanceStreamService.mapSessionIdToToken(session.id, session.sessionToken);
  balanceStreamService.broadcastBalanceUpdate(session.sessionToken, {
    balance: session.balance,
    status: session.status,
    type: 'INIT',
    amount: initAmount,
    cardDisplayNumber: card.physicalCardNumber || undefined,
    sessionId: session.id,
  });

  return sendSuccess(
    res,
    {
      ...session,
      cardId: card.id,
      physicalCardNumber: card.physicalCardNumber,
      sessionCardNumber: session.sessionCardNumber || `${card.physicalCardNumber}_${session.cycleNumber || 1}`,
      cycleNumber: session.cycleNumber || 1,
      customerName: session.customerName,
      customerPhone: session.customerPhone,
      startedAt: session.issuedAt.toISOString(),
      createdAt: session.issuedAt.toISOString(),
      updatedAt: session.issuedAt.toISOString(),
    },
    201,
  );
}

export async function getSessionById(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;

  const session = await prisma.cardSession.findFirst({
    where: { id, organizationId: orgId || undefined },
    include: {
      card: true,
      branch: true,
      issuedBy: { select: { id: true, name: true, email: true } },
      settledBy: { select: { id: true, name: true, email: true } },
      transactions: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!session) {
    return sendError(res, 404, 'NOT_FOUND', 'Card session not found');
  }

  return sendSuccess(res, session);
}

export async function getActiveSessionByQr(req: Request, res: Response) {
  const { qrToken } = req.params;
  const orgId = req.user?.organizationId;

  const card = await prisma.card.findFirst({
    where: { qrToken, organizationId: orgId || undefined },
    include: {
      sessions: {
        where: { status: SessionStatus.ACTIVE },
        take: 1,
        include: {
          branch: true,
          transactions: {
            include: {
              staff: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  });

  if (!card) {
    return sendError(res, 404, 'NOT_FOUND', 'Card not found with this QR code');
  }

  if (!card.physicalCardNumber || (card as any).assignmentStatus === 'UNASSIGNED') {
    await prisma.card.update({
      where: { id: card.id },
      data: {
        physicalCardNumber: card.physicalCardNumber || card.qrToken.toUpperCase(),
        assignmentStatus: 'ASSIGNED',
      },
    });
    (card as any).assignmentStatus = 'ASSIGNED';
    card.physicalCardNumber = card.physicalCardNumber || card.qrToken.toUpperCase();
  }

  if (card.status === CardStatus.BLOCKED) {
    return sendError(
      res,
      403,
      'CARD_BLOCKED',
      `Card ${card.physicalCardNumber} is blocked and cannot be used for any organization transactions.`,
    );
  }

  const activeSession = card.sessions[0] || null;

  return sendSuccess(res, {
    card: {
      id: card.id,
      physicalCardNumber: card.physicalCardNumber,
      qrToken: card.qrToken,
      assignmentStatus: (card as any).assignmentStatus,
      status: card.status,
    },
    activeSession,
  });
}

export async function rechargeSession(req: Request, res: Response) {
  const { id } = req.params;
  const { amount, paymentMethod = 'CASH', externalReference, branchId: requestedBranchId } = req.body;
  const orgId = req.user?.organizationId;

  const rechargeAmount = parseFloat(amount);
  if (!rechargeAmount || rechargeAmount <= 0) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Recharge amount must be greater than 0');
  }

  const session = await prisma.cardSession.findFirst({
    where: { id, organizationId: orgId || undefined },
    include: { card: true, branch: true },
  });

  if (!session) {
    return sendError(res, 404, 'NOT_FOUND', 'Session not found');
  }

  if (session.status !== SessionStatus.ACTIVE) {
    return sendError(res, 400, 'INVALID_STATE', 'Cannot recharge an inactive or settled session');
  }

  // Determine effective recharging branch:
  // Can be passed via body branchId, header 'x-branch-id', or staff's branch assignment.
  let effectiveBranchId = requestedBranchId || (req.headers['x-branch-id'] as string) || session.branchId;

  if (req.user?.role === 'STAFF') {
    if (requestedBranchId && !req.user.assignedBranchIds.includes(requestedBranchId)) {
      return sendError(res, 403, 'BRANCH_ACCESS_DENIED', 'You are not authorized to process recharges for another branch');
    }
    if (!requestedBranchId && req.user.assignedBranchIds.length > 0) {
      effectiveBranchId = req.user.assignedBranchIds.includes(effectiveBranchId)
        ? effectiveBranchId
        : req.user.assignedBranchIds[0];
    }
  }

  const rechargingBranch = await prisma.branch.findFirst({
    where: { id: effectiveBranchId, organizationId: orgId || undefined },
  });

  if (!rechargingBranch || rechargingBranch.status !== 'ACTIVE') {
    return sendError(res, 403, 'BRANCH_INACTIVE', 'This branch location is currently disabled or inactive');
  }

  if (session.card?.status === CardStatus.BLOCKED) {
    return sendError(res, 400, 'CARD_BLOCKED', 'Cannot recharge a blocked card');
  }

  const updatedSession = await prisma.$transaction(async (tx) => {
    const balanceBefore = session.balance;
    const balanceAfter = balanceBefore + rechargeAmount;

    // Update session balance and associate active session with the recharging branch
    const updated = await tx.cardSession.update({
      where: { id },
      data: {
        balance: balanceAfter,
        branchId: effectiveBranchId,
      },
    });

    const txType = paymentMethod === 'UPI' ? TransactionType.RECHARGE_UPI : TransactionType.RECHARGE_CASH;

    // Credit transaction accurately to the recharging branch
    const txRecord = await tx.transaction.create({
      data: {
        sessionId: session.id,
        branchId: effectiveBranchId,
        staffUserId: req.user?.id,
        type: txType,
        amount: rechargeAmount,
        balanceBefore,
        balanceAfter,
        paymentMethod: paymentMethod === 'UPI' ? 'UPI' : 'CASH',
        externalReference,
      },
    });

    return {
      ...updated,
      transactionId: txRecord.id,
      amount: rechargeAmount,
      balance: balanceAfter,
      balanceBefore,
      balanceAfter,
      paymentMethod,
    };
  });

  balanceStreamService.broadcastBalanceUpdate(session.id, {
    balance: updatedSession.balance,
    status: updatedSession.status,
    type: 'RECHARGE',
    amount: rechargeAmount,
    sessionId: session.id,
  });

  return sendSuccess(res, updatedSession);
}

export async function purchaseSession(req: Request, res: Response) {
  const { id } = req.params;
  const { items } = req.body;
  const orgId = req.user?.organizationId;

  if (!Array.isArray(items) || items.length === 0) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Purchase requires at least one item');
  }

  const session = await prisma.cardSession.findFirst({
    where: { id, organizationId: orgId || undefined },
    include: { card: true, branch: true },
  });

  if (!session) {
    return sendError(res, 404, 'NOT_FOUND', 'Session not found');
  }

  if (session.status !== SessionStatus.ACTIVE) {
    return sendError(res, 400, 'INVALID_STATE', 'Cannot make purchases on an inactive session');
  }

  if (session.card?.status === CardStatus.BLOCKED) {
    return sendError(res, 400, 'CARD_BLOCKED', 'Card is blocked');
  }

  if (req.user?.role === 'STAFF' && !req.user.assignedBranchIds.includes(session.branchId)) {
    return sendError(res, 403, 'BRANCH_ACCESS_DENIED', 'You are not authorized to make purchases on a session belonging to another branch');
  }

  // Calculate total and validate stock inside atomic transaction
  try {
    const result = await prisma.$transaction(async (tx) => {
      let totalCost = 0;
      const detailedItems: any[] = [];

      for (const it of items) {
        const product = await tx.product.findUnique({
          where: { id: it.productId },
        });

        if (!product) {
          throw new Error(`Product '${it.productId}' not found`);
        }

        const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
        const itemSubtotal = product.price * qty;
        totalCost += itemSubtotal;



        detailedItems.push({
          productId: product.id,
          itemName: product.itemName,
          unitPrice: product.price,
          quantity: qty,
          subtotal: itemSubtotal,
        });
      }

      const currentSession = await tx.cardSession.findUniqueOrThrow({
        where: { id },
      });

      if (currentSession.status !== SessionStatus.ACTIVE) {
        throw new Error('INVALID_STATE: Session is no longer active');
      }

      if (currentSession.balance < totalCost) {
        throw new Error(`INSUFFICIENT_BALANCE: Current balance is ₹${currentSession.balance.toFixed(2)}, required ₹${totalCost.toFixed(2)}`);
      }

      const balanceBefore = currentSession.balance;
      const balanceAfter = balanceBefore - totalCost;

      const updatedSession = await tx.cardSession.update({
        where: { id },
        data: { balance: balanceAfter },
      });

      const txRecord = await tx.transaction.create({
        data: {
          sessionId: session.id,
          branchId: session.branchId,
          staffUserId: req.user?.id,
          type: TransactionType.PURCHASE,
          amount: totalCost,
          balanceBefore,
          balanceAfter,
          paymentMethod: 'CARD_BALANCE',
          items: detailedItems,
        },
      });

      return {
        session: updatedSession,
        transaction: txRecord,
        transactionId: txRecord.id,
        amount: totalCost,
        balance: balanceAfter,
        balanceBefore,
        balanceAfter,
      };
    });

    balanceStreamService.broadcastBalanceUpdate(session.id, {
      balance: result.balance,
      status: result.session.status,
      type: 'PURCHASE',
      amount: result.amount,
      sessionId: session.id,
    });

    return sendSuccess(res, result);
  } catch (err: any) {
    const isNotFound = err.message?.includes('not found');
    return sendError(res, isNotFound ? 404 : 400, isNotFound ? 'NOT_FOUND' : 'PURCHASE_FAILED', err.message || 'Purchase failed');
  }
}

export async function returnSession(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;

  const session = await prisma.cardSession.findFirst({
    where: { id, organizationId: orgId || undefined },
    include: { card: true, branch: true },
  });

  if (!session) {
    return sendError(res, 404, 'NOT_FOUND', 'Session not found');
  }

  if (session.status === SessionStatus.SETTLED) {
    return sendError(res, 400, 'ALREADY_SETTLED', 'Session is already settled and refunded');
  }

  const refundAmount = session.balance;

  const result = await prisma.$transaction(async (tx) => {
    const settledSession = await tx.cardSession.update({
      where: { id },
      data: {
        balance: 0.0,
        status: SessionStatus.SETTLED,
        settledAt: new Date(),
        settledByUserId: req.user?.id,
        refundAmount,
      },
    });

    if (refundAmount > 0) {
      await tx.transaction.create({
        data: {
          sessionId: session.id,
          branchId: session.branchId,
          staffUserId: req.user?.id,
          type: TransactionType.REFUND_RETURN,
          amount: refundAmount,
          balanceBefore: refundAmount,
          balanceAfter: 0.0,
          paymentMethod: 'DIRECT_REFUND',
        },
      });
    }

    if (session.cardId) {
      // Reset card status to AVAILABLE
      await tx.card.update({
        where: { id: session.cardId },
        data: { status: CardStatus.AVAILABLE },
      });
    }

    return { session: settledSession, refundAmount };
  });

  balanceStreamService.broadcastBalanceUpdate(session.id, {
    balance: 0.0,
    status: SessionStatus.SETTLED,
    type: 'REFUND',
    amount: refundAmount,
    sessionId: session.id,
  });

  return sendSuccess(res, result);
}

export async function cancelRecharge(req: Request, res: Response) {
  const { id } = req.params;
  const { reason } = req.body;
  const orgId = req.user?.organizationId;

  const txRecord = await prisma.transaction.findUnique({
    where: { id },
    include: {
      session: {
        include: { card: true, branch: true },
      },
    },
  });

  if (!txRecord) {
    return sendError(res, 404, 'NOT_FOUND', 'Transaction not found');
  }

  if (orgId && txRecord.session.organizationId !== orgId) {
    return sendError(res, 403, 'FORBIDDEN', 'Access denied to this transaction');
  }

  const txType = String(txRecord.type || '');
  const isRecharge = txType.includes('RECHARGE') || txType === 'CASH' || txType === 'UPI';
  if (!isRecharge) {
    return sendError(res, 400, 'INVALID_TRANSACTION_TYPE', 'Only recharge transactions can be cancelled via this endpoint');
  }

  const existingMeta = (txRecord.items as any) || {};
  if (existingMeta.isCancelled) {
    return sendError(res, 400, 'ALREADY_CANCELLED', 'This recharge transaction has already been cancelled');
  }

  const session = txRecord.session;
  if (session.status !== SessionStatus.ACTIVE) {
    return sendError(res, 400, 'SESSION_INACTIVE', 'Cannot cancel top-up on an inactive or settled session');
  }

  if (session.balance < txRecord.amount) {
    const spentAmount = (txRecord.amount - session.balance).toFixed(2);
    return sendError(
      res,
      400,
      'INSUFFICIENT_BALANCE',
      `Cannot cancel top-up: Customer already spent ₹${spentAmount}. Current card balance is only ₹${session.balance.toFixed(2)}.`,
    );
  }

  const balanceBefore = session.balance;
  const balanceAfter = balanceBefore - txRecord.amount;

  const result = await prisma.$transaction(async (txPrisma) => {
    const updatedSession = await txPrisma.cardSession.update({
      where: { id: session.id },
      data: { balance: balanceAfter },
    });

    const cancelMeta = {
      ...existingMeta,
      isCancelled: true,
      cancelledAt: new Date().toISOString(),
      cancelledByUserId: req.user?.id,
      cancelledByUserName: req.user?.name || 'Staff',
      cancellationReason: (reason || '').trim() || 'Staff voided recharge',
    };

    const updatedTx = await txPrisma.transaction.update({
      where: { id: txRecord.id },
      data: {
        items: cancelMeta,
      },
      include: {
        staff: { select: { id: true, name: true } },
      },
    });

    return { session: updatedSession, transaction: updatedTx };
  });

  balanceStreamService.broadcastBalanceUpdate(session.sessionToken, {
    balance: balanceAfter,
    status: session.status,
    type: 'RECHARGE_CANCELLED',
    amount: txRecord.amount,
    sessionId: session.id,
  });

  return sendSuccess(res, result);
}

export async function cancelOrder(req: Request, res: Response) {
  const { id } = req.params;
  const { reason } = req.body;
  const orgId = req.user?.organizationId;

  const txRecord = await prisma.transaction.findUnique({
    where: { id },
    include: {
      session: {
        include: { card: true, branch: true },
      },
    },
  });

  if (!txRecord) {
    return sendError(res, 404, 'NOT_FOUND', 'Transaction not found');
  }

  if (orgId && txRecord.session.organizationId !== orgId) {
    return sendError(res, 403, 'FORBIDDEN', 'Access denied to this transaction');
  }

  if (txRecord.type !== TransactionType.PURCHASE) {
    return sendError(res, 400, 'INVALID_TRANSACTION_TYPE', 'Only purchase orders can be cancelled via this endpoint');
  }

  const existingMeta = (txRecord.items as any) || {};
  if (existingMeta?.isCancelled) {
    return sendError(res, 400, 'ALREADY_CANCELLED', 'This order has already been cancelled');
  }

  const session = txRecord.session;
  if (session.status !== SessionStatus.ACTIVE) {
    return sendError(res, 400, 'SESSION_INACTIVE', 'Cannot cancel order on an inactive or settled session');
  }

  const balanceBefore = session.balance;
  const balanceAfter = balanceBefore + txRecord.amount;

  const result = await prisma.$transaction(async (txPrisma) => {
    const updatedSession = await txPrisma.cardSession.update({
      where: { id: session.id },
      data: { balance: balanceAfter },
    });

    const orderItems = Array.isArray(txRecord.items)
      ? txRecord.items
      : existingMeta.orderItems || [];

    const cancelMeta = {
      orderItems,
      isCancelled: true,
      cancelledAt: new Date().toISOString(),
      cancelledByUserId: req.user?.id,
      cancelledByUserName: req.user?.name || 'Staff',
      cancellationReason: (reason || '').trim() || 'Customer cancelled order',
    };

    const updatedTx = await txPrisma.transaction.update({
      where: { id: txRecord.id },
      data: {
        items: cancelMeta,
      },
      include: {
        staff: { select: { id: true, name: true } },
      },
    });

    return { session: updatedSession, transaction: updatedTx };
  });

  balanceStreamService.broadcastBalanceUpdate(session.sessionToken, {
    balance: balanceAfter,
    status: session.status,
    type: 'PURCHASE_CANCELLED',
    amount: txRecord.amount,
    sessionId: session.id,
  });

  return sendSuccess(res, result);
}

export async function listRecharges(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId && req.user?.role !== 'SUPER_ADMIN') {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const {
    branchId,
    startDate,
    endDate,
    paymentMethod,
    status,
    search,
    limit = 50,
    page = 1,
    offset,
  } = req.query as Record<string, any>;

  let effectiveBranchId = branchId && branchId !== 'ALL' ? String(branchId) : undefined;
  if (req.user?.role === 'STAFF' && req.user.assignedBranchIds && req.user.assignedBranchIds.length > 0) {
    if (!effectiveBranchId || !req.user.assignedBranchIds.includes(effectiveBranchId)) {
      effectiveBranchId = req.user.assignedBranchIds[0];
    }
  }

  const dateFilter: any = {};
  if (startDate) dateFilter.gte = new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`);
  if (endDate) dateFilter.lte = new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`);

  const where: any = {
    type: { in: [TransactionType.RECHARGE_CASH, TransactionType.RECHARGE_UPI] },
    session: {
      ...(orgId ? { organizationId: orgId } : {}),
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    },
    ...(startDate || endDate ? { createdAt: dateFilter } : {}),
  };

  if (effectiveBranchId) {
    where.branchId = effectiveBranchId;
  }

  const take = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
  const skip = offset ? parseInt(String(offset), 10) || 0 : (Math.max(1, parseInt(String(page), 10) || 1) - 1) * take;

  const allMatchingTx = await prisma.transaction.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true } },
      staff: { select: { id: true, name: true, email: true } },
      session: {
        include: {
          card: { select: { physicalCardNumber: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  let filtered = allMatchingTx;

  // Filter by payment method if specified
  if (paymentMethod && paymentMethod !== 'ALL') {
    const pm = String(paymentMethod).toUpperCase();
    filtered = filtered.filter((t) => {
      const type = String(t.type);
      const method = String(t.paymentMethod || '').toUpperCase();
      return pm === 'UPI' ? (type.includes('UPI') || method === 'UPI') : (type.includes('CASH') || method === 'CASH');
    });
  }

  // Filter by status (ACTIVE vs CANCELLED)
  if (status && status !== 'ALL') {
    const isCancelledTarget = status === 'CANCELLED';
    filtered = filtered.filter((t) => {
      const isCancelled = Boolean((t.items as any)?.isCancelled);
      return isCancelledTarget ? isCancelled : !isCancelled;
    });
  }

  // Filter by search term
  const searchTerm = String(search || '').trim().toLowerCase();
  if (searchTerm) {
    filtered = filtered.filter((t) => {
      const cardNum = (t.session.card?.physicalCardNumber || t.session.sessionCardNumber || '').toLowerCase();
      const custName = (t.session.customerName || '').toLowerCase();
      const custPhone = (t.session.customerPhone || '').toLowerCase();
      const staffName = (t.staff?.name || '').toLowerCase();
      return (
        cardNum.includes(searchTerm) ||
        custName.includes(searchTerm) ||
        custPhone.includes(searchTerm) ||
        staffName.includes(searchTerm)
      );
    });
  }

  // Calculate summary metrics across all filtered recharges
  let totalCount = 0;
  let totalVolume = 0;
  let upiCount = 0;
  let upiVolume = 0;
  let cashCount = 0;
  let cashVolume = 0;
  let cancelledCount = 0;
  let cancelledVolume = 0;

  filtered.forEach((t) => {
    const isCancelled = Boolean((t.items as any)?.isCancelled);
    const isUpi = String(t.type).includes('UPI') || String(t.paymentMethod || '').toUpperCase() === 'UPI';

    if (isCancelled) {
      cancelledCount++;
      cancelledVolume += t.amount;
    } else {
      totalCount++;
      totalVolume += t.amount;
      if (isUpi) {
        upiCount++;
        upiVolume += t.amount;
      } else {
        cashCount++;
        cashVolume += t.amount;
      }
    }
  });

  const paginated = filtered.slice(skip, skip + take);

  const formatted = paginated.map((t) => {
    const isCancelled = Boolean((t.items as any)?.isCancelled);
    const cancelMeta = (t.items as any) || {};
    const isUpi = String(t.type).includes('UPI') || String(t.paymentMethod || '').toUpperCase() === 'UPI';

    return {
      id: t.id,
      sessionId: t.sessionId,
      cardNumber: t.session.card?.physicalCardNumber || t.session.sessionCardNumber || 'MC-CARD',
      customerName: t.session.customerName || 'Customer',
      customerPhone: t.session.customerPhone || '—',
      branchId: t.branchId,
      branchName: t.branch?.name || 'Counter',
      staffUserId: t.staffUserId,
      staffName: t.staff?.name || 'Staff',
      type: t.type,
      amount: t.amount,
      paymentMethod: isUpi ? 'UPI' : 'CASH',
      balanceBefore: t.balanceBefore,
      balanceAfter: t.balanceAfter,
      isCancelled,
      cancelledAt: cancelMeta.cancelledAt || null,
      cancelledByUserName: cancelMeta.cancelledByUserName || null,
      cancellationReason: cancelMeta.cancellationReason || null,
      createdAt: t.createdAt.toISOString(),
    };
  });

  return sendSuccess(res, {
    items: formatted,
    transactions: formatted,
    total: filtered.length,
    page: Math.floor(skip / take) + 1,
    limit: take,
    totalPages: Math.ceil(filtered.length / take) || 1,
    summary: {
      totalCount,
      totalVolume: Number(totalVolume.toFixed(2)),
      upiCount,
      upiVolume: Number(upiVolume.toFixed(2)),
      cashCount,
      cashVolume: Number(cashVolume.toFixed(2)),
      cancelledCount,
      cancelledVolume: Number(cancelledVolume.toFixed(2)),
    },
    pagination: {
      total: filtered.length,
      page: Math.floor(skip / take) + 1,
      limit: take,
      totalPages: Math.ceil(filtered.length / take) || 1,
    },
  });
}

