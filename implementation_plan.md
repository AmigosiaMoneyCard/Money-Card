# Implementation Plan — Localhost Staff Credentials for Mobile POS APK

Provision dedicated active staff credentials in the local database for testing the Flutter Mobile POS APK against the localhost backend.

![Mobile POS Localhost Login Screen](C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/mobile_pos_localhost_login_1790319232113.jpg)

## Layout Wireframes

```
+-------------------------------------------------------+
|                       CAFE POS                        |
|                                                       |
|                     Staff Login                       |
|        Welcome back! Enter your details to continue.  |
|                                                       |
|  Mobile Number                                        |
|  [ 9876543210                                       ] |
|                                                       |
|  Password                                             |
|  [ **********                                     (O) ] |
|                                                       |
|  [                    SIGN IN                       ] |
|                                                       |
|          Connected to Localhost: 192.168.105.39       |
+-------------------------------------------------------+
```

## User Requirements and Scope

- The user requested: "make a staff cred for localhsot apk".
- Provision an active staff account in the local PostgreSQL database with complete M0 permissions, assigned to an active counter/branch.
- Ensure the password is properly hashed using bcrypt so authentication succeeds via `POST /api/v1/auth/login`.
- Verify sample products and branch link exist for POS transactions.
- Provide connection endpoints for Android emulator, USB adb reverse, and physical LAN device.

## Provisioned Account Details

- Mobile Number: 9876543210
- Password: password123
- Staff Name: Counter Staff
- Role: STAFF
- Status: ACTIVE
- Must Change Password: false
- Organization: Activation Test Cafeteria
- Counter / Branch: Counter 1 (Ground Floor Food Court)
- Permissions: Full M0 permissions (CARD_VIEW, CARD_ISSUE, CARD_RETURN, CARD_BLOCK, CARD_UNBLOCK, SESSION_VIEW, RECHARGE, PURCHASE, REFUND, PRODUCT_VIEW, PRODUCT_MANAGE, INVENTORY_VIEW, INVENTORY_MANAGE, VIEW_ANALYTICS, VIEW_REPORTS, STAFF_VIEW, BRANCH_VIEW)

## Backend Connection Endpoints

- Android Emulator: http://10.0.2.2:3000/api/v1
- USB Cable (via adb reverse tcp:3000 tcp:3000): http://127.0.0.1:3000/api/v1
- Wi-Fi / Physical Device on LAN: http://192.168.105.39:3000/api/v1

## Verification and Test Plan

- Proactively tested API login via POST http://localhost:3000/api/v1/auth/login.
- Verified response status 200 with valid JWT tokens, staff user profile, and active branch assignment.
