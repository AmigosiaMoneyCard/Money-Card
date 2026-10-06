# Implementation Plan — Input Validation & Mobile Role Login Isolation

## Visual Design Reference

![Mobile POS Role Login and Web Admin Validation](/C:/Users/damie/.gemini/antigravity-ide/brain/5d95263b-cd5f-4577-8545-14c5773f5f9e/mobile_role_login_web_form_sketch_1791277189450.jpg)

---

## ASCII Layout Wireframes

### 1. Web Admin — Add Menu Price Strict Number Input
```
+----------------------------------------------------------------+
| Add Menu - Counter 1                                       [X] |
+----------------------------------------------------------------+
| Item Name *                                                    |
| [ Chicken Burger                                             ] |
|                                                                |
| Price (INR) *                                                  |
| [ Rs. | 150                                                  ] |
| (Strictly accepts numbers 0-9 only; blocks e, +, -, .)         |
| (Character limit: max 7 digits up to 9,999,999)                |
|                                                                |
| Type:  ( Veg )  [ Non-Veg ]  ( Egg )                           |
|                                                                |
| [ Cancel ]                                    [ Add Menu Item ]|
+----------------------------------------------------------------+
```

### 2. Web Admin — Add Staff Member Phone (10 digits) & Password (Min 4)
```
+----------------------------------------------------------------+
| Add New Staff Member                                       [X] |
+----------------------------------------------------------------+
| Role:  (o) Counter Manager    ( ) Kitchen Staff                |
|                                                                |
| Staff Full Name *            Staff Phone Number *              |
| [ Ramesh Kumar             ] [ 9876543210                    ] |
|                              (Strict 10-digit limit enforced)  |
|                                                                |
| Login Password *                                               |
| [ ****                                                     ]   |
| (Placeholder: Min 4 characters | Validation: min 4, max 50)    |
|                                                                |
| [ Cancel ]                                       [ Next Step ] |
+----------------------------------------------------------------+
```

### 3. Mobile POS — Role Selection & Fresh Input per Role
```
+----------------------------------------------------------------+
|                          MONEY CARD                            |
|                                                                |
|       +------------------------------------------------+       |
|       | [POS Icon]   Counter Manager                 > |       |
|       +------------------------------------------------+       |
|                                                                |
|       +------------------------------------------------+       |
|       | [Chef Icon]  Kitchen Staff                   > |       |
|       +------------------------------------------------+       |
|                                                                |
+----------------------------------------------------------------+

Switching to Counter Manager:
+----------------------------------------------------------------+
| [< Back]                                                       |
|                     Counter Manager                            |
|                                                                |
| Phone Number                                                   |
| [ 9876543210                                                 ] |
| (Max 10 digits strictly enforced via input formatters)         |
|                                                                |
| Password                                                       |
| [ *******                                                  (o) ]
|                                                                |
| [                         Login                              ] |
|                                                                |
| (If kitchen staff logs in here -> blocked with message:        |
|  "This account belongs to Kitchen Staff. Please switch")       |
+----------------------------------------------------------------+

Tapping [< Back] clears all fields -> Kitchen Staff page is clean:
+----------------------------------------------------------------+
| [< Back]                                                       |
|                      Kitchen Staff                             |
|                                                                |
| Phone Number                                                   |
| [                                                            ] |
| (Fresh blank field; zero leakage from Counter Manager tab)     |
|                                                                |
| Password                                                       |
| [                                                          (o) ]
|                                                                |
| [                         Login                              ] |
|                                                                |
| (If counter manager logs in here -> blocked with message:      |
|  "This account belongs to Counter Manager. Please switch")     |
+----------------------------------------------------------------+
```

---

## Technical Design & Scope Breakdown

### 1. Web Frontend — Menu Price Strict Number Input
- Target files:
  - `Frontend Money Card/src/features/products/CounterAddProductModal.tsx`
  - `Frontend Money Card/src/features/products/CounterViewEditMenuModal.tsx`
  - `Frontend Money Card/src/features/products/ProductsPage.tsx`
- Implementation details:
  - Change input `type="text"` with `inputMode="numeric"`.
  - Attach `onKeyDown` to block keys `['e', 'E', '+', '-', '.']`.
  - In `onChange`, clean entered string via `e.target.value.replace(/[^0-9]/g, '')`.
  - Cap price value to 7 characters (`maxLength={7}`, preventing numbers over 9,999,999).

### 2. Web Frontend — Staff Phone Number 10-Digit Restriction
- Target files:
  - `Frontend Money Card/src/features/staff/StaffPage.tsx`
  - `Frontend Money Card/src/features/staff/CounterStaffPage.tsx`
- Implementation details:
  - Set `maxLength={10}` on the staff phone input element.
  - In `onChange`, sanitize with `e.target.value.replace(/\D/g, '').slice(0, 10)` so non-numeric inputs are discarded and input never exceeds 10 digits.

### 3. Backend & Web Frontend — Staff Password Minimum Floor from 8 to 4
- Target files:
  - `Backend Money Card/src/validation/user.schema.ts`
  - `Frontend Money Card/src/features/staff/StaffPage.tsx`
  - `Frontend Money Card/src/features/staff/CounterStaffPage.tsx`
- Implementation details:
  - In `user.schema.ts` (`createStaffMemberSchema`), change `.min(8, 'Password must be at least 8 characters long')` to `.min(4, 'Password must be at least 4 characters long')`.
  - In `StaffPage.tsx` (`validateBasicInfo`), change `formPassword.trim().length < 8` check to `< 4` and error message to `'Password must be at least 4 characters'`.
  - In `CounterStaffPage.tsx` (`handleSubmit`), change `trimmedPassword.length < 8` check to `< 4` and placeholder to `'Min 4 characters'`.

### 4. Flutter Mobile POS — Cross-Role Login Restriction
- Target files:
  - `Flutter Money card/lib/providers/auth_provider.dart`
  - `Flutter Money card/lib/features/auth/login_screen.dart`
- Implementation details:
  - In `AuthNotifier.login(...)`, add parameter `String? expectedRole` (`'KITCHEN'` or `'MANAGER'`).
  - Upon successful credentials verification by backend:
    - If `expectedRole == 'KITCHEN'` and `!user.isKitchenStaff`:
      - Terminate session via `await _authRepository.logout()`.
      - Fail login with message: `'This account is assigned to Counter Manager. Please select Counter Manager to log in.'`
    - If `expectedRole == 'MANAGER'` and `user.isKitchenStaff`:
      - Terminate session via `await _authRepository.logout()`.
      - Fail login with message: `'This account is assigned to Kitchen Staff. Please select Kitchen Staff to log in.'`
  - In `login_screen.dart` (`_handleLogin`), pass `expectedRole: _roleMode == LoginRoleMode.kitchen ? 'KITCHEN' : 'MANAGER'`.

### 5. Flutter Mobile POS — Phone Number 10-Digit Input Limit
- Target file:
  - `Flutter Money card/lib/features/auth/login_screen.dart`
- Implementation details:
  - In `_phoneController` `TextFormField`, add:
    ```dart
    inputFormatters: [
      FilteringTextInputFormatter.digitsOnly,
      LengthLimitingTextInputFormatter(10),
    ],
    ```
  - This strictly limits phone number input to digits only with a 10-character maximum.

### 6. Flutter Mobile POS — Role Switch Credential Isolation
- Target file:
  - `Flutter Money card/lib/features/auth/login_screen.dart`
- Implementation details:
  - Add helper `_switchRole(LoginRoleMode mode)`:
    ```dart
    void _switchRole(LoginRoleMode mode) {
      _phoneController.clear();
      _passwordController.clear();
      _formKey.currentState?.reset();
      ref.read(authNotifierProvider.notifier).clearError();
      setState(() {
        _roleMode = mode;
      });
    }
    ```
  - Call `_switchRole(LoginRoleMode.selectRole)` on top-back navigation button.
  - Call `_switchRole(LoginRoleMode.manager)` on Counter Manager selection.
  - Call `_switchRole(LoginRoleMode.kitchen)` on Kitchen Staff selection.

---

## Verification & Test Plan

1. Backend Unit Tests & Typecheck:
   - Run `npm test` in `Backend Money Card` (124+ unit tests).
   - Run `npx tsc --noEmit` in `Backend Money Card` (0 errors).
2. Frontend Unit Tests & Typecheck:
   - Run `npm test -- --run` in `Frontend Money Card` (312+ unit tests).
   - Run `npx tsc --noEmit` in `Frontend Money Card` (0 errors).
3. Flutter Analysis & Widget Tests:
   - Run `flutter analyze --no-pub` in `Flutter Money card` (0 issues).
   - Run `flutter test` in `Flutter Money card` (186+ unit/widget tests).
4. Manual Verification Scenarios:
   - Web Add Menu: type `e`, `+`, `-`, `.`, paste letters — verified blocked; type 1234567 — caps at 7 digits.
   - Web Add Staff: type phone over 10 digits — strictly caps at 10 digits; password with 4 characters accepts and creates staff.
   - Mobile Login: select Kitchen Staff, enter Counter Manager credentials — displays role restriction error; switch between tabs — input controllers clear immediately.
