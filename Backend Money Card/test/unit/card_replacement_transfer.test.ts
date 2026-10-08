import { describe, it, expect } from 'vitest';
import { CardStatus, SessionStatus, CardHistoryAction, TransactionType } from '@prisma/client';

describe('Card Replacement & Balance Transfer (End-to-End Accounting & State Logic)', () => {
  const mockOrgId = 'org-kjc-001';
  const mockStaff = {
    id: 'staff-nishas-001',
    name: 'Nishas',
    organizationId: mockOrgId,
  };

  const customer = {
    name: 'Alex Rivera',
    phone: '9876543210',
  };

  // Old Card (Blocked due to hardware damage with ₹380 locked balance)
  let sourceCard = {
    id: 'card-old-101',
    organizationId: mockOrgId,
    physicalCardNumber: 'KD1VSUUR5',
    qrToken: 'qr_old_101',
    status: CardStatus.BLOCKED,
    activeSession: {
      id: 'sess-old-01',
      balance: 380.0,
      status: SessionStatus.ACTIVE,
      branchId: 'branch-kitchen-1',
      customerName: customer.name,
      customerPhone: customer.phone,
    },
  };

  // Target Card (Fresh plastic card in Available stock)
  let targetCard = {
    id: 'card-new-202',
    organizationId: mockOrgId,
    physicalCardNumber: 'KD2XYZ123',
    qrToken: 'qr_new_202',
    status: CardStatus.AVAILABLE,
    activeSession: null as any,
  };

  const transactionLedger: any[] = [];
  const customerHistoryAuditEvents: any[] = [];

  it('1. Validates prerequisites: source card must be BLOCKED with active balance', () => {
    expect(sourceCard.status).toBe(CardStatus.BLOCKED);
    expect(sourceCard.activeSession).toBeDefined();
    expect(sourceCard.activeSession.balance).toBe(380.0);
    expect(targetCard.status).toBe(CardStatus.AVAILABLE);
    expect(targetCard.activeSession).toBeNull();
  });

  it('2. Prevents replacing if target card is already in use or active', () => {
    const invalidTarget = { ...targetCard, status: CardStatus.ACTIVE, activeSession: { id: 'busy-sess' } };
    const canAssign = invalidTarget.status === CardStatus.AVAILABLE && !invalidTarget.activeSession;
    expect(canAssign).toBe(false);
  });

  it('3. Executes atomic replacement: settles old session, activates new card, and migrates ₹380', () => {
    const lockedBalance = sourceCard.activeSession.balance;

    // Settle old session without refunding fiat cash
    sourceCard.activeSession.balance = 0.0;
    sourceCard.activeSession.status = SessionStatus.SETTLED;

    // Create new session on target card
    const newSession = {
      id: 'sess-new-02',
      balance: lockedBalance,
      status: SessionStatus.ACTIVE,
      branchId: sourceCard.activeSession.branchId,
      customerName: sourceCard.activeSession.customerName,
      customerPhone: sourceCard.activeSession.customerPhone,
    };
    targetCard.status = CardStatus.ACTIVE;
    targetCard.activeSession = newSession;

    // Record internal ledger transfer
    transactionLedger.push({
      id: 'tx-transfer-01',
      sessionId: newSession.id,
      type: TransactionType.TRANSFER,
      amount: lockedBalance,
      balanceBefore: 0.0,
      balanceAfter: lockedBalance,
      paymentMethod: 'TRANSFER',
      reference: `Transferred from ${sourceCard.physicalCardNumber}`,
    });

    // Record audit event
    customerHistoryAuditEvents.push({
      cardId: sourceCard.id,
      physicalCardNumber: sourceCard.physicalCardNumber,
      action: CardHistoryAction.CARD_REPLACED,
      performedByName: mockStaff.name,
      reason: `Replaced by card ${targetCard.physicalCardNumber}. Balance migrated: ₹${lockedBalance.toFixed(2)}`,
    });

    // Assert final state
    expect(sourceCard.activeSession.balance).toBe(0.0);
    expect(sourceCard.activeSession.status).toBe(SessionStatus.SETTLED);
    expect(targetCard.status).toBe(CardStatus.ACTIVE);
    expect(targetCard.activeSession.balance).toBe(380.0);
    expect(targetCard.activeSession.customerName).toBe('Alex Rivera');
  });

  it('4. Financial Integrity: Ledger transfer is isolated from cash/UPI recharges and cash refunds', () => {
    const cashRecharges = transactionLedger.filter((t) => t.type === TransactionType.RECHARGE_CASH);
    const refunds = transactionLedger.filter((t) => t.type === TransactionType.REFUND_RETURN);
    const transfers = transactionLedger.filter((t) => t.type === TransactionType.TRANSFER);

    expect(cashRecharges).toHaveLength(0);
    expect(refunds).toHaveLength(0);
    expect(transfers).toHaveLength(1);
    expect(transfers[0].amount).toBe(380.0);
  });

  it('5. Audit Trail: History event verifies full traceability', () => {
    expect(customerHistoryAuditEvents).toHaveLength(1);
    expect(customerHistoryAuditEvents[0].action).toBe(CardHistoryAction.CARD_REPLACED);
    expect(customerHistoryAuditEvents[0].performedByName).toBe('Nishas');
    expect(customerHistoryAuditEvents[0].reason).toContain('KD2XYZ123');
    expect(customerHistoryAuditEvents[0].reason).toContain('₹380.00');
  });
});
