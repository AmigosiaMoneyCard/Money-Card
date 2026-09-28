# Implementation Plan: Role-Specific Auth Error Messages (Web App & Mobile)

Update authentication error handling across the Web App (`Frontend Money Card`), Mobile App (`Flutter Money card`), and Backend API (`Backend Money Card`) to provide exact, context-specific error messages:
1. **Password Mismatch**: When the account exists for that portal/role but the password does not match, return `"Credentials are wrong."`
2. **Account Does Not Exist**: When an account does not exist for that specific dashboard or portal:
   - Counter Dashboard: `"Counter doesn't exist."`
   - Org Admin Dashboard: `"Org Admin doesn't exist."`
   - Staff (Mobile POS): `"Staff doesn't exist."`

---

## User Review Required

> [!IMPORTANT]
> **Web Login Experience**: The Web App is used by both **Org Admins** (Organization Dashboard) and **Counter Managers** (Counter Dashboard). To know which specific dashboard the user is attempting to access (so we can display `"Counter doesn't exist."` vs `"Org Admin doesn't exist."`):
> - We will add clean segmented portal tabs to [LoginPage.tsx](file:///d:/money%20card/Money-Card-web-app/Frontend%20Money%20Card/src/features/auth/LoginPage.tsx):
>   `[ Org Admin ]` | `[ Counter Dashboard ]`
> - When Counter WhatsApp invitation links are opened (`/login?portal=counter`), it will automatically activate the **Counter Dashboard** tab.
> - The Mobile App ([login_screen.dart](file:///d:/money%20card/Money-Card-web-app/Flutter%20Money%20card/lib/features/auth/login_screen.dart)) is dedicated to Staff, so missing accounts will automatically report `"Staff doesn't exist."`.

---

## Proposed Changes

### 1. Frontend Web App (`Frontend Money Card`)

#### [MODIFY] [LoginPage.tsx](file:///d:/money%20card/Money-Card-web-app/Frontend%20Money%20Card/src/features/auth/LoginPage.tsx)
- Add a portal selector state `portal: 'ORG_ADMIN' | 'COUNTER'` (initialized from URL search param `?portal=counter` or default `'ORG_ADMIN'`).
- Add sleek tab bar on top of the card:
  - Tab 1: **Org Admin** (`admin@example.com or 10-digit mobile`)
  - Tab 2: **Counter Dashboard** (`10-digit counter mobile number`)
- Pass `portal` in the credentials payload to `apiService.auth.login({ ...credentials, portal })`.
- Ensure `apiError` correctly displays the exact server/mock error response (`"Counter doesn't exist."`, `"Org Admin doesn't exist."`, `"Credentials are wrong."`).

#### [MODIFY] [mock auth handler: auth.ts](file:///d:/money%20card/Money-Card-web-app/Frontend%20Money%20Card/src/services/mock/handlers/auth.ts)
- Update `login` method to inspect `credentials.portal` (or `credentials.role`):
  - Find matching user by email or phone in `mockStore.staffUsers` (and `mockStore.branches` for counter).
  - **If no match found**:
    - If `portal === 'COUNTER'`: return `createMockError('NOT_FOUND', "Counter doesn't exist.")`
    - If `portal === 'ORG_ADMIN'`: return `createMockError('NOT_FOUND', "Org Admin doesn't exist.")`
    - If `portal === 'STAFF'`: return `createMockError('NOT_FOUND', "Staff doesn't exist.")`
  - **If match found, but role mismatch**:
    - If user has role `STAFF` while on `ORG_ADMIN` tab: return `"Org Admin doesn't exist."`
    - If user has role `ORG_ADMIN` while on `COUNTER` tab: return `"Counter doesn't exist."`
  - **If match found and role matches, but password incorrect**:
    - Return `createMockError('UNAUTHORIZED', "Credentials are wrong.")`

#### [MODIFY] [seed.ts](file:///d:/money%20card/Money-Card-web-app/Frontend%20Money%20Card/src/services/mock/data/seed.ts)
- Add `phone` properties to `SEED_STAFF_USERS` (`usr_staff_eros`: `'9876543212'`, `usr_orgadmin`: `'9876543210'`, `staff_001`: `'9876543211'`).
- Add `credentials` to `SEED_BRANCHES` (`branch_001`: phone `'9876543212'`, password `'password'`).
- Ensure mock phone authentication matches real demo accounts.

---

### 2. Backend API (`Backend Money Card`)

#### [MODIFY] [auth.controller.ts](file:///d:/money%20card/Money-Card-web-app/Backend%20Money%20Card/src/controllers/auth.controller.ts)
- Update `loginSchema` to accept optional `portal: z.enum(['ORG_ADMIN', 'COUNTER', 'STAFF', 'SUPER_ADMIN']).optional()`.
- Update user lookup and error handling:
  - If user is not found:
    - If `portal === 'COUNTER'`: return 401 with `"Counter doesn't exist."`
    - If `portal === 'ORG_ADMIN'`: return 401 with `"Org Admin doesn't exist."`
    - If `portal === 'STAFF'` (or mobile client): return 401 with `"Staff doesn't exist."`
    - Fallback: `"Credentials are wrong."`
  - If user is found, but role does not match requested portal:
    - e.g. User is `STAFF`, portal is `'ORG_ADMIN'`: return `"Org Admin doesn't exist."`
    - User is `ORG_ADMIN`, portal is `'COUNTER'` or `'STAFF'`: return `"Counter doesn't exist."` / `"Staff doesn't exist."`
  - If user exists and matches role, but password is invalid:
    - Return 401 with `"Credentials are wrong."`

---

### 3. Flutter Mobile App (`Flutter Money card`)

#### [MODIFY] [auth_provider.dart](file:///d:/money%20card/Money-Card-web-app/Flutter%20Money%20card/lib/providers/auth_provider.dart)
- In `login()`'s `on ApiException catch (e)`:
  - If `e.message` is provided from backend or mock interceptor (e.g. `"Staff doesn't exist."`, `"Credentials are wrong."`), display `e.message` directly.
  - If `e.code == ApiErrorCode.unauthorized || e.statusCode == 401`: default to `"Credentials are wrong."` instead of `'Phone number, email or password is incorrect.'`.
  - If 404 or user not found: default to `"Staff doesn't exist."`.

#### [MODIFY] [auth_service.dart](file:///d:/money%20card/Money-Card-web-app/Flutter%20Money%20card/lib/services/auth_service.dart)
- Include `'portal': 'STAFF'` in payload sent to `/api/v1/auth/login`.

#### [MODIFY] [mock_api_interceptor.dart](file:///d:/money%20card/Money-Card-web-app/Flutter%20Money%20card/lib/core/network/interceptors/mock_api_interceptor.dart)
- Add phone numbers and password check to mock users database.
- For `POST /api/v1/auth/login`:
  - Check phone/email against mock staff database.
  - If no staff found: reject with 404/401 and `"Staff doesn't exist."`.
  - If staff found, but password does not match: reject with 401 and `"Credentials are wrong."`.

---

## Wireframe & Interaction Flow

### Web App Login Card with Portal Tabs
```
+-------------------------------------------------------------+
|                        MONEY CARD                           |
|                 Sign in to your dashboard                   |
|                                                             |
|   +--------------------------+--------------------------+   |
|   |       Org Admin          |    Counter Dashboard     |   |
|   +--------------------------+--------------------------+   |
|                                                             |
|   [ ! ] Credentials are wrong.                              |
|     - OR -                                                  |
|   [ ! ] Counter doesn't exist.                              |
|     - OR -                                                  |
|   [ ! ] Org Admin doesn't exist.                            |
|                                                             |
|   Email or Mobile Number                                    |
|   [ 9876543210                                            ] |
|                                                             |
|   Password                                                  |
|   [ ••••••••••                                         👁 ] |
|                                                             |
|   [                Sign In                                ] |
+-------------------------------------------------------------+
```

### Mobile App (Flutter)
```
+-------------------------------------------------------------+
|                      [ Credit Card Icon ]                   |
|                          MONEY CARD                         |
|                         Staff Login                         |
|                                                             |
|   [ ! ] Credentials are wrong.                              |
|     - OR -                                                  |
|   [ ! ] Staff doesn't exist.                                |
|                                                             |
|   Mobile Number                                             |
|   [ 9876543210                                            ] |
|                                                             |
|   Password                                                  |
|   [ ••••••••••                                         👁 ] |
|                                                             |
|   [                   Login                               ] |
+-------------------------------------------------------------+
```

---

## Verification Plan

### Automated Tests
1. **Frontend Vitest (`Frontend Money Card/src/__tests__/authErrorMessages.test.ts`)**:
   - Test Org Admin login with non-existent phone -> asserts `"Org Admin doesn't exist."`
   - Test Org Admin login with existing phone + wrong password -> asserts `"Credentials are wrong."`
   - Test Counter Dashboard login with non-existent phone -> asserts `"Counter doesn't exist."`
   - Test Counter Dashboard login with existing phone + wrong password -> asserts `"Credentials are wrong."`
   - Test valid logins still succeed and navigate properly.
2. **Backend Unit Tests**:
   - Run `npm test` in `Backend Money Card` to ensure auth and validation test suites pass.
3. **Flutter Parity**:
   - Check error handling and mock interceptor logic in Flutter.

