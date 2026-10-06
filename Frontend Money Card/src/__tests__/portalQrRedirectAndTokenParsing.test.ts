import { describe, it, expect } from 'vitest';
import { getPublicCustomerPortalUrl } from '@/utils';
import { mockUserPortalHandlers } from '@/services/mock/handlers/userPortal';

function extractWalletToken(raw: string): string {
  let clean = raw.trim();
  if (clean.startsWith('mc:')) {
    clean = clean.substring(3).trim();
  }
  if (clean.includes('/c/')) {
    clean = clean.split('/c/')[1].split('?')[0].split('#')[0].trim();
  } else if (clean.startsWith('http://') || clean.startsWith('https://')) {
    try {
      const url = new URL(clean);
      const param =
        url.searchParams.get('wallet') ||
        url.searchParams.get('card') ||
        url.searchParams.get('token') ||
        url.searchParams.get('qr');
      if (param) {
        clean = param.trim();
      } else {
        const segs = url.pathname.split('/').filter(Boolean);
        if (segs.length > 0) {
          clean = segs[segs.length - 1].trim();
        }
      }
    } catch {
      // fallback
    }
  }
  try {
    clean = decodeURIComponent(clean);
  } catch {
    // fallback
  }
  return clean.trim();
}

describe('Portal QR Redirect and Wallet Token Resolution Tests', () => {
  it('extracts raw wallet IDs accurately', () => {
    expect(extractWalletToken('KD1eifd')).toBe('KD1eifd');
    expect(extractWalletToken('  KD1IRUG9  ')).toBe('KD1IRUG9');
    expect(extractWalletToken('mc:KD1eifd')).toBe('KD1eifd');
    expect(extractWalletToken('MC-001')).toBe('MC-001');
  });

  it('extracts wallet token from full /c/ URLs', () => {
    expect(
      extractWalletToken('https://money-card-frontend-staging.vercel.app/c/KD1eifd'),
    ).toBe('KD1eifd');
    expect(
      extractWalletToken('https://money-card-frontend.vercel.app/c/KD1IRUG9?source=qr#top'),
    ).toBe('KD1IRUG9');
    expect(extractWalletToken('http://localhost:5173/c/KD1eifd')).toBe('KD1eifd');
  });

  it('extracts wallet token from search parameters', () => {
    expect(
      extractWalletToken('https://money-card-frontend-staging.vercel.app/portal?wallet=KD1eifd'),
    ).toBe('KD1eifd');
    expect(
      extractWalletToken('https://money-card-frontend-staging.vercel.app/portal?card=KD1IRUG9'),
    ).toBe('KD1IRUG9');
    expect(
      extractWalletToken('https://money-card-frontend.vercel.app/portal?token=KD1eifd'),
    ).toBe('KD1eifd');
  });

  it('formats clean customer portal destination URLs for given wallet tokens', () => {
    const url = getPublicCustomerPortalUrl('KD1eifd');
    expect(url).toContain('/c/KD1eifd');
  });

  it('resolves card session via mockUserPortalHandlers with raw token and URL', async () => {
    // Card with qrToken 'qr_token_mc001_8a7b9c' and physicalCardNumber 'MC-001'
    const resRaw = await mockUserPortalHandlers.resolvePublicCard('MC-001');
    expect(resRaw.success).toBe(true);
    if (resRaw.success) {
      expect(resRaw.data.cardDisplayNumber).toBe('MC-001');
    }

    const resUrl = await mockUserPortalHandlers.resolvePublicCard(
      'https://money-card-frontend-staging.vercel.app/c/MC-001',
    );
    expect(resUrl.success).toBe(true);

    const resCase = await mockUserPortalHandlers.resolvePublicCard('mc-001');
    expect(resCase.success).toBe(true);
  });
});
