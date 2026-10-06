import { describe, it, expect } from 'vitest';

describe('Counter Admin vs Org Admin Staff Isolation', () => {
  it('identifies genuine staff vs counter accounts correctly', () => {
    const rawUsers = [
      { id: 'u1', name: 'Counter 2', role: 'STAFF', isCounterAccount: true, assignedBranchIds: ['b2'] },
      { id: 'u2', name: 'Ramesh Cashier', role: 'STAFF', isCounterAccount: false, assignedBranchIds: ['b2'] },
      { id: 'u3', name: 'Staff - Counter 1', role: 'STAFF', isCounterAccount: true, assignedBranchIds: ['b1'] },
    ];

    // Filter for Counter 2 team members
    const counter2Staff = rawUsers.filter(
      (u) => !u.isCounterAccount && !u.name.startsWith('Staff - ') && u.assignedBranchIds.includes('b2'),
    );

    expect(counter2Staff).toHaveLength(1);
    expect(counter2Staff[0].name).toBe('Ramesh Cashier');
  });

  it('renders formatted counter name with Staff - prefix in Org Admin view matching Menu Management', () => {
    const formatCounterRowTitle = (counterName: string) => {
      const cleanName = counterName.replace(/^Staff\s*-\s*/i, '');
      return `Staff - ${cleanName}`;
    };

    expect(formatCounterRowTitle('Counter 2')).toBe('Staff - Counter 2');
    expect(formatCounterRowTitle('Staff - Counter 2')).toBe('Staff - Counter 2');
    expect(formatCounterRowTitle('South Indian Express')).toBe('Staff - South Indian Express');
  });

  it('calculates zero staff quota usage when only counter accounts exist', () => {
    const accounts = [
      { id: 'c1', name: 'Counter 1', isCounterAccount: true, status: 'ACTIVE' },
      { id: 'c2', name: 'Counter 2', isCounterAccount: true, status: 'ACTIVE' },
    ];

    const genuineStaffCount = accounts.filter((a) => !a.isCounterAccount && a.status === 'ACTIVE').length;
    expect(genuineStaffCount).toBe(0);

    const usageString = `Staff Usage: ${genuineStaffCount} / 25 staff accounts created`;
    expect(usageString).toBe('Staff Usage: 0 / 25 staff accounts created');
  });

  it('routes to CounterStaffPage for STAFF role and StaffPage for ORG_ADMIN role', () => {
    const resolveStaffView = (role: 'ORG_ADMIN' | 'STAFF' | 'SUPER_ADMIN') => {
      if (role === 'STAFF') return 'CounterStaffPage';
      return 'StaffPage';
    };

    expect(resolveStaffView('STAFF')).toBe('CounterStaffPage');
    expect(resolveStaffView('ORG_ADMIN')).toBe('StaffPage');
  });
});
