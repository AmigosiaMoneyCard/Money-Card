# Implementation Plan - Menu Analytics Card Simplification

![Menu Analytics Food Quantity Cards](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\menu_analytics_food_quantity_cards_1790655580696.jpg)

# Summary of Scope

Based on user feedback, simplify and rename the menu analytics overview cards across both Web and Mobile apps:
1. Rename 'Items Sold' to 'Food Quantity' with unit 'Items' (e.g. 0 Items / 45 Items).
2. Remove 'Dishes Ordered' completely.
3. Update 'Cancelled Orders' unit to 'Orders' (e.g. 0 Orders) instead of 'Cancels'.

# Component Breakdown and File Changes

1. Web App: Frontend Money Card/src/features/analytics/OrgAdminAnalyticsComponents.tsx
- Function: OrgAdminMenuAnalyticsSection
- In lines 885-888:
  - Remove unused dishesOrdered calculation.
- In lines 910-959:
  - Change grid from sm:grid-cols-3 to sm:grid-cols-2.
  - Card 1: Label changed from 'Items Sold' to 'Food Quantity', value formatted as '{itemsSold} Items'.
  - Card 2: Remove 'Dishes Ordered' Card.
  - Card 3: Label remains 'Cancelled Orders', value formatted as '{cancelledOrders} Orders'.
- Remove unused ChefHat icon from lucide-react imports if not used elsewhere in file.

2. Mobile POS App: Flutter Money card/lib/features/analytics/analytics_screen.dart
- Function: _buildMenuAnalyticsTab
- In lines 664-710:
  - Remove the 'Dishes Ordered' summary card.
  - Update 'Items Sold' to 'Food Quantity' with value '${data.productsSoldCount} Items' and subtitle 'Total food items sold'.
  - Update 'Cancelled Orders' with value '${data.cancelledOrdersCount} Orders'.
  - Arrange the summary cards cleanly:
    - Row 1: 'Food Sales' and 'Food Quantity' (2 columns).
    - Row 2: 'Cancelled Orders' (full-width single card or balanced layout).

# Wireframe Specifications

Wireframe 1: Web App Menu Analytics Cards
```
+---------------------------------------------------------------------------------------+
| Food Quantity                                     | Cancelled Orders                  |
| 0 Items                                           | 0 Orders                          |
+---------------------------------------------------------------------------------------+
| All Ordered Menu Items                                                [Search...]     |
+---------------------------------------------------------------------------------------+
| Dish Name               | Price           | Quantity Sold     | Total Revenue         |
+-------------------------+-----------------+-------------------+-----------------------+
| Masala Dosa             | Rs. 120.00      | 34                | Rs. 4,080.00          |
| Chicken Biryani         | Rs. 280.00      | 45                | Rs. 12,600.00         |
+---------------------------------------------------------------------------------------+
```

Wireframe 2: Mobile POS Menu Analytics Cards
```
+-----------------------------------+-----------------------------------+
| Food Sales                        | Food Quantity                     |
| ₹0.00                             | 0 Items                           |
| 0 orders placed                   | Total food items sold             |
+-----------------------------------+-----------------------------------+
| Cancelled Orders                                                      |
| 0 Orders                                                              |
| ₹0.00 voided                                                          |
+-----------------------------------------------------------------------+
| All Ordered Menu Items                                            [v] |
+-----------------------------------------------------------------------+
```

# Verification Plan
- Run Web test suite: npm test -- --run in Frontend Money Card/
- Run Web TypeScript check: npx tsc --noEmit in Frontend Money Card/
- Run Mobile unit tests: flutter test in Flutter Money card/
- Run Mobile analyzer: flutter analyze --no-pub in Flutter Money card/
- Publish Shorebird OTA patch: Patch 8 for staging release 1.0.3+4
