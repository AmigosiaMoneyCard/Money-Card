import { describe, it, expect } from 'vitest';
import {
  createStaffMemberSchema,
  updateStaffMemberSchema,
  loginSchema,
} from '../../src/validation/index.js';
import { FROZEN_M0_PERMISSIONS } from '../../src/controllers/staff.controller.js';

describe('New Requirements: Phone Auth, WhatsApp Sharing & Auto-Register Cards', () => {
  describe('1. Staff Creation Schema (Phone + Password, No Email Required)', () => {
    it('should validate staff with 10-digit phone and password', () => {
      const validStaff = {
        name: 'John Staff',
        phone: '9876543210',
        password: 'StaffPassword123',
      };
      const result = createStaffMemberSchema.parse(validStaff);
      expect(result.name).toBe('John Staff');
      expect(result.phone).toBe('9876543210');
      expect(result.password).toBe('StaffPassword123');
      expect(result.email).toBeUndefined();
    });

    it('should normalize formatted phone numbers (strip dashes, spaces)', () => {
      const formatted = {
        name: 'John Staff',
        phone: '+91 98765-43210',
        password: 'StaffPassword123',
      };
      const result = createStaffMemberSchema.parse(formatted);
      expect(result.phone).toBe('9876543210');
    });

    it('should reject phone numbers with less than 10 digits', () => {
      const invalid = {
        name: 'John Staff',
        phone: '12345',
        password: 'StaffPassword123',
      };
      expect(() => createStaffMemberSchema.parse(invalid)).toThrow(/valid 10-digit phone/);
    });

    it('should reject staff creation without password', () => {
      const missingPassword = {
        name: 'John Staff',
        phone: '9876543210',
      };
      expect(() => createStaffMemberSchema.parse(missingPassword)).toThrow(/Password is required/);
    });

    it('should optionally accept valid email if provided', () => {
      const withEmail = {
        name: 'John Staff',
        phone: '9876543210',
        password: 'StaffPassword123',
        email: 'staff@example.com',
      };
      const result = createStaffMemberSchema.parse(withEmail);
      expect(result.email).toBe('staff@example.com');
    });
  });

  describe('2. Login Schema (Email or Phone + Password)', () => {
    it('should accept login with phone number', () => {
      const payload = {
        phone: '9876543210',
        password: 'StaffPassword123',
      };
      const result = loginSchema.parse(payload);
      expect(result.phone).toBe('9876543210');
    });

    it('should accept login with email', () => {
      const payload = {
        email: 'admin@example.com',
        password: 'AdminPassword123',
      };
      const result = loginSchema.parse(payload);
      expect(result.email).toBe('admin@example.com');
    });
  });

  describe('3. Frozen Permissions (Stock/Inventory Removed)', () => {
    it('should NOT include any INVENTORY_* permissions', () => {
      const codes = FROZEN_M0_PERMISSIONS.map((p) => p.code);
      expect(codes).not.toContain('INVENTORY_VIEW');
      expect(codes).not.toContain('INVENTORY_MANAGE');
      expect(codes).not.toContain('INVENTORY_IMPORT');
    });

    it('should retain essential staff permissions for cards, sessions, and products', () => {
      const codes = FROZEN_M0_PERMISSIONS.map((p) => p.code);
      expect(codes).toContain('CARD_VIEW');
      expect(codes).toContain('CARD_ISSUE');
      expect(codes).toContain('CARD_RETURN');
      expect(codes).toContain('RECHARGE');
      expect(codes).toContain('PURCHASE');
      expect(codes).toContain('PRODUCT_VIEW');
    });
  });

  describe('4. QR Token Extraction & Cross-Tenant Resolution Guard', () => {
    it('should extract token from standard /c/ path with trailing slash', async () => {
      const { extractCleanToken } = await import('../../src/controllers/cards.controller.js');
      expect(extractCleanToken('https://money-card-frontend-staging.vercel.app/c/qtk_abc123/')).toBe('qtk_abc123');
    });

    it('should extract token from ?token= or ?qr= query parameters', async () => {
      const { extractCleanToken } = await import('../../src/controllers/cards.controller.js');
      expect(extractCleanToken('https://moneycard.app/portal?token=qtk_param123')).toBe('qtk_param123');
      expect(extractCleanToken('https://moneycard.app/portal?qr=qtk_qrparam456')).toBe('qtk_qrparam456');
    });

    it('should handle URL encoded characters and mc: prefix', async () => {
      const { extractCleanToken } = await import('../../src/controllers/cards.controller.js');
      expect(extractCleanToken('mc:qtk_prefix999')).toBe('qtk_prefix999');
      expect(extractCleanToken('https%3A%2F%2Fmoney-card.vercel.app%2Fc%2Fqtk_encoded777')).toBe('qtk_encoded777');
    });

    it('should preserve raw card tokens and card numbers without corruption', async () => {
      const { extractCleanToken } = await import('../../src/controllers/cards.controller.js');
      expect(extractCleanToken('  MC-001  ')).toBe('MC-001');
      expect(extractCleanToken('qtk_raw_token_888')).toBe('qtk_raw_token_888');
    });
  });
});
