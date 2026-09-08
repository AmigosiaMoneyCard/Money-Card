// ─── Card Block Reason & Business Logic Messages ───────────────
// Converts technical or raw card block strings into clear, minimal business messages.

export function buildCardBlockReason(
  category: string,
  notes?: string,
  blockerName?: string,
  blockerRole?: string,
): string {
  const roleMap: Record<string, string> = {
    ORG_ADMIN: 'Org Admin',
    SUPER_ADMIN: 'Super Admin',
    BRANCH_MANAGER: 'Branch Manager',
    CASHIER: 'Cashier',
    STAFF: 'Staff',
    MANAGER: 'Manager',
  };
  const roleLabel = blockerRole ? roleMap[blockerRole] || blockerRole : 'Administrator';

  const blocker = blockerName ? `${blockerName} (${roleLabel})` : 'Administrator';
  const cleanNotes = notes?.trim();

  switch (category) {
    case 'Administrative Block':
      return cleanNotes
        ? `Administratively suspended by ${blocker}: ${cleanNotes}`
        : `Administratively suspended by ${blocker}.`;

    case 'Lost or Stolen Card':
      return cleanNotes
        ? `Reported lost or stolen by ${blocker}: ${cleanNotes}`
        : `Reported lost or stolen by ${blocker}.`;

    case 'Suspicious Activity / Fraud':
      return cleanNotes
        ? `Suspicious activity flagged by ${blocker}: ${cleanNotes}`
        : `Suspicious activity flagged by ${blocker}.`;

    case 'Damaged / Hardware Fault':
      return cleanNotes
        ? `Damaged card reported by ${blocker}: ${cleanNotes}`
        : `Damaged card reported by ${blocker}.`;

    case 'Customer Request':
      return cleanNotes
        ? `Blocked per customer request by ${blocker}: ${cleanNotes}`
        : `Blocked per customer request by ${blocker}.`;

    case 'Staff Discretion':
      return cleanNotes
        ? `Blocked by staff discretion (${blocker}): ${cleanNotes}`
        : `Blocked by staff discretion (${blocker}).`;

    default:
      return cleanNotes
        ? `${category} by ${blocker}: ${cleanNotes}`
        : `${category} by ${blocker}.`;
  }
}

export function formatBlockedCardMessage(
  rawReason?: string | null,
  fallbackBlocker?: string | null,
): string {
  if (!rawReason || !rawReason.trim()) {
    return 'Card blocked by administrator.';
  }

  const trimmed = rawReason.trim();

  // Pattern 1: Legacy or bracketed format: [Blocked by Name (Role)] Category: Notes or [Blocked by Name (Role)] Category
  const bracketMatch = trimmed.match(/^\[Blocked by ([^\]]+)\]\s*([^:]+?)(?:\s*:\s*(.*))?$/i);
  if (bracketMatch) {
    const [, blocker, category, notes] = bracketMatch;
    const cat = category.trim();
    const cleanNotes = (notes || '').trim();

    if (cat === 'Administrative Block') {
      return cleanNotes
        ? `Administratively suspended by ${blocker}: ${cleanNotes}`
        : `Administratively suspended by ${blocker}.`;
    }
    if (cat === 'Lost or Stolen Card') {
      return cleanNotes
        ? `Reported lost or stolen by ${blocker}: ${cleanNotes}`
        : `Reported lost or stolen by ${blocker}.`;
    }
    if (cat === 'Suspicious Activity / Fraud') {
      return cleanNotes
        ? `Suspicious activity flagged by ${blocker}: ${cleanNotes}`
        : `Suspicious activity flagged by ${blocker}.`;
    }
    if (cat === 'Damaged / Hardware Fault') {
      return cleanNotes
        ? `Damaged card reported by ${blocker}: ${cleanNotes}`
        : `Damaged card reported by ${blocker}.`;
    }
    if (cat === 'Customer Request') {
      return cleanNotes
        ? `Blocked per customer request by ${blocker}: ${cleanNotes}`
        : `Blocked per customer request by ${blocker}.`;
    }
    if (cat === 'Staff Discretion') {
      return cleanNotes
        ? `Blocked by staff discretion (${blocker}): ${cleanNotes}`
        : `Blocked by staff discretion (${blocker}).`;
    }

    return cleanNotes
      ? `${cat} by ${blocker}: ${cleanNotes}`
      : `${cat} by ${blocker}.`;
  }

  // Pattern 2: Standalone category string like "Administrative Block"
  if (trimmed === 'Administrative Block') {
    const byStr = fallbackBlocker ? ` by ${fallbackBlocker}` : '';
    return `Administratively suspended${byStr}.`;
  }
  if (trimmed === 'Lost or Stolen Card') {
    const byStr = fallbackBlocker ? ` by ${fallbackBlocker}` : '';
    return `Reported lost or stolen${byStr}.`;
  }
  if (trimmed === 'Suspicious Activity / Fraud') {
    return 'Suspicious activity flagged.';
  }
  if (trimmed === 'Damaged / Hardware Fault') {
    return 'Damaged card reported.';
  }
  if (trimmed === 'Customer Request') {
    return 'Blocked per customer request.';
  }

  // If it's a legacy long sentence, strip out the verbose policy boilerplate if present
  if (trimmed.includes('Usage immediately halted for balance protection.')) {
    return trimmed.replace(/\.?\s*Usage immediately halted for balance protection\./, '.').trim();
  }
  if (trimmed.includes('All cafeteria purchases and recharges are disabled.')) {
    return trimmed.replace(/\.?\s*All cafeteria purchases and recharges are disabled\./, '.').trim();
  }

  // Already a descriptive sentence
  return trimmed;
}

export function countWords(text?: string | null): number {
  if (!text) return 0;
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

export function validateBlockReasonWordCount(text?: string | null, maxWords: number = 30): {
  wordCount: number;
  isValid: boolean;
} {
  const wordCount = countWords(text);
  return {
    wordCount,
    isValid: wordCount <= maxWords,
  };
}

