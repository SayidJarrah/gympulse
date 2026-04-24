---
name: fix-tests
description: GymPulse E2E fix loop. Loaded by the /fix-tests command. Takes failing Playwright specs from the latest report and drives a tightly scoped developer fix loop until green. Does not run BA, SA, designer, or reviewer — scope is "make these specs pass," nothing more.
---

# GymPulse Fix-Tests Loop

One job — turn a set of failing Playwright specs green without expanding scope. This is
NOT `/deliver`. There is no PRD, SDD, handoff, or reviewer in the loop. The developer
agent is dispatched with hard scope guards so a test fix never drifts into a refactor.

```
  /fix-tests [spec?]  →  locate failures  →  dev fix (scoped)  →  rebuild container  →  re-run failing specs  →  regression run  →  done
                              ↑                                                                    │
                              └─────────────────── up to 3 iterations ──────────────────────────── ┘
```

---

## Stage 1 — Locate the failures

Find the evidence of what is red.

```bash
ls -t e2e/test-results 2>/dev/null | head -1
cat e2e/test-results/.last-run.json 2>/dev/null
```

If the latest Playwright run is missing, stale (older than the last commit on the file
under test, or older than the last `--build` of the e2e stack), or the user asked to
target a specific spec not in the last report:

> Re-run the suite to get a fresh signal. Boot via `/run e2e` if the stack is not up,
> otherwise just:
> ```bash
> cd e2e && E2E_BASE_URL=http://localhost:5174 npx playwright test [spec filter if given]
> ```

Parse failing specs from either `e2e/test-results/.last-run.json` or the run output.
Record for each failure:
- Spec file path (e.g. `e2e/specs/onboarding-plan-pt-booking.spec.ts`)
- Test name
- Assertion that failed and the actual value
- First frame from the stack trace that points into `e2e/` or `frontend/` or `backend/`
- HTTP status / body from any captured network response (when the failure is
  "expected 200 got 500" style)

If the user passed `{spec-name}`, narrow this list to that spec only.

## Stage 2 — Classify each failure

For every failing test, pick ONE category before writing the dev prompt:

| Category | Signal | Fix site |
|---|---|---|
| **Backend bug** | HTTP 500 / 4xx where 2xx expected; exception in backend logs | `backend/src/**` |
| **Frontend bug** | UI element missing, wrong copy, route guard wrong, store out of sync | `frontend/src/**` |
| **Seed / fixture** | Backend returns 4xx because seeded data contradicts the request (Lesson 6) | `demo-seeder/src/**` OR the test's own setup |
| **Test drift** | Test asserts old behaviour; SDD says current behaviour is correct | `e2e/specs/**` — but STOP and ask user first (see Guard 3) |
| **Flake** | Passes on re-run without code changes | No fix — rerun, and if it stabilises, move on |

When the signal is ambiguous, pull backend logs:
```bash
docker compose -f docker-compose.e2e.yml logs --tail=100 backend | grep -iE "error|exception|stack" | tail -40
```

Categorisation determines which container to rebuild later (Lesson 7) and which files
the dev agent is allowed to touch.

## Stage 3 — Pre-flight branch check

Before the dev agent runs, verify we are not about to edit `main` (Lesson 3):

```bash
git branch --show-current
```

- On a `feature/*`, `fix/*`, or `chore/*` branch → continue on that branch. If the
  branch is checked out somewhere other than a worktree, move to a worktree first
  (Lesson 8).
- On `main` → STOP and ask the user:
  > "You are on `main`. Create `fix/{short-slug}` in `.worktrees/{short-slug}` to work
  > in, or are you pointing me at an existing branch?"
  >
  > Default suggestion: slug = the failing spec name without `.spec.ts`, e.g.
  > `fix/onboarding-plan-pt-booking`.

If the user approves the default, create the worktree with an **absolute path**
(Lesson 9):
```bash
git -C /Users/d.korniichuk/IdeaProjects/gympulse worktree add \
    /Users/d.korniichuk/IdeaProjects/gympulse/.worktrees/{slug} \
    -b fix/{slug}
```

All subsequent edits happen inside the worktree directory — never in the main checkout
(Lesson 8).

## Stage 4 — Dispatch the developer (scoped)

Spawn ONE `developer` agent per iteration. The prompt MUST include every guard below —
they are what keep the fix from turning into a refactor.

> "Bug Fix Mode — scope: make the following Playwright specs pass. Nothing else.
>
> **Failing specs:**
> - {spec path}::{test name} — {one-line symptom, e.g. `POST /trainers/{id}/availability returned 500, expected 200`}
> - ... (repeat per failure)
>
> **Read these first (only these):**
> - Each failing spec file listed above
> - The production code the stack trace points to (follow the top 1–2 frames)
> - `docs/sdd/{slug}.md` ONLY IF the spec maps cleanly to one feature slug AND the
>   correct behaviour is unclear from the test itself
>
> **Scope guards (hard limits — do not cross):**
> 1. Touch at most 3 files this iteration. If the fix truly needs more than 3 files,
>    STOP and report — do not escalate, do not refactor.
> 2. Do not rename, restructure, extract helpers, improve unrelated code, or add new
>    tests. No speculative improvements.
> 3. Do not modify test assertions or test setup unless the test is provably wrong
>    against the SDD. If you think a test is wrong, STOP and ask — do not silently
>    weaken assertions to make them pass.
> 4. Do not add `waitForTimeout` or sleeps. Use `expect.poll`, `waitForResponse`, or
>    direct UI-state assertions (CLAUDE.md testing rules).
> 5. No markdown bug docs under `docs/bugs/` — a reproducible bug becomes a failing
>    test case that passes after the fix, and the test already exists here.
> 6. Load `kotlin-conventions` if touching backend, `react-conventions` if touching
>    frontend. Do not load design-standards — this is not a UI delivery.
> 7. Before claiming a fix is 'already present,' read the exact file:line and confirm.
>    Never infer from memory (deliver skill 'already done' rule).
>
> **Output:** the list of files touched, one-line per-file description of the change,
> and the root cause in one sentence. Do not describe what the tests do."

Developer returns. Before believing the result, verify the file count:
```bash
git -C .worktrees/{slug} diff --name-only
```
Over 3 files → developer violated the scope guard. Do not rebuild. Report to the user.

## Stage 5 — Rebuild the affected container (Lesson 7)

Never skip this. A stale Vite bundle or JVM process will mask the fix and you will
declare the test still broken when the code already works.

```bash
# Frontend changes touched frontend/** :
docker compose -f docker-compose.e2e.yml up -d --build frontend

# Backend changes touched backend/** :
docker compose -f docker-compose.e2e.yml up -d --build --force-recreate backend

# Seed / fixture changes touched demo-seeder/** :
# (E2E stack does not run demo-seeder; seed changes apply via test-support endpoints
#  and global-setup — usually no container rebuild is needed. If the seeder image IS
#  in the e2e compose file, rebuild it; otherwise just rerun the suite.)
```

Confirm the compose output shows `Recreated`, not just `Running`. If it says
`Running`, force the rebuild again — Docker cached and didn't pick up the new layer.

## Stage 6 — Re-run the failing specs

Only the specs that were red. If they all pass, move to regression. If some still fail,
loop back to Stage 2 with the new evidence.

```bash
cd e2e && E2E_BASE_URL=http://localhost:5174 \
  npx playwright test specs/{spec-a}.spec.ts specs/{spec-b}.spec.ts
```

## Stage 7 — Regression run (default on)

A scoped fix can still break something else — run the full suite once before declaring
done:
```bash
cd e2e && E2E_BASE_URL=http://localhost:5174 npx playwright test
```

If a previously-green spec is now red, treat it as a new failure and loop back to
Stage 2. That spec is now in scope for this fix session.

Skip this stage only if the user passed `--no-regression`.

## Iteration cap

Default 3 iterations (overridable via `--max-iterations N`). An iteration = one
developer dispatch + one rebuild + one re-run of failing specs.

After iteration {cap} without all specs green:
> STOP. Report every still-failing spec, the files touched across iterations, and the
> last error excerpt. Do NOT keep looping. Do NOT create a PR. Hand back to the user.

Same behaviour if the scope guard was tripped (>3 files) and the developer should not
be re-dispatched without new user input.

## Reporting (on success)

```
✅ Fix-tests: {N} spec(s) green.

Fixed:
  - e2e/specs/{spec}.spec.ts — "{test name}"
  - ...

Root cause: {one sentence per distinct bug}

Files touched:
  - {file 1} — {one-line description}
  - ...

Iterations used: {k}/{cap}
Regression suite: {N} passed / {M} total
```

Do not open a PR automatically. The user invokes `/fix-tests` mid-work; they decide
when to commit, push, and whether it belongs to an in-flight feature PR or its own
`fix/*` PR.

## What this skill deliberately does NOT do

- No BA / PRD update — a test fix is not a feature.
- No SA / SDD update, except when the fix exposes a spec-vs-SDD contradiction and the
  developer stopped to flag it (Stage 4, Guard 3 + SDD Hygiene rule in CLAUDE.md) —
  in that case, the user resolves the contradiction, not this skill.
- No designer / handoff — visual polish is not a test fix.
- No reviewer agent — the test suite IS the reviewer here.
- No tech-debt logging — suggestions emerge from reviewer, not from a test fix.
- No PR creation — the user decides scope and branch for the commit.

## When to reach for `/deliver` instead

Escalate out of `/fix-tests` into `/deliver` if any of these become true:

- The fix needs >3 files AND spans multiple subsystems (SA classification needed).
- The spec is missing entirely and must be authored from a PRD/SDD — that is tester's
  job inside `/deliver`, not this skill's.
- The test failure reveals a missing feature, not a broken one.
- Multiple PRD/SDD docs contradict each other (Lesson 4 — resolve by UX intent, not
  here).

In any of those cases, stop and tell the user: "This isn't a test fix — it needs
`/deliver --audit {slug}` or `/deliver {slug}`."
