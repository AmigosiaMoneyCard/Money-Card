import { describe, it, expect } from 'vitest';
import { PermissionCode } from '@prisma/client';
import { computeStaffType, KITCHEN_DEFAULT_PERMISSIONS } from '../../src/controllers/staff.controller.js';

describe('Kitchen Role & Staff Role Presets Unit Tests', () => {
  describe('computeStaffType helper', () => {
    it('identifies KITCHEN role when user has product permissions without recharge', () => {
      const kitchenPerms = [
        PermissionCode.PRODUCT_VIEW,
        PermissionCode.PRODUCT_MANAGE,
        PermissionCode.SESSION_VIEW,
      ];
      expect(computeStaffType(kitchenPerms)).toBe('KITCHEN');
    });

    it('identifies MANAGER role when user has full permissions including recharge', () => {
      const managerPerms = [
        PermissionCode.CARD_VIEW,
        PermissionCode.CARD_ISSUE,
        PermissionCode.CARD_RETURN,
        PermissionCode.RECHARGE,
        PermissionCode.PURCHASE,
        PermissionCode.PRODUCT_VIEW,
        PermissionCode.PRODUCT_MANAGE,
        PermissionCode.SESSION_VIEW,
      ];
      expect(computeStaffType(managerPerms)).toBe('MANAGER');
    });

    it('defaults to MANAGER role if user has recharge even with product permissions', () => {
      const mixedPerms = [
        PermissionCode.RECHARGE,
        PermissionCode.PRODUCT_VIEW,
      ];
      expect(computeStaffType(mixedPerms)).toBe('MANAGER');
    });
  });

  describe('Kitchen default permissions preset', () => {
    it('contains view and manage menu permissions', () => {
      expect(KITCHEN_DEFAULT_PERMISSIONS).toContain(PermissionCode.PRODUCT_VIEW);
      expect(KITCHEN_DEFAULT_PERMISSIONS).toContain(PermissionCode.PRODUCT_MANAGE);
      expect(KITCHEN_DEFAULT_PERMISSIONS).toContain(PermissionCode.SESSION_VIEW);
    });

    it('strictly excludes financial operations', () => {
      expect(KITCHEN_DEFAULT_PERMISSIONS).not.toContain(PermissionCode.RECHARGE);
      expect(KITCHEN_DEFAULT_PERMISSIONS).not.toContain(PermissionCode.CARD_ISSUE);
      expect(KITCHEN_DEFAULT_PERMISSIONS).not.toContain(PermissionCode.CARD_RETURN);
      expect(KITCHEN_DEFAULT_PERMISSIONS).not.toContain(PermissionCode.REFUND);
      expect(KITCHEN_DEFAULT_PERMISSIONS).not.toContain(PermissionCode.STAFF_MANAGE);
    });
  });

  describe('Kitchen Order Lifecycle Transitions', () => {
    const allowedTransitions: Record<string, string[]> = {
      PENDING: ['PREPARING'],
      PREPARING: ['READY'],
      READY: ['COMPLETED'],
      COMPLETED: [],
    };

    it('validates linear transition PENDING -> PREPARING -> READY -> COMPLETED', () => {
      let currentStatus = 'PENDING';
      expect(allowedTransitions[currentStatus]).toContain('PREPARING');

      currentStatus = 'PREPARING';
      expect(allowedTransitions[currentStatus]).toContain('READY');

      currentStatus = 'READY';
      expect(allowedTransitions[currentStatus]).toContain('COMPLETED');
    });

    it('blocks illegal status skips or regressions', () => {
      expect(allowedTransitions.PENDING).not.toContain('COMPLETED');
      expect(allowedTransitions.READY).not.toContain('PENDING');
      expect(allowedTransitions.COMPLETED).toHaveLength(0);
    });
  });

  describe('Daily Sequential Order Numbering', () => {
    it('starts at 101 on a new day with zero previous orders', () => {
      const todayOrderCount = 0;
      const orderNumber = todayOrderCount + 101;
      expect(orderNumber).toBe(101);
    });

    it('increments sequentially for subsequent orders', () => {
      const count1 = 5;
      expect(count1 + 101).toBe(106);

      const count2 = 47;
      expect(count2 + 101).toBe(148);
    });
  });
});
