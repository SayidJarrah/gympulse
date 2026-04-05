---
name: backlog
description: GymPulse tech debt backlog viewer. Read docs/backlog/tech-debt.md and present items grouped by effort, with optional filtering by feature.
---

# GymPulse Tech Debt Backlog

Read `docs/backlog/tech-debt.md` and present all open items.

## Display format

Group by effort size. For each item show: ID, title, feature, and first sentence of description.

```
SMALL (a few lines)
  TD-001  member-home   MemberHomeSectionEmptyCard missing optional CTA slot
  TD-003  member-home   Plan teasers loading flicker in useMemberHomeMembershipSection

MEDIUM (< half a day)
  ...

LARGE (needs planning)
  ...

Total: {N} items — {S} small, {M} medium, {L} large
```

## Optional filter

If arguments were provided (e.g. `/backlog member-home`), show only items where Feature matches the argument.

## Adding or closing items manually

To **add** an item the user describes, append it to `docs/backlog/tech-debt.md` with the next available TD-N, infer effort from description, and confirm.

To **close** an item (e.g. `/backlog close TD-003`), remove the entry from `docs/backlog/tech-debt.md`, confirm removal, and note which feature it belonged to.
