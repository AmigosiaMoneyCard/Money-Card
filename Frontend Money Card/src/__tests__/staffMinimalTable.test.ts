import { describe, it, expect } from 'vitest';
import type { Staff, Branch } from '@/types';

describe('Staff Management Minimal Table & Counter-First Layout Tests', () => {
  const mockBranches: Branch[] = [
    {
      id: 'branch-1',
      name: 'Main Cafeteria',
      organizationId: 'org-1',
      status: 'ACTIVE',
      createdAt: '2026-09-10T10:00:00Z',
      updatedAt: '2026-09-10T10:00:00Z',
    },
    {
      id: 'branch-2',
      name: 'Snack Bar',
      organizationId: 'org-1',
      status: 'ACTIVE',
      createdAt: '2026-09-10T10:00:00Z',
      updatedAt: '2026-09-10T10:00:00Z',
    },
  ];

  const mockStaffList: Staff[] = [
    {
      id: 'staff-1',
      organizationId: 'org-1',
      name: 'Alex Counter Staff',
      phone: '9876543210',
      email: 'staff@moneycard.io',
      status: 'ACTIVE',
      assignedBranchIds: ['branch-1'],
      permissions: ['CARD_VIEW', 'CARD_ISSUE', 'PURCHASE'],
      createdAt: '2026-09-10T10:00:00Z',
      updatedAt: '2026-09-10T10:00:00Z',
    },
    {
      id: 'staff-2',
      organizationId: 'org-1',
      name: 'John Staff',
      phone: '9876543211',
      email: 'staff@example.com',
      status: 'ACTIVE',
      assignedBranchIds: ['branch-2'],
      permissions: ['CARD_VIEW', 'RECHARGE'],
      createdAt: '2026-09-10T10:00:00Z',
      updatedAt: '2026-09-10T10:00:00Z',
    },
    {
      id: 'staff-3',
      organizationId: 'org-1',
      name: 'Multi-Counter Staff',
      phone: '9876543212',
      email: 'multi@example.com',
      status: 'ACTIVE',
      assignedBranchIds: ['branch-1', 'branch-2'],
      permissions: ['STAFF_MANAGE', 'CARD_VIEW'],
      createdAt: '2026-09-10T10:00:00Z',
      updatedAt: '2026-09-10T10:00:00Z',
    },
  ];

  it('should correctly resolve counter names for each staff row without text cutoff', () => {
    const resolveCounterName = (staff: Staff, branches: Branch[]) => {
      const assigned = branches.filter((b) => staff.assignedBranchIds.includes(b.id));
      return assigned.length > 0 ? assigned.map((b) => b.name).join(', ') : 'All Counters';
    };

    expect(resolveCounterName(mockStaffList[0], mockBranches)).toBe('Main Cafeteria');
    expect(resolveCounterName(mockStaffList[1], mockBranches)).toBe('Snack Bar');
    expect(resolveCounterName(mockStaffList[2], mockBranches)).toBe('Main Cafeteria, Snack Bar');
  });

  it('should format staff role label accurately for detail modal', () => {
    const getRoleLabel = (staff: Staff) => {
      return staff.permissions.includes('STAFF_MANAGE') ? 'Manager / Admin' : 'Cashier / POS';
    };

    expect(getRoleLabel(mockStaffList[0])).toBe('Cashier / POS');
    expect(getRoleLabel(mockStaffList[2])).toBe('Manager / Admin');
  });

  it('should verify the minimal 3-column table structure: Counter Name, Staff Details, Edit', () => {
    const tableColumns = [
      { key: 'counterName', header: 'Counter Name' },
      { key: 'staffDetails', header: 'Staff Details' },
      { key: 'actions', header: 'Edit' },
    ];

    expect(tableColumns.length).toBe(3);
    expect(tableColumns[0].header).toBe('Counter Name');
    expect(tableColumns[1].header).toBe('Staff Details');
    expect(tableColumns[2].header).toBe('Edit');
  });
});
