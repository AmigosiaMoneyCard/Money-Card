# Implementation Plan: CI Pipeline Fix, Counter Credentials, Wallets Header & Blocked Cards Analytics

## Overview
This cumulative implementation plan incorporates all recent platform enhancements: CI pipeline database service container, counter credentials multi-format phone lookup, Counter Dashboard Wallets header alignment, and the new **"Blocked Cards"** tab on the Analytics page for both Organization Admin and Counter Admin.

---

## Part 1: GitHub Actions CI Pipeline Fix
- Attached `services: postgres:16` to `backend` job in `.github/workflows/ci.yml`.
- Added `npx prisma db push --skip-generate --accept-data-loss` step before `npm test`.

---

## Part 2: Counter Credentials Login Resolution
- `Backend Money Card/src/controllers/organization.controller.ts`:
  - Multi-format phone lookup (`cleanPhone`, `91${cleanPhone}`, `+91${cleanPhone}`) in `createBranch`.
  - Auto-provision manager user when no staff assignment exists in `updateBranch`.
- `Backend Money Card/src/controllers/auth.controller.ts`:
  - Included `'12345678'` in login fallback list.
- `Frontend Money Card/src/features/branches/BranchesPage.tsx`:
  - Standardized placeholders and copy fallbacks to `'12345678'`.
- `Frontend Money Card/src/services/mock/handlers/branches.ts`:
  - Added phone and password update support to mock `updateBranch`.

---

## Part 3: Counter Dashboard Wallets Page & Customer History Section
- In `Frontend Money Card/src/features/cards/CounterStaffCardsView.tsx`:
  - Retained `[CreditCard]`, `<h1>Wallets & Customer History</h1>`, `[Badge Live Active]`, and `[Wallet Analytics Button]` grouped together on the left.
  - Restored `[Customer History]` button in the top header and in each row of the table directly next to `[Wallet Analytics]` and `[Wallet Details]`.
  - Restored Modal 3 (Counter-scoped Customer History Modal with search and session list) and Modal 4 (Session Details Modal with breakdown).
  - Retained `[Refresh]` on the right.

---

## Part 4: Blocked Cards Tab in Analytics (Org Admin & Counter Admin)

### Overview
Add a dedicated **"Blocked Cards"** tab to the Analytics dashboard across both the **Organization Admin** and **Counter Admin / Staff** portals (right next to the existing *Menu Analytics* tab). This allows administrators and cafeteria counter managers to track, audit, search, and manage cards that were blocked (e.g. reported lost, damaged, or suspended) along with locked wallet balances and unblock actions.

### UI Layout & ASCII Wireframe

```
+--------------------------------------------------------------------------------------------------------------------+
|  Money Card Admin Portal            Back > Analytics           Cafeteria: mes kalladi collage   [S] swathi (Counter)|
+--------------------------------------------------------------------------------------------------------------------+
|  Counter Analytics                                  [iti block v]   [ 02-10-2026 - 02-10-2026 ] [Today] (R) [View PDF] |
|                                                                                                                    |
|  [|| Financial Overview]  [[] Card Analytics]  [X Menu Analytics]  [* Blocked Cards *] <--- NEW TAB                |
|  ------------------------------------------------------------------=================                              |
|                                                                                                                    |
|  +--------------------------------------------+    +--------------------------------------------+                  |
|  |  TOTAL BLOCKED CARDS                       |    |  LOCKED BALANCE                            |                  |
|  |  3 Cards                                   |    |  ₹450.00                                   |                  |
|  +--------------------------------------------+    +--------------------------------------------+                  |
|                                                                                                                    |
|  +--------------------------------------------------------------------------------------------------------------+  |
|  |  [Q Search blocked cards by card ID, customer, phone, or reason...                         ]                 |  |
|  |                                                                                                              |  |
|  |  CARD / WALLET ID   CUSTOMER           LOCKED BAL   BLOCKED REASON          BLOCKED BY      DATE         ACTION  |  |
|  |  -----------------  -----------------  -----------  ----------------------  --------------  -----------  ------  |  |
|  |  [=] MC-0012        Rahul Sharma       ₹150.00      [Blocked] Lost card     Swathi (Staff)  02-10-2026   [Unblock|  |
|  |                     +91 9876543210                  at campus lawn                                               |  |
|  |                                                                                                                  |  |
|  |  [=] MC-0045        Ananya Sen         ₹200.00      [Blocked] Misplaced     Admin (Org)     01-10-2026   [Unblock|  |
|  |                     +91 9876543211                  in canteen                                                   |  |
|  |                                                                                                                  |  |
|  |  [=] MC-0078        Mohammed Riyas     ₹100.00      [Blocked] Card Damaged  Swathi (Staff)  28-09-2026   [Unblock|  |
|  |                     +91 9876543212                  magnetic chip error                                          |  |
|  +--------------------------------------------------------------------------------------------------------------+  |
+--------------------------------------------------------------------------------------------------------------------+
```

### Technical Architecture & Component Breakdown

1. **Tab Navigation Extension ([`OrgAdminAnalyticsView.tsx`](file:///d:/money%20card/Money-Card-web-app/Frontend%20Money%20Card/src/features/analytics/OrgAdminAnalyticsView.tsx))**:
   - Added fourth tab button `Blocked Cards` with `ShieldAlert` icon.
   - Maintained active tab underline styling (`border-emerald-600 text-emerald-700 bg-emerald-50/50`).
   - Renders `<OrgAdminBlockedCardsSection />` when `activeTab === 'blocked'`.

2. **Tab State Management ([`useOrgAdminAnalytics.ts`](file:///d:/money%20card/Money-Card-web-app/Frontend%20Money%20Card/src/features/analytics/useOrgAdminAnalytics.ts))**:
   - Updated `activeTab` union type: `'overview' | 'cards' | 'menu' | 'blocked'`.
   - Reads/writes URL search param `?tab=blocked`.

3. **New Component: [`OrgAdminBlockedCardsSection.tsx`](file:///d:/money%20card/Money-Card-web-app/Frontend%20Money%20Card/src/features/analytics/OrgAdminBlockedCardsSection.tsx)**:
   - **Data Fetching**: Calls `apiService.cards.getCards({ status: 'BLOCKED', branchId })`.
   - **KPI Cards**: Total Blocked Cards and Locked Balance.
   - **Instant Search**: By Card ID, Customer Name, Phone, or Reason.
   - **Unblock Flow**: Modal confirmation with immediate live status refresh.

---

## Credentials for Testing

### 🏢 Organization Admin
* **Portal URL**: `/login` (or staging URL)
* **Email**: `admin@maincafe.com` *(or `admin@acme.com`)*
* **Password**: `password` *(or `Password123!`)*

### 🏪 Counter Admin / Staff
* **Portal URL**: `/login`
* **Mobile / Identifier**: `7736919053` *(or `9876543212`)*
* **Password**: `password` *(or `Password123!`)*
