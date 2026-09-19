import { describe, it, expect } from 'vitest';
import {
  validateCounterName,
  validateMobileNumber,
  validatePassword,
} from '../features/branches/BranchesPage';

describe('Counter Management Strict Validation Tests', () => {
  describe('Counter Name Validation', () => {
    it('should reject empty or whitespace-only names', () => {
      expect(validateCounterName('')).toBe('Counter name is required');
      expect(validateCounterName('   ')).toBe('Counter name is required');
    });

    it('should reject names shorter than 2 characters or longer than 20 characters', () => {
      expect(validateCounterName('A')).toBe('Counter name must be between 2 and 20 characters');
      expect(validateCounterName('A'.repeat(21))).toBe(
        'Counter name must be between 2 and 20 characters',
      );
    });

    it('should reject names with disallowed special characters', () => {
      expect(validateCounterName('Counter #1')).toBe(
        'Counter name can only contain letters, numbers, spaces, hyphens, and &',
      );
      expect(validateCounterName('Juice <Bar>')).toBe(
        'Counter name can only contain letters, numbers, spaces, hyphens, and &',
      );
    });

    it('should accept valid counter names with letters, numbers, spaces, hyphens, and &', () => {
      expect(validateCounterName('Juice Bar')).toBeNull();
      expect(validateCounterName('South Indian - 1')).toBeNull();
      expect(validateCounterName('Bakes & Cakes')).toBeNull();
      expect(validateCounterName('Counter 02')).toBeNull();
    });
  });

  describe('Mobile Number Validation', () => {
    it('should reject empty or whitespace mobile numbers', () => {
      expect(validateMobileNumber('')).toBe('Mobile number is required');
      expect(validateMobileNumber('   ')).toBe('Mobile number is required');
    });

    it('should reject numbers not equal to 10 digits', () => {
      expect(validateMobileNumber('987654321')).toBe('Mobile number must be exactly 10 digits');
      expect(validateMobileNumber('98765432100')).toBe('Mobile number must be exactly 10 digits');
    });

    it('should reject numbers not starting with 6, 7, 8, or 9', () => {
      expect(validateMobileNumber('1234567890')).toBe(
        'Mobile number must start with 6, 7, 8, or 9',
      );
      expect(validateMobileNumber('5555555555')).toBe(
        'Mobile number must start with 6, 7, 8, or 9',
      );
      expect(validateMobileNumber('0987654321')).toBe(
        'Mobile number must start with 6, 7, 8, or 9',
      );
    });

    it('should accept valid 10-digit Indian mobile numbers starting with 6, 7, 8, 9', () => {
      expect(validateMobileNumber('9876543210')).toBeNull();
      expect(validateMobileNumber('8123456789')).toBeNull();
      expect(validateMobileNumber('7012345678')).toBeNull();
      expect(validateMobileNumber('6987654321')).toBeNull();
    });

    it('should strip non-digits and validate the clean 10-digit number', () => {
      expect(validateMobileNumber('+91 98765-43210')).toBeNull();
    });
  });

  describe('Password Validation', () => {
    it('should allow empty password when not required (editing flow to retain current)', () => {
      expect(validatePassword('', false)).toBeNull();
    });

    it('should require password when isRequired is true (creation flow)', () => {
      expect(validatePassword('', true)).toBe('Password is required');
    });

    it('should reject passwords shorter than 6 characters', () => {
      expect(validatePassword('12345', false)).toBe(
        'Password must be between 6 and 30 characters',
      );
      expect(validatePassword('abc', true)).toBe(
        'Password must be between 6 and 30 characters',
      );
    });

    it('should reject passwords longer than 30 characters', () => {
      expect(validatePassword('A'.repeat(31), false)).toBe(
        'Password must be between 6 and 30 characters',
      );
    });

    it('should accept valid passwords between 6 and 30 characters', () => {
      expect(validatePassword('secret123', false)).toBeNull();
      expect(validatePassword('Strong#Pass1!', true)).toBeNull();
    });
  });
});
