# Implementation Plan: Delete Staff Option in Edit Staff Modal (Org Admin & Counter Dashboard)

Add a dedicated Delete Staff button on the far left of the modal footer inside the Edit Staff modal across Org Admin and Counter Dashboard, opposite the Close and Save buttons.

## Visual Design Sketch

![Edit Staff Modal with Delete Button](C:\Users\damie\.gemini\antigravity-ide\brain\9c70217b-9240-4d11-907e-eaaf4a37b746\edit_staff_modal_delete_button_sketch_1790243640386.jpg)

## User Review Required

- Delete Button Location:
  - Inside the Edit Staff modal (`showStaffModal`), placed on the **far left** of the modal footer.
  - Sits on the opposite end from the **Close** and **Save Staff Information** buttons.
- Layout & Responsiveness:
  - Modal footer uses a two-sided flex layout (`w-full flex items-center justify-between`):
    - Left side: Danger-styled `Delete Staff` button with `Trash2` icon.
    - Right side: `Close` outline button and `Save Staff Information` primary button.
- Safety & Guards:
  - When editing another staff member: `Delete Staff` is active, clicking it opens the confirmation dialog.
  - When editing own account (`selectedStaff.id === user?.id`): The button remains visible on the far left but is disabled with tooltip "Cannot delete your own account" to prevent accidental lockouts while maintaining visual consistency.
- Confirmation Flow:
  - Clicking `Delete Staff` opens the existing delete confirmation modal.
  - Confirming triggers `apiService.staff.deleteStaff(staffId)`, closes both modals, and shows a success notification.

## Proposed Changes

### Frontend Web Admin Dashboard

#### [MODIFY] [StaffPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/staff/StaffPage.tsx)

- Update `canManage` definition to ensure counter managers in Counter Dashboard have management access:
  ```ts
  const canManage = hasPermission('STAFF_MANAGE') || isCounterView;
  ```
- Refactor the `ModalFooter` of the Edit Staff modal (`showStaffModal`, around line 1605):
  - Replace the current single flex list with an explicit two-sided flex container:
    ```tsx
    <ModalFooter className="w-full flex items-center justify-between">
      <div>
        {canManage && selectedStaff && (
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={selectedStaff.id === user?.id || isSubmitting}
            title={selectedStaff.id === user?.id ? 'Cannot delete your own account' : 'Delete staff member'}
            className="text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 border border-rose-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={() => handleInitiateDelete(selectedStaff)}
          >
            Delete Staff
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setShowStaffModal(false)} disabled={isSubmitting}>
          Close
        </Button>
        {canManage && staffTab === 'overview' && (
          <Button type="button" variant="primary" onClick={handleSaveProfile} isLoading={isSubmitting} disabled={isSubmitting}>
            Save Staff Information
          </Button>
        )}
        {canManage && staffTab === 'branches' && (
          <Button type="button" variant="primary" onClick={handleSaveBranches} isLoading={isSubmitting} disabled={isSubmitting} leftIcon={<Building2 className="h-4 w-4" />}>
            Save Branches
          </Button>
        )}
      </div>
    </ModalFooter>
    ```

---

## Wireframe Layout

### Edit Staff Modal Footer Layout
```
+------------------------------------------------------------------------------------+
| Staff Settings: Rahul Sharma                                                   [X] |
+------------------------------------------------------------------------------------+
| [Overview]   [Counters]                                                            |
|                                                                                    |
| Staff Name                                                                         |
| [ Rahul Sharma                                                                   ] |
|                                                                                    |
| Phone Number                                                                       |
| [ 9876543210                                                                     ] |
|                                                                                    |
| Account Status                                                                     |
| (•) Active  ( ) Inactive                                                           |
|                                                                                    |
+------------------------------------------------------------------------------------+
| [ Trash2 Delete Staff ]                                 [ Close ] [ Save Changes ] |
+------------------------------------------------------------------------------------+
```

---

## Web <-> Mobile App Parity Check

- Mobile POS (`Flutter Money card`):
  - The Flutter mobile POS app is strictly an operational terminal for issuing cards, recharges, and scanning food purchases.
  - Staff creation, editing, and deletion are handled exclusively within the Web Admin Dashboard and Counter Dashboard. No Flutter changes required.

---

## Verification Plan

### Automated Test Suites
- Execute Frontend Vitest tests: `npm test -- --run` in `Frontend Money Card`
- Execute TypeScript check: `npx tsc --noEmit` in `Frontend Money Card`
- Ensure all 272+ frontend tests pass with 0 errors.

### Manual Verification
- Open Org Admin -> Staff -> click Edit on a staff member -> verify "Delete Staff" button is displayed on the far left of the footer, with Close and Save buttons on the far right.
- Open Counter Dashboard -> Staff -> click Edit on a staff member -> verify "Delete Staff" button is on the far left.
- Click "Delete Staff" -> verify confirmation dialog opens with warning message and cancel/confirm buttons.
