# Bug Brief: class-schedule — Edit modal save button renders "Save Changes" instead of entity-specific label

Date: 2026-04-05 20:55

## Failing Tests
Spec: `frontend/e2e/class-schedule.spec.ts`

- `Trainer Profile Management › AC 3 — admin can edit a trainer profile and changes are reflected immediately`
- `Trainer Profile Management › AC 2 — photo upload section is present in edit mode with accepted formats hint`
- `Trainer Profile Management › SCH-09 — trainer photo upload succeeds and the photo is rendered after reload`
- `Trainer Profile Management › SCH-10 — trainer photo upload rejects unsupported file formats`
- `Trainer Profile Management › SCH-11 — trainer photo upload rejects files larger than 5 MB`
- `Room Management › AC 11 — admin can edit a room and changes appear in the list`
- `Class Template Management › AC 18 — admin can edit a class template and changes appear in the library`

## Failure
```
Error: expect(locator).toBeVisible() failed
Locator: getByRole('dialog').getByRole('button', { name: 'Save Trainer', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found
```

Same error pattern for `Save Room` and `Save Template` in their respective edit flows.
For SCH-10 and SCH-11, the test times out waiting for `getByRole('button', { name: 'Upload Photo' })` because the edit dialog never opens (the spec cannot click the "Save Trainer" button in the create step).

## Steps to Reproduce
1. Navigate to `/admin/trainers` as admin.
2. Create a trainer via the modal.
3. Open the edit modal for that trainer (`Edit <Name>` button).
4. Observe the save button label in the dialog.
5. Expected: button text is `Save Trainer`.
6. Actual: button text is `Save Changes`.

Same reproduction applies to rooms (`Save Room` expected, `Save Changes` rendered) and class templates (`Save Template` expected, `Save Changes` rendered).

## Evidence
Screenshots: `test-results/` (captured by Playwright on failure)

Console errors: none

Source code — `TrainerFormModal.tsx` line 407:
```tsx
{isLoading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save Trainer'}
```
`RoomFormModal.tsx` line 354:
```tsx
{isLoading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save Room'}
```
`ClassTemplateFormModal.tsx` line 451:
```tsx
{isLoading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save Template'}
```

All three modals share the same pattern: the label is entity-specific only in create mode; in edit mode it falls back to the generic `Save Changes`.

## Severity
Critical — all edit flows for trainers, rooms, and class templates are either untestable or broken from a spec perspective. The AC-2, SCH-09, SCH-10, SCH-11 tests additionally cannot exercise photo upload because they cannot reach the edit dialog save step.

## Files to Change
(leave blank — developer fills after root cause analysis)

## Proposed Fix
(leave blank — developer fills after root cause analysis)
