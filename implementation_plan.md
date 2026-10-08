# Implementation Plan: Granular Operational Capabilities with Merged Card Management for Add & Edit Team Member

![Add Team Member Capabilities UI Mockup](C:/Users/damie/.gemini/antigravity-ide/brain/c99edd16-0faf-4782-a7e1-399d96eb8a4b/add_team_member_merged_cards_sketch_1791452600613.jpg)

## User Request Summary
In Org Admin and Counter Admin staff management ("Add Team Member to Counter/Kitchen 1" and edit staff modals), replace the rigid two-button selection ("Kitchen Manager" vs "Kitchen Staff") with 6 granular operational capabilities. Merge "Issue & Return Cards" and "Block & Unblock Cards" into a single unified capability: "Card Management". Use "Billing" for order taking and sales.

## Technical Design and Architectural Breakdown

### 1. Six Unified Operational Capabilities
In `Frontend Money Card/src/features/staff/constants.ts`, define the 6 operational capabilities:
- **Billing** (`PURCHASE`): Can scan cards, take customer food orders, and deduct payment from wallets. Automatically includes `PRODUCT_VIEW`, `CARD_VIEW`, `SESSION_VIEW`.
- **Recharge Cards** (`RECHARGE`): Can top-up card balances using Cash or UPI. Automatically includes `CARD_VIEW` and `SESSION_VIEW`.
- **Refund Transactions** (`REFUND`): Can refund completed customer purchase transactions. Automatically includes `SESSION_VIEW`.
- **Card Management** (`CARD_ISSUE`, `CARD_RETURN`, `CARD_BLOCK`, `CARD_UNBLOCK`): Merged card operations to issue new cards, settle card returns, and block or unblock cards. Automatically includes `CARD_VIEW`.
- **Menu & Products** (`PRODUCT_VIEW`, `PRODUCT_MANAGE`): Can view food items and update menu prices or availability.
- **View Analytics & Reports** (`VIEW_ANALYTICS`, `VIEW_REPORTS`): Can view counter revenue metrics and export audit reports. Automatically includes `BRANCH_VIEW` and `STAFF_VIEW`.

### 2. Quick Presets and Dynamic Mobile Nickname Indication
Provide quick preset selection chips for convenience while allowing full custom toggling:
- **Billing Counter**: Selects Billing and Menu & Products.
- **Cashier / Recharge Counter**: Selects Recharge Cards, Billing, Card Management, and Refund Transactions.
- **Full Access**: Selects all 6 capabilities.
- **Custom**: Active when custom selections are made.
Below the toggles, a dynamic badge indicates the resulting mobile app role:
- If Recharge Cards is selected: Displays "Mobile POS Nickname: Manager".
- If Recharge Cards is not selected: Displays "Mobile POS Nickname: Staff".

### 3. Modal Form Updates
- In `CounterStaffPage.tsx`:
  - Update `showAddModal` ("Add Team Member to [Counter/Kitchen Name]"): Replace the two "Role Type" buttons with the 6 operational capability cards.
  - Update `showStaffDetailsModal` ("Staff Details & Edit"): Replace the two "Role Type" buttons with the 6 operational capability cards pre-populated from the staff member's active permissions.
  - Update `handleCreateStaff` and `handleSaveStaffChanges` to map the selected capability IDs to the required permissions array.
- In `StaffPage.tsx`:
  - Update `showAddModal` ("Add Staff Member") and `showStaffDetailsModal` ("Staff Details & Permissions"): Replace the two "Role Type" buttons with the 6 operational capability cards.
  - Automatically persist the selected granular permissions on creation and updates.

## ASCII Wireframes

### Add / Edit Team Member Modal
```
+-----------------------------------------------------------------+
| Add Team Member to Central Kitchen                          [X] |
| Mobile POS Nickname: Manager                                    |
+-----------------------------------------------------------------+
| Staff Name *                                                    |
| [ Jane Doe                                                    ] |
|                                                                 |
| Mobile Number (Login ID) *               Login Password *       |
| [ 9876543210               ]             [ ********       (o) ] |
|                                                                 |
| What can this team member do?                                   |
| Quick Presets: [Billing Counter] [Cashier Counter] [Full Access]|
|                                                                 |
| +-----------------------------+ +-----------------------------+ |
| | [x] Billing                 | | [x] Recharge Cards          | |
| |     Take orders and deduct  | |     Cash and UPI top-up     | |
| +-----------------------------+ +-----------------------------+ |
| +-----------------------------+ +-----------------------------+ |
| | [x] Refund Transactions     | | [x] Card Management         | |
| |     Process order refunds   | |     Issue, return, block/   | |
| |                             | |     unblock cards           | |
| +-----------------------------+ +-----------------------------+ |
| +-----------------------------+ +-----------------------------+ |
| | [x] Menu & Products         | | [x] View Analytics          | |
| |     Manage menu items       | |     Access performance      | |
| |                             | |     reports                 | |
| +-----------------------------+ +-----------------------------+ |
|                                                                 |
|                                     [ Cancel ]  [ Create Staff ]|
+-----------------------------------------------------------------+
```

## Detailed File Modifications

1. `Frontend Money Card/src/features/staff/constants.ts`:
   - Define `OPERATIONAL_CAPABILITIES` with 6 options (Billing, Recharge Cards, Refund Transactions, Card Management, Menu & Products, View Analytics & Reports).
   - Export helper functions:
     - `capabilitiesToPermissions(capabilityIds: string[]): Permission[]`
     - `permissionsToCapabilities(permissions: Permission[]): string[]`

2. `Frontend Money Card/src/features/staff/CounterStaffPage.tsx`:
   - Replace `formRoleType` state with `selectedCapabilities` state (`string[]`).
   - Replace the two role buttons in "Add Team Member" modal with the 6 `OPERATIONAL_CAPABILITIES` selection cards and quick preset chips.
   - Replace the two role buttons in "Edit Staff Details" modal with the 6 `OPERATIONAL_CAPABILITIES` selection cards.
   - Update `handleCreateStaff` and `handleSaveStaffChanges` to send the resolved permissions.

3. `Frontend Money Card/src/features/staff/StaffPage.tsx`:
   - Replace the two role buttons in "Add Staff Member" modal and "Staff Details & Permissions" modal with the 6 `OPERATIONAL_CAPABILITIES` selection cards.
   - Keep permissions synchronized with the selected capabilities.

4. `Frontend Money Card/src/__tests__/`:
   - Run Vitest suite (`npm test -- --run`) and TypeScript check (`npx tsc --noEmit`) to verify zero regressions.

## Verification and Quality Checks
1. Run `npx tsc --noEmit` in `Frontend Money Card`.
2. Run `npm test -- --run` in `Frontend Money Card`.
3. Verify responsive layout for mobile viewport compatibility on modals.
4. Verify zero emojis across all code, labels, and text.
