import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';

export async function resolvePublicQrToken(req: Request, res: Response) {
  let { qrToken } = req.body;
  if (!qrToken || !qrToken.trim()) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'qrToken is required');
  }

  qrToken = qrToken.trim();
  if (qrToken.includes('/c/')) {
    qrToken = qrToken.split('/c/')[1].split('?')[0].split('#')[0];
  }

  const card = await prisma.card.findUnique({
    where: { qrToken: qrToken.trim() },
    include: {
      organization: { select: { name: true, logoUrl: true } },
      sessions: {
        where: { status: 'ACTIVE' },
        take: 1,
        include: {
          branch: { select: { name: true, location: true } },
        },
      },
    },
  });

  if (!card) {
    return sendError(res, 404, 'CARD_NOT_FOUND', 'Card not recognized');
  }

  if (card.status === 'BLOCKED') {
    return sendError(
      res,
      403,
      'CARD_BLOCKED',
      'This card has been blocked by store staff. Please visit cafeteria desk.',
    );
  }

  const activeSession = card.sessions[0] || null;

  if (!activeSession) {
    return sendError(
      res,
      404,
      'SESSION_NOT_FOUND',
      'No active card session found. Please request cafeteria staff to issue a session.',
    );
  }

  return sendSuccess(res, {
    sessionToken: activeSession.sessionToken,
    cardDisplayNumber: card.physicalCardNumber || 'UNASSIGNED',
    sessionStatus: activeSession.status,
    currentBalance: activeSession.balance,
    cardStatus: card.status,
    organizationName: card.organization.name,
    organizationLogo: card.organization.logoUrl,
    branchName: activeSession.branch.name,
    issuedAt: activeSession.issuedAt,
  });
}

export async function getPublicSessionBalance(req: Request, res: Response) {
  const { sessionToken } = req.params;

  const session = await prisma.cardSession.findUnique({
    where: { sessionToken },
    include: {
      organization: { select: { name: true, logoUrl: true } },
      branch: { select: { name: true } },
      card: { select: { physicalCardNumber: true, status: true } },
    },
  });

  if (!session) {
    return sendError(res, 404, 'NOT_FOUND', 'Session not found');
  }

  return sendSuccess(res, {
    sessionId: session.id,
    sessionToken: session.sessionToken,
    cardDisplayNumber: session.card?.physicalCardNumber || 'UNASSIGNED',
    sessionStatus: session.status,
    currentBalance: session.balance,
    balance: session.balance,
    status: session.status,
    branchDisplayName: session.branch.name,
    branchName: session.branch.name,
    organizationName: session.organization.name,
    startedAt: session.issuedAt,
    issuedAt: session.issuedAt,
    settledAt: session.settledAt,
    refundAmount: session.refundAmount,
    settlementStatus: session.status === 'SETTLED' ? 'SETTLED_REFUNDED' : 'ACTIVE_IN_USE',
  });
}

export async function getPublicSessionTransactions(req: Request, res: Response) {
  const { sessionToken } = req.params;

  const session = await prisma.cardSession.findUnique({
    where: { sessionToken },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!session) {
    return sendError(res, 404, 'NOT_FOUND', 'Session not found');
  }

  const formatted = session.transactions.map((tx) => ({
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    balanceAfter: tx.balanceAfter,
    paymentMethod: tx.paymentMethod,
    items: tx.items,
    createdAt: tx.createdAt,
    timestamp: tx.createdAt,
    status: 'SUCCESS',
  }));

  return sendSuccess(res, formatted);
}

export async function getPublicSessionReceipts(req: Request, res: Response) {
  const { sessionToken } = req.params;

  const session = await prisma.cardSession.findUnique({
    where: { sessionToken },
    include: {
      transactions: {
        where: { type: 'PURCHASE' },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!session) {
    return sendError(res, 404, 'NOT_FOUND', 'Session not found');
  }

  const receipts = session.transactions.map((tx) => {
    let items: any[] = [];
    if (Array.isArray(tx.items)) {
      items = tx.items;
    } else if (typeof tx.items === 'string') {
      try {
        items = JSON.parse(tx.items);
      } catch {
        items = [];
      }
    }

    return {
      receiptId: `rcpt_${tx.id.substring(0, 8)}`,
      sessionId: session.id,
      date: tx.createdAt,
      totalAmount: tx.amount,
      paymentMethod: tx.paymentMethod || 'SMART_CARD',
      items: items.map((i: any) => ({
        itemName: i.name || i.itemName || 'Item',
        quantity: i.quantity || 1,
        unitPrice: i.price || i.unitPrice || 0,
        totalPrice: (i.quantity || 1) * (i.price || i.unitPrice || 0),
      })),
    };
  });

  return sendSuccess(res, receipts);
}
