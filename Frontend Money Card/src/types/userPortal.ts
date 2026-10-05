// ─── User Portal Public Response Requirements (M0 Section 35) ──
import type { SessionStatus, TransactionType, TransactionStatus } from './card';

export interface PublicSessionDetail {
  sessionId: string;
  cardDisplayNumber: string; // e.g. MC-001 (Human readable card display number, NOT raw QR token)
  sessionStatus: SessionStatus;
  currentBalance: number;
  branchDisplayName: string;
  customerName?: string | null;
  customerPhone?: string | null;
  startedAt: string;
  settledAt?: string | null;
  settlementStatus: string;
}

export interface PublicTransactionItem {
  itemId?: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PublicTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  timestamp: string;
  paymentMethod?: string;
  externalReference?: string;
  items?: PublicTransactionItem[];
}

export interface PublicReceipt {
  receiptId: string;
  sessionId: string;
  date: string;
  totalAmount: number;
  paymentMethod?: string;
  items: PublicTransactionItem[];
}

export interface PublicSessionOrderItem {
  itemName: string;
  quantity: number;
  unitPrice: number;
}

export interface PublicSessionOrder {
  id: string;
  orderNumber: number;
  orderStatus: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED';
  orderedAt: string;
  preparingAt?: string | null;
  readyAt?: string | null;
  completedAt?: string | null;
  items: PublicSessionOrderItem[];
  counterName: string;
  amount: number;
}

export interface PublicMenuItem {
  id: string;
  name: string;
  price: number;
  categories: string[];
  isVeg: boolean;
  status: string;
}
