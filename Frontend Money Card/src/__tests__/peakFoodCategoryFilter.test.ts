import { describe, it, expect } from 'vitest';
import {
  extractProductCategories,
  matchesFoodCategory,
  STANDARD_FOOD_CATEGORIES,
} from '@/features/peak/PeakPage';
import type { ProductDemandMetric } from '@/types';

describe('Peak & Demand Analysis: Food Category Filter Logic', () => {
  describe('extractProductCategories', () => {
    it('should parse comma-delimited category string', () => {
      expect(extractProductCategories('Veg, Fast Food')).toEqual(['Veg', 'Fast Food']);
    });

    it('should parse pipe-delimited category string', () => {
      expect(extractProductCategories('Veg|Fast Food|Snack')).toEqual(['Veg', 'Fast Food', 'Snack']);
    });

    it('should handle category string arrays without crashing', () => {
      expect(extractProductCategories(['Veg', 'Fast Food'])).toEqual(['Veg', 'Fast Food']);
    });

    it('should handle null, undefined, and empty string safely', () => {
      expect(extractProductCategories(null)).toEqual([]);
      expect(extractProductCategories(undefined)).toEqual([]);
      expect(extractProductCategories('')).toEqual([]);
    });

    it('should trim whitespace around categories', () => {
      expect(extractProductCategories('  Non-Veg ,  Beverage  ')).toEqual(['Non-Veg', 'Beverage']);
    });
  });

  describe('matchesFoodCategory', () => {
    it('should return true for ALL category selection', () => {
      expect(matchesFoodCategory(['Veg'], 'ALL')).toBe(true);
      expect(matchesFoodCategory([], 'ALL')).toBe(true);
    });

    it('should strictly match "Veg" without falsely matching "Non-Veg"', () => {
      const vegCats = ['Veg', 'Fast Food'];
      const nonVegCats = ['Non-Veg', 'Fast Food'];

      expect(matchesFoodCategory(vegCats, 'Veg')).toBe(true);
      expect(matchesFoodCategory(nonVegCats, 'Veg')).toBe(false);
    });

    it('should strictly match "Non-Veg" without matching "Veg"', () => {
      const vegCats = ['Veg', 'Fast Food'];
      const nonVegCats = ['Non-Veg', 'Fast Food'];

      expect(matchesFoodCategory(nonVegCats, 'Non-Veg')).toBe(true);
      expect(matchesFoodCategory(vegCats, 'Non-Veg')).toBe(false);
    });

    it('should match "Fast Food" accurately when present', () => {
      expect(matchesFoodCategory(['Veg', 'Fast Food'], 'Fast Food')).toBe(true);
      expect(matchesFoodCategory(['Non-Veg', 'Fast Food'], 'Fast Food')).toBe(true);
      expect(matchesFoodCategory(['Beverage'], 'Fast Food')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(matchesFoodCategory(['Beverage'], 'beverage')).toBe(true);
      expect(matchesFoodCategory(['fast food'], 'Fast Food')).toBe(true);
    });

    it('should match plural variants (e.g. Beverages vs Beverage)', () => {
      expect(matchesFoodCategory(['Beverage'], 'Beverages')).toBe(true);
      expect(matchesFoodCategory(['Beverages'], 'Beverage')).toBe(true);
      expect(matchesFoodCategory(['Snack'], 'Snacks')).toBe(true);
    });
  });

  describe('STANDARD_FOOD_CATEGORIES', () => {
    it('should include core cafeteria food categories', () => {
      expect(STANDARD_FOOD_CATEGORIES).toContain('Fast Food');
      expect(STANDARD_FOOD_CATEGORIES).toContain('Veg');
      expect(STANDARD_FOOD_CATEGORIES).toContain('Non-Veg');
      expect(STANDARD_FOOD_CATEGORIES).toContain('Beverage');
      expect(STANDARD_FOOD_CATEGORIES).toContain('Snack');
    });
  });

  describe('Product Demand List Filtering Integration', () => {
    const sampleProducts: ProductDemandMetric[] = [
      {
        productId: 'P1',
        productName: 'Veg Burger',
        category: 'Veg, Fast Food',
        quantitySold: 45,
        revenue: 5400,
        peakHourQuantity: 30,
        offPeakQuantity: 15,
        stockStatus: 'NORMAL',
      },
      {
        productId: 'P2',
        productName: 'Cold Coffee',
        category: 'Beverage',
        quantitySold: 32,
        revenue: 2560,
        peakHourQuantity: 20,
        offPeakQuantity: 12,
        stockStatus: 'NORMAL',
      },
      {
        productId: 'P3',
        productName: 'Chicken Wrap',
        category: 'Non-Veg, Fast Food',
        quantitySold: 28,
        revenue: 4200,
        peakHourQuantity: 18,
        offPeakQuantity: 10,
        stockStatus: 'NORMAL',
      },
      {
        productId: 'P4',
        productName: 'Crispy Fries',
        category: 'Veg, Snack',
        quantitySold: 50,
        revenue: 3000,
        peakHourQuantity: 35,
        offPeakQuantity: 15,
        stockStatus: 'NORMAL',
      },
    ];

    const filterProductsByCategory = (items: ProductDemandMetric[], category: string) => {
      if (!category || category === 'ALL') return items;
      return items.filter((p) => {
        const cats = extractProductCategories(p.category);
        return matchesFoodCategory(cats, category);
      });
    };

    it('returns all products when category is ALL', () => {
      const result = filterProductsByCategory(sampleProducts, 'ALL');
      expect(result).toHaveLength(4);
    });

    it('filters only Veg items and excludes Non-Veg items', () => {
      const result = filterProductsByCategory(sampleProducts, 'Veg');
      expect(result.map((r) => r.productName)).toEqual(['Veg Burger', 'Crispy Fries']);
      expect(result.some((r) => r.productName === 'Chicken Wrap')).toBe(false);
    });

    it('filters only Non-Veg items', () => {
      const result = filterProductsByCategory(sampleProducts, 'Non-Veg');
      expect(result.map((r) => r.productName)).toEqual(['Chicken Wrap']);
    });

    it('filters Fast Food items correctly (including both Veg Burger and Chicken Wrap)', () => {
      const result = filterProductsByCategory(sampleProducts, 'Fast Food');
      expect(result.map((r) => r.productName)).toEqual(['Veg Burger', 'Chicken Wrap']);
    });

    it('filters Beverage items correctly', () => {
      const result = filterProductsByCategory(sampleProducts, 'Beverage');
      expect(result.map((r) => r.productName)).toEqual(['Cold Coffee']);
    });

    it('returns empty array for categories with no matching items', () => {
      const result = filterProductsByCategory(sampleProducts, 'Dessert');
      expect(result).toHaveLength(0);
    });
  });

  describe('sortProductDemand (Revenue Wise vs Order Wise Prioritization)', () => {
    const products: ProductDemandMetric[] = [
      {
        productId: 'prod_1',
        productName: 'Chai Tea',
        category: 'Beverage',
        quantitySold: 120, // highest orders
        revenue: 2400,
        peakHourQuantity: 80,
        offPeakQuantity: 40,
        stockStatus: 'NORMAL',
        currentStock: 50,
      },
      {
        productId: 'prod_2',
        productName: 'Paneer Thali',
        category: 'Main Course',
        quantitySold: 40,
        revenue: 8800, // highest revenue
        peakHourQuantity: 30,
        offPeakQuantity: 10,
        stockStatus: 'NORMAL',
        currentStock: 25,
      },
      {
        productId: 'prod_3',
        productName: 'Veg Sandwich',
        category: 'Snack',
        quantitySold: 60,
        revenue: 3600,
        peakHourQuantity: 40,
        offPeakQuantity: 20,
        stockStatus: 'LOW',
        currentStock: 8,
      },
      {
        productId: 'prod_4',
        productName: 'Cold Coffee',
        category: 'Beverage',
        quantitySold: 60,
        revenue: 3600, // same revenue as Sandwich, but higher stock
        peakHourQuantity: 45,
        offPeakQuantity: 15,
        stockStatus: 'NORMAL',
        currentStock: 40,
      },
    ];

    it('prioritizes highest revenue and stocks first in REVENUE wise sorting', async () => {
      const { sortProductDemand } = await import('@/features/peak/PeakPage');
      const sorted = sortProductDemand(products, 'REVENUE');

      // Top item should be Paneer Thali with ₹8800 revenue
      expect(sorted[0].productName).toBe('Paneer Thali');
      expect(sorted[0].revenue).toBe(8800);

      // When revenue is equal (₹3600), Cold Coffee (stock: 40) is prioritized before Veg Sandwich (stock: 8)
      expect(sorted[1].productName).toBe('Cold Coffee');
      expect(sorted[2].productName).toBe('Veg Sandwich');

      // Lowest revenue item is Chai Tea (₹2400)
      expect(sorted[3].productName).toBe('Chai Tea');
    });

    it('prioritizes highest order units first in ORDERS wise sorting', async () => {
      const { sortProductDemand } = await import('@/features/peak/PeakPage');
      const sorted = sortProductDemand(products, 'ORDERS');

      // Top item should be Chai Tea with 120 units sold
      expect(sorted[0].productName).toBe('Chai Tea');
      expect(sorted[0].quantitySold).toBe(120);

      // Next are items with 60 units sold (Cold Coffee & Veg Sandwich)
      expect(sorted[1].quantitySold).toBe(60);
      expect(sorted[2].quantitySold).toBe(60);

      // Last item should be Paneer Thali with 40 units sold
      expect(sorted[3].productName).toBe('Paneer Thali');
      expect(sorted[3].quantitySold).toBe(40);
    });
  });

  describe('Time Window Presets (getPeakPresetDates)', () => {
    it('calculates thisMonth preset from 1st of current month to today without timezone shift', async () => {
      const { getPeakPresetDates } = await import('@/features/peak/PeakPage');
      const dates = getPeakPresetDates('thisMonth');

      const now = new Date();
      const expectedStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const expectedEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      expect(dates.startDate).toBe(expectedStart);
      expect(dates.endDate).toBe(expectedEnd);
    });

    it('calculates today preset as current calendar day', async () => {
      const { getPeakPresetDates } = await import('@/features/peak/PeakPage');
      const dates = getPeakPresetDates('today');

      const now = new Date();
      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      expect(dates.startDate).toBe(expected);
      expect(dates.endDate).toBe(expected);
    });

    it('calculates custom preset using customStart and customEnd when provided', async () => {
      const { getPeakPresetDates } = await import('@/features/peak/PeakPage');
      const dates = getPeakPresetDates('custom', '2026-02-01', '2026-02-15');

      expect(dates.startDate).toBe('2026-02-01');
      expect(dates.endDate).toBe('2026-02-15');
    });

    it('falls back to 1st of current month and today for custom preset when dates not provided', async () => {
      const { getPeakPresetDates } = await import('@/features/peak/PeakPage');
      const dates = getPeakPresetDates('custom');

      const now = new Date();
      const expectedStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const expectedEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      expect(dates.startDate).toBe(expectedStart);
      expect(dates.endDate).toBe(expectedEnd);
    });
  });
});
