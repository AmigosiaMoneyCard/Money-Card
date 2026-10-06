import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { balanceStreamService } from '../services/balanceStream.service.js';
import { ProductStatus } from '@prisma/client';

export async function resolvePublicQrToken(req: Request, res: Response) {
  let { qrToken } = req.body;
  if (!qrToken || !qrToken.trim()) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'qrToken is required');
  }

  const cleaned = qrToken.trim();
  const token = cleaned.includes('/c/') ? cleaned.split('/c/')[1].split('?')[0].split('#')[0] : cleaned;

  const card = await prisma.card.findFirst({
    where: {
      OR: [
        { qrToken: token },
        { qrToken: { equals: token, mode: 'insensitive' } },
        { physicalCardNumber: { equals: token, mode: 'insensitive' } },
      ],
    },
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
    customerName: activeSession.customerName || null,
    customerPhone: activeSession.customerPhone || null,
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
    customerName: session.customerName || null,
    customerPhone: session.customerPhone || null,
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

  const formatted = session.transactions.map((tx) => {
    let rawMeta = tx.items as any;
    if (typeof rawMeta === 'string') {
      try {
        rawMeta = JSON.parse(rawMeta);
      } catch {
        rawMeta = {};
      }
    }
    const isCancelled = Boolean(rawMeta?.isCancelled);

    return {
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      balanceAfter: tx.balanceAfter,
      paymentMethod: tx.paymentMethod,
      items: tx.items,
      createdAt: tx.createdAt,
      timestamp: tx.createdAt,
      status: isCancelled ? 'CANCELLED' : 'SUCCESS',
    };
  });

  return sendSuccess(res, formatted);
}

export async function getPublicSessionReceipts(req: Request, res: Response) {
  const { sessionToken } = req.params;

  const session = await prisma.cardSession.findUnique({
    where: { sessionToken },
    include: {
      branch: { select: { name: true } },
      transactions: {
        where: { type: 'PURCHASE' },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!session) {
    return sendError(res, 404, 'NOT_FOUND', 'Session not found');
  }

  const receipts = session.transactions
    .map((tx) => {
      let rawMeta = tx.items as any;
      if (typeof rawMeta === 'string') {
        try {
          rawMeta = JSON.parse(rawMeta);
        } catch {
          rawMeta = {};
        }
      }

      const isCancelled = Boolean(rawMeta?.isCancelled);
      if (isCancelled) return null;

      let items: any[] = [];
      if (Array.isArray(rawMeta)) {
        items = rawMeta;
      } else if (rawMeta && Array.isArray(rawMeta.items)) {
        items = rawMeta.items;
      }

      const mappedItems = items.map((i: any) => ({
        itemName: i.itemName || i.name || 'Food Item',
        quantity: Number(i.quantity) || 1,
        unitPrice: Number(i.unitPrice ?? i.price ?? 0),
        totalPrice: Number(
          i.subtotal ??
            i.totalPrice ??
            (Number(i.quantity || 1) * Number(i.unitPrice ?? i.price ?? 0))
        ),
      }));

      if (mappedItems.length === 0 && tx.amount > 0) {
        mappedItems.push({
          itemName: 'Food Purchase',
          quantity: 1,
          unitPrice: tx.amount,
          totalPrice: tx.amount,
        });
      }

      return {
        receiptId: `rcpt_${tx.id.substring(0, 8)}`,
        sessionId: session.id,
        date: tx.createdAt,
        totalAmount: tx.amount,
        paymentMethod: tx.paymentMethod || 'SMART_CARD',
        orderNumber: rawMeta?.orderNumber || undefined,
        counterName: rawMeta?.counterName || session.branch?.name || undefined,
        items: mappedItems,
      };
    })
    .filter(Boolean);

  return sendSuccess(res, receipts);
}

/**
 * Server-Sent Events (SSE) stream endpoint for real-time customer session balance updates
 * Route: GET /api/v1/public/sessions/:sessionToken/balance-stream
 */
export async function streamPublicSessionBalance(req: Request, res: Response) {
  const { sessionToken } = req.params;

  if (!sessionToken || !sessionToken.trim()) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'sessionToken is required');
  }

  try {
    const session = await prisma.cardSession.findUnique({
      where: { sessionToken: sessionToken.trim() },
      include: {
        card: { select: { physicalCardNumber: true, status: true } },
      },
    });

    if (!session) {
      return sendError(res, 404, 'NOT_FOUND', 'Session not found');
    }

    if (session.card?.status === 'BLOCKED') {
      return sendError(
        res,
        403,
        'CARD_BLOCKED',
        'This card has been blocked by store staff. Please visit cafeteria desk.',
      );
    }

    // Register this response as an SSE client
    balanceStreamService.addClient(session.sessionToken, res, {
      balance: session.balance,
      status: session.status,
      cardDisplayNumber: session.card?.physicalCardNumber || 'UNASSIGNED',
      sessionId: session.id,
    });
  } catch (err: any) {
    return sendError(res, 500, 'INTERNAL_ERROR', err?.message || 'Failed to establish balance stream');
  }
}

export async function getPublicSessionOrders(req: Request, res: Response) {
  const { sessionToken } = req.params;

  const session = await prisma.cardSession.findUnique({
    where: { sessionToken },
    include: {
      branch: { select: { name: true } },
      transactions: {
        where: { type: 'PURCHASE' },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!session) {
    return sendError(res, 404, 'NOT_FOUND', 'Session not found');
  }

  const orders = session.transactions
    .map((tx) => {
      const rawMeta = (tx.items as any) || {};
      const isCancelled = Boolean(rawMeta?.isCancelled);
      if (isCancelled) return null;

      const orderItems = Array.isArray(rawMeta?.items)
        ? rawMeta.items
        : Array.isArray(tx.items)
        ? tx.items
        : [];

      const currentStatus = (rawMeta.orderStatus || 'PENDING').toUpperCase();

      return {
        id: tx.id,
        orderNumber: rawMeta.orderNumber || 101,
        orderStatus: currentStatus,
        orderedAt: rawMeta.orderedAt || tx.createdAt,
        preparingAt: rawMeta.preparingAt || null,
        readyAt: rawMeta.readyAt || null,
        completedAt: rawMeta.completedAt || null,
        items: orderItems.map((i: any) => ({
          itemName: i.name || i.itemName || 'Item',
          quantity: i.quantity || 1,
          unitPrice: i.price || i.unitPrice || 0,
        })),
        counterName: rawMeta.counterName || session.branch.name || 'Counter',
        amount: tx.amount,
      };
    })
    .filter(Boolean);

  return sendSuccess(res, orders);
}

export async function getPublicSessionMenu(req: Request, res: Response) {
  const { sessionToken } = req.params;

  const session = await prisma.cardSession.findUnique({
    where: { sessionToken },
    select: { organizationId: true, branchId: true },
  });

  if (!session) {
    return sendError(res, 404, 'NOT_FOUND', 'Session not found');
  }

  const products = await prisma.product.findMany({
    where: {
      organizationId: session.organizationId,
      status: ProductStatus.ACTIVE,
      OR: [
        { branchId: session.branchId },
        { branchId: null },
      ],
    },
    orderBy: { itemName: 'asc' },
  });

  const menu = products.map((p) => {
    const isVeg = p.category?.some((c: string) => c.toLowerCase().includes('veg') && !c.toLowerCase().includes('non'));
    return {
      id: p.id,
      name: p.itemName,
      price: p.price,
      categories: p.category || [],
      isVeg: Boolean(isVeg),
      status: p.status,
    };
  });

  return sendSuccess(res, menu);
}

