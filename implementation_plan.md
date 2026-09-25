# Implementation Plan — Remove Redundant Add Staff Button from Search Bar Row

Streamline the Staff Management UI by removing the duplicate "Add Staff" button from the search filter row, keeping the primary "Add Staff" button exclusively at the top right of the page header.

![Clean Search Bar Row with Refresh Only](C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/counter_staff_clean_search_bar_1790320143558.jpg)

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

## User Requirements and Scope

- The user requested: "in counter dashobrd - Staff Management - Remove add staff option HOriontal to Search bar. update plan".
- Remove the redundant "Add Staff" button positioned next to the "Refresh" button on the search bar row.
- Retain the primary "Add Staff" button at the top right of the page header.

## Proposed Changes

File: [StaffPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/staff/StaffPage.tsx)
- In the search and filter row (lines 1292-1314), remove the conditional `Button` rendering `{isCounterView && canManage && (<Button ...>Add Staff</Button>)}`.
- Leave only the `Refresh` button in the action cluster aligned with the search input:
```tsx
<div className="flex items-center gap-2">
  <Button
    variant="outline"
    size="sm"
    onClick={fetchStaffData}
    leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
    className="text-xs h-8 px-2.5 rounded-xl border-slate-200 text-slate-700 hover:border-emerald-500"
  >
    Refresh
  </Button>
</div>
```

## Verification and Test Plan

- Proactively execute Frontend test suite: `npm test -- --run` in `Frontend Money Card` (272 passing).
- Proactively execute Frontend TypeScript check: `npx tsc --noEmit` in `Frontend Money Card` (0 errors).
- Confirm the search bar row displays only the search input and the Refresh button.
