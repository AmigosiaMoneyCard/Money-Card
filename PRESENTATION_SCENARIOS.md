# Money Card - Real-Time Practical Scenarios and Presentation Defense Guide

This document catalogs real-time operational scenarios, technical edge cases, architecture decisions, and defense questions for evaluators, investors, and clients.

## 1. Staff and Counter Rush Hour Scenarios

- Scenario: Concurrent Card Tap at Multiple Counters (Double Spend Prevention)
  - Question: A student gives their QR code screenshot to a friend. Both tap at Counter A (Meals) and Counter B (Juice) at the exact same second. Will the system let them spend more than their balance?
  - Technical Answer: No. Money Card uses database transactions with row-level locks on the CardSession record. When a purchase request arrives, balance verification and balance deduction happen atomically inside a single ACID database transaction ($transaction). The first transaction acquires the lock, deducts the amount, and commits; the second concurrent request reads the updated balance immediately and fails with INSUFFICIENT_FUNDS.

- Scenario: Cashier Punches Incorrect Recharge Amount (e.g. 5000 instead of 500)
  - Question: A staff member accidentally adds 5000 rupees instead of 500 rupees in cash. How is this corrected without corrupting financial records?
  - Technical Answer: Staff opens Top-up History on the mobile POS and taps Cancel Top-up. A mandatory reason code must be selected (Wrong Amount Entered, Duplicate Scan, Payment Failed, or Other Reason). The system creates an explicit VOID transaction record linked to the original transaction ID rather than silently deleting rows. The audit ledger remains immutable.

- Scenario: Kitchen Runs Out of Food After Payment Deduction
  - Question: The customer paid 120 rupees for Biryani, but the kitchen counter is out of stock. How does the customer get their money back?
  - Technical Answer: In the Food Orders tab on the POS app, the cashier taps Cancel Order. The reason is logged as Item Out of Stock. The system atomically refunds the exact 120 rupees back to the customer active card session balance, increments the item inventory back in the database, and creates an audit void transaction.

- Scenario: Dishonest Staff Top-up and Void Fraud Attempt
  - Question: What stops a dishonest staff member from topping up 1000 rupees in cash, letting a friend spend it, and then cancelling the top-up at the end of the shift?
  - Technical Answer: Two guards prevent this. First, a top-up can only be cancelled if the current session balance is equal to or greater than the original top-up amount. If the customer already spent the money, the void is automatically blocked because the wallet balance cannot become negative. Second, all cancellations record the staff user ID, timestamp, and counter, and appear highlighted in the Org Admin analytics report.

## 2. Physical Card and Customer Lifecycle Scenarios

- Scenario: Lost Physical Card with Remaining Wallet Balance
  - Question: A customer drops their card in the cafeteria. Someone else finds it. What happens to the money?
  - Technical Answer: The customer visits the counter or admin. Staff clicks Block Card. The card status changes to BLOCKED instantly across all POS devices and web dashboards. Any scan attempt at any counter fails immediately with CARD_BLOCKED. Once verified, staff can unblock the card or migrate the active session to a new physical card.

- Scenario: Card Return and Deposit Settlement
  - Question: A customer is finishing college or visiting for one day. How is the card returned and deposit refunded?
  - Technical Answer: Staff scans the card and taps Return Card. The system shows the exact breakdown: Remaining Wallet Balance plus Card Deposit Refundable. Staff disburses the cash, and the session status changes from ACTIVE to SETTLED. The physical card returns to AVAILABLE inventory, ready to be issued to the next customer with zero balance.

- Scenario: Customer Self-Service Balance Check via Phone Camera
  - Question: How does a customer check their balance without visiting a counter or installing an app?
  - Technical Answer: The QR code printed on the physical card contains an opaque HTTPS customer portal URL. Scanning it opens the lightweight web portal in the smartphone browser. The customer views their live wallet balance, recent recharge and purchase history, and cafeteria details in real time.

- Scenario: QR Screenshot Sharing
  - Question: Can multiple customers share a single card by screenshotting the QR code?
  - Technical Answer: The QR code points to a single active session pool. While a screenshot can be scanned, all purchases deduct from the exact same balance. In addition, the active session records the customer name and phone number, which cashiers can verify on high-value orders.

## 3. Hardware, Printing, and Network Scenarios

- Scenario: Thermal Printer Runs Out of Paper Mid-Transaction
  - Question: Payment was deducted from the card, but the thermal printer jammed or ran out of paper. Did the customer lose money, and how do they get a bill?
  - Technical Answer: The database transaction commits first. The mobile POS retains the full receipt data on screen. Staff can tap Reprint Receipt once paper is replaced, or tap Download PDF / Share Digital Bill to send a digital receipt directly, preventing any double-charging.

- Scenario: Internet Connectivity Outage During Lunch Rush
  - Question: What happens if cafeteria Wi-Fi or mobile hotspot drops during the peak 1:00 PM lunch rush?
  - Technical Answer: The mobile POS app uses local SQLite caching for active menus and counter configurations. For financial transactions, the app prevents unverified offline double-spending by requiring connectivity to the backend or local counter server. If offline, the POS notifies staff clearly rather than failing silently with un-synced balances.

- Scenario: Server URL and Flavor Isolation
  - Question: How do you prevent staging test data from polluting production, or mobile devices hitting the wrong server?
  - Technical Answer: The mobile app enforces entry point separation (main_production.dart vs main_staging.dart). ServerConfigStorage contains an active guard that automatically purges any hardcoded staging URLs if running in a production flavor, and vice versa.

## 4. Cafeteria Owner and Manager Reconciliation Scenarios

- Scenario: End-of-Day Cash Drawer Discrepancy
  - Question: At 9:00 PM, the cashier has 14,200 rupees cash in the drawer, but the system reports 15,000 rupees in Cash Recharges. How does the manager trace the difference?
  - Technical Answer: The Org Admin opens Analytics -> Financial Overview. The system isolates Cash Recharges, UPI Recharges, Food Purchases, and Cash Refunds into distinct tiles. The manager can click View PDF to generate an itemized transaction ledger matching each recharge against the specific cashier user ID and timestamp to isolate the exact missing 800 rupees.

- Scenario: Multiple Cafeteria Branches Under One Owner
  - Question: If an owner runs both an engineering canteen and a medical canteen, can a student recharge at Canteen A and spend at Canteen B?
  - Technical Answer: Yes. Under the organization hierarchy, cards and sessions are organization-wide by default, while transactions record the exact branchId where the meal was served. The Org Admin dashboard provides branch comparison analytics, showing which counter collected the cash versus which counter served the food.

- Scenario: Menu Item Modification During Operational Hours
  - Question: What happens if a counter manager deletes a product that was sold earlier in the day?
  - Technical Answer: Soft-delete and referential integrity protection prevent historical transaction breakage. The product is deactivated or hidden from future POS carts, but existing transaction rows retain the product name, price, and quantity for accurate historical reporting.

## 5. SaaS Platform and Super Admin Governance Scenarios

- Scenario: Cafeteria Account Deletion and Data Cleanup
  - Question: When a cafeteria contract ends and the Super Admin deletes the organization, what happens to live cards, sessions, and analytics?
  - Technical Answer: The backend deletion routine deletes transactions, sessions, and cards in foreign-key dependency order inside a single database transaction. All platform analytics queries filter strictly for active organizations, ensuring deleted cafeteria counts, cards, and financial figures vanish immediately from the platform totals without caching stale 304 responses.

- Scenario: Multi-Tenant Data Leak Prevention
  - Question: Can Cafeteria A staff or admin ever see card numbers, sales figures, or customer data from Cafeteria B?
  - Technical Answer: No. Every API request is verified through JWT authentication middleware and tenant isolation middleware. The database queries enforce organizationId scoping at the controller and ORM level. Even if a user alters the request payload, the backend validates authorization against verified JWT claims.

- Scenario: Plan Limits Exceeded
  - Question: What happens when a cafeteria owner reaches their subscription card or counter limit?
  - Technical Answer: The backend checks organization usage against the active plan limit during card issuance. If cardCount exceeds cardLimit, the API returns a structured LIMIT_EXCEEDED error. The dashboard displays an alert prompting the owner to request a plan upgrade from the Super Admin.

## 6. Architecture and Security Questions

- Question: Why not store wallet balances directly on physical RFID/NFC/QR cards?
  - Answer: Offline chip balance architectures are vulnerable to physical cloning and tampering. Storing the balance on a centralized database session linked to an opaque token guarantees cryptographic security, real-time balance updates, instant remote blocking if stolen, and phone-based balance checks.

- Question: What is the architectural difference between a Card and a CardSession?
  - Answer: A Card represents the permanent physical token (plastic card or printed QR badge). A CardSession represents a temporary customer lifecycle (from issuance to card return). When a card is returned, the session settles and closes. When issued to a new customer tomorrow, a new session begins on the same plastic card with a fresh zero balance.

- Question: Can the customer portal link be guessed by incrementing IDs?
  - Answer: No. Tokens are generated using cryptographically random UUIDs or high-entropy hash strings. There are no sequential numbers or database primary keys exposed in QR URLs.
