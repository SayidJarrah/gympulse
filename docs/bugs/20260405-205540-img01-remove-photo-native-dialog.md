# Bug Brief: entity-image-management — IMG-01 Remove photo button click times out waiting for native confirm dialog

Date: 2026-04-05 20:55

## Failing Test
Spec: `frontend/e2e/entity-image-management.spec.ts`
Test name: `Entity Image Management › IMG-01 member uploads and removes a profile photo with navbar sync`

## Failure
```
Test timeout of 30000ms exceeded.

Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('section').filter({ hasText: 'Profile photo' }).first().getByRole('button', { name: 'Remove' })
    - locator resolved to <button ...>Remove</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - performing click action
```

## Steps to Reproduce
1. Log in as a USER.
2. Navigate to `/profile`.
3. Upload a profile photo and save.
4. Navigate back to `/profile`.
5. Click the "Remove" button in the Profile photo section.
6. The spec uses `page.waitForEvent('dialog')` expecting a native browser `confirm()` dialog.
7. Expected: a browser `confirm()` dialog appears and is accepted via `dialog.accept()`.
8. Actual: the "Remove" button click causes Playwright to block, waiting for a dialog that never fires (or the button click is intercepted by something that prevents the dialog from opening), causing a 30s timeout.

## Evidence
The spec pattern:
```ts
const dialogPromise = page.waitForEvent('dialog');
await photoSection.getByRole('button', { name: 'Remove' }).click();
const dialog = await dialogPromise;
await dialog.accept();
```

The `waitForEvent('dialog')` is set up **after** the `click()` call (in sequential `await` form). Playwright requires the dialog handler to be registered **before** the action that triggers the dialog. Because `waitForEvent` is awaited after the click, if the dialog fires synchronously during the click, Playwright has no handler registered yet and the dialog is dismissed (or the click never fires the dialog at all).

Additionally, if the application uses a custom modal/confirmation component rather than a native `window.confirm()`, no `dialog` event fires and `waitForEvent('dialog')` will never resolve.

## Severity
Critical — photo removal flow is entirely untestable. Whether this is a spec ordering issue (dialog promise registered after click) or the app uses a custom modal instead of `window.confirm()` needs developer verification.

Likely agent: QA (spec fix if ordering issue or custom modal) or Frontend (if the app is supposed to use `window.confirm()` but does not).

## Files to Change
(leave blank — developer fills after root cause analysis)

## Proposed Fix
(leave blank — developer fills after root cause analysis)
