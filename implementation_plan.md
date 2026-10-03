# Mobile Staff Roles (Manager vs Kitchen) & Kitchen Display System — Implementation Plan

![Staff Creation Role Selector Modal](file:///C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/staff_role_manager_and_kitchen_plan_1791057619665.jpg)

![Kitchen Order Display and Manager Tracking UI](file:///C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/kitchen_orders_and_manager_tracking_1791057379506.jpg)

## 1. Overview & Architecture

When cafeteria organizations provision staff for their counters, staff members operate in two fundamentally different capacities:
1. **Counter Manager (POS Cashier)**: Handles financial transactions, customer wallet cards (issue, top-up/recharge, return, refund), menu item billing, operational reports, and live order tracking.
2. **Kitchen Staff (Line Cook / Chef)**: Operates the Kitchen Display System (KDS). Views incoming food tickets, prepares dishes according to items and quantities, and marks orders as ready for pickup. They must not have access to wallet recharges, card issuance, cash drawers, or refunds.

Currently, creating a staff member defaults to assigning full manager permissions to everyone. This plan introduces explicit role selection (`Manager` vs `Kitchen`) during staff creation for both Org Admins and Counter Admins, auto-configures role-specific permission presets, and tailors the mobile application experience based on the assigned role.

---

## 2. Role Specifications & Permission Matrix

| Attribute | Counter Manager | Kitchen Staff |
|---|---|---|
| **Primary Responsibility** | POS Billing, Card Wallets, Cash Register, Oversight | Order Preparation, Ticket Dispatch, Menu Awareness |
| **Mobile App Boot Destination** | POS Home / Scanner Screen (`/app/home`) | Kitchen Display System (`/app/kitchen`) |
| **Wallet & Card Operations** | Full (`CARD_VIEW`, `CARD_ISSUE`, `CARD_RETURN`, `CARD_BLOCK`, `CARD_UNBLOCK`) | None (Disabled & Hidden) |
| **Balance Top-Up (Recharge)** | Allowed (`RECHARGE`) | Blocked |
| **POS Menu Billing** | Allowed (`PURCHASE`) | Blocked (Read-only menu access) |
| **Card Returns & Refunds** | Allowed (`REFUND`, `CARD_RETURN`) | Blocked |
| **Kitchen Order Actions** | View Live Queue, Monitor Ready Status, Dispatch | View Tickets, Accept (`PREPARING`), Mark Done (`READY`) |
| **Menu & Catalog Access** | Full Management (`PRODUCT_VIEW`, `PRODUCT_MANAGE`) | View Only (`PRODUCT_VIEW`) |
| **Staff & Counter Oversight** | View & Manage Counter Staff (`STAFF_VIEW`, `STAFF_MANAGE`) | None |
| **Default Permissions** | All 16 M0 Permissions | `PRODUCT_VIEW`, `SESSION_VIEW` |

---

## 3. Order Lifecycle State Machine

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

## 4. ASCII Wireframes

### Wireframe 1: Web Admin Staff Creation Modal (Org Admin & Counter Admin)

```
+--------------------------------------------------------------------------+
| Add New Mobile Staff                                                 [X] |
+--------------------------------------------------------------------------+
| SELECT STAFF ROLE                                                        |
| +----------------------------------+ +---------------------------------+ |
| | [*] Manager                      | | [ ] Kitchen Staff               | |
| | Full POS billing, wallet top-up, | | Kitchen Display System (KDS),   | |
| | card issuance, and returns.      | | order tickets, and preparation. | |
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
| Assigned Role Preset: [ Manager: Full POS Access ]                       |
|                                                                          |
| [ Cancel ]                                         [ Create Mobile Staff ]|
+--------------------------------------------------------------------------+
```

### Wireframe 2: Mobile App — Kitchen Display System (Kitchen Staff View)

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

### Wireframe 3: Mobile App — Counter Manager POS Tracking View

```
+--------------------------------------------------------------------------+
| HOME -- Main Cafeteria Counter                       [Manager: Sarah L.] |
+--------------------------------------------------------------------------+
| [ SCAN QR WALLET / BILL ORDER ]                                          |
+--------------------------------------------------------------------------+
| KITCHEN QUEUE TRACKER                                                    |
| +----------------------------------------------------------------------+ |
| | 2 Preparing        1 Ready for Pickup        1 Pending Kitchen Queue | |
| | [ View Live Orders Queue -> ]                                        | |
| +----------------------------------------------------------------------+ |
|                                                                          |
| Quick Actions:                                                           |
| [ Issue Card ]  [ Recharge Balance ]  [ Settle & Return ]  [ Analytics ]  |
|                                                                          |
| Recent Orders:                                                           |
| * Ticket #102: 2x Veg Burger, 1x Lime Soda -> [PENDING] (02m ago)        |
| * Ticket #101: 1x Paneer Combo, 2x Naan    -> [PREPARING] (06m ago)      |
| * Ticket #100: 1x Cold Coffee              -> [READY TO SERVE]           |
+--------------------------------------------------------------------------+
```

---

## 5. Worktree Implementation Plan

### Phase 1 — Web Admin Staff Creation with Role Selector
- **File**: `Frontend Money Card/src/features/staff/constants.ts`
  - Define `KITCHEN_PERMISSIONS`:
    ```typescript
    export const KITCHEN_PERMISSIONS = [
      'PRODUCT_VIEW',
      'SESSION_VIEW',
    ];
    ```
- **File**: `Frontend Money Card/src/features/staff/StaffPage.tsx`
  - In `Add Staff Modal`:
    - Add segmented role toggle: `roleType: 'MANAGER' | 'KITCHEN'` (defaulting to `'MANAGER'`).
    - When switched to `'KITCHEN'`, auto-populate `formPermissions` with `KITCHEN_PERMISSIONS` and lock financial checkboxes.
    - When switched to `'MANAGER'`, auto-populate `formPermissions` with `MANAGER_PERMISSIONS`.
  - In Staff Table:
    - Add Role column or badge: `Counter Manager` (emerald badge) vs `Kitchen Staff` (blue/slate badge).
    - Add Role filter dropdown alongside Counter filter: `All Roles`, `Manager`, `Kitchen Staff`.
  - In Staff Edit Modal:
    - Allow changing role type between Manager and Kitchen with automatic permission bundle update.
- **File**: `Frontend Money Card/src/features/branches/BranchesPage.tsx`
  - In Counter Details modal, display assigned Counter Managers and Kitchen Staff.
  - Provide a direct action button: `Add Staff` with pre-selected Counter.

### Phase 2 — Backend API: Staff Type & Kitchen Order Management
- **File**: `Backend Money Card/src/validation/user.schema.ts`
  - Add optional `staffType: z.enum(['MANAGER', 'KITCHEN']).optional()` to `createStaffMember` and `updateStaffMember`.
- **File**: `Backend Money Card/src/controllers/staff.controller.ts`
  - Accept `staffType` in payload.
  - If `staffType === 'KITCHEN'`, default permissions to `[PRODUCT_VIEW, SESSION_VIEW]`.
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

### Phase 3 — Flutter Mobile App: Dynamic Routing & KDS Interface
- **File**: `Flutter Money card/lib/models/auth_user.dart`
  - Add helper getters:
    ```dart
    bool get isKitchenStaff =>
        !hasPermission(AppPermission.recharge) &&
        hasPermission(AppPermission.productView);

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
    - For `Kitchen Staff`: Show `Orders` (KDS) and `Menu` (dishes). Hide Wallets, Recharge, and Analytics.
    - For `Manager`: Show full POS navigation tabs (`Home`, `Wallets/Cards`, `Menu`, `Analytics`).
- **New File**: `Flutter Money card/lib/features/kitchen/kitchen_orders_screen.dart`
  - Dedicated Kitchen Display System:
    - Active order queue cards with item breakdown, elapsed time counter, and status buttons.
    - Action "Start Preparing" (`PREPARING`) and "Mark Done" (`READY`).
    - Tab for "Ready for Pickup" orders.
    - Sound or haptic notification on new incoming ticket.
- **File**: `Flutter Money card/lib/features/home/home_screen.dart`
  - For Managers, embed the **Kitchen Queue Tracker** widget below the QR Scan button, showing live counts for Pending, Preparing, and Ready orders.

---

## 6. Verification & Automated Test Plan

1. **Backend Tests (`Backend Money Card`)**:
   - `test/unit/staff_creation_roles.test.ts`: Verify creating staff with `staffType: 'KITCHEN'` assigns only kitchen permissions, while `staffType: 'MANAGER'` assigns full manager permissions.
   - `test/unit/kitchen_orders.test.ts`: Verify daily order number generation, status lifecycle transitions, and counter scoping.
   - Run: `npm test`.
2. **Frontend Tests (`Frontend Money Card`)**:
   - Verify Staff modal role selection properly updates form permissions and submits valid payload.
   - Verify role filter in Staff table.
   - Run: `npx tsc --noEmit` and `npm test -- --run`.
3. **Flutter Tests (`Flutter Money card`)**:
   - Verify `isKitchenStaff` and `isManager` role resolution in `auth_user_test.dart`.
   - Widget tests for `KitchenOrdersScreen`: card display, accept order tap, mark done tap.
   - Run: `flutter test` and `flutter analyze --no-pub`.
