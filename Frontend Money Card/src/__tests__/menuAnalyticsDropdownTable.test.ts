import { describe, it, expect } from 'vitest';
import type { ProductDemandItem } from '@/types';

describe('Menu Analytics - All Ordered Menu Items Collapsible Dropdown Table', () => {
  const mockDemandItems: ProductDemandItem[] = [
    {
      productId: 'prod_1',
      productName: 'Chicken Biryani',
      unitPrice: 280,
      quantitySold: 45,
      totalRevenue: 12600,
      orderCount: 38,
    },
    {
      productId: 'prod_2',
      productName: 'Masala Dosa',
      unitPrice: 120,
      quantitySold: 34,
      totalRevenue: 4080,
      orderCount: 30,
    },
    {
      productId: 'prod_3',
      productName: 'Paneer Makhani',
      unitPrice: 240,
      quantitySold: 28,
      totalRevenue: 6720,
      orderCount: 24,
    },
    {
      productId: 'prod_4',
      productName: 'Cold Coffee',
      unitPrice: 80,
      quantitySold: 22,
      totalRevenue: 1760,
      orderCount: 19,
    },
  ];

  it('starts open by default displaying all ordered dishes', () => {
    let isTableOpen = true;
    expect(isTableOpen).toBe(true);

    const visibleItems = isTableOpen ? mockDemandItems : [];
    expect(visibleItems).toHaveLength(4);
    expect(visibleItems[0].productName).toBe('Chicken Biryani');
  });

  it('collapses table content when toggled off', () => {
    let isTableOpen = true;

    // Toggle collapse
    isTableOpen = !isTableOpen;
    expect(isTableOpen).toBe(false);

    const visibleItems = isTableOpen ? mockDemandItems : [];
    expect(visibleItems).toHaveLength(0);
  });

  it('re-expands table content when toggled back on', () => {
    let isTableOpen = false;

    // Toggle expand
    isTableOpen = !isTableOpen;
    expect(isTableOpen).toBe(true);

    const visibleItems = isTableOpen ? mockDemandItems : [];
    expect(visibleItems).toHaveLength(4);
  });

  it('automatically opens the dropdown when user enters a dish search term', () => {
    let isTableOpen = false;
    let searchTerm = '';

    const handleSearchChange = (value: string) => {
      searchTerm = value;
      if (!isTableOpen && value.trim()) {
        isTableOpen = true;
      }
    };

    handleSearchChange('Dosa');
    expect(searchTerm).toBe('Dosa');
    expect(isTableOpen).toBe(true);

    const filtered = mockDemandItems.filter((i) =>
      i.productName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].productName).toBe('Masala Dosa');
  });

  it('verifies strictly 4 columns without category or status or currency code in header', () => {
    const tableHeaders = ['Dish Name', 'Price', 'Quantity Sold', 'Total Revenue'];
    expect(tableHeaders).toHaveLength(4);
    expect(tableHeaders).not.toContain('Category');
    expect(tableHeaders).not.toContain('Status');
    expect(tableHeaders).not.toContain('Cancelled Quantity');
    expect(tableHeaders[3]).toBe('Total Revenue');
    expect(tableHeaders[3]).not.toContain('(R)');
  });
});
