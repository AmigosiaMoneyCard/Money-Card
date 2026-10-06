# Implementation Plan: Fix Backend CI Typecheck Failure

## Overview
The GitHub Actions CI pipeline failed at the "Backend Tests and Typecheck" step during `npx tsc --noEmit`. The root cause is duplicate variable declarations in `returnSession` and a missing union type member in `balanceStream.service.ts`.

## Root Cause Details
1. `Backend Money Card/src/controllers/sessions.controller.ts`:
   - Lines 586-587 declare `const paymentMethod` and `const selectedPaymentMethod`.
   - Lines 607-609 redeclare `const paymentMethod` and `const selectedPaymentMethod` in the same function scope, triggering TypeScript error `TS2451: Cannot redeclare block-scoped variable`.
2. `Backend Money Card/src/services/balanceStream.service.ts`:
   - Line 7 defines `BalanceUpdatePayload.type` union without `'RETURN_NO_REFUND'`, causing `TS2322: Type 'RETURN_NO_REFUND' is not assignable to type...` when broadcasted during card return with zero refund.

## Technical Changes Required

1. `Backend Money Card/src/controllers/sessions.controller.ts`:
   - In `returnSession()`: Remove duplicate declaration lines 586-587 so `paymentMethod`, `skipRefund`, and `selectedPaymentMethod` are declared cleanly once at lines 607-609.

2. `Backend Money Card/src/services/balanceStream.service.ts`:
   - Add `'RETURN_NO_REFUND'` to the `BalanceUpdatePayload` `type` union.

## Verification Plan
1. Run `npx tsc --noEmit` in `Backend Money Card` to verify 0 TypeScript errors.
2. Run `npm test` in `Backend Money Card` to ensure all 124 tests pass.
3. Once approved and verified, push to `staging` to resolve the GitHub Actions CI pipeline.
