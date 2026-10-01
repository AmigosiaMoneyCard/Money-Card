# Implementation Plan: Mobile POS Network Error Message Sanitization

Sanitize raw connection timeout and socket error messages in the mobile application to prevent internal backend URLs (e.g. `money-card-backend-staging-681a.onrender.com`) from being exposed to staff, replacing them with the exact message: "Network error. Please check your connection and try again."

---

## Technical Design & Exact Code Changes

### 1. File: `Flutter Money card/lib/core/errors/api_exception.dart`
- In `ApiException.fromDioException`:
  - When `dioException.type` is `DioExceptionType.connectionTimeout`, `sendTimeout`, or `receiveTimeout`:
    - Replace the previous message with:
      `'Network error. Please check your connection and try again.'`
  - When `dioException.type` is `DioExceptionType.connectionError`:
    - For non-loopback hosts:
      - Replace `'Cannot connect to server at $targetDisplay. Ensure backend server is running on laptop.'`
      - With: `'Network error. Please check your connection and try again.'`
  - When `dioException.type` is `DioExceptionType.badResponse` or `unknown`:
    - Fallback message: `'Network error. Please check your connection and try again.'`

---

## Verification Plan

1. Automated Tests:
   - Run `flutter analyze --no-pub` to ensure 0 lint or analyzer errors.
   - Run `flutter test` across all unit and widget tests in `Flutter Money card`.
2. Local Git:
   - Auto-approved local git commit on `staging`.
   - Ask user before pushing to remote (`origin staging`) and publishing Shorebird patch.
