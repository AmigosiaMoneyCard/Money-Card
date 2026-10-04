# Implementation Plan — Mobile Login Minimalist UI Streamline

## Overview
Streamline the mobile login interface in `Flutter Money card` to create a clean, uncluttered, minimalist authentication flow:
1. On the initial Role Selection screen: Remove the sub-headings "Staff Login" and "Select your operational role to proceed". Keep only the brand icon and "MONEY CARD" title.
2. In the role buttons: Streamline both "Counter Manager" and "Kitchen Staff" buttons to show only their primary title and icon. Remove the secondary subtitle descriptions and remove the badge boxes ("Manager" green box and "Kitchen" blue box).
3. In the Counter Manager login form: Remove the top green "Counter Manager Login" pill badge container and remove the bottom "Switch to Kitchen Staff Login" button.
4. In the Kitchen Staff login form: Remove the top "Kitchen Staff Login" pill badge container and remove the bottom "Switch to Counter Manager Login" button.

---

## Visual Design Reference

![Minimal Mobile Login UI](C:\Users\damie\.gemini\antigravity-ide\brain\218ce084-c8ce-49ca-a93b-bc0ce2200b0c\mobile_login_minimal_ui_1791121380307.jpg)

---

## ASCII Wireframes

### 1. Minimal Role Selection Screen
```text
+------------------------------------------+
|                                          |
|                  ( [=] )                 |
|                                          |
|                MONEY CARD                |
|                                          |
|                                          |
|  +------------------------------------+  |
|  | [POS]   Counter Manager        >   |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  | [Chef]  Kitchen Staff          >   |  |
|  +------------------------------------+  |
|                                          |
+------------------------------------------+
```

### 2. Minimal Counter Manager / Kitchen Staff Login Form
```text
+------------------------------------------+
|  [<-]                                    |
|                                          |
|                  ( [=] )                 |
|                                          |
|                MONEY CARD                |
|              Counter Manager             |
|                                          |
|  Phone Number                            |
|  [ [Phone] 10-digit mobile number     ]  |
|                                          |
|  Password                                |
|  [ [Lock]  ••••••••             (Eye) ]  |
|                                          |
|  +------------------------------------+  |
|  |               Login                |  |
|  +------------------------------------+  |
|                                          |
+------------------------------------------+
```

---

## Proposed Changes

### Mobile POS (`Flutter Money card/`)

#### [login_screen.dart](file:///d:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/auth/login_screen.dart)
- In `_buildRoleSelectionView`:
  - Remove `Text('Staff Login')` and `Text('Select your operational role to proceed')`.
  - Adjust spacing between "MONEY CARD" and the role selection buttons.
- In `_buildRoleSelectionCard`:
  - Remove `subtitle`, `badgeText`, `badgeBg`, and `badgeColor` parameters.
  - Simplify card layout to render only:
    - Left icon container with subtle rounded background.
    - Title (`Counter Manager` or `Kitchen Staff`) in bold, clear font.
    - Right trailing arrow icon (`Icons.arrow_forward_ios`).
- In `_buildRoleLoginForm`:
  - In top navigation row: keep the back button (`IconButton(icon: Icon(Icons.arrow_back))`), remove the pill box container displaying `roleTitle`.
  - Under "MONEY CARD", display clean role indicator (`Counter Manager` or `Kitchen Staff`).
  - At the bottom of the form: remove the `TextButton` role switcher ("Switch to Kitchen Staff Login" / "Switch to Counter Manager Login").

#### [login_screen_test.dart](file:///d:/Money%20Card%20Project/Flutter%20Money%20card/test/features/auth/login_screen_test.dart)
- Update test cases to match the simplified UI:
  - Verify "MONEY CARD", "Counter Manager", and "Kitchen Staff" are present on initial view.
  - Verify "Staff Login" and "Select your operational role to proceed" are not present.
  - Verify Counter Manager and Kitchen Staff forms navigate correctly without the removed pill badges and switcher buttons.

---

## Verification Plan

### Automated Verification
- Run `flutter analyze --no-pub` in `Flutter Money card` (verify zero lint or type errors).
- Run `flutter test` in `Flutter Money card` (verify all unit and widget tests pass).
- Run `npm test -- --run` in `Frontend Money Card` (verify web tests pass).
- Run `npm test` in `Backend Money Card` (verify backend tests pass).

### Manual Verification
- Launch the Flutter app or inspect the widget test tree to ensure the login screen is clean, minimal, and matches the user's specification.
