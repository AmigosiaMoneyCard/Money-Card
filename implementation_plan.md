# Implementation Plan - Web Super Admin Overview Refinements & Mobile POS Order Search, Bill & Shell Enhancements

## Overview & Scope of Work
This comprehensive implementation plan unites all pending and newly requested enhancements across the Web Dashboard and Flutter Mobile App:

Part 1: Web App - Super Admin Dashboard Header & Filter Refinements
- Overview CardHeader: Remove description subtitle text ("Platform scale and operational wallet analytics under a unified organization and time window filter."), leaving the clean header title "Overview".
- Filter Button: Rename action button in Overview filter toolbar from "Refresh Metrics" to "Refresh".
- Time Window Filter: Remove the "All Time" button from the date filter box, keeping the start/end date inputs and "Today" button.

Part 2: Mobile App - Bill Page Wallet Prefix Removal & Label Update
- Rename Label: In `bill_receipt_screen.dart`, change `Card:` row label to `Wallet:`.
- Remove Prefix: In `receipt_bill.dart`, update `displayCardId` getter to strip any `MC-`, `MC `, `CARD-`, or `WALLET-` prefixes, displaying only the clean wallet ID (e.g. `KD1IRUG9`).

Part 3: Mobile App - Manager Food Progress Screen Search Bar & QR Scan Button
- In `live_order_tracker_screen.dart`, add a search bar at the top with a dedicated QR scanner icon button.
- Tapping the QR scanner opens `QrScannerView` to scan the customer's wallet QR code, populating the search bar with the scanned wallet ID.
- Manually typing or scanning filters both In Progress and Ready tabs by wallet ID, ticket number, customer name, or food items.
- Clear button (X) inside search bar to reset search immediately.

Part 4: Mobile App - Kitchen Staff Orders Screen Wallet ID Search Bar
- In `kitchen_orders_screen.dart`, add a search bar at the top to filter active preparation and ready tickets by wallet ID or ticket number.
- Clear button (X) to quickly reset search filter.

Part 5: Mobile App - Remove Background Auto-Fetching (Cache & Manual Reload)
- In `kitchen_orders_provider.dart`, remove background `_pollingTimer` and `_startPolling()` interval.
- Orders stay cached in state until the staff member explicitly triggers a reload via the AppBar refresh button or pull-to-refresh.

Part 6: Mobile App - Kitchen Staff Shell Profile Button Removal
- In `staff_app_shell.dart`, remove the `Profile` navigation destination from `destinations` for kitchen staff (`isKitchen`), leaving only `Kitchen Orders` and `Menu`.
- Update `_calculateSelectedIndex` and `_onItemTapped` navigation logic to match the 2-destination bar.

![Mobile POS Order Search and Bill Updates](C:\Users\damie\.gemini\antigravity-ide\brain\5d95263b-cd5f-4577-8545-14c5773f5f9e\mobile_pos_order_search_and_bill_1791177313177.jpg)

## Technical Design & Scope

1. Web App SuperAdmin Dashboard
File: `Frontend Money Card/src/features/dashboard/SuperAdminDashboard.tsx`
- `<CardHeader title="Overview" />` without description.
- Remove `<Button ...>All Time</Button>`.
- Change button text to `Refresh`.

2. Mobile App Receipt Bill Model & Bill Screen
Files:
- `Flutter Money card/lib/models/receipt_bill.dart`
- `Flutter Money card/lib/features/receipt/bill_receipt_screen.dart`
Logic:
- In `receipt_bill.dart`: strip `MC-`, `MC `, `CARD-`, `CARD `, `WALLET-`, `WALLET ` in `displayCardId`.
- In `bill_receipt_screen.dart`: `_buildReceiptRow('Wallet:', bill.displayCardId)`.

3. Mobile App Food Progress Screen
File: `Flutter Money card/lib/features/orders/live_order_tracker_screen.dart`
- Add `TextEditingController _searchController`.
- Search container with search input, clear button, and QR scan `IconButton(icon: Icon(Icons.qr_code_scanner))`.
- When QR scan pressed, display modal sheet or dialog with `QrScannerView`. On scan, set controller text to clean scanned token.
- Filter lists: `inProgressOrders.where(...)` and `readyOrders.where(...)` matching query against `cardDisplayNumber`, `orderNumber`, `customerName`, and item names.

4. Mobile App Kitchen Orders Screen
File: `Flutter Money card/lib/features/kitchen/kitchen_orders_screen.dart`
- Add `TextEditingController _searchController`.
- Search bar filtering `activeOrders` and `readyOrders` by `order.cardDisplayNumber` or `order.orderNumber`.

5. Mobile App Disable Polling
File: `Flutter Money card/lib/providers/kitchen_orders_provider.dart`
- Remove `_startPolling()` and `_pollingTimer`.

6. Mobile App Shell Navigation
File: `Flutter Money card/lib/widgets/shell/staff_app_shell.dart`
- In `destinations: isKitchen`, remove `Profile` item.
- Update `_calculateSelectedIndex` (0 for `/app/kitchen`, 1 for `/app/products`).
- Update `_onItemTapped` (0 for `/app/kitchen`, 1 for `/app/products`).

## ASCII Wireframes

### Mobile Food Progress Screen (Manager)
```
+-------------------------------------------------------+
| Food Progress                               [Refresh] |
+-------------------------------------------------------+
| [ Search wallet ID, ticket #...     [X] ] [Scan QR]   |  <- Search bar + QR scan button
+-------------------------------------------------------+
|  In Progress (2)        |   Ready (1)                 |
+-------------------------------------------------------+
| +---------------------------------------------------+ |
| | Ticket #102                               COOKING | |
| | Wallet: KD1IRUG9 • 4m elapsed • Rs.180            | |
| | - 2x Veg Burger                                   | |
| +---------------------------------------------------+ |
+-------------------------------------------------------+
```

### Mobile Kitchen Orders Screen (Kitchen Staff)
```
+-------------------------------------------------------+
| Kitchen Orders                              [Refresh] |
+-------------------------------------------------------+
| [ Search wallet ID, ticket #...                 [X] ] |  <- Search bar
+-------------------------------------------------------+
|  Active Prep (2)        |   Ready for Pickup (1)      |
+-------------------------------------------------------+
| +---------------------------------------------------+ |
| | Ticket #102                               COOKING | |
| | Wallet: KD1IRUG9                                  | |
| | - 2x Veg Burger                                   | |
| |                                     [Mark Ready]  | |
| +---------------------------------------------------+ |
+-------------------------------------------------------+
| [ Kitchen Orders ]                    [ Menu ]        |  <- Only 2 buttons (No Profile)
+-------------------------------------------------------+
```

### Mobile Bill Receipt Screen
```
+-------------------------------------------------------+
|                          Bill                     [v] |
+-------------------------------------------------------+
|                    MONEY CARD                         |
|                  MAIN CAFETERIA                       |
|                   SALES RECEIPT                       |
| ----------------------------------------------------- |
| Bill Number:                           BILL-#A1B2C3D4 |
| Wallet:                                      KD1IRUG9 |  <- Renamed to Wallet, No "MC-" prefix
| Date:                               05 Oct 2026 10:45 |
| Cashier:                                         Eros |
| ----------------------------------------------------- |
| ITEM                         QTY x RATE        AMOUNT |
| ----------------------------------------------------- |
| Veg Burger                     2 x Rs.90    Rs.180.00 |
| Cold Coffee                    1 x Rs.60     Rs.60.00 |
| ----------------------------------------------------- |
| TOTAL:                                      Rs.240.00 |
+-------------------------------------------------------+
```

## Verification Plan

### Automated Tests
1. Frontend Tests: Run `npm test -- --run` in `Frontend Money Card` (verify all 303+ tests pass).
2. Frontend Type Check: Run `npx tsc --noEmit` in `Frontend Money Card` (verify 0 errors).
3. Flutter Unit Tests: Run `flutter test` in `Flutter Money card` (verify all passing).
4. Flutter Static Analysis: Run `flutter analyze --no-pub` in `Flutter Money card` (verify 0 issues).
