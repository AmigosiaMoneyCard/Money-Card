import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/config/database.js';
import { returnSession, refundSessionBalance } from '../../src/controllers/sessions.controller.js';
import { CardStatus, CardAssignmentStatus, SessionStatus, TransactionType } from '@prisma/client';

function createMockReqRes({
  sessionId,
  orgId,
  branchIds = [],
  role = 'STAFF',
  userId,
  body = {},
}: {
  sessionId: string;
  orgId: string;
  branchIds?: string[];
  role?: string;
  userId: string;
  body?: any;
}) {
  const req: any = {
    params: { id: sessionId },
    user: {
      id: userId,
      organizationId: orgId,
      role,
      assignedBranchIds: branchIds,
    },
    body,
  };

  const res: any = {
    statusCode: 200,
    payload: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.payload = data;
      return this;
    },
  };

  return { req, res };
}

describe('Session Settlement & Refund Concurrency Protection', () => {
  const testOrgId = 'org-conc-test-' + Date.now();
  let branchAId: string;
  let branchBId: string;
  let testStaffId: string;

  beforeAll(async () => {
    // 1. Create isolated test organization
    await prisma.organization.create({
      data: {
        id: testOrgId,
        name: 'Concurrency Test Organization',
      },
    });

    // 2. Create test staff user (satisfies foreign key constraint for settledByUserId / staffUserId)
    const staff = await prisma.user.create({
      data: {
        organizationId: testOrgId,
        email: `staff-conc-${Date.now()}@test.local`,
        passwordHash: 'testhash123',
        name: 'Concurrency Test Staff',
        role: 'STAFF',
      },
    });
    testStaffId = staff.id;

    // 3. Create test branches
    const branchA = await prisma.branch.create({
      data: {
        organizationId: testOrgId,
        name: 'Kitchen A',
      },
    });
    branchAId = branchA.id;

    const branchB = await prisma.branch.create({
      data: {
        organizationId: testOrgId,
        name: 'Kitchen B',
      },
    });
    branchBId = branchB.id;
  });

  afterAll(async () => {
    // Clean up all data associated with the test organization
    await prisma.transaction.deleteMany({
      where: { session: { organizationId: testOrgId } },
    });
    await prisma.cardSession.deleteMany({
      where: { organizationId: testOrgId },
    });
    await prisma.card.deleteMany({
      where: { organizationId: testOrgId },
    });
    await prisma.user.deleteMany({
      where: { organizationId: testOrgId },
    });
    await prisma.branch.deleteMany({
      where: { organizationId: testOrgId },
    });
    await prisma.organization.deleteMany({
      where: { id: testOrgId },
    });
  });

  it('1. Prevents duplicate refund when two concurrent return requests arrive simultaneously', async () => {
    const card = await prisma.card.create({
      data: {
        organizationId: testOrgId,
        physicalCardNumber: 'TEST-CONC-01',
        qrToken: 'qr-conc-01-' + Date.now(),
        assignmentStatus: CardAssignmentStatus.ASSIGNED,
        status: CardStatus.ACTIVE,
      },
    });

    const session = await prisma.cardSession.create({
      data: {
        organizationId: testOrgId,
        branchId: branchAId,
        cardId: card.id,
        sessionToken: 'token-conc-01-' + Date.now(),
        balance: 500.0,
        status: SessionStatus.ACTIVE,
      },
    });

    const client1 = createMockReqRes({
      sessionId: session.id,
      orgId: testOrgId,
      branchIds: [branchAId],
      userId: testStaffId,
      body: { paymentMethod: 'CASH', skipRefund: false },
    });

    const client2 = createMockReqRes({
      sessionId: session.id,
      orgId: testOrgId,
      branchIds: [branchAId],
      userId: testStaffId,
      body: { paymentMethod: 'CASH', skipRefund: false },
    });

    // Fire both requests simultaneously
    await Promise.all([
      returnSession(client1.req, client1.res),
      returnSession(client2.req, client2.res),
    ]);

    const results = [
      { status: client1.res.statusCode, body: client1.res.payload },
      { status: client2.res.statusCode, body: client2.res.payload },
    ];

    const successes = results.filter((r) => r.status === 200);
    const settledRejections = results.filter(
      (r) => r.status === 400 && r.body?.error?.code === 'ALREADY_SETTLED',
    );

    // Exactly one must succeed, and the other must be rejected with ALREADY_SETTLED
    expect(successes.length).toBe(1);
    expect(settledRejections.length).toBe(1);
    expect(successes[0].body.data.refundAmount).toBe(500.0);
    expect(successes[0].body.data.retainedProfit).toBe(0.0);

    // Verify database state: Exactly ONE REFUND_RETURN transaction recorded
    const txRecords = await prisma.transaction.findMany({
      where: { sessionId: session.id, type: TransactionType.REFUND_RETURN },
    });
    expect(txRecords.length).toBe(1);
    expect(txRecords[0].amount).toBe(500.0);

    // Verify session and card state
    const updatedSession = await prisma.cardSession.findUnique({
      where: { id: session.id },
    });
    expect(updatedSession?.balance).toBe(0.0);
    expect(updatedSession?.status).toBe(SessionStatus.SETTLED);

    const updatedCard = await prisma.card.findUnique({
      where: { id: card.id },
    });
    expect(updatedCard?.status).toBe(CardStatus.AVAILABLE);
  });

  it('2. Prevents duplicate execution on concurrent Retain Profit requests', async () => {
    const card = await prisma.card.create({
      data: {
        organizationId: testOrgId,
        physicalCardNumber: 'TEST-CONC-02',
        qrToken: 'qr-conc-02-' + Date.now(),
        assignmentStatus: CardAssignmentStatus.ASSIGNED,
        status: CardStatus.ACTIVE,
      },
    });

    const session = await prisma.cardSession.create({
      data: {
        organizationId: testOrgId,
        branchId: branchAId,
        cardId: card.id,
        sessionToken: 'token-conc-02-' + Date.now(),
        balance: 1000.0,
        status: SessionStatus.ACTIVE,
      },
    });

    const client1 = createMockReqRes({
      sessionId: session.id,
      orgId: testOrgId,
      branchIds: [branchAId],
      userId: testStaffId,
      body: { skipRefund: true },
    });

    const client2 = createMockReqRes({
      sessionId: session.id,
      orgId: testOrgId,
      branchIds: [branchAId],
      userId: testStaffId,
      body: { skipRefund: true },
    });

    await Promise.all([
      returnSession(client1.req, client1.res),
      returnSession(client2.req, client2.res),
    ]);

    const results = [
      { status: client1.res.statusCode, body: client1.res.payload },
      { status: client2.res.statusCode, body: client2.res.payload },
    ];

    const successes = results.filter((r) => r.status === 200);
    const rejections = results.filter(
      (r) => r.status === 400 && r.body?.error?.code === 'ALREADY_SETTLED',
    );

    expect(successes.length).toBe(1);
    expect(rejections.length).toBe(1);
    expect(successes[0].body.data.retainedProfit).toBe(1000.0);
    expect(successes[0].body.data.refundAmount).toBe(0.0);

    // Verify 0 rows in transactions table because refundAmount == 0
    const txRecords = await prisma.transaction.findMany({
      where: { sessionId: session.id },
    });
    expect(txRecords.length).toBe(0);

    // Verify session retainedProfit in database
    const dbSession = await prisma.cardSession.findUnique({
      where: { id: session.id },
    });
    expect(dbSession?.retainedProfit).toBe(1000.0);
    expect(dbSession?.balance).toBe(0.0);
    expect(dbSession?.status).toBe(SessionStatus.SETTLED);
  });

  it('3. Prevents duplicate balance refunds on concurrent refundSessionBalance requests', async () => {
    const card = await prisma.card.create({
      data: {
        organizationId: testOrgId,
        physicalCardNumber: 'TEST-CONC-03',
        qrToken: 'qr-conc-03-' + Date.now(),
        assignmentStatus: CardAssignmentStatus.ASSIGNED,
        status: CardStatus.ACTIVE,
      },
    });

    const session = await prisma.cardSession.create({
      data: {
        organizationId: testOrgId,
        branchId: branchAId,
        cardId: card.id,
        sessionToken: 'token-conc-03-' + Date.now(),
        balance: 400.0,
        status: SessionStatus.ACTIVE,
      },
    });

    const client1 = createMockReqRes({
      sessionId: session.id,
      orgId: testOrgId,
      branchIds: [branchAId],
      userId: testStaffId,
      body: { paymentMethod: 'UPI' },
    });

    const client2 = createMockReqRes({
      sessionId: session.id,
      orgId: testOrgId,
      branchIds: [branchAId],
      userId: testStaffId,
      body: { paymentMethod: 'UPI' },
    });

    await Promise.all([
      refundSessionBalance(client1.req, client1.res),
      refundSessionBalance(client2.req, client2.res),
    ]);

    const results = [
      { status: client1.res.statusCode, body: client1.res.payload },
      { status: client2.res.statusCode, body: client2.res.payload },
    ];

    const successes = results.filter((r) => r.status === 200);
    const rejections = results.filter(
      (r) => r.status === 400 && r.body?.error?.code === 'ALREADY_REFUNDED',
    );

    expect(successes.length).toBe(1);
    expect(rejections.length).toBe(1);
    expect(successes[0].body.data.refundAmount).toBe(400.0);

    // Verify only ONE refund transaction was created
    const txRecords = await prisma.transaction.findMany({
      where: { sessionId: session.id },
    });
    expect(txRecords.length).toBe(1);
    expect(txRecords[0].amount).toBe(400.0);
    expect(txRecords[0].paymentMethod).toBe('UPI');

    // Balance refunded, but session remains ACTIVE
    const dbSession = await prisma.cardSession.findUnique({
      where: { id: session.id },
    });
    expect(dbSession?.balance).toBe(0.0);
    expect(dbSession?.status).toBe(SessionStatus.ACTIVE);
  });

  it('4. Rejects sequential repeated settlement requests with 400 ALREADY_SETTLED', async () => {
    const card = await prisma.card.create({
      data: {
        organizationId: testOrgId,
        physicalCardNumber: 'TEST-CONC-04',
        qrToken: 'qr-conc-04-' + Date.now(),
        assignmentStatus: CardAssignmentStatus.ASSIGNED,
        status: CardStatus.ACTIVE,
      },
    });

    const session = await prisma.cardSession.create({
      data: {
        organizationId: testOrgId,
        branchId: branchAId,
        cardId: card.id,
        sessionToken: 'token-conc-04-' + Date.now(),
        balance: 250.0,
        status: SessionStatus.ACTIVE,
      },
    });

    const firstClient = createMockReqRes({
      sessionId: session.id,
      orgId: testOrgId,
      branchIds: [branchAId],
      userId: testStaffId,
      body: { paymentMethod: 'CASH' },
    });

    await returnSession(firstClient.req, firstClient.res);
    expect(firstClient.res.statusCode).toBe(200);

    // Immediately attempt sequential replay
    const secondClient = createMockReqRes({
      sessionId: session.id,
      orgId: testOrgId,
      branchIds: [branchAId],
      userId: testStaffId,
      body: { paymentMethod: 'CASH' },
    });

    await returnSession(secondClient.req, secondClient.res);
    expect(secondClient.res.statusCode).toBe(400);
    expect(secondClient.res.payload?.error?.code).toBe('ALREADY_SETTLED');
  });

  it('5. Enforces counter matching guard before transaction execution', async () => {
    const card = await prisma.card.create({
      data: {
        organizationId: testOrgId,
        physicalCardNumber: 'TEST-CONC-05',
        qrToken: 'qr-conc-05-' + Date.now(),
        assignmentStatus: CardAssignmentStatus.ASSIGNED,
        status: CardStatus.ACTIVE,
      },
    });

    const session = await prisma.cardSession.create({
      data: {
        organizationId: testOrgId,
        branchId: branchAId, // Issued at Branch A
        cardId: card.id,
        sessionToken: 'token-conc-05-' + Date.now(),
        balance: 100.0,
        status: SessionStatus.ACTIVE,
      },
    });

    // Staff assigned ONLY to Branch B attempts to return Branch A card
    const mismatchedClient = createMockReqRes({
      sessionId: session.id,
      orgId: testOrgId,
      branchIds: [branchBId], // Different branch
      userId: testStaffId,
      body: { paymentMethod: 'CASH' },
    });

    await returnSession(mismatchedClient.req, mismatchedClient.res);
    expect(mismatchedClient.res.statusCode).toBe(403);
    expect(mismatchedClient.res.payload?.error?.code).toBe('RETURN_COUNTER_MISMATCH');

    // Verify session was NOT modified
    const dbSession = await prisma.cardSession.findUnique({
      where: { id: session.id },
    });
    expect(dbSession?.balance).toBe(100.0);
    expect(dbSession?.status).toBe(SessionStatus.ACTIVE);
  });
});
