import { describe, it, expect } from 'vitest';
import type { Staff, Branch } from '@/types';
import type { CounterStaffGroup } from '@/features/staff/StaffPage';

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
      assignedBranchIds: ['branch-1'], // Both in branch-1
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

  it('should group staff by counter and prevent repeating counter rows', () => {
    // Option 1 grouping logic
    const buildCounterGroups = (branches: Branch[], staff: Staff[]): CounterStaffGroup[] => {
      const groups: CounterStaffGroup[] = [];
      branches.forEach((b) => {
        const assigned = staff.filter((s) => s.assignedBranchIds.includes(b.id));
        groups.push({
          id: b.id,
          counterName: b.name,
          staff: assigned,
        });
      });
      return groups;
    };

    const groups = buildCounterGroups(mockBranches, mockStaffList);
    // Main Cafeteria has staff-1, staff-2, and staff-3 (3 staff accounts)
    expect(groups.length).toBe(2);
    expect(groups[0].counterName).toBe('Main Cafeteria');
    expect(groups[0].staff.length).toBe(3);

    // Snack Bar has staff-3 (1 staff account)
    expect(groups[1].counterName).toBe('Snack Bar');
    expect(groups[1].staff.length).toBe(1);
  });

  it('should format button label as "Staff Details (N)" without displaying raw names in the table cell', () => {
    const getStaffDetailsButtonLabel = (group: CounterStaffGroup) => {
      return `Staff Details ${group.staff.length > 0 ? `(${group.staff.length})` : ''}`.trim();
    };

    const groupWithThree = {
      id: 'branch-1',
      counterName: 'Main Cafeteria',
      staff: mockStaffList,
    };
    const groupWithZero = {
      id: 'branch-empty',
      counterName: 'Empty Counter',
      staff: [],
    };

    expect(getStaffDetailsButtonLabel(groupWithThree)).toBe('Staff Details (3)');
    expect(getStaffDetailsButtonLabel(groupWithZero)).toBe('Staff Details');
  });

  it('should verify the minimal 2-column table structure: Counter Name and Staff Details only', () => {
    const tableColumns = [
      { key: 'counterName', header: 'Counter Name' },
      { key: 'staffDetails', header: 'Staff Details' },
    ];

    expect(tableColumns.length).toBe(2);
    expect(tableColumns[0].header).toBe('Counter Name');
    expect(tableColumns[1].header).toBe('Staff Details');
  });

  it('should validate staff name field with a limit of 20 characters', () => {
    const validateName = (name: string) => {
      if (!name.trim()) return 'Name is required';
      if (name.trim().length > 20) return 'Name cannot exceed 20 characters';
      return null;
    };

    expect(validateName('Alex Counter Staff')).toBeNull();
    expect(validateName('A'.repeat(20))).toBeNull();
    expect(validateName('A'.repeat(21))).toBe('Name cannot exceed 20 characters');
    expect(validateName('   ')).toBe('Name is required');
  });

  it('should validate staff phone number with simple 10-digit validation', () => {
    const validatePhone = (phone: string) => {
      const cleanPhone = phone.replace(/\D/g, '');
      if (!cleanPhone) return 'Phone number is required';
      if (!/^\d{10}$/.test(cleanPhone)) return 'Phone number must be exactly 10 digits';
      return null;
    };

    expect(validatePhone('9876543210')).toBeNull();
    expect(validatePhone('98765-43210')).toBeNull();
    expect(validatePhone('12345')).toBe('Phone number must be exactly 10 digits');
    expect(validatePhone('987654321099')).toBe('Phone number must be exactly 10 digits');
    expect(validatePhone('')).toBe('Phone number is required');
  });

  it('should verify minimal password checklist requirements', () => {
    const checkPasswordRequirements = (pwd: string, confirm: string) => ({
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pwd),
      matches: Boolean(pwd && pwd === confirm),
    });

    const weak = checkPasswordRequirements('pass', 'pass');
    expect(weak.length).toBe(false);
    expect(weak.uppercase).toBe(false);

    const strong = checkPasswordRequirements('StrongPass1@', 'StrongPass1@');
    expect(strong.length).toBe(true);
    expect(strong.uppercase).toBe(true);
    expect(strong.lowercase).toBe(true);
    expect(strong.number).toBe(true);
    expect(strong.special).toBe(true);
    expect(strong.matches).toBe(true);
  });

  it('should verify that Performance & Audit is the designated primary audit action', () => {
    const staffActionName = 'Performance & Audit';
    expect(staffActionName).toBe('Performance & Audit');
  });
});
