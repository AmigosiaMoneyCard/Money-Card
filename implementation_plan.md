# Implementation Plan — Super Admin Organization Label Alignment & Mobile Staff Menu Active/Inactive Toggle

Update the Super Admin Dashboard terminology from Cafeteria to Organization, and empower staff members to set menu products Active/Inactive directly in the mobile application.

## User Requirements
1. **Super Admin Dashboard**: Change "Cafeteria" / "Cafeterias" labels to "Organization" / "Organizations" (Quick Action button, KPI StatCard, Action Needed notices).
2. **Mobile App Menu Permissions & Controls**: Give staff permission to set menu items Active/Inactive in the mobile app, with instant switch toggling and backend/mock permission enablement.
3. **Plan Update**: Maintain and update `implementation_plan.md`.

---

## Proposed Changes

### 1. Super Admin Dashboard (Web Frontend)
File: `Frontend Money Card/src/features/dashboard/SuperAdminDashboard.tsx`
- **Quick Action Button**: Change `'Add Cafeteria'` to `'Add Organization'`.
- **Primary Metric Card**: Change `label="Cafeterias"` to `label="Organizations"`.
- **Urgent Action Notice**:
  - Update `'A cafeteria requested plan renewal'` to `'An organization requested plan renewal'`.
  - Update `'Cafeterias submitted plan changes requiring your approval.'` to `'Organizations submitted plan changes requiring your approval.'`.

### 2. Staff Menu Active/Inactive Permission & Fast Toggle (Mobile App)
File: `Flutter Money card/lib/providers/pos_cart_provider.dart`
- In `loadProducts()`: Remove hardcoded `status: 'ACTIVE'` query parameter so all menu items (both ACTIVE and INACTIVE) for the branch are loaded into `PosCatalogState.products`.
- In `PosCatalogState`:
  - Preserve `filteredProducts` (filtering `status.toUpperCase() == 'ACTIVE'`) for the POS billing checkout flow so inactive items cannot be ordered.
  - Provide `managementProducts` / `allFilteredProducts` getters (applying category & search filters across both active and inactive products) for the Menu management view.

File: `Flutter Money card/lib/features/products/products_screen.dart`
- Switch list source to `catalogState.managementProducts` so staff can see both active and inactive menu items.
- On each product card:
  - Add an inline adaptive Switch (`Switch.adaptive`) alongside the status badge.
  - When toggled, call `productRepository.updateProduct(id: product.id, status: newStatus)`.
  - Provide immediate feedback via a SnackBar confirming the status change.
  - Refresh catalog so the item reflects the updated state instantly.
- In `_showEditProductBottomSheet`: Ensure the status ChoiceChips (`ACTIVE (Available)` vs `INACTIVE (Hidden)`) function smoothly and allow staff to save status changes.

File: `Flutter Money card/lib/core/network/interceptors/mock_api_interceptor.dart`
- Add PUT / PATCH handler for `/products/:id` (`ApiEndpoints.products`).
- Grant permission to update status to users having either `AppPermission.productManage` OR `AppPermission.productView` (or role `STAFF`).
- Update `mockProducts` in-memory state with the updated status, price, category, or itemName.

### 3. Backend API Permissions for Staff Menu Status
File: `Backend Money Card/src/routes/products.routes.ts`
- Update `PATCH /products/:id` and `PUT /products/:id` route guards from `requirePermission(PermissionCode.PRODUCT_MANAGE)` to `requireAnyPermission(PermissionCode.PRODUCT_MANAGE, PermissionCode.PRODUCT_VIEW)`.
- This ensures counter staff with `PRODUCT_VIEW` or `PRODUCT_MANAGE` are authorized to toggle product availability (active/inactive) without requiring full admin privilege.

### 4. Staff Daily Activity & Mobile Recharge Enhancements (Previously Staged)
- Web Staff Daily Activity Summary: "Wallet issued" and "Wallet closed" with card name/number.
- Mobile Recharge: Explicit selection between Cash and UPI with prominent, high-contrast selectable UI cards.
- Mobile Recharges History: "Cannot Void" guard when top-up cannot be cancelled.

---

## ASCII Wireframes

### 1. Super Admin Dashboard (After Terminology Alignment)
```
+------------------------------------------------------------------------------------+
| Welcome back, Super Admin                                         [ Refresh ]     |
+------------------------------------------------------------------------------------+
| [!] Action Needed: 1 Request Awaiting Approval                            [URGENT] |
| An organization requested plan renewal. Tap to approve.      [ Review Requests -> ]|
+------------------------------------------------------------------------------------+
| Quick Actions:                                                                     |
| +-------------------+  +-------------------+  +-----------------+  +-------------+ |
| | [+] Add           |  | [!] Review        |  | [#] Manage      |  | [=] View    | |
| |     Organization  |  |     Requests      |  |     Plans       |  |     Reports | |
| +-------------------+  +-------------------+  +-----------------+  +-------------+ |
+------------------------------------------------------------------------------------+
| SaaS Platform Metrics:                                                             |
| +-------------------+  +-------------------+  +-----------------+  +-------------+ |
| | Organizations [#] |  | Active Cardh. [@] |  | Active Count.[#]|  | Staff [@#]  | |
| | 2                 |  | 2                 |  | 2               |  | 4           | |
| +-------------------+  +-------------------+  +-----------------+  +-------------+ |
+------------------------------------------------------------------------------------+
```

### 2. Mobile App Menu Screen (Products & Menu) with Staff Active/Inactive Toggle
```
+----------------------------------------------------+
| Products & Menu                                    |
+----------------------------------------------------+
| [ Q Search products by name...                   ] |
| [ All ] [ Veg ] [ Non-Veg ] [ Drinks ]             |
+----------------------------------------------------+
| +------------------------------------------------+ |
| | [Food]  Veg Fried Rice         [ACTIVE] ( O)   | |  <-- Switch toggles ACTIVE / INACTIVE
| |         ₹120.00                   [Edit]       | |
| |         [Veg] [Rice]                           | |
| +------------------------------------------------+ |
| +------------------------------------------------+ |
| | [Food]  Cold Coffee           [INACTIVE] (O )  | |  <-- Inactive item visible to staff
| |         ₹60.00                    [Edit]       | |
| |         [Drinks]                               | |
| +------------------------------------------------+ |
+----------------------------------------------------+
|                                [+ Add Menu Item]   |
+----------------------------------------------------+
```

---

## Verification Plan

### Automated Tests
1. **Frontend Money Card**:
   - `npm run type-check` (verify 0 TypeScript compiler errors).
   - `npm run test` (verify all 284 vitest unit tests pass).
2. **Backend Money Card**:
   - `npm run build` or `npm run typecheck` (verify TypeScript compilation).

### Manual Verification
1. Log in as Super Admin (`superadmin@moneycard.io`):
   - Observe Dashboard:
     - StatCard label displays **"Organizations"**.
     - Quick Action button displays **"Add Organization"**.
     - Renewal / change notices refer to **"organization" / "organizations"**.
2. Mobile App (Products & Menu):
   - Log in as Counter Staff.
   - Open Menu (`/app/products`).
   - Notice both Active and Inactive items are listed.
   - Tap the Switch on any item: it toggles between ACTIVE and INACTIVE with a feedback toast.
   - Switch to POS Billing screen: verify only ACTIVE items appear in the billing catalog.
