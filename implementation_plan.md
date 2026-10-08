# Implementation Plan: Super Admin Organizations and Subscriptions Terminology and UI Cleanup

## Visual UI Sketch

![Super Admin Organizations and Plans UI Sketch](file:///C:/Users/damie/.gemini/antigravity-ide/brain/c99edd16-0faf-4782-a7e1-399d96eb8a4b/superadmin_orgs_plans_sketch_1791491477798.jpg)

## ASCII Wireframes

### 1. Super Admin Organizations Page - Toolbar and Row Actions
```
+----------------------------------------------------------------------------------------------------+
| Organizations                                                          [+ Add Organization]        |
+----------------------------------------------------------------------------------------------------+
| Search Organization                      Plan Scope             Status Scope       [Refresh]       |
| [ Search by name or ID...        ]      [ All Plans      v ]   [ All Statuses v ]                  |
+----------------------------------------------------------------------------------------------------+
| ORGANIZATION NAME        | ADMIN EMAIL           | KITCHENS | CARDS | STATUS   | ACTIONS           |
| Demo Org 1               | admin@demo1.com       | 2        | 14    | ACTIVE   | [ v Action Menu ] |
+----------------------------------------------------------------------------------------------------+
                                                                                 | Edit Details      |
                                                                                 | Change Status     |
                                                                                 | Reset Password    |
                                                                                 |-------------------|
                                                                                 | Delete Organizations |
                                                                                 +-------------------+
```

### 2. "Add new organization" Modal
```
+------------------------------------------------------------------+
| Add new organization                                         [X] |
+------------------------------------------------------------------+
| Organization Name *                                              |
| [ e.g. Acme Organization                                       ] |
|                                                                  |
| Organization Email *                                             |
| [ Org gmail                                                    ] |
|                                                                  |
| Plan *                                                           |
| [ Starter (₹999/monthly)                                     v ] |
|                                                                  |
|                                       [ Cancel ] [ Create Org ]  |
+------------------------------------------------------------------+
```

### 3. "Delete Organizations" Modal (Streamlined)
```
+------------------------------------------------------------------+
| Delete Organizations                                         [X] |
+------------------------------------------------------------------+
|                                                                  |
|   Are you sure you want to permanently delete Demo Org 1?        |
|                                                                  |
|                                    [ Cancel ] [ Delete Org ]     |
+------------------------------------------------------------------+
```

### 4. "Reset Org Admin Password" Modal (Legible Black Text)
```
+------------------------------------------------------------------+
| Reset Org Admin Password                                     [X] |
+------------------------------------------------------------------+
| [!] Are you sure you want to reset the password for Demo Admin?  |
|     Setting a temporary password will require the Org Admin to   |
|     create a new private password upon their next login.         |
|     (Rendered in crisp black/dark slate font)                    |
|------------------------------------------------------------------|
| Organization:  Demo Org 1                                        |
| Admin Name:    Demo Org 1 Admin                                  |
| Admin Email:   damienjosephmartin10@gmail.com                    |
|------------------------------------------------------------------|
| Temporary Password *                                             |
| [ Min. 6 characters                                            ] |
|                                                                  |
|                                     [ Cancel ] [ Set Password ]  |
+------------------------------------------------------------------+
```

### 5. Plans and Subscriptions: Edit Plan Modal (Plan Name as Title)
```
+------------------------------------------------------------------+
| Starter                                                      [X] |
+------------------------------------------------------------------+
| [icon] SUBSCRIBED ORGANIZATION              [ 0 Organizations ]  |
|------------------------------------------------------------------|
| Plan Name *                                                      |
| [ Starter                                                      ] |
|                                                                  |
| Default Price (₹) *                      Billing Interval        |
| [ 999                          ]        [ Monthly              v]|
|                                                                  |
| Kitchen Limit            Staff Limit             Card Limit      |
| [ 3                 ]   [ 3                 ]   [ 50           ] |
|                                                                  |
| [ Delete Plan ]                         [ Cancel ] [ Save Plan ] |
+------------------------------------------------------------------+
```

### 6. Subscriptions Tab: Renamed Heading and Search Bar
```
+----------------------------------------------------------------------------------------------------+
| Organization Subscriptions & Custom Limits                                                         |
|                                                                                                    |
| [ Search organization by name or ID...   ]   [ All Plans v ]   [ All Statuses v ]                  |
|                                                                                                    |
| ORGANIZATION             | ASSIGNED PLAN     | BILLING   | USAGE LIMITS           | ACTIONS        |
| Demo Org 1               | Starter           | Monthly   | 1/3 K, 2/3 S, 0/50 C   | [ Edit Limits ]|
+----------------------------------------------------------------------------------------------------+
```

## Technical Changes

### File 1: `Frontend Money Card/src/features/organizations/OrganizationsPage.tsx`
- Line 224: Update action menu button label from `<span>Delete Cafeteria</span>` to `<span>Delete Organizations</span>`.
- Line 762: Update search label from `Search Cafeteria` to `Search Organization`.
- Line 870: Update modal title from `Add New Cafeteria` to `Add new organization`.
- Line 882: Update input label from `Cafeteria Name *` to `Organization Name *`.
- Line 883: Update input placeholder from `e.g. Acme Cafeteria` to `e.g. Acme Organization`.
- Line 897: Update input label from `Org Admin Gmail Address *` to `Organization Email *`.
- Line 899: Update input placeholder from `e.g. cafeteria.admin@gmail.com` to `Org gmail`.
- Line 1259-1265: In Reset Org Admin Password modal, change font color from yellow (`text-amber-200`, `text-amber-300/80`) to black (`text-slate-900`, `text-slate-800`), with clean light amber background/border styling.
- Line 1270: Rename metadata row label from `Cafeteria:` to `Organization:`.
- Line 1356: In Delete Organization Confirmation modal, change `title="Delete Cafeteria"` to `title="Delete Organizations"`.
- Line 1357: Remove `description="Permanently remove cafeteria and all related data"`.
- Lines 1379-1381: Remove `<p className="text-xs text-slate-600 leading-relaxed">This action cannot be undone. All branch locations, staff accounts, products, and registered smart cards belonging to this organization will be permanently deleted.</p>`, keeping only the direct confirmation question.

### File 2: `Frontend Money Card/src/features/subscriptions/AdminPlansSubscriptionsView.tsx`
- Line 901: Rename section heading from `Cafeteria Subscriptions & Custom Limits` to `Organization Subscriptions & Custom Limits`.
- Line 908: Rename search placeholder from `Search cafeteria by name or ID...` to `Search organization by name or ID...`.
- Line 942: Update empty state title from `No cafeteria subscriptions found` to `No organization subscriptions found`.
- Line 987: Rename search placeholder from `Search pending requests by cafeteria or plan...` to `Search pending requests by organization or plan...`.
- Line 1005: Update empty state description to refer to `organization plan change requests`.
- Line 1071: In Create New Plan modal, remove `<span className="text-xs font-semibold text-slate-700 block">Default Resource Limits</span>`.
- Line 1120: In Edit Global Plan modal, change `title={'Edit / View Global Plan: ' + selectedPlan?.name}` to `title={selectedPlan?.name || 'Plan Details'}`.
- Line 1137: Rename `Subscribed Tenants` to `Subscribed Organization`.
- Line 1141: Update badge count text from `{subscribedOrgsForSelectedPlan.length} Cafeterias` to `{subscribedOrgsForSelectedPlan.length} Organizations`.
- Line 1145: Remove `<p className="text-xs text-slate-500">No cafeterias currently subscribed to this plan.</p>`.
- Line 1197: In Edit Global Plan modal, remove `<span className="text-xs font-semibold text-slate-700 block">Default Resource Limits</span>`.
- Lines 1235-1237: In Edit Global Plan modal, remove `<p className="text-xs text-slate-400">Note: Changing default limits updates the global template. Organization-specific overrides will remain intact.</p>`.
- Line 1447: In Review Plan Request modal, change `Cafeteria:` to `Organization:`.

## Verification and Testing
1. Run `npx tsc --noEmit` in `Frontend Money Card` to ensure zero TypeScript errors.
2. Run `npm test -- --run` in `Frontend Money Card` to verify all test suites continue passing.
3. Review git diff to ensure strict scope adherence and zero unrequested changes.
