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
});
