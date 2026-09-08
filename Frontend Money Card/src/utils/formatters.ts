// ─── Format Currency ───────────────────────────────────────
// Default to INR (₹) as per the project brief examples.

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ─── Format Compact Currency (e.g., ₹25,130.58 Cr, ₹45.20 L, ₹12.5k) ─
export function formatCompactCurrency(amount: number, currency: string = 'INR'): string {
  if (isNaN(amount) || amount === 0) return '₹0';
  const isNegative = amount < 0;
  const abs = Math.abs(amount);

  let formatted = '';
  if (abs >= 10000000) {
    const val = abs / 10000000;
    formatted = `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Cr`;
  } else if (abs >= 100000) {
    const val = abs / 100000;
    formatted = `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} L`;
  } else if (abs >= 10000) {
    const val = abs / 1000;
    formatted = `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}k`;
  } else {
    formatted = formatCurrency(abs, currency);
  }

  return isNegative ? `-${formatted}` : formatted;
}

// ─── Format Compact Number (e.g., 56.66 Cr, 1.25 L, 15.2k) ────
export function formatCompactNumber(num: number): string {
  if (isNaN(num) || num === 0) return '0';
  const isNegative = num < 0;
  const abs = Math.abs(num);

  let formatted = '';
  if (abs >= 10000000) {
    const val = abs / 10000000;
    formatted = `${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Cr`;
  } else if (abs >= 100000) {
    const val = abs / 100000;
    formatted = `${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} L`;
  } else if (abs >= 10000) {
    const val = abs / 1000;
    formatted = `${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}k`;
  } else {
    formatted = abs.toLocaleString('en-IN');
  }

  return isNegative ? `-${formatted}` : formatted;
}

// ─── Format Date ───────────────────────────────────────────

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString));
}

export function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

// ─── Format Card Number ────────────────────────────────────

export function formatCardNumber(cardNumber: string): string {
  return cardNumber.startsWith('MC-') ? cardNumber : `MC-${cardNumber}`;
}

// ─── Truncate Text ─────────────────────────────────────────

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

// ─── Transaction Items Formatter ───────────────────────────

export interface FormattedTransactionItem {
  name: string;
  quantity: number;
  unitPrice?: number;
  total?: number;
}

export function extractTransactionItems(rawItems: any): FormattedTransactionItem[] {
  if (!rawItems) return [];
  let items = rawItems;
  if (typeof rawItems === 'string') {
    try {
      items = JSON.parse(rawItems);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(items)) {
    if (typeof items === 'object' && items !== null) {
      items = [items];
    } else {
      return [];
    }
  }

  return items
    .map((it: any) => {
      if (!it) return null;
      if (typeof it === 'string') {
        return { name: it.trim(), quantity: 1 };
      }
      const name =
        it.itemName ||
        it.name ||
        it.productName ||
        it.title ||
        (it.productId ? `Product (${String(it.productId).slice(0, 6)})` : 'Item');
      const quantity = Math.max(1, Number(it.quantity || it.qty || it.count || 1));
      const unitPrice =
        typeof it.unitPrice === 'number'
          ? it.unitPrice
          : typeof it.price === 'number'
          ? it.price
          : undefined;
      const total =
        typeof it.subtotal === 'number'
          ? it.subtotal
          : typeof it.totalAmount === 'number'
          ? it.totalAmount
          : typeof it.totalPrice === 'number'
          ? it.totalPrice
          : unitPrice !== undefined
          ? unitPrice * quantity
          : undefined;

      return {
        name,
        quantity,
        unitPrice,
        total,
      };
    })
    .filter(Boolean) as FormattedTransactionItem[];
}

