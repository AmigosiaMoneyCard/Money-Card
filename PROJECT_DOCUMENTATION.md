# Money Card Project — System Documentation and Operational Workflow Guide

## 1. Overview and Architecture

Money Card is an enterprise multi-tenant prepaid cafeteria card and POS management system engineered for high-throughput school, corporate, and campus dining facilities. The platform operates across three integrated sub-projects:

- Backend (Node.js + Express + Prisma + PostgreSQL):
  REST API server running at port 3000 handling multi-tenant isolation, JWT authentication with refresh rotation, atomic transaction ledgers, SSE balance streaming, and granular permission enforcement.
- Frontend (React 18 + Vite + TypeScript + Vanilla CSS):
  Web administration portal running at port 5173 providing dedicated role-based dashboards: Super Admin (multi-tenant SaaS metrics, plan overrides, organization management), Org Admin (cafeteria business oversight, counter configuration, menu catalog, financial analytics, PDF custom export), and Counter Staff (counter management, operational audit ledger).
- Mobile POS App (Flutter / Dart + Riverpod):
  High-speed Android POS mobile client for counter staff and counter managers supporting QR card scanning, real-time balance inquiries, cash/UPI recharges, menu POS cart ordering, order edit/cancel with auto-refund, card return settlement, hardware printing, and Shorebird Over-The-Air (OTA) updates.

## 2. Roles, Permissions, and Counter Responsibilities

### Super Admin (Platform Owner)
- Full visibility across all client organizations, subscription tiers, and billing catalogs.
- High-level tenant analytics, active cafeterias monitoring, and system-wide configurations.

### Org Admin (Cafeteria Business Owner)
- Manages branches (cafeterias/counters), menu catalog items, pricing, and counter staff accounts.
- Complete financial analytics: Financial Overview (8 metric tiles: Organization, Net Money Collected, Online UPI, Cash Money, Money Added, Money Refunded, Cancelled Top-ups, Cancelled Food Orders), Card Fleet Analytics, Peak Activity, and Staff Performance Audit.
- Customized multi-page PDF executive and operational report generator.

### Counter Manager (Branch Supervisor)
- Assigned to a specific branch via UserBranch linking.
- Holds elevated counter permissions:
  - CARD_ISSUE, CARD_RETURN, CARD_BLOCK, CARD_UNBLOCK
  - RECHARGE (Load cash/UPI money onto customer cards)
  - PURCHASE (Food order processing)
  - REFUND (Process settlements and cancellations)
  - SESSION_VIEW, STAFF_VIEW, STAFF_MANAGE, VIEW_ANALYTICS, VIEW_REPORTS
- Operational scope: Recharging customer cards, handling settlements, voiding incorrect top-ups, reviewing daily counter audit ledger, and managing counter staff.

### Counter Staff (Food Counter Cashier)
- Assigned to a specific branch food counter.
- Holds focused order fulfillment permissions:
  - PURCHASE (Primary role: scanning customer card and deducting order amount from balance)
  - CARD_VIEW (Checking card status and remaining balance)
  - PRODUCT_VIEW (Browsing menu items)
- Operational scope: Deducting food orders, cancelling wrong dish selections, and serving meals. Cannot recharge cards or issue new cards without explicit permission.

## 3. End-to-End Operational Workflows

### Card and Session Lifecycle
1. Card Provisioning:
   Unassigned cards with unique QR tokens are registered in the system under the organization and assigned to specific cafeteria counters.
2. Card Activation & Issuance:
   When an available card is scanned, staff enters customer details (Name, 10-digit Phone). An active CardSession is generated, setting status to ACTIVE and binding the card to the customer.
3. Balance Top-up (Manager / Recharging Counter):
   Manager scans the card and deposits funds via Cash or UPI QR. An atomic RECHARGE transaction is recorded, updating session balance and broadcasting balance updates via SSE.
4. Food Order Deduction (Counter Staff):
   Customer orders food at the counter. Staff selects dishes from the menu catalog, confirms the POS cart, and scans the card. The purchase cost is deducted atomically from the card balance, creating a PURCHASE transaction with itemized dish records.
5. Order Edit and Cancellation (Auto-Refund):
   If an order was entered in error or the customer changes their mind, staff opens Food Orders in the Action Hub:
   - Cancel Order: Marks transaction as CANCELLED with a logged reason and auto-refunds the amount back to the card balance.
   - Edit Order: Cancels the existing transaction, auto-refunds the balance, and re-opens the POS cart preloaded with items for immediate adjustment.
6. Top-up Cancellation (Void Incorrect Recharge):
   If a manager typed the wrong recharge amount, they open Top-up History and select Cancel Top-up. As long as the customer has not spent into that balance, the top-up is voided and deducted from the card balance.
7. Settlement & Card Return:
   When the customer finishes their dining period, the manager selects Settle / Return Card. The remaining card balance is refunded to the customer, the session is marked SETTLED, and the physical card is returned to AVAILABLE stock for the next customer.

### Staff Performance & Operational Audit Ledger
- Found in the Staff Management and Counter Dashboard views.
- Clicking Audit on any staff member opens their full operational audit timeline.
- Displays: Date & Time, Operation Type (Card Activation, Cash Recharge, UPI Recharge, Food Purchase, Card Settlement, Refund), Coupon ID (Physical Card Number / Session Card ID), Customer Details, and Amount.
- Filterable by date range, operation category, and real-time search query.

## 4. Completed Milestones and Implementations

- Super Admin Analytics Financial Overview:
  Restructured into an 8-box grid with zero blank space (Organization, Net Money Collected, Online UPI Money, Cash Money, Money Added, Money Refunded, Cancelled Top-ups, Cancelled Food Orders).
- Super Admin Subscription & Platform Performance:
  Removed redundant boxes (Active Subscriptions, Pending Requests, Catalog, MRR, Platform Cafeterias Performance, Subscription Distribution).
- Counter Dashboard Integration:
  Added quick actions (View Cards, Team Members, Menu, Analytics), removed cafeteria switcher for counter staff, and streamlined counter metrics.
- Mobile POS App Hardening:
  - Single back button policy across all routes.
  - Granular permission guards for Action Hub options.
  - Dedicated Bill Receipt modal with Print, Save, and Done buttons.
  - Material Icons font preservation via --no-tree-shake-icons to eliminate Chinese glyph scrambling.
  - Staging Shorebird OTA release 1.0.3+4 published and installed on connected hardware.
- PDF Report Generator:
  Comprehensive PDF generators in Web and Mobile apps with toggleable sections, executive summaries, financial tables, and menu demand metrics.
