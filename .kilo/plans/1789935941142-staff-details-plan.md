# Plan: Counter Staff Page Cleanup (STAFF only, ORG_ADMIN unchanged)

## Confirmed (4 points)
1. Real staff name shown (formatStaffDisplayName removes "counter manager")
2. Details button opens minimal modal with Active/Inactive slide
3. View Details / Edit / Performance & Audit actions preserved
4. Active/Inactive slide switch kept

## Before / After (ASCII)
BEFORE (2-col counter table):
```
Staff Name | Actions (Details only)
"Counter Counter Manager" | [Details]
```
AFTER (same 2-col + real names + full actions via Details modal):
```
Staff Name | Details
"John Doe" | [Details] -> opens: Name + Active/Inactive slide + Info + View/Edit/Audit
```

## Files (STAFF only, counter view guarded by isCounterView)
- Frontend/src/features/staff/StaffPage.tsx (formatStaffDisplayName line 898; counterStaffColumns 1124; showStaffDetailsModal 1677; handleOpenStaffAudit 921)

## Validation
- npx tsc --noEmit = 0 errors
- npm test -- --run = 255 pass
- ORG_ADMIN grouped view (orgAdminColumns 1068) untouched
