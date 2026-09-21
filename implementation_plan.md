# Implementation Plan: Bulk Upload for Counters & Menu with Bulk WhatsApp Dispatch

Add Bulk Upload options to the "Create Counter" and "Add Menu Item" buttons, and provide an automated Bulk WhatsApp Credentials Dispatch workflow for all newly provisioned counter managers.

![Bulk WhatsApp Dispatch Screen](C:/Users/damie/.gemini/antigravity-ide/brain/9635058f-8784-4982-b40a-c7e9d921ee9b/bulk_upload_whatsapp_dispatch_plan_1789925142934.jpg)

## User Review Required

- Counter Details in CSV Template:
  - `counterName`: Counter name (e.g. "Main Cafeteria Counter 1")
  - `phone`: Manager mobile number (10 digits)
  - `password`: Manager login password (defaults to 123456 if empty)
  - `address`: Optional physical counter location
- Bulk WhatsApp Credential Sharing:
  - Web browsers cannot silently send WhatsApp messages in the background without user interaction (or an enterprise Meta Cloud API).
  - Solution: Upon successful bulk creation, a "Counters Created Successfully!" dispatch panel displays all created counters with:
    1. Direct 1-Click WhatsApp Button on every row (launches WhatsApp Web with the manager's personalized welcome message, counter name, mobile number, password, and login URL pre-filled).
    2. Sequential "Send to Next Manager" button to step through each manager in order with a single click.
    3. "Copy All Credentials" button to copy all credentials into the clipboard in one organized text block for instant group sharing or broadcast.
    4. "Download Credentials CSV" to save an offline reference.

## ASCII Layout Wireframe

```
1. Counters Page Split Button:
+-----------------------------------------------------------------------------------------------+
| Counters                                                [ Create Counter | v ]                |
| Counter Usage: 3 / 10 counters created                  +-----------------------------------+ |
|                                                         | [+] Single Counter                | |
|                                                         | [^] Bulk Upload Counters (CSV)    | |
|                                                         +-----------------------------------+ |
+-----------------------------------------------------------------------------------------------+

2. Post-Upload Bulk WhatsApp Credentials Dispatch Screen:
+-----------------------------------------------------------------------------------------------+
| Counters Created Successfully! (3 Counters Ready)                                         [X] |
+-----------------------------------------------------------------------------------------------+
| All 3 counters have been provisioned. Share credentials with counter managers:                |
|                                                                                               |
| +---------------------+---------------+------------+----------------------------------------+ |
| | Counter Name        | Mobile Number | Password   | WhatsApp Dispatch                      | |
| +---------------------+---------------+------------+----------------------------------------+ |
| | North Block Kiosk   | 9876543210    | Pass@123   | [ Send via WhatsApp ]                  | |
| | Food Court Counter  | 9876543211    | Pass@456   | [ Send via WhatsApp ]                  | |
| | Executive Lounge    | 9876543212    | Pass@789   | [ Send via WhatsApp ]                  | |
| +---------------------+---------------+------------+----------------------------------------+ |
|                                                                                               |
| [ Copy All Credentials ]     [ Download Credentials CSV ]                    [ Done ]         |
+-----------------------------------------------------------------------------------------------+

3. Menu Page Split Button:
+-----------------------------------------------------------------------------------------------+
| Menu Management  [Counter Scope]                       [ Add Menu Item | v ]                  |
|                                                        +-----------------------------------+  |
|                                                        | [+] Add Single Item               |  |
|                                                        | [^] Bulk Upload Menu (CSV)        |  |
|                                                        +-----------------------------------+  |
+-----------------------------------------------------------------------------------------------+
```

## Proposed Changes

### Frontend Web (`Frontend Money Card`)

- [NEW] [BulkCsvImportModal.tsx](file:///d:/Money%20Card%20Project/Frontend%20Money%20Card/src/components/common/BulkCsvImportModal.tsx)
  - Universal CSV import component supporting template downloads, drag-and-drop parsing, and live row validation diagnostics.
  - Supports custom post-import success screens (such as the Bulk WhatsApp Dispatch view for counters).

- [MODIFY] [BranchesPage.tsx](file:///d:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/branches/BranchesPage.tsx)
  - Convert "Create Counter" button into a split button with dropdown option for "Bulk Upload Counters (CSV)".
  - Configure bulk import with Counter template (`counterName,phone,password,address`).
  - Implement the Bulk WhatsApp Credentials Dispatch modal showing created counters, individual `wa.me` links, and "Copy All Credentials" handler.

- [MODIFY] [ProductsPage.tsx](file:///d:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/products/ProductsPage.tsx)
  - Convert "Add Menu Item" button into a split button with dropdown option for "Bulk Upload Menu (CSV)".
  - Configure bulk import with Menu template (`itemName,category,price,description`).
  - Batch persist items to the active counter.

- [MODIFY] [realClient.ts](file:///d:/Money%20Card%20Project/Frontend%20Money%20Card/src/services/api/realClient.ts)
  - Add batch counter creation and batch menu item helpers.

### Backend API (`Backend Money Card`)

- [MODIFY] [organization.controller.ts](file:///d:/Money%20Card%20Project/Backend%20Money%20Card/src/controllers/organization.controller.ts)
  - Support batch creation of branches and atomic provisioning of counter managers with permission checks and plan limit validation.

## Verification Plan

### Automated Tests
- TypeScript check: `npx tsc --noEmit` in `Frontend Money Card/`
- Frontend Vitest suite: `npm test -- --run` in `Frontend Money Card/`
- Backend Vitest suite: `npm test` in `Backend Money Card/`
- Flutter check: `flutter analyze --no-pub` in `Flutter Money card/`

### Manual Verification
- Test downloading Counter CSV template.
- Upload valid CSV with 3 counters, verify creation, and verify the Bulk WhatsApp Dispatch screen renders each counter with their individual WhatsApp links.
- Test "Copy All Credentials" and confirm formatted text is placed on the clipboard.
- Test downloading Menu CSV template and uploading items to verify catalog addition.
