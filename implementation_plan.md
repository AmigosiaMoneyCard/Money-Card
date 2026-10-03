# Mobile Staff Roles, Separated Login, Manager Food Progress Tracking & KDS — Implementation Plan

![Manager Dashboard Food Progress Tracking](file:///C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/manager_dashboard_food_progress_tracking_1791057966898.jpg)

![Kitchen Menu View/Edit and KDS](file:///C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/kitchen_role_menu_edit_and_kds_1791057836219.jpg)

![Mobile Separated Login Flow](file:///C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/mobile_manager_and_kitchen_login_boxes_1791057753070.jpg)

![Staff Creation Role Selector Modal](file:///C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/staff_role_manager_and_kitchen_plan_1791057619665.jpg)

## 1. Overview & Architecture

When cafeteria staff use the Money Card mobile application, they operate in two distinct capacities:
1. **Counter Manager (POS Cashier)**: Handles financial transactions, customer wallet cards (issue, top-up/recharge, return, refund), menu item billing, operational reports, and **live food progress tracking** (monitoring which orders are In Progress vs Finished/Ready).
2. **Kitchen Staff (Line Cook / Chef)**: Operates the Kitchen Display System (KDS) and manages menu availability. Views incoming food tickets, prepares dishes according to items and quantities, marks orders as ready, and **views/edits the menu** (toggling dishes in/out of stock, updating prices, dish names, or preparation notes). They must not have access to wallet recharges, card issuance, cash drawers, or refunds.

---

## 2. Where Managers See Food Progress in Mobile App

The Counter Manager has visibility into real-time food progress across three distinct locations in the mobile application:

### Location 1: Manager Home Dashboard (`HomeScreen`)
Directly below the large **SCAN QR WALLET** button and above Today's Sales, a dedicated **Food Preparation Progress** interactive card displays:
- **Real-Time Status Counters**:
  - **In Progress (Cooking)**: Amber badge showing active tickets currently being prepared by kitchen staff (e.g. `2 In Progress`).
  - **Finished / Ready**: High-contrast emerald badge showing orders finished and waiting for customer pickup at the counter (e.g. `1 Finished / Ready`).
  - **Queued / Pending**: Slate badge showing orders placed and waiting for kitchen line pickup (e.g. `1 Queued`).
- **Live Preview Carousel / Card**: Displays the latest active ticket with order number, ordered dishes, elapsed cooking time, and current status pill.
- **View All Orders CTA**: Tapping anywhere on this card navigates directly into the full Live Order Tracker.

### Location 2: Dedicated Live Order Tracker Screen (`/app/orders-tracker`)
Accessible via the Home Screen widget or the top AppBar icon, this full-screen manager tracker provides:
- **Segmented Filter Tabs**:
  - `In Progress`: Lists all orders currently cooking in the kitchen with live timer counter and item checklist.
  - `Finished / Ready`: Lists all orders marked as ready by the kitchen. Each card has a prominent emerald button: **Confirm Handover / Complete** so the cashier can mark the order dispatched when handed to the customer.
  - `All Orders`: Chronological log of all orders for the current counter shift.
- **Real-Time Synchronization**: Instantly updates via SSE/WebSocket/auto-poll whenever kitchen staff advances status.

### Location 3: Customer Session & Receipt Details Screen (`/app/sessions/:id`)
When the manager looks up any customer's active session or past transaction:
- The purchase record displays an itemized **Food Preparation Status** badge:
  - `[IN PROGRESS - Cooking (04m elapsed)]`
  - `[FINISHED / READY - Waiting for Customer Pickup]`
  - `[COMPLETED - Handed Over]`

---

## 3. Role Specifications & Permission Matrix

| Attribute | Counter Manager | Kitchen Staff |
|---|---|---|
| **Primary Responsibility** | POS Billing, Card Wallets, Cash Register, Food Progress Oversight | Order Preparation, Ticket Dispatch, Menu Management |
| **Mobile Login Button** | "Counter Manager" | "Kitchen Staff" |
| **Mobile App Boot Destination** | POS Home / Scanner Screen (`/app/home`) | Kitchen Display System (`/app/kitchen`) |
| **Food Progress Tracking** | View Live Queue, In Progress & Finished Badges, Confirm Handover | Receive Tickets, Accept (`PREPARING`), Mark Done (`READY`) |
| **Menu View & Edit** | Full (`PRODUCT_VIEW`, `PRODUCT_MANAGE`) | Full (`PRODUCT_VIEW`, `PRODUCT_MANAGE`) — Toggle In-Stock, Edit Dish |
| **Wallet & Card Operations** | Full (`CARD_VIEW`, `CARD_ISSUE`, `CARD_RETURN`, `CARD_BLOCK`, `CARD_UNBLOCK`) | None (Disabled & Hidden) |
| **Balance Top-Up (Recharge)** | Allowed (`RECHARGE`) | Blocked |
| **POS Menu Billing** | Allowed (`PURCHASE`) | Blocked (Read-only for cashier) |
| **Card Returns & Refunds** | Allowed (`REFUND`, `CARD_RETURN`) | Blocked |
| **Staff & Counter Oversight** | View & Manage Counter Staff (`STAFF_VIEW`, `STAFF_MANAGE`) | None |
| **Default Permissions** | All 16 M0 Permissions | `PRODUCT_VIEW`, `PRODUCT_MANAGE`, `SESSION_VIEW` |

---

## 4. Mobile App Separated Login Experience

### Two-Step Role Selection & Login Flow
1. **Role Selection Entry**:
   - The initial login view presents the brand header `MONEY CARD` and two large action buttons:
     - **Counter Manager**: Styled with an emerald POS icon and descriptive subtitle ("POS Billing, Wallets & Reports").
     - **Kitchen Staff**: Styled with a blue KDS/Chef icon and descriptive subtitle ("Kitchen Display, Orders & Menu").
2. **Redirected Login Box**:
   - Tapping **Counter Manager** displays the **Manager Login Box**:
     - Header: "Counter Manager Login"
     - Subtitle: "Enter credentials to access POS billing and card operations"
     - Primary Button: "Login as Manager" (emerald theme)
     - Footer: "Switch to Kitchen Staff"
   - Tapping **Kitchen Staff** displays the **Kitchen Staff Login Box**:
     - Header: "Kitchen Display Login"
     - Subtitle: "Enter credentials to access the kitchen queue and menu"
     - Primary Button: "Login to Kitchen" (blue theme)
     - Footer: "Switch to Counter Manager"
3. **Role Enforcement & Intelligent Routing**:
   - Manager login boots into POS Home (`/app/home`) with food progress tracking widget.
   - Kitchen login boots into Kitchen Display System (`/app/kitchen`).

---

## 5. Order Lifecycle State Machine

```
  [Customer Bills at POS]
             |
             v
      +--------------+
      |   PENDING    |  (Queued in kitchen, manager sees: "1 Queued")
      +--------------+
             |
             | [Kitchen Staff taps "Accept / Start Preparing"]
             v
      +--------------+
      |  PREPARING   |  (Cooking, manager sees: "In Progress (Cooking)")
      +--------------+
             |
             | [Kitchen Staff taps "Mark as Ready / Done"]
             v
      +--------------+
      |    READY     |  (Food plated on counter, manager sees: "Finished / Ready")
      +--------------+
             |
             | [Manager hands food to customer & taps "Confirm Handover"]
             v
      +--------------+
      |  COMPLETED   |  (Order fulfilled and archived)
      +--------------+
```

---

## 6. ASCII Wireframes

### Wireframe 1: Manager Home Dashboard with Food Progress Tracking Widget

```
+--------------------------------------------------------------------------+
| HOME -- Main Cafeteria Counter                       [Manager: Sarah L.] |
+--------------------------------------------------------------------------+
|                                                                          |
|       +----------------------------------------------------------+       |
|       |                     [ QR SCAN ICON ]                     |       |
|       |                     SCAN QR WALLET                       |       |
|       |            Scan wallet to bill order or check balance    |       |
|       +----------------------------------------------------------+       |
|                                                                          |
| FOOD PREPARATION PROGRESS                         [ View All Orders -> ] |
| +----------------------------------------------------------------------+ |
| |  [ 2 In Progress ]        [ 1 Finished / Ready ]       [ 1 Queued ]  | |
| |  (Cooking in kitchen)     (Ready on counter)           (Pending)     | |
| | -------------------------------------------------------------------- | |
| |  Active Order Preview:                                               | |
| |  Ticket #102: Veg Biryani Combo               [ IN PROGRESS (04m) ]  | |
| |  Ticket #101: Paneer Butter Masala            [ FINISHED / READY ]   | |
| +----------------------------------------------------------------------+ |
|                                                                          |
| Today's Sales: Rs 14,250              Transactions: 48 orders            |
+--------------------------------------------------------------------------+
| Navigation:  [*] [ Home ]   [ Cards/Wallets ]   [ Menu ]   [ Analytics ] |
+--------------------------------------------------------------------------+
```

### Wireframe 2: Full-Screen Live Order Tracker (`/app/orders-tracker`)

```
+--------------------------------------------------------------------------+
| [<- Back]                     LIVE ORDER TRACKER                         |
+--------------------------------------------------------------------------+
| [*] In Progress (2)         | [ ] Finished / Ready (1)   | [ ] All (48)  |
+--------------------------------------------------------------------------+
| Order #102                                                  Elapsed: 04m |
| Customer: MC-402 (John D.)                                               |
| ------------------------------------------------------------------------ |
|   [v] 1x Veg Biryani Combo                                               |
|   [v] 1x Fresh Lime Soda                                                 |
| ------------------------------------------------------------------------ |
| Status: IN PROGRESS (Kitchen preparing)                                  |
+--------------------------------------------------------------------------+
| Order #101                                                  Elapsed: 08m |
| Customer: MC-109 (Alex R.)                                               |
| ------------------------------------------------------------------------ |
|   [v] 1x Paneer Butter Masala Combo                                      |
|   [v] 2x Butter Naan                                                     |
| ------------------------------------------------------------------------ |
| Status: FINISHED / READY (Plated on counter)                             |
| [ CONFIRM HANDOVER / COMPLETE ]  <- (Tapped by cashier when given)       |
+--------------------------------------------------------------------------+
```

### Wireframe 3: Mobile App Login Role Selector Screen

```
+--------------------------------------------------------------------------+
|                              MONEY CARD                                  |
|                         Modern POS Management                            |
|                                                                          |
|               Select your workspace role to continue:                    |
|                                                                          |
|       +----------------------------------------------------------+       |
|       |  [ POS Terminal Icon ]                                   |       |
|       |  COUNTER MANAGER                                         |       |
|       |  POS billing, card recharge, food progress & reports     |       |
|       +----------------------------------------------------------+       |
|                                                                          |
|       +----------------------------------------------------------+       |
|       |  [ Kitchen Chef Icon ]                                   |       |
|       |  KITCHEN STAFF                                           |       |
|       |  Kitchen display system, order queue & menu control      |       |
|       +----------------------------------------------------------+       |
|                                                                          |
|                              v2.1.0 (Staging)                            |
+--------------------------------------------------------------------------+
```

### Wireframe 4: Redirected Login Boxes (Manager vs Kitchen)

```
+------------------------------------+   +------------------------------------+
| [<- Back]       MONEY CARD         |   | [<- Back]       MONEY CARD         |
|                                    |   |                                    |
| +--------------------------------+ |   | +--------------------------------+ |
| | Counter Manager Login          | |   | | Kitchen Display Login          | |
| | POS Billing & Cash Management  | |   | | KDS Orders & Menu Control      | |
| |                                | |   | |                                | |
| | Phone Number                   | |   | | Phone Number                   | |
| | [ 9876543210                 ] | |   | | [ 9876543210                 ] | |
| |                                | |   | |                                | |
| | Password                       | |   | | Password                       | |
| | [ ........                   ] | |   | | [ ........                   ] | |
| |                                | |   | |                                | |
| | [     LOGIN AS MANAGER     ]   | |   | | [     LOGIN TO KITCHEN     ]   | |
| +--------------------------------+ |   | +--------------------------------+ |
|                                    |   |                                    |
|    Switch to Kitchen Staff ->      |   |    Switch to Counter Manager ->    |
+------------------------------------+   +------------------------------------+
```

### Wireframe 5: Mobile App — Kitchen Display System (Kitchen Staff View)

```
+--------------------------------------------------------------------------+
| KITCHEN DISPLAY -- Main Cafeteria Counter                   [Status: Live] |
+--------------------------------------------------------------------------+
| [ Active Orders (3) ]             |             [ Ready for Pickup (2) ]  |
+--------------------------------------------------------------------------+
| Ticket #102                 Card: MC-402                    Elapsed: 02m |
| Status: PENDING                                                          |
| ------------------------------------------------------------------------ |
|   * 2x Veg Burger                                                        |
|   * 1x Fresh Lime Soda                                                   |
| ------------------------------------------------------------------------ |
| [ START PREPARING ]                                                      |
+--------------------------------------------------------------------------+
| Ticket #101                 Card: MC-109                    Elapsed: 06m |
| Status: PREPARING                                                        |
| ------------------------------------------------------------------------ |
|   * 1x Paneer Butter Masala Combo                                        |
|   * 2x Butter Naan                                                       |
| ------------------------------------------------------------------------ |
| [ MARK AS READY / DONE ]                                                 |
+--------------------------------------------------------------------------+
```

---

## 7. Worktree Implementation Plan

### Phase 1 — Flutter Mobile App: Manager Dashboard Food Progress Widget & Order Tracker
- **File**: `Flutter Money card/lib/features/home/home_screen.dart`
  - Insert `FoodPreparationProgressWidget` directly below `SCAN QR WALLET` container:
    - Display 3 status metric cards:
      - `In Progress` (amber/orange theme, count of orders in `PREPARING` state)
      - `Finished / Ready` (emerald green theme, count of orders in `READY` state)
      - `Queued` (slate gray theme, count of orders in `PENDING` state)
    - Active order preview card: show ticket #, elapsed timer, dish names, and status chip.
    - Tap handler: navigates to `/app/orders-tracker`.
- **New File**: `Flutter Money card/lib/features/orders/live_order_tracker_screen.dart`
  - Segmented tabs: `In Progress`, `Finished / Ready`, `All Orders`.
  - For `Finished / Ready` tickets, provide "Confirm Handover / Complete" button that transitions status to `COMPLETED`.
- **File**: `Flutter Money card/lib/features/sessions/session_details_screen.dart`
  - In purchase transaction cards, render food preparation status chip (`PENDING`, `PREPARING`, `READY`, `COMPLETED`).
- **File**: `Flutter Money card/lib/providers/kitchen_orders_provider.dart`
  - Provide `activeOrdersCountProvider`, `preparingOrdersCountProvider`, and `readyOrdersCountProvider` for immediate reactive updates on the Manager Home Screen.

### Phase 2 — Flutter Mobile App: Separated Login Screen with Role Buttons
- **File**: `Flutter Money card/lib/features/auth/login_screen.dart`
  - State `MobileLoginMode _loginMode = MobileLoginMode.roleSelect`.
  - Two primary buttons: `Counter Manager` and `Kitchen Staff`.
  - Redirected Manager Login Box and Kitchen Login Box.
  - Role guard and dynamic navigation to `/app/home` or `/app/kitchen`.

### Phase 3 — Web Admin Staff Creation with Role Selector & Kitchen Permissions
- **File**: `Frontend Money Card/src/features/staff/constants.ts`
  - Define `KITCHEN_PERMISSIONS`: `['PRODUCT_VIEW', 'PRODUCT_MANAGE', 'SESSION_VIEW']`.
- **File**: `Frontend Money Card/src/features/staff/StaffPage.tsx`
  - Add role toggle: `Manager` vs `Kitchen Staff` in Add Staff Modal.
  - Auto-populate permissions and add role badge/filter to staff table.

### Phase 4 — Backend API: Staff Type, Permissions & Kitchen Order Management
- **File**: `Backend Money Card/src/controllers/staff.controller.ts`
  - Support `staffType: 'MANAGER' | 'KITCHEN'`.
- **File**: `Backend Money Card/src/controllers/sessions.controller.ts`
  - Assign daily `orderNumber` to purchases and store order metadata.
- **New File**: `Backend Money Card/src/controllers/kitchen.controller.ts`
  - `getKitchenOrders` and `updateOrderStatus` with counter branch scoping.
- **File**: `Backend Money Card/src/routes/kitchen.routes.ts` & `src/routes/index.ts`
  - Mount `/api/kitchen` routes.

---

## 8. Verification & Automated Test Plan

1. **Flutter Mobile Tests (`Flutter Money card`)**:
   - `test/features/home/food_progress_widget_test.dart`:
     - Verify Food Progress Widget renders on Manager Home Screen.
     - Verify correct counts for `In Progress`, `Finished / Ready`, and `Queued`.
     - Verify tapping "View All Orders" opens `LiveOrderTrackerScreen`.
   - `test/features/orders/live_order_tracker_test.dart`:
     - Verify tab filtering for `In Progress` and `Finished / Ready`.
     - Verify "Confirm Handover / Complete" button dispatches order completion.
   - `test/features/auth/login_screen_test.dart`:
     - Verify 2 role buttons and redirected login boxes.
   - Run: `flutter test` and `flutter analyze --no-pub`.
2. **Backend Tests (`Backend Money Card`)**:
   - `test/unit/kitchen_orders.test.ts`:
     - Test order status flow: `PENDING` -> `PREPARING` (In Progress) -> `READY` (Finished) -> `COMPLETED` (Dispatched).
     - Test order query counter branch scoping.
   - Run: `npm test`.
3. **Frontend Tests (`Frontend Money Card`)**:
   - Run: `npx tsc --noEmit` and `npm test -- --run`.
