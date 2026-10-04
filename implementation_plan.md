# Implementation Plan - Web Org Admin Staff Table & Mobile Kitchen POS Enhancements

## Overview & Scope of Work

This comprehensive implementation plan unites all pending and newly requested enhancements across the Web Dashboard and Flutter Mobile App:

### Part 1: Web App - Mirror Menu Management in Org Admin Staff Management & Isolate Counter Dashboard
- Mirror 3-Column Layout: In `StaffPage.tsx`, format the table identical to `ProductsPage.tsx`:
  - Column 1: `Counter Name` displaying `Staff - {branch.name}` (e.g. `Staff - COUNTER 1`) with building icon.
  - Column 2: `Add Staff` button with plus icon, opening modal pre-scoped to that counter.
  - Column 3: `View / Edit` button with eye icon, opening counter staff list modal.
  - Modal Title: Renders `Staff - {selectedCounterGroup.counterName}`.
- Isolation: Remove legacy counter-view conditionals from `StaffPage.tsx` so Org Admin and Counter Dashboard (`CounterStaffPage.tsx`) remain 100% isolated.
- Tests: Update `staffMinimalTable.test.ts` and `counterStaffIsolation.test.ts`.

### Part 2: Mobile App - Kitchen Staff KDS Refinements
- Shorten AppBar Title: Change `Kitchen Display System` to `Kitchen Orders` so it is fully visible without being truncated to `Kitchen Display ...`.
- Remove Blue Avg Time Box: Remove the blue `Avg Xm` metric container from AppBar actions to declutter the header.
- Hide Audio Button: Remove the audio mute/unmute button from the kitchen orders AppBar to keep the screen minimal and focused.
- Remove Batch Preparation Summary: Remove the `Batch Preparation Summary` card from the top of the active orders list so active tickets are immediately visible.
- Clean Status Labels:
  - In Active Prep: Change `COOKING / IN PROGRESS` to `COOKING`.
  - In Ready for Pickup: Change `FINISHED / READY` to `READY`.

### Part 3: Mobile App - Staff Profile Screen
- Back Navigation: In `more_screen.dart` (`/app/profile`), add an explicit `Icons.arrow_back` button to the AppBar leading position with safe pop and fallback routing (`/app/kitchen` for kitchen staff, `/app/home` for standard staff).

### Part 4: Mobile App - Counter Manager Food Progress Screen
- Rename Screen: In `live_order_tracker_screen.dart`, rename AppBar title from `Live Food Progress Tracker` to `Food Progress`.
- Two Clean Tabs:
  - Remove the `All` tab.
  - Keep exactly two tabs: `In Progress` and `Ready` (renamed from `Finished / Ready`).
  - Update `TabController` length from 3 to 2.
  - Status labels inside cards: Use `COOKING` and `READY`.

### Part 5: Mobile App - Billing Orders Cancel & Edit Guard for Finished / Served Orders
- In `pos_scan_purchase_screen.dart` and `pos_checkout_screen.dart`:
  - In the Food Orders bottom sheet, inspect the kitchen status of each order transaction.
  - If the order is in finished or served state (`READY` or `COMPLETED`), hide the `Edit` and `Cancel Order` buttons and display a green `READY` or `SERVED` badge instead.
  - Ensure orders that are already cooked or handed over cannot be cancelled or edited by cashiers.
  - In `mock_api_interceptor.dart`: reject `/cancel-order` if the order is already in `READY` or `COMPLETED` state.

---

## Technical Design & Scope

### 1. Web App StaffPage Layout
File: `Frontend Money Card/src/features/staff/StaffPage.tsx`
- Replace `orgAdminColumns`:
  - `counterName`: Icon + `Staff - {group.counterName}`
  - `addStaff`: Outlined button labeled `Add Staff`
  - `staffDetails`: Button labeled `View / Edit`
- Update modal title: `Staff - {selectedCounterGroup.counterName}`
- Remove dead `isCounterView` conditionals from `StaffPage.tsx`.

### 2. Flutter Kitchen Orders Screen
File: `Flutter Money card/lib/features/kitchen/kitchen_orders_screen.dart`
- AppBar title: `'Kitchen Orders'`
- Remove `Consumer` with `averagePrepMinutesProvider`
- Remove audio mute `IconButton`
- Remove `_buildBatchSummaryCard` and its insertion at index 0 of the active orders list
- Card status strings:
  - When `isPreparing`: `'COOKING'`
  - When `isReady`: `'READY'`

### 3. Flutter Staff Profile Screen
File: `Flutter Money card/lib/features/more/more_screen.dart`
- Add `leading` IconButton in `AppBar` with `Icons.arrow_back`.
- Handles `context.pop()` if canPop, else redirects to kitchen dashboard or home dashboard based on staff role.

### 4. Flutter Food Progress Screen
File: `Flutter Money card/lib/features/orders/live_order_tracker_screen.dart`
- Change title to `'Food Progress'`.
- Set `TabController` length to 2.
- Tab 1: `In Progress (${inProgressOrders.length})`
- Tab 2: `Ready (${readyOrders.length})`
- Remove `All` tab and its `_buildList` view.
- Card status labels: change `COOKING / IN PROGRESS` to `COOKING` and `FINISHED / READY` to `READY`.

### 5. Flutter Billing Orders Edit & Cancel Guard
Files:
- `Flutter Money card/lib/features/pos/pos_scan_purchase_screen.dart`
- `Flutter Money card/lib/features/pos/pos_checkout_screen.dart`
- `Flutter Money card/lib/core/network/interceptors/mock_api_interceptor.dart`
- Logic:
  - Check transaction kitchen status against `kitchenOrdersNotifierProvider`.
  - If status is `READY` or `COMPLETED`, replace `Edit` and `Cancel Order` buttons with a status badge (`READY` or `SERVED`).
  - Backend/Mock interceptor enforces validation error `CANNOT_CANCEL_SERVED` if cancellation is attempted on a cooked/served order.

---

## ASCII Wireframes

### Org Admin Staff Management (Web App)
```
+-----------------------------------------------------------------------------------------------+
| Staff Management                                                                  [Add Staff] |
| Staff Usage: 3 / 25 staff accounts created                                                    |
|                                                                                               |
| [Search counters or staff by name, phone...                ]   [All Roles v]   [ Refresh ]    |
|                                                                                               |
| +-------------------------------------------------------------------------------------------+ |
| | COUNTER NAME                                  |     ADD STAFF      |          VIEW / EDIT | |
| +-------------------------------------------------------------------------------------------+ |
| | [Icon] Staff - MAIN CAFETERIA                 |   [+ Add Staff]    |        [Eye View / Edit] | |
| | [Icon] Staff - COUNTER 1                      |   [+ Add Staff]    |        [Eye View / Edit] | |
| | [Icon] Staff - COUNTER 2                      |   [+ Add Staff]    |        [Eye View / Edit] | |
| | [Icon] Staff - EXECUTIVE LOUNGE               |   [+ Add Staff]    |        [Eye View / Edit] | |
| +-------------------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------------------+
```

### Kitchen Orders Screen (Flutter Mobile App)
```
+-------------------------------------------------------+
| Kitchen Orders                              [Refresh] |  <- No blue box, no audio button, short title
+-------------------------------------------------------+
|  Active Prep (3)        |   Ready for Pickup (1)      |
+-------------------------------------------------------+
|                                                       |  <- No Batch Prep Summary card
| +---------------------------------------------------+ |
| | Ticket #102                               COOKING | |  <- Label is "COOKING"
| | - 2x Veg Burger                                   | |
| | - 1x Cold Coffee                                  | |
| |                                     [Mark Ready]  | |
| +---------------------------------------------------+ |
| +---------------------------------------------------+ |
| | Ticket #103                     QUEUED / PENDING  | |
| | - 1x Masala Dosa                                  | |
| |                                     [Start Cook]  | |
| +---------------------------------------------------+ |
+-------------------------------------------------------+
```

### Food Progress Screen (Flutter Mobile App)
```
+-------------------------------------------------------+
| Food Progress                               [Refresh] |  <- Renamed from "Live Food Progress Tracker"
+-------------------------------------------------------+
|  In Progress (2)        |   Ready (1)                 |  <- Exactly 2 tabs (All tab removed)
+-------------------------------------------------------+
| +---------------------------------------------------+ |
| | Ticket #102                               COOKING | |  <- Label is "COOKING"
| | 4m elapsed • ₹180                                 | |
| | - 2x Veg Burger                                   | |
| +---------------------------------------------------+ |
+-------------------------------------------------------+
```

### Billing Orders Sheet Guard (Flutter Mobile App)
```
+-------------------------------------------------------+
| Food Orders                                           |
+-------------------------------------------------------+
| -₹120.00                                  [CANCELLED] |
| 1x Veg Sandwich                                       |
+-------------------------------------------------------+
| -₹180.00                                      [READY] |  <- Ready/Served: No Edit or Cancel buttons!
| 2x Veg Burger                                         |
+-------------------------------------------------------+
| -₹60.00                              [Edit]  [Cancel] |  <- Pending/Cooking: Can Edit or Cancel
| 1x Cold Coffee                                        |
+-------------------------------------------------------+
```

---

## Verification Plan

### Automated Tests
1. Frontend Tests: `npm test -- --run` in `Frontend Money Card` (verify all 298+ tests pass).
2. Frontend Type Check: `npx tsc --noEmit` in `Frontend Money Card`.
3. Flutter Unit Tests: `flutter test` in `Flutter Money card` (verify all 186+ tests pass).
4. Flutter Static Analysis: `flutter analyze --no-pub` in `Flutter Money card` (verify 0 issues).
