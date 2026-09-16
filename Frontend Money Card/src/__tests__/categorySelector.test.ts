import { describe, it, expect } from 'vitest';
import { PRODUCT_CATEGORY_GROUPS } from '../features/products/CategorySelector';

describe('CategorySelector Configuration & Logic', () => {
  it('should define all required product category groups', () => {
    expect(PRODUCT_CATEGORY_GROUPS.length).toBe(4);
    const groupIds = PRODUCT_CATEGORY_GROUPS.map((g) => g.id);
    expect(groupIds).toContain('food_type');
    expect(groupIds).toContain('meal_type');
    expect(groupIds).toContain('food_category');
    expect(groupIds).toContain('dietary_attributes');
  });

  it('should contain expected food categories', () => {
    const foodCatGroup = PRODUCT_CATEGORY_GROUPS.find((g) => g.id === 'food_category');
    expect(foodCatGroup).toBeDefined();
    const options = foodCatGroup!.options.map((o) => o.value);
    expect(options).toContain('Main Course');
    expect(options).toContain('Starter');
    expect(options).toContain('Fast Food');
  });

  it('should handle toggle logic properly', () => {
    const selected: string[] = ['Veg'];
    const toggle = (val: string, current: string[]) => {
      const exists = current.some((c) => c.toLowerCase() === val.toLowerCase());
      if (exists) {
        return current.filter((c) => c.toLowerCase() !== val.toLowerCase());
      }
      return [...current, val];
    };

    // Adding 'Spicy'
    const updated1 = toggle('Spicy', selected);
    expect(updated1).toEqual(['Veg', 'Spicy']);

    // Removing 'Veg'
    const updated2 = toggle('Veg', updated1);
    expect(updated2).toEqual(['Spicy']);

    // Adding 'veg' (case insensitive match removes)
    const updated3 = toggle('veg', ['Veg']);
    expect(updated3).toEqual([]);
  });
});
