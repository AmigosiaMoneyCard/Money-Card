// ─── Card Block Reason & Business Logic Messages ───────────────
// Converts technical or raw card block strings into clear, minimal business messages.

const CATEGORY_MAP: Record<string, string> = {
  'Administrative Block': 'Administratively suspended',
  'Lost or Stolen Card': 'Reported lost or stolen',
  'Suspicious Activity / Fraud': 'Suspicious activity flagged',
  'Damaged / Hardware Fault': 'Damaged card reported',
  'Customer Request': 'Blocked per customer request',
  'Staff Discretion': 'Blocked by staff discretion',
};

function formatReasonString(prefix: string, blocker: string, notes?: string): string {
  const cleanNotes = notes?.trim();
  const lead = prefix.includes('staff discretion')
    ? `${prefix} (${blocker})`
    : `${prefix} by ${blocker}`;
  return cleanNotes ? `${lead}: ${cleanNotes}` : `${lead}.`;
}

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

  const prefix = CATEGORY_MAP[category] || category;
  return formatReasonString(prefix, blocker, notes);
}

const STANDALONE_MAP: Record<string, (fallback?: string | null) => string> = {
  'Administrative Block': (fb) => `Administratively suspended${fb ? ` by ${fb}` : ''}.`,
  'Lost or Stolen Card': (fb) => `Reported lost or stolen${fb ? ` by ${fb}` : ''}.`,
  'Suspicious Activity / Fraud': () => 'Suspicious activity flagged.',
  'Damaged / Hardware Fault': () => 'Damaged card reported.',
  'Customer Request': () => 'Blocked per customer request.',
};

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
    const prefix = CATEGORY_MAP[cat] || cat;
    return formatReasonString(prefix, blocker, notes);
  }

  // Pattern 2: Standalone category string like "Administrative Block"
  const standaloneFormatter = STANDALONE_MAP[trimmed];
  if (standaloneFormatter) {
    return standaloneFormatter(fallbackBlocker);
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
