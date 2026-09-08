import { describe, it, expect } from 'vitest';
import {
  buildCardBlockReason,
  formatBlockedCardMessage,
  countWords,
  validateBlockReasonWordCount,
} from '../utils/cardBlockMessages';

describe('cardBlockMessages business logic', () => {
  describe('formatBlockedCardMessage', () => {
    it('accurately formats user prompt exact string [Blocked by Acme General Manager (Org Admin)] Administrative Block', () => {
      const input = '[Blocked by Acme General Manager (Org Admin)] Administrative Block';
      const output = formatBlockedCardMessage(input);

      expect(output).toBe('Administratively suspended by Acme General Manager (Org Admin).');
    });

    it('accurately formats administrative block with custom remarks/notes', () => {
      const input =
        '[Blocked by Acme General Manager (Org Admin)] Administrative Block: Annual finance audit pending';
      const output = formatBlockedCardMessage(input);

      expect(output).toBe(
        'Administratively suspended by Acme General Manager (Org Admin): Annual finance audit pending',
      );
    });

    it('accurately formats lost or stolen card events into minimal message', () => {
      const input = '[Blocked by Acme General Manager (Org Admin)] Lost or Stolen Card';
      const output = formatBlockedCardMessage(input);

      expect(output).toBe('Reported lost or stolen by Acme General Manager (Org Admin).');
    });

    it('accurately formats lost or stolen card events with notes', () => {
      const input =
        '[Blocked by John Staff (Cashier)] Lost or Stolen Card: Misplaced wallet at cafeteria';
      const output = formatBlockedCardMessage(input);

      expect(output).toBe('Reported lost or stolen by John Staff (Cashier): Misplaced wallet at cafeteria');
    });

    it('accurately formats suspicious activity / fraud', () => {
      const input =
        '[Blocked by Security Officer (Staff)] Suspicious Activity / Fraud: 5 rapid recharge failures';
      const output = formatBlockedCardMessage(input);

      expect(output).toBe(
        'Suspicious activity flagged by Security Officer (Staff): 5 rapid recharge failures',
      );
    });

    it('handles legacy standalone string "Administrative Block" with fallback blocker', () => {
      const output = formatBlockedCardMessage('Administrative Block', 'Acme General Manager');
      expect(output).toBe('Administratively suspended by Acme General Manager.');
    });

    it('handles legacy standalone string "Lost or Stolen Card" with fallback blocker', () => {
      const output = formatBlockedCardMessage('Lost or Stolen Card', 'Acme General Manager');
      expect(output).toBe('Reported lost or stolen by Acme General Manager.');
    });

    it('strips legacy boilerplate if present', () => {
      const legacy1 =
        'Card reported lost or stolen (recorded by Acme General Manager (Org Admin)). Usage immediately halted for balance protection.';
      expect(formatBlockedCardMessage(legacy1)).toBe(
        'Card reported lost or stolen (recorded by Acme General Manager (Org Admin)).',
      );

      const legacy2 =
        'Card administratively suspended by Admin. All cafeteria purchases and recharges are disabled.';
      expect(formatBlockedCardMessage(legacy2)).toBe(
        'Card administratively suspended by Admin.',
      );
    });

    it('handles empty or null string gracefully', () => {
      expect(formatBlockedCardMessage(null)).toBe('Card blocked by administrator.');
      expect(formatBlockedCardMessage('')).toBe('Card blocked by administrator.');
    });
  });

  describe('buildCardBlockReason', () => {
    it('generates minimal business logic message for Lost or Stolen Card without notes (user prompt scenario)', () => {
      const reason = buildCardBlockReason(
        'Lost or Stolen Card',
        '',
        'Acme General Manager',
        'ORG_ADMIN',
      );

      expect(reason).toBe('Reported lost or stolen by Acme General Manager (Org Admin).');
    });

    it('generates minimal business logic message for Lost or Stolen Card with customer notes', () => {
      const reason = buildCardBlockReason(
        'Lost or Stolen Card',
        'Misplaced wallet at cafeteria, reported via phone',
        'Acme General Manager',
        'ORG_ADMIN',
      );

      expect(reason).toBe(
        'Reported lost or stolen by Acme General Manager (Org Admin): Misplaced wallet at cafeteria, reported via phone',
      );
    });

    it('generates minimal business logic message for Administrative Block with ORG_ADMIN', () => {
      const reason = buildCardBlockReason(
        'Administrative Block',
        '',
        'Acme General Manager',
        'ORG_ADMIN',
      );

      expect(reason).toBe('Administratively suspended by Acme General Manager (Org Admin).');
    });

    it('includes optional notes cleanly for Administrative Block', () => {
      const reason = buildCardBlockReason(
        'Administrative Block',
        'Corporate account expired',
        'Acme General Manager',
        'ORG_ADMIN',
      );

      expect(reason).toBe(
        'Administratively suspended by Acme General Manager (Org Admin): Corporate account expired',
      );
    });

    it('handles damaged card faults', () => {
      const reason = buildCardBlockReason(
        'Damaged / Hardware Fault',
        'NFC chip cracked',
        'Cashier Alice',
        'CASHIER',
      );

      expect(reason).toBe('Damaged card reported by Cashier Alice (Cashier): NFC chip cracked');
    });
  });

  describe('30-word limit validation for additional reasons', () => {
    it('returns 0 for empty or null or whitespace inputs', () => {
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0);
      expect(countWords(null)).toBe(0);
      expect(countWords(undefined)).toBe(0);
      expect(validateBlockReasonWordCount('').isValid).toBe(true);
    });

    it('accurately counts words with multiple spaces and newlines', () => {
      const text = 'Customer   misplaced\nwallet at\tcafeteria counter';
      expect(countWords(text)).toBe(6);
      const res = validateBlockReasonWordCount(text, 30);
      expect(res.wordCount).toBe(6);
      expect(res.isValid).toBe(true);
    });

    it('passes for exactly 30 words', () => {
      const thirtyWords = Array.from({ length: 30 }, (_, i) => `word${i + 1}`).join(' ');
      expect(countWords(thirtyWords)).toBe(30);
      const res = validateBlockReasonWordCount(thirtyWords, 30);
      expect(res.wordCount).toBe(30);
      expect(res.isValid).toBe(true);
    });

    it('fails when exceeding 30 words (e.g. 31 words)', () => {
      const thirtyOneWords = Array.from({ length: 31 }, (_, i) => `word${i + 1}`).join(' ');
      expect(countWords(thirtyOneWords)).toBe(31);
      const res = validateBlockReasonWordCount(thirtyOneWords, 30);
      expect(res.wordCount).toBe(31);
      expect(res.isValid).toBe(false);
    });
  });
});
