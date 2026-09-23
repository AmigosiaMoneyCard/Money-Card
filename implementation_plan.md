# Implementation Plan: Staff Real Password Persistence & Staff Details Modal Decluttering

Comprehensive plan to:
1. Fix "Current Password" in Staff Settings (Org Admin) so it displays and shares the actual real password rather than falling back to static '123456'.
2. Declutter the Staff Details modal by removing the Active/Inactive slide toggle, and removing Close, Edit, Performance & Audit, and View Details buttons, keeping only the Back button visible.

![Staff Details Minimal Modal & Password Management](file:///C:/Users/damie/.gemini/antigravity-ide/brain/9635058f-8784-4982-b40a-c7e9d921ee9b/staff_details_minimal_and_password_sketch_1790137490495.jpg)

## User Review Required

> [!IMPORTANT]
> - **Staff Password Persistence**:
>   - Passwords for staff created directly or via counter creation will now be stored in persistent local cache (`mc_staff_passwords` and cross-referenced with `mc_branch_passwords`).
>   - When changing a staff password, the updated password is saved immediately into persistent storage so it stays accurate across page reloads and modal opens.
>   - The "Current Password" field and the "Copy Credentials" action will always use the real password.
> - **Staff Details Modal Simplification**:
>   - The Active/Inactive toggle switch is removed from inside the modal.
>   - The buttons Close, Edit, Performance & Audit, and View Details are removed from the footer.
>   - Only the Back button remains visible, navigating back to the previous list or closing the dialog.

---

## ASCII Wireframes

### Staff Details Modal (Minimal & Clean)
```
+-------------------------------------------------------------+
| Staff Details                                           [X] |
+-------------------------------------------------------------+
|  [Avatar]  Robert Chen                        [Active]      |
|            Counter Staff                                    |
|                                                             |
|  +-------------------------------------------------------+  |
|  | Assigned Counter      Robert Chen                     |  |
|  | Phone Number          (512) 654-6393                  |  |
|  | Role & Position       Counter Staff                   |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  [<- Back]                                                  |
+-------------------------------------------------------------+
(Active toggle removed; Close, Edit, Audit, View Details removed)
```

### Org Admin Staff Settings — Real Password Section
```
+-------------------------------------------------------------+
| Current Password Card:                                      |
| +---------------------------------------------------------+ |
| | CURRENT PASSWORD                                        | |
| | actual_real_password_here               [Reveal / Hide] | |
| | Copying or sharing credentials will use this password.  | |
| +---------------------------------------------------------+ |
|                                                             |
| [Update Password]    [Copy Credentials]                     |
+-------------------------------------------------------------+
(Uses persistent mc_staff_passwords and mc_branch_passwords)
```

---

## Proposed Changes

### Frontend — `Frontend Money Card/`

#### [StaffPage.tsx](file:///D:/Money%20Card%20Project/Frontend%20Money%20Card/src/features/staff/StaffPage.tsx)

1. **Persistent Staff Password Storage**:
   - Define storage constants:
     ```ts
     const STAFF_PASSWORDS_KEY = 'mc_staff_passwords';
     const BRANCH_PASSWORDS_KEY = 'mc_branch_passwords';
     ```
   - Implement storage helper methods:
     ```ts
     const getStoredStaffPassword = (staffId: string, branchIds?: string[]): string | null => {
       try {
         const staffMap = JSON.parse(localStorage.getItem(STAFF_PASSWORDS_KEY) || '{}');
         if (staffMap[staffId]) return staffMap[staffId];
         if (branchIds && branchIds.length > 0) {
           const branchMap = JSON.parse(localStorage.getItem(BRANCH_PASSWORDS_KEY) || '{}');
           for (const bid of branchIds) {
             if (branchMap[bid]) return branchMap[bid];
           }
         }
       } catch {}
       return null;
     };

     const storeStaffPassword = (staffId: string, pass: string): void => {
       try {
         const staffMap = JSON.parse(localStorage.getItem(STAFF_PASSWORDS_KEY) || '{}');
         staffMap[staffId] = pass;
         localStorage.setItem(STAFF_PASSWORDS_KEY, JSON.stringify(staffMap));
       } catch {}
     };
     ```
   - In `handleAddStaff`: After successful staff creation, call `storeStaffPassword(res.data.id, formPassword.trim())`.
   - In `handleChangeStaffPassword`: After successful password change, call `storeStaffPassword(selectedStaff.id, formNewPassword.trim())` and update `setCurrentStaffPassword(formNewPassword.trim())`.
   - In `handleOpenStaffModal`: Look up `const saved = getStoredStaffPassword(staff.id, staff.assignedBranchIds)` and set `setCurrentStaffPassword(saved || staff.credentials?.password || '123456')`.

2. **Staff Details Modal Decluttering (`showStaffDetailsModal`)**:
   - Remove the status slide switch block (lines 1729–1746).
   - In `ModalFooter` (lines 1749–1811):
     - Remove `Close` button.
     - Remove `Edit` button.
     - Remove `Performance & Audit` button.
     - Remove `View Details` button.
     - Make `Back` button unconditionally visible:
       ```tsx
       <ModalFooter>
         <Button
           type="button"
           variant="outline"
           size="sm"
           onClick={() => {
             setShowStaffDetailsModal(false);
             if (selectedCounterGroup) {
               setShowCounterStaffModal(true);
             }
           }}
           leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
           className="text-xs font-medium border-slate-300 text-slate-700 hover:bg-slate-100"
         >
           Back
         </Button>
       </ModalFooter>
       ```

---

## Verification Plan

### Automated Tests
- Type checking: `npx tsc --noEmit` in `Frontend Money Card/` (0 errors required)
- Vitest suite: `npm test -- --run` in `Frontend Money Card/` (255/255 passing required)
- Backend suite: `npm test` in `Backend Money Card/` (100/100 passing required)

### Manual Verification
1. Create a staff member with custom password, e.g. `SecretPass123`.
2. Open staff settings for that member: Click "Reveal" on Current Password, verify it shows `SecretPass123` instead of `123456`.
3. Update password to `NewPass456`: Verify Current Password updates immediately and persists when reloading page.
4. Open a counter manager created in Counters page: Verify Current Password reflects the counter's password from `mc_branch_passwords`.
5. Open Staff Details modal:
   - Verify Active/Inactive toggle switch is gone.
   - Verify Close, Edit, Performance & Audit, and View Details buttons are gone.
   - Verify only the Back button is visible and works properly.
