# Implementation Plan - Fix QR Scan Resolution Unique Constraint Error on qrToken

![Mobile Action Hub](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\minimal_return_refund_and_pos_billing_1790679770487.jpg)
![Minimal Cards and Billing](C:\Users\damie\.gemini\antigravity-ide\brain\999581c9-5c30-4195-933d-3667425ed95a\minimal_cards_and_return_refund_parity_1790743012642.jpg)

Problem Analysis:
When a staff member scans a card QR code in the Mobile POS app, the request calls POST /api/v1/cards/resolve with the scanned qrToken.
Inside resolveCard (Backend Money Card/src/controllers/cards.controller.ts):
1. The backend searches for the card scoped strictly to the current staff user's organization: prisma.card.findFirst({ where: { organizationId: orgId, OR: [...] } }).
2. If the scanned card exists in the database under a different organization (e.g. from seed data, another test cafeteria, or a different organization account), the query returns null.
3. Because the query returns null, the backend enters the auto-registration fallback branch: prisma.card.create({ data: { organizationId: orgId, qrToken: token, ... } }).
4. Because qrToken is globally unique across the cards table (qrToken String @unique), PostgreSQL rejects the insert with a Prisma P2002 unique constraint violation on qrToken.
5. The catch block then attempts to find the card again using organizationId: orgId, which still returns null because the card belongs to another organization.
6. The backend throws a raw 400 CARD_REGISTRATION_FAILED error: "Failed to auto-register card: Unique constraint failed on the fields: (qrToken)".
7. The mobile app catches this ApiException and displays the raw database constraint error in the UI.
Additionally, if the scanned QR code contains trailing slashes, URL parameters, or specific URL prefixes that differ from the stored token format, token extraction can diverge, leading to unexpected registration attempts.

Proposed Worktree Specifications:

1. Robust QR Token Extraction & Cross-Tenant Resolution Guard in Backend
- File: Backend Money Card/src/controllers/cards.controller.ts
  - Add extractCleanToken(input: string): string helper:
    - Decodes URI components if encoded.
    - Trims whitespace and strips trailing slashes.
    - Strips mc: prefix if present.
    - Safely parses URLs to extract tokens from /c/{token}, ?token=..., and ?qr=... query parameters.
    - Falls back cleanly to sanitized alphanumeric token strings.
  - In resolveCard:
    - Use extractCleanToken to normalize rawInput.
    - Query caller's organization first (exact and case-insensitive matching across qrToken and physicalCardNumber).
    - If not found in caller's organization:
      - Perform a global lookup: prisma.card.findFirst({ where: { OR: [{ qrToken: cleanToken }, { qrToken: { equals: cleanToken, mode: 'insensitive' } }, { qrToken: tokenStr }] }, include: { organization: true } }).
      - If found under another organization (existing.organizationId !== orgId):
        - Return HTTP 400 / 409 error: "This card is already registered to another cafeteria organization (${existing.organization?.name || 'Different Organization'}). It cannot be used in your organization."
        - Strictly bypass any auto-registration create attempts.
      - If found under the same organization via broader criteria, use the card.
    - If not found anywhere in the entire database:
      - Proceed with auto-registration.
      - In the auto-registration try/catch:
        - Handle Prisma P2002 errors gracefully: re-check global existence; if owned by another organization return clean mismatch error; if owned by caller's organization (e.g. concurrent race condition) return the card safely.
        - Prevent any unhandled raw database exception from reaching the client.

2. Enhanced QR Code Token Parser in Flutter Mobile POS App
- File: Flutter Money card/lib/core/utils/qr_validator.dart
  - In QrValidator.extractToken:
    - Add support for ?qr= parameter in URLs.
    - Strip trailing slashes from path segments.
    - Handle URL decoding if raw payload contains encoded sequences.

3. User-Friendly Error Presentation in Mobile POS UI
- File: Flutter Money card/lib/features/pos/pos_scan_purchase_screen.dart
  - Ensure error snackbar strips any internal technical prefixes and presents clean human-readable messaging.

ASCII Wireframes:

Scan Resolution Flow:
+-------------------------------------------------------------+
| Camera View / Manual Card Input                             |
| Scans: https://money-card-frontend-staging.vercel.app/c/qtk |
+-------------------------------------------------------------+
                              |
                              v
                  [extractCleanToken]
                  Extracts: "qtk_..."
                              |
                              v
                [Lookup in Staff's Org]
                    /                 \
            Found  /                   \ Not Found
                  v                     v
          [Activate Session]     [Global DB Lookup]
                                   /            \
                     Found in Other Org          Not Found Anywhere
                            |                             |
                            v                             v
           [Clean Organization Error]            [Auto-Register New Card]
           "Card belongs to another org"         "Wallet activated"

Mobile Error Display (Friendly Notice):
+-------------------------------------------------------------+
| [!] This card is already registered to another cafeteria    |
|     organization (Acme Cafeterias). Cannot be used here.    |
+-------------------------------------------------------------+

Verification Plan:
1. Proactively run Backend test suite: npm test.
2. Proactively run Flutter test suite: flutter test and flutter analyze --no-pub.
3. Verify cross-tenant detection prevents unique constraint exceptions when scanning cards belonging to other organizations.
4. Verify valid cards within the organization resolve and activate smoothly.
