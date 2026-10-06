# Implementation Plan — QR Wallet Scan to PWA Portal Redirection

## Visual Design Reference

![QR Wallet Scan to PWA Portal Redirection](/C:/Users/damie/.gemini/antigravity-ide/brain/40124c13-8182-4da5-8dae-66d3097486e9/pwa_qr_redirect_portal_sketch_1791308746879.jpg)

---

## ASCII Layout Wireframes

### 1. Physical Card QR Scan via Smartphone Native Camera
```
+-------------------------------------------------------------+
|                     SMARTPHONE CAMERA                       |
|                                                             |
|                   [   Scan Area Frame   ]                   |
|                   |  +---------------+  |                   |
|                   |  |  [QR CODE]    |  |                   |
|                   |  +---------------+  |                   |
|                                                             |
|          +---------------------------------------+          |
|          | (Safari / Chrome Link Banner)         |          |
|          | money-card-frontend-staging.vercel.app|          |
|          | Open "/c/KD1eifd" in Browser          |          |
|          +---------------------------------------+          |
|                                                             |
+-------------------------------------------------------------+
```

### 2. In-App PWA Camera Scanner & Instant URL Redirect
```
+-------------------------------------------------------------+
| Money Card PWA Portal                           [Install PWA|
+-------------------------------------------------------------+
| Check Wallet Balance & Receipts                             |
|                                                             |
| +---------------------------------------------------------+ |
| | Live Optical Scanner                                [X] | |
| |                                                         | |
| |                +-----------------------+                | |
| |                | [Physical Wallet QR]  |                | |
| |                +-----------------------+                | |
| |                                                         | |
| | Scanned Raw Payload: "KD1eifd"                          | |
| +---------------------------------------------------------+ |
|                                                             |
| (Redirects automatically to:                                |
|  https://money-card-frontend-staging.vercel.app/c/KD1eifd)  |
|                                                             |
| -> Resolves active wallet session                           |
| -> Establishes session token                                |
| -> Displays live balance, digital receipts & order tracker  |
+-------------------------------------------------------------+
```

---

## Technical Design & Scope Breakdown

### 1. Web Frontend — In-App Scanner URL Redirection (`PortalSessionPage.tsx`)
- File: `Frontend Money Card/src/features/portal/PortalSessionPage.tsx`
- Changes:
  - In `handleResolveCard`, extract the wallet identifier whether the scanned input is raw text (`KD1eifd`), prefix format (`mc:KD1eifd`), or full URL (`https://.../c/KD1eifd`).
  - Automatically redirect the browser to the clean public URL route (`/c/${walletToken}`) using `navigate('/c/' + encodeURIComponent(cleanToken))`.
  - Add URL search parameter listener (`useSearchParams`) to support direct links like `/portal?wallet=KD1eifd`, `/portal?card=KD1eifd`, or `/portal?token=KD1eifd`, routing directly into the resolution flow.

### 2. Web Frontend — Root Short Route Support (`AppRoutes.tsx`)
- File: `Frontend Money Card/src/app/routes/AppRoutes.tsx`
- Changes:
  - Add alias routes for customer portal resolution (`/portal/:token`, `/c/:qrToken`, `/c/:token`).
  - Add fallback route before the 404 handler that detects single-segment wallet parameters (such as `/:token` matching alphanumeric wallet patterns) and redirects them to `/c/:token`.

### 3. Web Frontend — Mock Handler Parity (`mock/handlers/userPortal.ts`)
- File: `Frontend Money Card/src/services/mock/handlers/userPortal.ts`
- Changes:
  - Update `mockUserPortalHandlers.resolvePublicCard` to sanitize incoming tokens (stripping `/c/` and URL prefixes) and match against both `qrToken` and `physicalCardNumber` case-insensitively, matching backend behavior.

### 4. Backend Engine — Resolution Controller Hardening (`public.controller.ts`)
- File: `Backend Money Card/src/controllers/public.controller.ts`
- Changes:
  - Ensure `resolvePublicQrToken` parses raw wallet tokens, full URLs, query parameters, and custom prefixes.
  - Verify case-insensitive lookups on both `physicalCardNumber` and `qrToken`.

### 5. Flutter Mobile POS — Full Portal URL QR Generation (`mock_qr_codes_screen.dart` & `app_config.dart`)
- Files:
  - `Flutter Money card/lib/core/config/app_config.dart`
  - `Flutter Money card/lib/features/more/mock_qr_codes_screen.dart`
- Changes:
  - In `app_config.dart`, define `customerPortalBaseUrl` based on environment/flavor (`money-card-frontend-staging.vercel.app` for staging, `money-card-frontend.vercel.app` for production).
  - In `mock_qr_codes_screen.dart`, update `QrImageView` payload data from raw `item.qrToken` to the complete PWA URL: `${AppConfig.customerPortalBaseUrl}/c/${item.qrToken}`.
  - When displayed on POS screens or printed, scanning the QR with a smartphone camera will open the PWA portal directly.

---

## Verification & Test Plan

1. Frontend Automated Tests & Typecheck:
   - Run `npm test -- --run` in `Frontend Money Card` (255+ passing tests).
   - Run `npx tsc --noEmit` in `Frontend Money Card` (0 errors).
2. Backend Automated Tests & Typecheck:
   - Run `npm test` in `Backend Money Card` (100+ passing tests).
   - Run `npx tsc --noEmit` in `Backend Money Card` (0 errors).
3. Flutter Analysis & Widget Tests:
   - Run `flutter analyze --no-pub` in `Flutter Money card` (0 issues).
   - Run `flutter test` in `Flutter Money card` (186+ passing tests).
4. Manual Verification Scenarios:
   - Test scanning raw wallet token `KD1eifd` in PWA portal camera scanner — redirects to `/c/KD1eifd` and loads session.
   - Test scanning full URL `https://money-card-frontend-staging.vercel.app/c/KD1eifd` — resolves and establishes session.
   - Test visiting `/portal?wallet=KD1eifd` in browser — automatically resolves and loads live balance.
   - Test Flutter mock QR screen — renders scannable QR with full PWA portal URL.
