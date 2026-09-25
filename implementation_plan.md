# Implementation Plan — Mobile POS Localhost Link and Staff Management Header Action

Documentation and configuration for connecting the Mobile POS APK to the local backend, and providing the "Add Staff" button on the top right side of the page header in Staff Management.

![Top Right Add Staff Button in Staff Management](C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/counter_staff_top_right_add_1790318428808.jpg)

## Layout Wireframes

```
+-----------------------------------------------------------------------------------+
| Staff Management                                                    [+ Add Staff] |
| Manage team members for Counter 1                                                 |
+-----------------------------------------------------------------------------------+
| [Search staff by name or phone...               ]                       [Refresh] |
|                                                                                   |
| +-------------------------------------------------------------------------------+ |
| | Staff Name               Role         Status       Actions                    | |
| | Counter Staff            Staff        Active       [View Details]  [Edit]     | |
| +-------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------+
```

## Mobile POS Localhost Links

The Flutter Mobile POS APK supports direct connection to the local backend server via the following endpoints:

- Wi-Fi / Physical Device on LAN: http://192.168.105.39:3000/api/v1
- Android Emulator: http://10.0.2.2:3000/api/v1
- USB Cable (via adb reverse tcp:3000 tcp:3000): http://127.0.0.1:3000/api/v1

To configure in the Mobile App:
1. Open the Mobile POS APK login screen.
2. Tap the Server Config / Network icon.
3. Tap the "Wi-Fi LAN" preset chip (or enter http://192.168.105.39:3000/api/v1).
4. Tap "Test Connection" to confirm green status, then tap "Save & Apply".

## Staff Management Header Action

In [StaffPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/staff/StaffPage.tsx):
- The header is structured as a responsive flex row: `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-4`.
- Left side displays the page title `Staff Management` and counter context subtitle when `currentBranch` is selected.
- Top right side displays the primary action button `Add Staff` with `UserPlus` icon whenever `canManage` is true (both Counter Admin and Org Admin).
- Tapping `Add Staff` opens the staff creation modal with pre-selected counter assignment and M0 permissions.

## Verification and Test Plan

- Frontend Test Suite: 272 passing across 36 test files via `npm test -- --run`.
- TypeScript Check: 0 errors via `npx tsc --noEmit`.
- Backend Auth Test: Verified `POST http://localhost:3000/api/v1/auth/login` returns 200 with tokens and Counter 1 assignment.
