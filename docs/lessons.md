# GymPulse — Project Lessons

Lessons learned from corrections and mistakes. Loaded at every session start via CLAUDE.md.
Each lesson is a rule, not a description. After every 10 new lessons, consolidate similar ones.

## Format

```
## Lesson N — {short title}
Date: YYYY-MM-DD
Correction: {what the user said or did}
Rule: {instruction to future Claude — specific and actionable}
Applies when: {situation where this rule kicks in}
```

---

<!-- Add lessons below this line -->

## Lesson 1 — Update review doc when blockers are fixed
Date: 2026-04-05
Correction: User noticed the review doc still showed blockers as `[ ]` after they had been fixed, making the PR state look blocked when it was actually clear.
Rule: After fixing reviewer blockers, always update `docs/reviews/{feature}-{date}.md` — mark each blocker `[x]` with a one-line note of the fix applied, and change the Verdict from BLOCKED to APPROVED. Commit the updated doc to the PR branch before declaring the PR clean.
Applies when: Any time reviewer blockers are resolved during the fix loop or manually.
