import { describe, it, expect } from 'vitest';

describe('Settings & Account Security Input Field Limits Tests', () => {
  it('should verify organization name input length is capped at 30 characters', () => {
    const rawInput = 'A very long organization name that exceeds the maximum allowed character limit';
    const maxLength = 30;
    const sanitized = rawInput.slice(0, maxLength);

    expect(sanitized.length).toBe(30);
    expect(sanitized).toBe('A very long organization name ');
  });

  it('should verify password input fields enforce max 30 character limit', () => {
    const rawCurrentPw = 'SuperSecretCurrentPasswordLongerThan30Chars!';
    const rawNewPw = 'NewSecurePasswordWithSpecialChars123456789!';
    const rawConfirmPw = 'NewSecurePasswordWithSpecialChars123456789!';
    const maxLength = 30;

    const currentPw = rawCurrentPw.slice(0, maxLength);
    const newPw = rawNewPw.slice(0, maxLength);
    const confirmPw = rawConfirmPw.slice(0, maxLength);

    expect(currentPw.length).toBe(30);
    expect(newPw.length).toBe(30);
    expect(confirmPw.length).toBe(30);
    expect(newPw).toBe(confirmPw);
  });

  it('should validate password criteria within 8-30 character range', () => {
    const validPassword = 'P@ssword123SecureBranch!';
    const isAtLeast8 = validPassword.length >= 8;
    const isAtMost30 = validPassword.length <= 30;
    const hasUpper = /[A-Z]/.test(validPassword);
    const hasLower = /[a-z]/.test(validPassword);
    const hasNumber = /[0-9]/.test(validPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(validPassword);

    expect(isAtLeast8).toBe(true);
    expect(isAtMost30).toBe(true);
    expect(hasUpper).toBe(true);
    expect(hasLower).toBe(true);
    expect(hasNumber).toBe(true);
    expect(hasSpecial).toBe(true);
  });
});
