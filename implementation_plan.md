# Implementation Plan — Kitchen Operations & Customer PWA Enhancements

## Overview
Implement operational business logic across the Mobile POS app (`Flutter Money card`), Customer PWA portal (`Frontend Money Card`), and Backend API (`Backend Money Card`):

1. **Counter Manager Dashboard — Food Preparation Progress**:
   - Reorder stage pills to logical flow: `Queued` -> `In Progress` -> `Finished`.
   - Remove active order preview box from the widget to display only clean stage counts without displaying specific preparing items in the dashboard tab.
2. **Kitchen Display System (KDS)**:
   - **Undo / Recall Completed Orders**: Provide a 5-minute undo option on tickets marked Ready/Done to return them back into active cooking.
   - **Prep Time Tracking & Kitchen Analytics**: Compute elapsed duration between `orderedAt` and `readyAt` to calculate average prep time and display individual ticket prep times.
   - **Ready Audio Notification Chime**: Play a notification sound when an order reaches `READY` status.
3. **Customer PWA (Web Portal)**:
   - **Live Order & Token Status Tracker**: Display customer's active food tokens and live prep stages (`In Queue` -> `Cooking` -> `Ready for Pickup`).
   - **Real-Time Digital Menu & Dietary Viewer**: Allow customers to browse available menu items, prices, and Veg/Non-Veg tags on their phone.
   - **Low Balance Alert & Digital Statements**: Highlight a low-balance warning banner when balance is below ₹100, with itemized statement/receipt viewing.
4. **Backend API**:
   - Provide public customer endpoints for live session orders and branch menu items.

---

## Visual Design Reference

![Kitchen Operations & Customer PWA Enhancements](C:\Users\damie\.gemini\antigravity-ide\brain\218ce084-c8ce-49ca-a93b-bc0ce2200b0c\kitchen_kds_pwa_live_tracker_ui_1791123423751.jpg)

---

## ASCII Wireframes

### 1. Counter Manager Dashboard — Clean Food Progress Widget
```text
+-------------------------------------------------------------+
| [Kitchen] Food Preparation Progress          Live Tracker > |
|                                                             |
| +-----------------+   +-----------------+   +-------------+ |
| | 4               |   | 2               |   | 6           | |
| | Queued          |   | In Progress     |   | Finished    | |
| | Pending queue   |   | Cooking         |   | Ready pickup| |
| +-----------------+   +-----------------+   +-------------+ |
+-------------------------------------------------------------+
(Active order items preview removed for a clean dashboard view)
```

### 2. Mobile KDS — Average Prep Time & Undo Recall
```text
+-------------------------------------------------------------+
| Kitchen Display System       Avg Prep: 6m     [Audio: ON]   |
+-------------------------------------------------------------+
| Ticket #104                      Card: 104    [READY / DONE]|
| Prepped in 7m • Counter 1                                   |
| - 2x Masala Dosa                                            |
| - 1x Filter Coffee                                          |
|                                                             |
| [ Undo / Return to Cooking ]                                |
+-------------------------------------------------------------+
```

### 3. Customer PWA Portal — Live Token Tracker & Low Balance Warning
```text
+-------------------------------------------------------------+
| Customer Wallet: CARD-104                       [ ACTIVE ]  |
| Current Balance: ₹65.00                                     |
|                                                             |
| ! LOW BALANCE ALERT: Balance is below ₹100.                  |
|   Please visit the counter to recharge before ordering.     |
|                                                             |
| +---------------------------------------------------------+ |
| | ACTIVE TOKEN: #104                    [READY FOR PICKUP]| |
| | Your order is ready at Counter 1!                       | |
| | - 2x Masala Dosa, 1x Filter Coffee                      | |
| +---------------------------------------------------------+ |
|                                                             |
| [ View Digital Menu ]           [ Transaction History ]     |
+-------------------------------------------------------------+
```

---

## Step-by-Step Implementation Worktree Changes

### Mobile POS Sub-Project (`Flutter Money card/`)

#### 1. [food_progress_widget.dart](file:///d:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/home/food_progress_widget.dart)
- Reorder stage count boxes in the `Row`:
  1. `Queued` (`pendingCount`)
  2. `In Progress` (`preparingCount`)
  3. `Finished` (`readyCount`)
- Remove the "Active Order Preview" card (`if (latestOrder != null) ...`) so specific preparing items are not shown in this summary tab.

#### 2. [kitchen_orders_screen.dart](file:///d:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/kitchen/kitchen_orders_screen.dart)
- In the AppBar / Header: Display average preparation time calculated across ready/completed orders (e.g. `Avg Prep: 6m`).
- In `_buildKitchenOrderCard`:
  - When `order.isReady`:
    - Display duration badge: `Prepped in ${order.prepTimeMinutes}m`.
    - Provide an `Undo / Return to Cooking` button that invokes `notifier.updateStatus(order.transactionId, 'PREPARING')`.
- When an order transitions to `READY`, play an alert notification sound.

#### 3. [kitchen_order.dart](file:///d:/Money%20Card%20Project/Flutter%20Money%20card/lib/models/kitchen_order.dart)
- Add helper getter `int get prepTimeMinutes`:
  - If `readyAt != null`, calculates `readyAt!.difference(orderedAt).inMinutes`.
  - Fallback to `elapsedMinutes`.

#### 4. [kitchen_orders_provider.dart](file:///d:/Money%20Card%20Project/Flutter%20Money%20card/lib/providers/kitchen_orders_provider.dart)
- Track average prep time in `KitchenOrdersState`: `double get averagePrepMinutes`.
- In `loadOrders`, detect when any ticket transitions to `READY` and trigger notification sound (`SystemSound.play(SystemSoundType.alert)`).

---

### Web PWA Sub-Project (`Frontend Money Card/`)

#### 1. [PortalSessionPage.tsx](file:///d:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/portal/PortalSessionPage.tsx)
- Add Low Balance Warning banner if `sessionDetail.currentBalance < 100`.
- Fetch active session orders via `apiService.userPortal.getPublicSessionOrders(sessionToken)`.
- Render **Live Token Tracker Card**:
  - Token number (`Token #104`)
  - Live status indicator:
    - `QUEUED`: "Order in Kitchen Queue" (amber badge)
    - `PREPARING`: "Cooking in Kitchen" (blue badge)
    - `READY`: "Ready for Pickup!" (pulsing green highlight with counter name)
- Add button and modal for **View Digital Menu**:
  - Displays cafeteria products with price, stock status, and Veg / Non-Veg dietary badges.

#### 2. [api/index.ts](file:///d:/Money%20Card%20Project/Frontend%20Money%20Card/src/services/api/index.ts) & [userPortal.ts](file:///d:/Money%20Card%20Project/Frontend%20Money%20Card/src/types/userPortal.ts)
- Add API methods and types for:
  - `getPublicSessionOrders(sessionToken)`
  - `getPublicSessionMenu(sessionToken)`

---

### Backend Engine Sub-Project (`Backend Money Card/`)

#### 1. [public.controller.ts](file:///d:/Money%20Card%20Project/Backend%20Money%20Card/src/controllers/public.controller.ts)
- Implement `getPublicSessionOrders(req, res)`:
  - Finds purchase transactions for the active session token.
  - Extracts items, token number (`orderNumber`), live status (`orderStatus`), `orderedAt`, `preparingAt`, and `readyAt`.
- Implement `getPublicSessionMenu(req, res)`:
  - Resolves session's branch and organization.
  - Returns active products with name, price, category tags (Veg, Non-Veg, Beverage), and stock status.

#### 2. [public.routes.ts](file:///d:/Money%20Card%20Project/Backend%20Money%20Card/src/routes/public.routes.ts)
- Add routes:
  - `GET /sessions/:sessionToken/orders` -> `getPublicSessionOrders`
  - `GET /sessions/:sessionToken/menu` -> `getPublicSessionMenu`

---

## Verification Plan

### Automated Verification
- Run `flutter analyze --no-pub` in `Flutter Money card` (verify zero lint or type errors).
- Run `flutter test` in `Flutter Money card` (verify all 181 mobile tests pass).
- Run `npx tsc --noEmit` and `npm test -- --run` in `Frontend Money Card` (verify 297 web tests pass).
- Run `npm test` in `Backend Money Card` (verify 124 backend tests pass).

### Manual Verification
- In Mobile App:
  - Counter Manager Dashboard: Verify `Queued`, `In Progress`, `Finished` stage order and confirm active order preview items are removed.
  - KDS: Mark an order Ready, verify "Prepped in Xm" and test the "Undo / Return to Cooking" button. Verify notification chime sounds.
- In PWA Customer Portal:
  - Confirm Low Balance warning displays when balance is below ₹100.
  - Confirm active orders show live token status (Queued, Cooking, Ready).
  - Open Digital Menu and verify Veg/Non-Veg tags and items display properly.
