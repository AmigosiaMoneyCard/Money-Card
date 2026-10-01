import { describe, it, expect, beforeEach } from 'vitest';
import { mockAuthHandlers } from '@/services/mock/handlers/auth';
import { mockStore } from '@/services/mock/store';

describe('Auth Error Messages: Role-Specific Non-Existent Accounts and Password Mismatch', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  describe('Counter Dashboard Portal', () => {
    it("should return \"Counter doesn't exist.\" when phone number is not found", async () => {
      const res = await mockAuthHandlers.login({
        phone: '9999999999',
        password: 'password',
        portal: 'COUNTER',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toBe("Counter doesn't exist.");
      }
    });

    it("should return \"Counter doesn't exist.\" when user exists but is not STAFF role", async () => {
      // usr_orgadmin is role ORG_ADMIN
      const res = await mockAuthHandlers.login({
        phone: '9876543299',
        password: 'password',
        portal: 'COUNTER',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toBe("Counter doesn't exist.");
      }
    });

    it('should return "Credentials are wrong." when counter account exists but password mismatches', async () => {
      // usr_staff_eros has phone 9876543212 and password 'password'
      const res = await mockAuthHandlers.login({
        phone: '9876543212',
        password: 'wrong_password',
        portal: 'COUNTER',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toBe('Credentials are wrong.');
      }
    });

    it('should successfully log into Counter Dashboard when credentials match', async () => {
      const res = await mockAuthHandlers.login({
        phone: '9876543212',
        password: 'password',
        portal: 'COUNTER',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.user.role).toBe('STAFF');
      }
    });
  });

  describe('Org Admin Portal', () => {
    it("should return \"Org Admin doesn't exist.\" when phone/email is not found", async () => {
      const res = await mockAuthHandlers.login({
        email: 'unknown@example.com',
        password: 'password',
        portal: 'ORG_ADMIN',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toBe("Org Admin doesn't exist.");
      }
    });

    it("should return \"Org Admin doesn't exist.\" when user exists but is STAFF role", async () => {
      // usr_staff_eros is role STAFF
      const res = await mockAuthHandlers.login({
        phone: '9876543212',
        password: 'password',
        portal: 'ORG_ADMIN',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toBe("Org Admin doesn't exist.");
      }
    });

    it('should return "Credentials are wrong." when Org Admin exists but password mismatches', async () => {
      // usr_orgadmin has email admin@maincafe.com and password 'password'
      const res = await mockAuthHandlers.login({
        email: 'admin@maincafe.com',
        password: 'incorrect_pass',
        portal: 'ORG_ADMIN',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toBe('Credentials are wrong.');
      }
    });

    it('should successfully log into Org Admin Dashboard when credentials match', async () => {
      const res = await mockAuthHandlers.login({
        email: 'admin@maincafe.com',
        password: 'password',
        portal: 'ORG_ADMIN',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.user.role).toBe('ORG_ADMIN');
      }
    });
  });

  describe('Single Unified Login (No Portal Switcher)', () => {
    it('should allow Super Admin to log in directly', async () => {
      const res = await mockAuthHandlers.login({
        email: 'amigosiamoneycard@gmail.com',
        password: 'password',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.user.role).toBe('SUPER_ADMIN');
      }
    });

    it('should allow Org Admin to log in directly', async () => {
      const res = await mockAuthHandlers.login({
        email: 'admin@maincafe.com',
        password: 'password',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.user.role).toBe('ORG_ADMIN');
      }
    });

    it('should allow Counter Staff / Manager to log in directly with phone', async () => {
      const res = await mockAuthHandlers.login({
        phone: '9876543212',
        password: 'password',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.user.role).toBe('STAFF');
      }
    });

    it('should return "Invalid credentials" on non-existent account with single login', async () => {
      const res = await mockAuthHandlers.login({
        email: 'unknown@example.com',
        password: 'password',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toBe('Invalid credentials');
      }
    });
  });
});

