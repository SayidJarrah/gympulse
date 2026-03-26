Debug the following issue in GymFlow: $ARGUMENTS

---

## Phase 1 — Diagnose Only (always run this first by default)

**Goal:** Produce a bug brief. Write zero code changes.

### Steps

1. Parse $ARGUMENTS for: feature slug, failing test name or user-reported symptom,
   any error messages already captured.

2. Identify the suspected layer:
   DB / backend service / controller / frontend API call / frontend component / state management

3. Read the SDD for this feature at `docs/sdd/{slug}.md` — confirm what the correct
   behaviour should be before reading implementation files.

4. Read ONLY the files directly relevant to the suspected layer. **Hard limit: 8 files.**
   - Do NOT read files outside the suspected layer unless the first reads prove the bug
     is elsewhere (then re-scope and document why).
   - If root cause is not clear after 8 files, stop — do not expand scope further.
     Write the brief with "Root Cause: UNKNOWN — see Attempted Reads."

5. Check: does the implementation match the SDD contract?

6. Identify root cause — be specific: file path, function/component name, line range,
   what is wrong and why.

### Output — write to `docs/bugs/YYYYMMDD-HHMMSS-{slug}.md`

```markdown
# Bug Brief: {slug} — {one-line description}
Date: {YYYY-MM-DD HH:MM}

## Symptom
{What the e2e test or user reported. Paste the exact error or test failure message.}

## Root Cause
File: `{path/to/file}`
Function/Component: `{name}`
Line(s): {range}
Problem: {precise description of what is wrong and why}

## SDD Compliance
{Does the implementation deviate from the SDD? Quote the relevant SDD section,
then show the actual code. If compliant, write "Implementation matches SDD."}

## Proposed Fix
{1–3 sentences. What exact change resolves this?}
Estimated scope: {1 file | 2–3 files | >3 files — if >3 files, do not attempt fix, escalate}

## Files to Change
- `path/to/file1` — what to change
- `path/to/file2` — what to change (if applicable)

## Do NOT Change
- {List files that look related but are not the cause}

## Attempted Reads (if root cause is UNKNOWN)
- {List every file read and what it ruled out}
```

**Stop here. Do not write any code changes.**

Tell the user:
> Bug brief written to `docs/bugs/{filename}`.
> If the proposed fix scope is ≤ 3 files, run: `/debug fix {slug} {filename}`
> If scope is >3 files, escalate to solution-architect before fixing.

---

## Phase 2 — Fix (only when explicitly invoked as `/debug fix {slug} {bug-brief-filename}`)

1. Read the bug brief at `docs/bugs/{bug-brief-filename}` — this is your only context.
2. Read ONLY the files listed under "Files to Change" in the brief. No other files.
3. Apply ONLY the change described in "Proposed Fix."
4. **Hard rules:**
   - Do NOT refactor, rename, or improve anything not directly causing the bug.
   - Do NOT read files not listed in the brief.
   - If the fix requires touching more than 3 files, stop immediately.
     Write an updated brief explaining why, and tell the user to escalate to solution-architect.
5. After applying the fix, run the relevant unit test or curl command to verify.
6. Report: what was changed, the diff summary, and the verification result.

---

## Do Not (either phase)
- Fix symptoms without identifying root cause
- Change the API contract without updating `docs/sdd/`
- Introduce workarounds that conflict with CLAUDE.md conventions
- In Phase 1: write any application code changes
- In Phase 2: read files not listed in the bug brief
