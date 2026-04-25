# Screens: user-profile-bio

This is an extension to the existing `/profile` page (handoff:
`docs/design-system/handoffs/member-profile-redesign/`). No new screen, no
new pattern. Inline-edit textarea added to the Personal Information card.

## Slot

In the Personal Information card on `/profile`, add a new field row labelled
**Bio** below `Emergency contact` and above the Account Actions row. The
field row uses the same inline-edit pattern as the redesign:

- Read state: label `Bio` (uppercase tracked eyebrow) + value text
  (`text-fg`). Multiline values render with preserved line breaks.
  Empty state: italic placeholder `text-fg-muted` reading `Add a short bio`.
- Edit state: `<textarea>` with 3 visible rows, autosizing up to 8 rows.
  Character counter below right of the textarea, `text-fg-metadata`,
  format `{n} / 500`. Counter switches to `text-warning-text` at < 50
  remaining, `text-error-text` at 0.

## Per-state rules

- **Populated:** value rendered with `whitespace-pre-line`. Edit affordance
  is the existing inline-edit chevron / hover-state used on other fields.
- **Loading:** during initial profile fetch — same skeleton as the rest of
  the card (no field-level skeleton needed).
- **Empty:** placeholder italic copy `Add a short bio` in `text-fg-muted`.
- **Error:** server-side validation surfaces below the textarea in the
  shared `text-error-text` style. Error code map (frontend
  `errorMessages.ts`):
  - `INVALID_BIO_FORMAT` → `Use plain text only — no HTML, markdown, or special characters.`
  - Server `INVALID_BIO_LENGTH` (>500) → not a separate code; the counter
    + native textarea maxlength handle this client-side. Server still
    returns 400 with `INVALID_BIO_FORMAT` if length somehow exceeded
    (defence in depth).

## Interactions

- Type → counter updates live.
- Pressing Cancel reverts to last saved value (same pattern as other inline
  fields).
- Pressing Save submits `PUT /profile/me` with `{ bio: <value or null if
  empty> }`.
- On success: returns to read state with new value rendered.
- On failure: stays in edit state with error message shown; user can retry.

## Tokens used

All from `docs/design-system/colors_and_type.css`:
- Eyebrow tracking: `eyebrow` token
- Text colors: `text-fg`, `text-fg-muted`, `text-fg-metadata`,
  `text-warning-text`, `text-error-text`
- Surface: same as parent card (`bg-surface-1`)
- Spacing follows the redesign card's existing field-row rhythm

## Accessibility

- Textarea has `aria-label="Bio"` if the visible eyebrow is not associated
  via `<label htmlFor>`.
- Character counter has `aria-live="polite"` so SR users hear updates.
- Error message has `role="alert"` when shown.

## Open questions

None — this is a purely additive textarea on a documented surface, and the
pattern is already proven on adjacent fields (`fitnessGoals`,
`preferredClassTypes`). If future product wants the bio surface elsewhere
(public profile, trainer-facing card, etc.), a new handoff is required.
