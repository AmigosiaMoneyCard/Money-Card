# Money Card Project — Agent Workspace Guide

> **Purpose**: This file is the single source of truth for any AI agent working in this repo.
> Read this FIRST before reading any source file. It eliminates the need to re-explore the codebase from scratch each session.

---

## Git Push & Branching Policy

1. **NEVER push to `main`** — strictly prohibited at all times.
2. **Push to `staging` ONLY when explicitly told** — user must say "push to staging" or "add to staging git".
3. **Default**: Push only to the active feature branch on remote (`origin/<feature-branch>`).
4. User manually reviews PRs and merges into staging/main themselves.

### Zero-Error Staging → Main Merge & URL Integrity Rules
When merging `staging` into `main` (Production), zero errors and zero URL/domain mismatches must occur:
- **No Hardcoded URLs**: Never hardcode environment-specific URLs (e.g. `localhost`, `*-staging.vercel.app`, or `*-staging.onrender.com`) in shared frontend/backend logic.
- **Frontend URL Resolution**:
  - API base URL must always load from environment variables (`import.meta.env.VITE_API_BASE_URL`).
  - Customer portal links and QR redirects must use `getPublicCustomerPortalUrl()` (`window.location.origin` in production, and `money-card-frontend-staging.vercel.app` only when hostname explicitly includes `'staging'`).
  - Production Vercel must route to production backend (`https://money-card-backend.onrender.com/api`).
  - Staging Vercel must route to staging backend (`https://money-card-backend-staging.onrender.com/api`).
- **Mobile POS Flavors (`Flutter Money card`)**:
  - Keep `productionBaseUrl` (`https://money-card-backend.onrender.com/api/v1`) and `stagingBaseUrl` (`https://money-card-backend-staging.onrender.com/api/v1`) isolated by entry point (`main_production.dart` vs `main_staging.dart`).
  - Maintain the active guard in `ServerConfigStorage` that purges any staging URL contamination when running a production build.
- **Pre-Merge Integrity Check**:
  - Before approving or proposing a staging-to-main merge, all test suites must pass (`Frontend`: 255+ passing, `Backend`: 100 passing, TypeScript: 0 errors).
  - Confirm `git diff main..staging` on `.env*`, `client.ts`, `vercel.json`, and `app_config.dart` contains no unintended hardcoded staging URLs.
  - Verify Prisma schema and migrations are in complete parity between branches.


---

## Mandatory Agent Workflow Rules

1. **Automatic Implementation Plan & Visual Image Sketch**:
   - Whenever the user requests **ANY changes in the project**, the agent **MUST automatically create an implementation plan** (`implementation_plan.md`) containing:
     - Clear technical design, component breakdown, and step-by-step changes.
     - **Visual Image Sketch** generated via `generate_image` tool (high-fidelity, realistic SaaS UI design).
     - Clean, detailed **ASCII wireframes** of the UI layout, tables, modals, and buttons.
   - **Obtain user approval** before executing any source code edits.

2. **Web App ↔ Mobile App Parity Check**:
   - Whenever changes are made to the **Web App (`Frontend Money Card`)**, the agent **MUST actively check whether the Mobile POS App (`Flutter Money card`) also requires corresponding updates**.
   - Review Flutter models (`lib/models/`), providers (`lib/providers/`), services (`lib/services/`), and UI screens (`lib/features/`) to maintain functional, data, and operational parity between Web and Mobile.

3. **PDF Export Parity & Consistency Check (Web & Mobile)**:
   - Whenever any changes are made in the **Web App (`Frontend Money Card`)** (such as analytics, reports, metrics, card/session data, or receipt details), the agent **MUST actively check whether the View PDF / PDF export functionality also requires corresponding updates in both Web and Mobile apps**.
   - Inspect and verify:
     - **Web PDF Exports**: `src/features/analytics/analyticsPdfExport.ts`, PDF customization modals, and related report generators.
     - **Mobile PDF Services**: `Flutter Money card/lib/services/analytics_pdf_service.dart`, `digital_receipt_service.dart`, and receipt providers.
   - Maintain 100% consistency across metrics, labels, layout structures, and calculations between the screens and their exported PDFs.

---

## Project Overview

**Money Card** is a prepaid cafeteria card management system with 3 sub-projects:

| Sub-project | Tech | Port | Purpose |
|---|---|---|---|
| `Backend Money Card` | Node.js + Express + Prisma + PostgreSQL | 3000 | REST API server |
| `Frontend Money Card` | React + Vite + TypeScript + Vanilla CSS | 5173 | Web admin dashboard |
| `Flutter Money card` | Flutter/Dart + Riverpod | — | Mobile POS app for staff |

**Start all**: `start_all.ps1` at root.

---

## User Roles & Permissions

| Role | Who | Access |
|---|---|---|
| `SUPER_ADMIN` | Platform owner | All orgs, plans, subscriptions, platform settings |
| `ORG_ADMIN` | Cafeteria business owner | Full control of their org (staff, branches, cards, analytics) |
| `STAFF` | Counter manager (assigned to a branch) | Scoped to their counter (branch) — Counter Dashboard, cards, sessions, products, staff at their counter |

**Permission codes (M0 permission set)** — defined in `Backend/src/controllers/staff.controller.ts` (`FROZEN_M0_PERMISSIONS`):
- `CARD_VIEW`, `CARD_ISSUE`, `CARD_RETURN`, `CARD_BLOCK`, `CARD_UNBLOCK`
- `RECHARGE`, `PURCHASE`, `REFUND`, `SESSION_VIEW`
- `PRODUCT_VIEW`, `PRODUCT_MANAGE`
- `VIEW_ANALYTICS`, `VIEW_REPORTS`
- `STAFF_VIEW`, `STAFF_MANAGE`
- `BRANCH_VIEW`, `BRANCH_MANAGE`

**Counter Manager**: A `STAFF`-role user with a `UserBranch` DB entry linking them to a specific branch.
- **Counter Dashboard**: Dedicated dashboard view (`isCounterAdmin` mode) scoped strictly to their assigned counter. Displays counter operational metrics, quick actions (View Cards, Team Members, Menu, Analytics), and custom date range filtering (with cafeteria-switching dropdown removed).
- **Branch Scoping**: Cards, customer sessions, product catalog, and staff management are strictly isolated to their assigned counter.

---

## Backend — `Backend Money Card/`

### Entry Point
- `src/server.ts` — Express server setup, port 3000

### Route Map (`src/routes/index.ts`)
All routes are prefixed with `/api`:

| Route prefix | Router file | Controller |
|---|---|---|
| `/auth` | `auth.routes.ts` | `auth.controller.ts` |
| `/admin` | `admin.routes.ts` | `admin.controller.ts` |
| `/public` | `public.routes.ts` | `public.controller.ts` |
| `/organization` | `organization.routes.ts` | `organization.controller.ts` |
| `/branches` | `organization.routes.ts` | `organization.controller.ts` |
| `/staff` | `staff.routes.ts` | `staff.controller.ts` |
| `/permissions` | `staff.routes.ts` | `staff.controller.ts` |
| `/cards` | `cards.routes.ts` | `cards.controller.ts` |
| `/card-sessions` | `sessions.routes.ts` | `sessions.controller.ts` |
| `/customer-history` | `customer-history.routes.ts` | `customer-history.controller.ts` |
| `/products` | `products.routes.ts` | `products.controller.ts` |
| `/inventory` | `products.routes.ts` | `products.controller.ts` |
| `/analytics` | `analytics.routes.ts` | `analytics.controller.ts` |
| `/subscription` | `subscription.routes.ts` | `subscription.controller.ts` |
| `/reports` | `reports.routes.ts` | `reports.controller.ts` |
| `/plans` | inline in `index.ts` | `subscription.controller.ts` |

### Key Middleware (`src/middlewares/`)

| File | Function | What it does |
|---|---|---|
| `auth.middleware.ts` | `requireAuth` | JWT validation, attaches `req.user` |
| `role.middleware.ts` | `requireRole(...roles)` | Blocks if user's role not in list |
| `permission.middleware.ts` | `requirePermission(...perms)` | Checks M0 permission codes; SUPER_ADMIN & ORG_ADMIN auto-pass |
| `permission.middleware.ts` | `requireAnyPermission(...perms)` | Like above but needs only one match |
| `tenant.middleware.ts` | — | Enforces org-level data isolation |
| `validate.middleware.ts` | `validateRequest({body, params, query})` | Zod schema validation |
| `rateLimiter.middleware.ts` | — | Rate limiting |
| `error.middleware.ts` | — | Global error handler |

### Validation Schemas (`src/validation/`)
- `auth.schema.ts` — login, password change
- `user.schema.ts` — createStaffMember, updateStaffMember, updateStaffBranches, updateStaffPermissions, changeStaffPassword
- `common.schema.ts` — shared Zod schemas

### Key Controllers
- **`staff.controller.ts`** — Staff CRUD, `FROZEN_M0_PERMISSIONS` list, `getStaffList` (scopes by org; for STAFF role → needs branch filter)
- **`organization.controller.ts`** — Org & branch CRUD, counter manager creation (grants default permissions)
- **`auth.controller.ts`** — Login, refresh token, `GET /auth/me`, password flows
- **`analytics.controller.ts`** — Financial + card analytics, cafeteria filter support
- **`cards.controller.ts`** — Card issue, return, block, unblock
- **`sessions.controller.ts`** — Card sessions, recharge, POS purchase, refund
- **`products.controller.ts`** — Menu products CRUD + inventory
- **`admin.controller.ts`** — SUPER_ADMIN only: org management, plan overrides
- **`subscription.controller.ts`** — Plan management, limit checks

### Database (Prisma)
- Config: `src/config/database.ts`
- Schema: `prisma/schema.prisma`
- Key models: `User`, `Organization`, `Branch`, `UserBranch` (links staff↔branch), `UserPermission`, `Card`, `CardSession`, `Transaction`, `Product`

---

## Frontend — `Frontend Money Card/`

### Tech Stack
- React 18 + Vite, TypeScript, Vanilla CSS (`src/index.css`)
- Path alias: `@/` → `src/`
- Tests: Vitest (`npm test -- --run`), **234 tests must always pass**

### Entry & Bootstrap
```
src/main.tsx → App.tsx → AppProviders.tsx → AppRoutes.tsx
```

### App Providers (`src/app/providers/`)
| File | Context/Hook | Purpose |
|---|---|---|
| `AuthProvider.tsx` | `AuthContext` | Login state, JWT, `GET /auth/me` on load, 401 interceptor |
| `BranchProvider.tsx` | `BranchContext` | Active branch selection; for STAFF role locks to assigned branch |
| `AppProviders.tsx` | — | Wraps all providers in order |

### Routing (`src/app/routes/AppRoutes.tsx`)
Route guards:
- `<AuthGuard>` — must be logged in
- `<GuestGuard>` — must NOT be logged in (redirects authenticated users)
- `<PermissionGuard roles={[...]}>` — role-level guard

| Path | Roles | Page |
|---|---|---|
| `/dashboard` | ALL | `DashboardPage` (SUPER_ADMIN → SaaS metrics, ORG_ADMIN → Org Dashboard, STAFF → Counter Dashboard) |
| `/branches` | ORG_ADMIN | `BranchesPage` |
| `/staff` | ORG_ADMIN, STAFF | `StaffPage` |
| `/cards` | ORG_ADMIN, STAFF | `CardsPage` |
| `/sessions` | STAFF | `SessionsPage` |
| `/products` | ORG_ADMIN, STAFF | `ProductsPage` |
| `/inventory` | ORG_ADMIN, STAFF | `InventoryPage` |
| `/analytics` | ALL | `AnalyticsPage` |
| `/subscriptions` | ORG_ADMIN | `SubscriptionsPage` |
| `/settings` | SUPER_ADMIN, STAFF | `SettingsPage` |
| `/organizations` | SUPER_ADMIN | `OrganizationsPage` |
| `/portal` | Public | Customer self-service portal |

### Navigation Config (`src/config/navigation.ts`)
`NAVIGATION_ITEMS` array — controls which sidebar items each role sees.
Filtering logic: `roles` array + optional `permission` field (checked via `usePermissions`).

### Hooks (`src/hooks/`)
| Hook | File | Returns |
|---|---|---|
| `useAuth()` | `useAuth.ts` | `{ user, isAuthenticated, isLoading, login, logout }` |
| `useBranch()` | `useBranch.ts` | `{ currentBranch, setBranch, branches }` |
| `usePermissions()` | `usePermissions.ts` | `{ hasPermission(code), canManage, role }` |

### API Service (`src/services/api/`)
| File | What it exports |
|---|---|
| `client.ts` | `apiClient` — Axios instance with token attachment & 401 handling |
| `realClient.ts` | `apiService` — typed methods for every endpoint |
| `index.ts` | Re-exports both `apiClient` and `apiService` |

**Always use `apiService.<domain>.<method>()` — never call fetch/axios directly.**

Key `apiService` namespaces:
- `.auth` — login, logout, getProfile, changePassword
- `.staff` — getStaffList, createStaff, updateStaff, deleteStaff, updatePermissions, changePassword
- `.organizations` — getOrganization, updateOrganization
- `.branches` — getBranches, createBranch, updateBranch
- `.cards` — getCards, issueCard, returnCard, blockCard
- `.sessions` — getSessions, getSessionById
- `.products` — getProducts, createProduct, updateProduct
- `.analytics` — getOrgAnalytics, getCounterAnalytics

### Features (`src/features/`)

| Feature | Key Files | Notes |
|---|---|---|
| `auth` | `LoginPage`, `ChangePasswordForm`, `UnauthorizedPage`, `MandatoryChangePasswordPage` | |
| `dashboard` | `DashboardPage.tsx`, `OrgAdminDashboard.tsx`, `SuperAdminDashboard.tsx` | Role-aware stats: `SUPER_ADMIN` → SaaS metrics, `ORG_ADMIN` → Org Admin Dashboard, `STAFF` → Counter Dashboard (`isCounterAdmin` mode scoped to counter) |
| `staff` | `StaffPage.tsx` (2824 lines), `PermissionMatrix.tsx`, `constants.ts` | Unified staff detail/edit modal; `canManage = hasPermission('STAFF_MANAGE')` |
| `cards` | `CardsPage` | Issue, return, block, unblock |
| `sessions` | `SessionsPage` | Customer history + active sessions |
| `products` | `ProductsPage` | Menu management |
| `inventory` | `InventoryPage` | Stock management |
| `analytics` | `OrgAdminAnalyticsView.tsx`, `OrgAdminAnalyticsComponents.tsx`, `useOrgAdminAnalytics.ts`, `analyticsPdfExport.ts`, `staffActivityFilter.ts` | PDF export, cafeteria filter, emerald tiles |
| `branches` | `BranchesPage` | Org admin branch (cafeteria) management |
| `organizations` | `OrganizationsPage` | Super admin org management |
| `settings` | `SettingsPage.tsx` | Role dispatch: `SUPER_ADMIN` → `SuperAdminSettingsView`, `ORG_ADMIN` → `OrgAdminSettingsView`, `STAFF` → *CounterSettingsView* (pending) |
| `subscriptions` | `SubscriptionsPage` | Plan & billing management |
| `portal` | `QrResolutionPage`, `PortalSessionPage` | Customer self-service via QR code |

### Types (`src/types/`)
- `auth.ts` — `AuthUser`, `AuthState`, `UserRole`
- `entities.ts` — `Branch`, `Organization`, `OrganizationOverview`
- `card.ts` — `Card`, `CardSession`, `Transaction`
- `analytics.ts` — `AnalyticsData`, `CardAnalytics`
- `api.ts` — `ApiResult<T>` (discriminated union: `{ success: true, data: T } | { success: false, error: ... }`)
- `index.ts` — re-exports all types

### UI Component Library (`src/components/ui/`)
Core components: `Button`, `Input`, `Select`, `Card`, `CardHeader`, `CardContent`, `Badge`, `Modal`, `ModalFooter`, `LoadingState`, `EmptyState`, `ErrorState`

Other components: `DataTable` (from `components/tables`), `PermissionMatrix` (from `features/staff`)

### CSS Design System
- All styles in `src/index.css` — Vanilla CSS, no Tailwind
- Color system: **Emerald green** (`emerald-*`) as primary, slate grays for text/borders
- Pattern: utility classes like `text-emerald-600`, `bg-slate-50`, `border-slate-200`

---

## Flutter Mobile App — `Flutter Money card/`

### Purpose
Staff POS app — issues cards, recharges, POS purchases, returns cards, views sessions.

### Architecture: Riverpod + Repository pattern
```
Screens → Providers → Repositories → Services → API
```

### Key Providers (`lib/providers/`)
| Provider | Purpose |
|---|---|
| `auth_provider.dart` | Login state, current staff user |
| `branch_provider.dart` | Active branch for the staff session |
| `permission_provider.dart` | M0 permission checks |
| `card_operations_provider.dart` | Issue, return, block card operations |
| `session_operations_provider.dart` | Session management |
| `pos_cart_provider.dart` | POS cart state |
| `recharge_provider.dart` | Balance recharge flows |
| `inventory_provider.dart` | Stock levels |
| `analytics_provider.dart` | Branch analytics |
| `api_providers.dart` | Provides API service instances |
| `hardware_settings_provider.dart` | Printer/hardware config |

### Key Services (`lib/services/`)
- `api_service.dart` — Base HTTP client, token management
- `auth_service.dart` — Login, logout
- `card_service.dart` — Card operations
- `session_service.dart` — Session API
- `product_service.dart` — Products/menu
- `inventory_service.dart` — Inventory
- `analytics_service.dart` — Analytics data
- `analytics_pdf_service.dart` — PDF generation (large, ~500 lines)
- `digital_receipt_service.dart` — Receipt generation (large, ~900 lines)

### Features (`lib/features/`)
`auth`, `home`, `cards`, `sessions`, `payments`, `pos`, `products`, `inventory`, `analytics`, `receipt`, `more`

### Models (`lib/models/`)
`auth_user`, `branch`, `card`, `card_session`, `transaction`, `product`, `inventory`, `analytics`, `payment`, `receipt_bill`, `subscription`, `organization`, `api_response`, `cart_item`, `hardware_settings`

### Entry Points
- `lib/main.dart` — Development
- `lib/main_staging.dart` — Staging
- `lib/main_production.dart` — Production

---

## Active Work Context

### Current Git Branch: `staging`
### Last Commits
- `7c2039c` — Analytics fixes: cafeteria filter clip fix, PDF modal emerald tiles, removed Status from PDF
- `3392366` — Removed "All Counters" filter from left sidebar
- `eb83f19` — PDF modal checkable tiles, metric subtitles, inactive card definition fix

### ✅ Completed Task: Counter Dashboard Full Control
**Status: Implemented, verified with 234/234 passing tests and 0 build errors.**

Files to change:

| File | Change |
|---|---|
| `Backend/src/routes/staff.routes.ts` | Replace `requireRole(SUPER_ADMIN, ORG_ADMIN)` → `requirePermission(STAFF_MANAGE)` on all mutation routes |
| `Backend/src/controllers/staff.controller.ts` | Scope `getStaffList` + mutations to counter's branch for `STAFF` role |
| `Backend/src/controllers/organization.controller.ts` | Add `STAFF_MANAGE` + `STAFF_VIEW` to counter manager creation defaults |
| `Backend/src/scripts/patchCounterManagerPermissions.ts` | **[NEW]** One-time backfill script for existing counter managers |
| `Frontend/src/config/navigation.ts` | Add `'STAFF'` to settings nav roles (line 99) |
| `Frontend/src/features/settings/SettingsPage.tsx` | Add `CounterSettingsView` component (Counter Profile + Change Password) |
| `Frontend/src/features/staff/StaffPage.tsx` | Add "Counter Scope" badge + info banner; hide branch-reassign tab for STAFF |
| `Frontend/src/app/routes/AppRoutes.tsx` | `/settings` route is already open (no `PermissionGuard`) — no change needed |

**Counter Settings page sections** (after removal of Preferences per user request):
1. **Counter Profile** — Counter Name, Manager Name, Phone, Branch ID, Org Name, Status
2. **Account Security** — `<ChangePasswordForm />`

---

## Common Patterns & Rules

### DO
- Always use `apiService.<domain>.<method>()` — never raw fetch/axios
- Use `requirePermission(PermissionCode.X)` for permission-based route guards (works for all roles including STAFF with that permission)
- Use `requireRole(Role.SUPER_ADMIN, Role.ORG_ADMIN)` only when you want to exclude STAFF entirely regardless of permissions
- Run `npm test -- --run` in `Frontend Money Card/` before any commit — all tests (currently 253+) must pass
- Use `notify.success()` / `notify.error()` for toast messages in frontend

### DON'T
- Don't call mock handlers directly — all data flows through `apiService`
- Don't add TailwindCSS — use Vanilla CSS with existing utility classes
- Don't break multi-tenant isolation — always filter queries by `organizationId`
- Don't push to `main` — ever

### Error Response Pattern (Backend)
```ts
sendError(res, statusCode, 'ERROR_CODE', 'Human message')
sendSuccess(res, data, statusCode?)
```

### API Result Pattern (Frontend)
```ts
const result = await apiService.staff.getStaffList();
if (!result.success) { /* handle error */ }
const data = result.data; // typed
```

---

## Dev Commands

```bash
# Backend (from Backend Money Card/)
npm run dev           # Start dev server (port 3000)
npx prisma studio     # Open DB GUI
npx prisma migrate dev # Apply migrations

# Frontend (from Frontend Money Card/)
npm run dev           # Start Vite dev server (port 5173)
npm test -- --run     # Run all 234 vitest tests once

# Flutter (from Flutter Money card/)
flutter run           # Run on connected device
flutter build apk     # Build release APK

# Root
.\start_all.ps1       # Start backend + frontend together
```
