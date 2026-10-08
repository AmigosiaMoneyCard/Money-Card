# Implementation Plan: Unified Staff Role with RBAC and Deferred Food Tracking in Mobile App

![Mobile Staff RBAC UI Mockup](C:/Users/damie/.gemini/antigravity-ide/brain/c99edd16-0faf-4782-a7e1-399d96eb8a4b/mobile_staff_rbac_ui_sketch_1791450193672.jpg)

## User Request Summary
Consolidate the mobile app role system into one universal role: Staff. Remove the pre-login role selector (Kitchen Manager vs Kitchen Staff). All authorization will be governed strictly by Role-Based Access Control (RBAC). Comment out the food tracking system of the manager and the kitchen staff order queue subsystem for future version releases. Dynamically determine the display nickname as Manager or Staff based on RBAC permissions.

## Technical Design and Architectural Breakdown

### 1. Unified Staff Login Experience
Currently, `login_screen.dart` forces the user into `LoginRoleMode.selectRole` where they choose between two role cards (Kitchen Manager and Kitchen Staff). Once selected, `auth_provider.dart` checks `expectedRole == 'KITCHEN'` vs `'MANAGER'` and throws a rejection error if the user logs into the wrong box.
Changes:
- In `login_screen.dart`: Remove `LoginRoleMode.selectRole` and role selection cards. Present a clean, unified Staff Login interface directly with Phone Number and Password inputs.
- In `auth_provider.dart`: Remove `expectedRole` argument and validation checks. Any active staff member can log in directly without artificial client-side role filtering.

### 2. Commenting Food Tracking and Kitchen Staff Order Subsystem for Future Release
As requested, do not delete these features; comment them out cleanly with comments indicating they are reserved for future version releases:
- In `home_screen.dart`: Comment out `FoodPreparationProgressWidget` invocation with a comment: `// Reserved for future version release: Kitchen food progress tracking`.
- In `app_router.dart`:
  - Comment out the auto-redirect to `/app/kitchen` for `user.isKitchenStaff`. All authenticated staff route directly to `/app/home`.
  - Comment out `/app/orders-tracker` route (`LiveOrderTrackerScreen`).
  - Comment out `/app/kitchen` route (`KitchenOrdersScreen`).
- In `staff_app_shell.dart`:
  - Comment out the `isKitchen` bottom navigation branch (Kitchen Orders / Menu). All staff navigate using the standard Staff bottom navigation bar: Home, Wallets, Menu, and Analytics (visible if user has manager/analytics permissions).
- In `more_screen.dart`:
  - Replace the back button redirect logic (`user.isKitchenStaff ? '/app/kitchen' : '/app/home'`) to always route to `/app/home`.

### 3. Dynamic Nickname Resolution (Manager vs Staff)
In `auth_user.dart`:
- Add getter `String get nickname => isManager ? 'Manager' : 'Staff';`
- `isManager` checks if the staff member has `AppPermission.recharge` or administrative permissions (`ORG_ADMIN`, `SUPER_ADMIN`, `STAFF_MANAGE`, `BRANCH_MANAGE`). If true, nickname is `Manager`; otherwise, `Staff`.
In `home_screen.dart`:
- Display `user.nickname` in the greeting badge chip next to the staff member's name.
In `more_screen.dart`:
- In the staff profile summary card, display `user.nickname` alongside their contact details (e.g. `9876543210 • Manager`).
In `staff_app_shell.dart`:
- The user profile menu popover displays the staff member name and nickname.

### 4. Updating Mobile Widget Tests
In `test/features/auth/login_screen_test.dart`:
- Update widget tests from expecting the two role selection cards to directly validating the single-form Staff Login view, validation error states, and credential inputs.

## ASCII Wireframes

### Unified Staff Login Screen
```
+---------------------------------------------------+
|                                                   |
|                    ( [==] )                       |
|                   MONEY CARD                      |
|                   Staff Login                     |
|                                                   |
|   Phone Number                                    |
|   [ 10-digit mobile number                      ] |
|                                                   |
|   Password                                        |
|   [ ********                                (o) ] |
|                                                   |
|   +-------------------------------------------+   |
|   |                  Login                    |   |
|   +-------------------------------------------+   |
|                                                   |
+---------------------------------------------------+
```

### Unified Staff Dashboard Screen (Manager vs Staff RBAC)
```
+---------------------------------------------------+
| [==] Money Card   [Kitchen: Central Kitchen]  (P) |
+---------------------------------------------------+
| Hello, Alex                   [ Manager / Staff ] |
| Kitchen: Central Kitchen                          |
|                                                   |
| +-----------------------------------------------+ |
| |                                               | |
| |                   [ Q R ]                     | |
| |               SCAN QR WALLET                  | |
| |      Scan wallet to start purchase/recharge   | |
| |                                               | |
| +-----------------------------------------------+ |
|                                                   |
| [ Today's Sales: Rs 14,250 | Orders: 64 ]         |
|                                                   |
| Quick Actions:                                    |
| [ + Issue Card ]  [ Return Card ]  [ Search Card] |
|                                                   |
| +-----------------------------------------------+ |
| | [Home]    [Wallets]    [Menu]    [Analytics*] | |
| +-----------------------------------------------+ |
+---------------------------------------------------+
(* Analytics tab conditionally visible based on RBAC permissions)
```

## Detailed File Modifications

1. `Flutter Money card/lib/models/auth_user.dart`:
   - Add `String get nickname => isManager ? 'Manager' : 'Staff';`.

2. `Flutter Money card/lib/features/auth/login_screen.dart`:
   - Remove `LoginRoleMode.selectRole` and `_buildRoleSelectionView`.
   - Render direct login form under Money Card brand header with "Staff Login" subtitle.
   - Remove back button on login form since there is no multi-step role selection.

3. `Flutter Money card/lib/providers/auth_provider.dart`:
   - Remove `expectedRole` parameter from `login()` method.
   - Remove role mismatch error guards so any staff member logs in cleanly.

4. `Flutter Money card/lib/features/home/home_screen.dart`:
   - Comment out `FoodPreparationProgressWidget` invocation with future release comment.
   - Bind greeting chip to `user.nickname`.

5. `Flutter Money card/lib/routing/app_router.dart`:
   - Comment out `/app/orders-tracker` and `/app/kitchen` routes.
   - Remove `user.isKitchenStaff` redirect check from `/login` and `/app` route handlers so all staff navigate to `/app/home`.

6. `Flutter Money card/lib/widgets/shell/staff_app_shell.dart`:
   - Comment out `isKitchen` branch from bottom navigation destinations and tap handling.
   - All staff use standard Staff bottom navigation with RBAC-gated tabs.

7. `Flutter Money card/lib/features/more/more_screen.dart`:
   - Display `user.nickname` in profile card.
   - Route back button to `/app/home`.

8. `Flutter Money card/test/features/auth/login_screen_test.dart`:
   - Update tests to reflect direct single-screen Staff Login.

## Verification and Quality Checks
1. Run `flutter test` autonomously.
2. Run `flutter analyze --no-pub` autonomously.
3. Validate zero emojis across all modified files.
4. Verify responsive layout and RBAC permissions gating.
