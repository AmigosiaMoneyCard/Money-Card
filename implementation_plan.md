# Mobile Staff Roles, Separated Mobile Login, Kitchen Menu View/Edit & KDS — Implementation Plan

![Kitchen Menu View/Edit and KDS](file:///C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/kitchen_role_menu_edit_and_kds_1791057836219.jpg)

![Mobile Separated Login Flow](file:///C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/mobile_manager_and_kitchen_login_boxes_1791057753070.jpg)

![Staff Creation Role Selector Modal](file:///C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/staff_role_manager_and_kitchen_plan_1791057619665.jpg)

![Kitchen Order Display and Manager Tracking UI](file:///C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/kitchen_orders_and_manager_tracking_1791057379506.jpg)

## 1. Overview & Architecture

When cafeteria staff use the Money Card mobile application, they operate in two distinct capacities:
1. **Counter Manager (POS Cashier)**: Handles financial transactions, customer wallet cards (issue, top-up/recharge, return, refund), menu item billing, operational reports, and live order tracking.
2. **Kitchen Staff (Line Cook / Chef)**: Operates the Kitchen Display System (KDS) and manages menu availability. Views incoming food tickets, prepares dishes according to items and quantities, marks orders as ready, and **views/edits the menu** (toggling dishes in/out of stock, updating prices, dish names, or preparation notes). They must not have access to wallet recharges, card issuance, cash drawers, or refunds.

To make the system seamless and role-tailored:
- The **Mobile App Login Screen** is separated into two explicit role buttons: **Counter Manager** and **Kitchen Staff**.
- Selecting either role button redirects the user to that dedicated **Login Box** (styled and titled specifically for that role, with an easy switch link to change roles).
- The **Web Admin Dashboard** provides explicit role selection (`Manager` vs `Kitchen`) when provisioning staff, auto-configuring permission presets.
- The **Kitchen Role Permissions** include `PRODUCT_VIEW`, `PRODUCT_MANAGE`, and `SESSION_VIEW`, granting full menu view/edit capabilities without financial exposure.
- Upon successful authentication, the mobile app dynamically boots into the appropriate interface:
  - Manager -> POS Billing Home Screen (`/app/home`) with live kitchen queue monitoring.
  - Kitchen Staff -> Kitchen Display System (`/app/kitchen`) with direct access to Menu View & Edit (`/app/products`).

---

## 2. Role Specifications & Permission Matrix

| Attribute | Counter Manager | Kitchen Staff |
|---|---|---|
| **Primary Responsibility** | POS Billing, Card Wallets, Cash Register, Oversight | Order Preparation, Ticket Dispatch, Menu Management |
| **Mobile Login Button** | "Counter Manager" | "Kitchen Staff" |
| **Mobile App Boot Destination** | POS Home / Scanner Screen (`/app/home`) | Kitchen Display System (`/app/kitchen`) |
| **Menu View & Edit** | Full (`PRODUCT_VIEW`, `PRODUCT_MANAGE`) | Full (`PRODUCT_VIEW`, `PRODUCT_MANAGE`) — Toggle In-Stock, Edit Dish |
| **Wallet & Card Operations** | Full (`CARD_VIEW`, `CARD_ISSUE`, `CARD_RETURN`, `CARD_BLOCK`, `CARD_UNBLOCK`) | None (Disabled & Hidden) |
| **Balance Top-Up (Recharge)** | Allowed (`RECHARGE`) | Blocked |
| **POS Menu Billing** | Allowed (`PURCHASE`) | Blocked (Read-only for cashier) |
| **Card Returns & Refunds** | Allowed (`REFUND`, `CARD_RETURN`) | Blocked |
| **Kitchen Order Actions** | View Live Queue, Monitor Ready Status, Dispatch | View Tickets, Accept (`PREPARING`), Mark Done (`READY`) |
| **Staff & Counter Oversight** | View & Manage Counter Staff (`STAFF_VIEW`, `STAFF_MANAGE`) | None |
| **Default Permissions** | All 16 M0 Permissions | `PRODUCT_VIEW`, `PRODUCT_MANAGE`, `SESSION_VIEW` |

---

## 3. Mobile App Separated Login Experience

### Two-Step Role Selection & Login Flow
1. **Role Selection Entry**:
   - The initial login view presents the brand header `MONEY CARD` and two large, high-contrast action buttons:
     - **Counter Manager**: Styled with an emerald POS icon and descriptive subtitle ("POS Billing, Wallets & Reports").
     - **Kitchen Staff**: Styled with a blue KDS/Chef icon and descriptive subtitle ("Kitchen Display, Orders & Menu").
2. **Redirected Login Box**:
   - Tapping **Counter Manager** displays the **Manager Login Box**:
     - Header: "Counter Manager Login"
     - Subtitle: "Enter credentials to access POS billing and card operations"
     - Fields: 10-digit mobile number and password
     - Primary Button: "Login as Manager" (emerald theme)
     - Footer: "Switch to Kitchen Staff" (instant transition back or toggle)
   - Tapping **Kitchen Staff** displays the **Kitchen Staff Login Box**:
     - Header: "Kitchen Display Login"
     - Subtitle: "Enter credentials to access the kitchen queue and menu"
     - Fields: 10-digit mobile number and password
     - Primary Button: "Login to Kitchen" (blue theme)
     - Footer: "Switch to Counter Manager"
3. **Role Enforcement & Intelligent Routing**:
   - On successful login, the system verifies the user's role and permission bundle:
     - If logging in via Manager box: Verifies manager capabilities (`RECHARGE` / `PURCHASE`). Boots directly into POS Home. If a kitchen-only staff user attempts to login here, shows friendly notice: "This account is registered for Kitchen Staff. Redirecting to Kitchen..." and boots into KDS.
     - If logging in via Kitchen box: Verifies kitchen capabilities. Boots directly into Kitchen Display System (`/app/kitchen`).

---

## 4. Order Lifecycle State Machine

```
  [Customer Bills at POS]
             |
             v
      +--------------+
      |   PENDING    |  (Ticket created, order queued in kitchen)
      +--------------+
             |
             | [Kitchen Staff taps "Accept / Start Preparing"]
             v
      +--------------+
      |  PREPARING   |  (Food being cooked/plated in kitchen)
      +--------------+
             |
             | [Kitchen Staff taps "Mark as Ready / Done"]
             v
      +--------------+
      |    READY     |  (Food ready on counter, manager & customer notified)
      +--------------+
             |
             | [Customer collects food / Manager confirms dispatch]
             v
      +--------------+
      |  COMPLETED   |  (Order fulfilled and archived)
      +--------------+
```

---

## 5. ASCII Wireframes

### Wireframe 1: Mobile App Login Role Selector Screen

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
|       |  POS billing, card recharge, returns, and reports        |       |
|       +----------------------------------------------------------+       |
|                                                                          |
|       +----------------------------------------------------------+       |
|       |  [ Kitchen Chef Icon ]                                   |       |
|       |  KITCHEN STAFF                                           |       |
|       |  Kitchen display system, orders queue, and menu control  |       |
|       +----------------------------------------------------------+       |
|                                                                          |
|                              v2.1.0 (Staging)                            |
+--------------------------------------------------------------------------+
```

### Wireframe 2: Redirected Login Boxes (Manager vs Kitchen)

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

### Wireframe 3: Mobile App — Kitchen Menu View & Edit Screen

```
+--------------------------------------------------------------------------+
| MENU CATALOG -- Main Cafeteria Counter                  [+ Add Dish]     |
+--------------------------------------------------------------------------+
| [ Search Menu Items...                                                 ] |
| [ All ]  [ Starters ]  [*] Main Course  [ Beverages ]  [ Desserts ]       |
+--------------------------------------------------------------------------+
| +----------------------------------------------------------------------+ |
| | Veg Biryani Combo                                           Rs 180   | |
| | Status: [ AVAILABLE / IN STOCK [O] ]                                 | |
| | [ Quick Edit ]  [ Edit Dish Details ]                                | |
| +----------------------------------------------------------------------+ |
| +----------------------------------------------------------------------+ |
| | Paneer Butter Masala                                        Rs 160   | |
| | Status: [ SOLD OUT / 86 [X] ]  <- (Tapped by kitchen to stop orders) | |
| | [ Quick Edit ]  [ Edit Dish Details ]                                | |
| +----------------------------------------------------------------------+ |
| +----------------------------------------------------------------------+ |
| | Cold Coffee with Ice Cream                                  Rs 90    | |
| | Status: [ AVAILABLE / IN STOCK [O] ]                                 | |
| | [ Quick Edit ]  [ Edit Dish Details ]                                | |
| +----------------------------------------------------------------------+ |
+--------------------------------------------------------------------------+
| Navigation:  [ Orders (KDS) ]       [*] [ Menu ]        [ Profile ]      |
+--------------------------------------------------------------------------+
```

### Wireframe 4: Web Admin Staff Creation Modal (Org Admin & Counter Admin)

```
+--------------------------------------------------------------------------+
| Add New Mobile Staff                                                 [X] |
+--------------------------------------------------------------------------+
| SELECT STAFF ROLE                                                        |
| +----------------------------------+ +---------------------------------+ |
| | [*] Manager                      | | [ ] Kitchen Staff               | |
| | Full POS billing, wallet top-up, | | Kitchen Display System (KDS),   | |
| | card issuance, and returns.      | | order queue, and menu edit.     | |
| +----------------------------------+ +---------------------------------+ |
|                                                                          |
| Full Name                                                                |
| [ John Doe                                                             ] |
|                                                                          |
| Mobile Number (10 digits)                                                |
| [ 9876543210                                                           ] |
|                                                                          |
| Counter Assignment                                                       |
| [ Main Cafeteria Counter                                             v ] |
|                                                                          |
| Login Password                                                           |
| [ ........                                                             ] |
|                                                                          |
| Assigned Role Preset: [ Kitchen: Orders Queue + Menu View & Edit ]       |
|                                                                          |
| [ Cancel ]                                         [ Create Mobile Staff ]|
+--------------------------------------------------------------------------+
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

## 6. Worktree Implementation Plan

### Phase 1 — Flutter Mobile App: Separated Login Screen with Role Buttons
- **File**: `Flutter Money card/lib/features/auth/login_screen.dart`
  - Introduce `enum MobileLoginMode { roleSelect, manager, kitchen }`.
  - State `MobileLoginMode _loginMode = MobileLoginMode.roleSelect`.
  - **Role Selection View (`MobileLoginMode.roleSelect`)**:
    - Clean brand header and version tag.
    - Two large elevated cards/buttons:
      1. `Counter Manager`: Green icon, title, subtitle. Tapping switches `_loginMode` to `MobileLoginMode.manager`.
      2. `Kitchen Staff`: Blue icon, title, subtitle. Tapping switches `_loginMode` to `MobileLoginMode.kitchen`.
  - **Manager Login Box (`MobileLoginMode.manager`)**:
    - Animated back arrow to return to role select.
    - Title: "Counter Manager Login" with emerald accent.
    - Phone and password fields.
    - Primary button: "Login as Manager".
    - Footer link: "Switch to Kitchen Staff" (switches to kitchen login box directly).
  - **Kitchen Login Box (`MobileLoginMode.kitchen`)**:
    - Animated back arrow to return to role select.
    - Title: "Kitchen Display Login" with blue accent.
    - Phone and password fields.
    - Primary button: "Login to Kitchen".
    - Footer link: "Switch to Counter Manager" (switches to manager login box directly).
  - **Dynamic Post-Login Routing**:
    - In `_handleLogin()`:
      - After authentication succeeds, inspect `authUser.isKitchenStaff`:
        - If `_loginMode == MobileLoginMode.kitchen` or user is Kitchen staff: Route to `/app/kitchen`.
        - If `_loginMode == MobileLoginMode.manager`: Route to `/app/home`.

### Phase 2 — Web Admin Staff Creation with Role Selector & Kitchen Permissions
- **File**: `Frontend Money Card/src/features/staff/constants.ts`
  - Define `KITCHEN_PERMISSIONS`:
    ```typescript
    export const KITCHEN_PERMISSIONS = [
      'PRODUCT_VIEW',
      'PRODUCT_MANAGE',
      'SESSION_VIEW',
    ];
    ```
- **File**: `Frontend Money Card/src/features/staff/StaffPage.tsx`
  - In `Add Staff Modal`:
    - Add segmented role toggle: `roleType: 'MANAGER' | 'KITCHEN'` (defaulting to `'MANAGER'`).
    - When switched to `'KITCHEN'`, auto-populate `formPermissions` with `KITCHEN_PERMISSIONS` (`PRODUCT_VIEW`, `PRODUCT_MANAGE`, `SESSION_VIEW`) and lock financial checkboxes.
    - When switched to `'MANAGER'`, auto-populate `formPermissions` with `MANAGER_PERMISSIONS`.
  - In Staff Table:
    - Add Role column or badge: `Counter Manager` (emerald badge) vs `Kitchen Staff` (blue/slate badge).
    - Add Role filter dropdown alongside Counter filter: `All Roles`, `Manager`, `Kitchen Staff`.
  - In Staff Edit Modal:
    - Allow changing role type between Manager and Kitchen with automatic permission bundle update.
- **File**: `Frontend Money Card/src/features/branches/BranchesPage.tsx`
  - In Counter Details modal, display assigned Counter Managers and Kitchen Staff.
  - Provide a direct action button: `Add Staff` with pre-selected Counter.

### Phase 3 — Backend API: Staff Type, Permissions & Kitchen Order Management
- **File**: `Backend Money Card/src/validation/user.schema.ts`
  - Add optional `staffType: z.enum(['MANAGER', 'KITCHEN']).optional()` to `createStaffMember` and `updateStaffMember`.
- **File**: `Backend Money Card/src/controllers/staff.controller.ts`
  - Accept `staffType` in payload.
  - If `staffType === 'KITCHEN'`, default permissions to:
    `[PermissionCode.PRODUCT_VIEW, PermissionCode.PRODUCT_MANAGE, PermissionCode.SESSION_VIEW]`.
  - If `staffType === 'MANAGER'`, default permissions to full M0 manager permissions.
  - For Counter Admins (`STAFF` role with `STAFF_MANAGE`), strictly enforce that created staff members are assigned exclusively to their own counter branch.
  - Include computed `staffType` (derived from permissions or user metadata) in response payloads.
- **File**: `Backend Money Card/src/controllers/sessions.controller.ts`
  - In `purchaseSession`, assign sequential daily `orderNumber` (e.g. `#101`) to purchase transactions.
  - Include order metadata in `Transaction.items`:
    ```typescript
    {
      orderNumber: sequenceNumber,
      orderStatus: 'PENDING',
      orderedAt: new Date().toISOString(),
      items: itemSummary,
      cardDisplayNumber: session.sessionCardNumber || card.physicalCardNumber,
      counterName: branch.name,
      counterId: branch.id
    }
    ```
- **New File**: `Backend Money Card/src/controllers/kitchen.controller.ts`
  - `getKitchenOrders`: Returns active orders for the caller's assigned counter (`PENDING`, `PREPARING`, `READY`).
  - `updateOrderStatus`: `PATCH /api/kitchen/orders/:transactionId/status`
    - Validates state transitions (`PENDING` -> `PREPARING` -> `READY` -> `COMPLETED`).
    - Enforces counter branch scoping.
- **File**: `Backend Money Card/src/routes/kitchen.routes.ts` & `src/routes/index.ts`
  - Mount `/api/kitchen` routes with `requireAuth` and permission validation.

### Phase 4 — Flutter Mobile App: Dynamic Routing, Menu Management & KDS Interface
- **File**: `Flutter Money card/lib/models/auth_user.dart`
  - Add helper getters:
    ```dart
    bool get isKitchenStaff =>
        !hasPermission(AppPermission.recharge) &&
        (hasPermission(AppPermission.productView) || hasPermission(AppPermission.productManage));

    bool get isManager =>
        hasPermission(AppPermission.recharge) ||
        role == 'ORG_ADMIN' ||
        role == 'SUPER_ADMIN';
    ```
- **File**: `Flutter Money card/lib/routing/app_router.dart`
  - Dynamic initial route based on staff role:
    - If `isKitchenStaff`: Navigate directly to `/app/kitchen`.
    - If `isManager`: Navigate to `/app/home`.
- **File**: `Flutter Money card/lib/widgets/shell/staff_app_shell.dart`
  - Tailor navigation destinations:
    - For `Kitchen Staff`: Show:
      1. `Orders` (`/app/kitchen` — KDS active tickets)
      2. `Menu` (`/app/products` — view menu, toggle in-stock / sold out, edit price and dish details)
      3. `Profile` (account details, counter information, logout)
      - Completely hide Wallets, Recharge, Return/Refund, and Analytics tabs.
    - For `Manager`: Show full POS navigation tabs (`Home`, `Wallets/Cards`, `Menu`, `Analytics`).
- **File**: `Flutter Money card/lib/features/products/products_screen.dart`
  - Ensure Kitchen Staff can comfortably:
    - Tap on stock status toggle to mark dishes as "Available / In Stock" or "Sold Out / 86".
    - Edit dish name, price, and category.
- **New File**: `Flutter Money card/lib/features/kitchen/kitchen_orders_screen.dart`
  - Dedicated Kitchen Display System:
    - Active order queue cards with item breakdown, elapsed time counter, and status buttons.
    - Action "Start Preparing" (`PREPARING`) and "Mark Done" (`READY`).
    - Tab for "Ready for Pickup" orders.
    - Sound or haptic notification on new incoming ticket.
- **File**: `Flutter Money card/lib/features/home/home_screen.dart`
  - For Managers, embed the **Kitchen Queue Tracker** widget below the QR Scan button, showing live counts for Pending, Preparing, and Ready orders.

---

## 7. Verification & Automated Test Plan

1. **Flutter Mobile Tests (`Flutter Money card`)**:
   - `test/features/auth/login_screen_test.dart`:
     - Verify initial view displays 2 role selection buttons: "Counter Manager" and "Kitchen Staff".
     - Verify tapping "Counter Manager" redirects to Manager Login Box with "Login as Manager" button.
     - Verify tapping "Kitchen Staff" redirects to Kitchen Login Box with "Login to Kitchen" button.
     - Verify "Switch to..." link toggles between boxes.
     - Verify back button returns to the 2 role buttons.
   - `test/features/products/kitchen_menu_edit_test.dart`:
     - Verify kitchen staff user can view products list and toggle availability.
     - Verify kitchen staff cannot access recharge or return screens.
   - Run: `flutter test` and `flutter analyze --no-pub`.
2. **Backend Tests (`Backend Money Card`)**:
   - `test/unit/staff_creation_roles.test.ts`: Verify creating staff with `staffType: 'KITCHEN'` assigns `PRODUCT_VIEW`, `PRODUCT_MANAGE`, and `SESSION_VIEW`, and excludes recharge/return permissions.
   - `test/unit/kitchen_orders.test.ts`: Verify daily order number generation, status lifecycle transitions, and counter scoping.
   - Run: `npm test`.
3. **Frontend Tests (`Frontend Money Card`)**:
   - Verify Staff modal role selection properly updates form permissions and submits valid payload.
   - Verify role filter in Staff table.
   - Run: `npx tsc --noEmit` and `npm test -- --run`.
