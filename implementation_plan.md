# Implementation Plan - Restrict Menu Page Filters to Veg, Non-Veg, and Drinks

![Menu Analytics and Product Filters](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\menu_analytics_food_quantity_cards_1790655580696.jpg)
![Mobile Action Hub](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\analytics_and_mobile_action_hub_1790656747216.jpg)

Proposed Worktree Specifications

1. Restrict Menu Page Filter Bar to Veg, Non-Veg, and Drinks
- File: Flutter Money card/lib/features/products/products_screen.dart
  - In ProductsScreen filter toolbar:
    - Replace dynamic unconstrained categories with the strict 4-category list: ['All', 'Veg', 'Non-Veg', 'Drinks'].
    - Removes all other categories (such as Snacks, Meals, Breakfast, etc.) from the horizontal filter bar.
  - In _showAddProductBottomSheet:
    - Update category ChoiceChips from ['Veg', 'Non-Veg', 'Beverages', 'Snacks', 'Meals'] to ['Veg', 'Non-Veg', 'Drinks'].
  - In _showEditProductBottomSheet:
    - Update category ChoiceChips from ['Veg', 'Non-Veg', 'Beverages', 'Snacks', 'Meals'] to ['Veg', 'Non-Veg', 'Drinks'].

2. Multi-Category Filtering Logic in POS Catalog
- File: Flutter Money card/lib/providers/pos_cart_provider.dart
  - In filteredProducts getter:
    - When selectedCategory == 'Drinks': match products categorized with 'drinks', 'beverages', 'beverage', 'juice', 'coffee', 'chai', or 'tea'.
    - When selectedCategory == 'Veg': match products categorized with 'veg' or 'vegan' (excluding 'non').
    - When selectedCategory == 'Non-Veg': match products categorized with 'non-veg', 'non veg', or 'nonveg'.
    - When selectedCategory == 'All': show all catalog items.
    - Fallback: retains direct lowercase equality for backward compatibility with existing tests.

UI Layout & ASCII Wireframe

Menu Page (Restricted Category Filters):
+-------------------------------------------------------+
|  [<-]  Products & Menu                                |
+-------------------------------------------------------+
| [ Search products by name...                        ] |
+-------------------------------------------------------+
|  (•) All    ( ) Veg    ( ) Non-Veg    ( ) Drinks      |
|  (All other categories removed)                       |
+-------------------------------------------------------+
|                                                       |
| +---------------------------------------------------+ |
| | [Food Icon]  Veg Biryani                 [ACTIVE] | |
| |              Rs. 120.00                   [ Edit] | |
| |              [Veg]                                | |
| +---------------------------------------------------+ |
| +---------------------------------------------------+ |
| | [Food Icon]  Chicken Fried Rice          [ACTIVE] | |
| |              Rs. 160.00                   [ Edit] | |
| |              [Non-Veg]                            | |
| +---------------------------------------------------+ |
| +---------------------------------------------------+ |
| | [Food Icon]  Fresh Lime Soda             [ACTIVE] | |
| |              Rs. 40.00                    [ Edit] | |
| |              [Drinks]                             | |
| +---------------------------------------------------+ |
|                                                       |
|                             [ + Add Menu Item ] (FAB) |
+-------------------------------------------------------+

Add / Edit Menu Item Modal:
+-------------------------------------------------------+
|  Add Menu Item                   Counter: Cafeteria   |
|                                                       |
|  Item Name: [ Enter item name                       ] |
|  Price (Rs.): [ 50.00                               ] |
|                                                       |
|  Category:                                            |
|  [ Veg ]    [ Non-Veg ]    [ Drinks ]                 |
|                                                       |
|  [                       Save                       ] |
+-------------------------------------------------------+

Verification & Automated Test Execution Plan
1. Flutter Unit & Widget Tests: Run flutter test autonomously across product and catalog tests.
2. Flutter Static Analysis: Run flutter analyze --no-pub to verify 0 warnings.
3. Test Parity: Verify frontend (npm test -- --run) and backend (npm test).
4. Version Control: Autonomous local commit on branch staging with zero emojis.
