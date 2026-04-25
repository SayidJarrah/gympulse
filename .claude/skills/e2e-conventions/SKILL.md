---
name: e2e-conventions
description: GymPulse E2E testing conventions. Load before writing or running
  Playwright specs, debugging E2E failures, or reasoning about the test stack.
---

# GymPulse E2E Conventions

## Stack

Tests always target the **E2E stack** (`docker-compose.e2e.yml`):
- Frontend: `http://localhost:5174`
- Backend: `http://localhost:8081`
- DB: `gymflow_e2e` on port 5433
- Specs: `e2e/specs/*.spec.ts` at the repo root
- Package: `e2e/package.json`

Never run Playwright against the dev stack (`docker-compose.dev.yml`).

## Spec writing

- One happy-path spec per feature, named `{slug}.spec.ts`.
- One scenario per spec — primary user journey end-to-end through the UI.
- Behavioural rules in `docs/product.md::{slug}` map one-to-one with `test()`
  cases where possible.
- No error-permutation fans. No visual regression. No admin E2E.

## Hard rules

1. **No `waitForTimeout`.** Use `expect.poll`, `waitForResponse`, or direct
   UI-state assertions.
2. **Unique emails per run.** All test users end in `@test.gympulse.local`.
   Generate inline via `crypto.randomUUID()`.
3. **No markdown bug briefs.** A reproducible bug becomes a failing
   `test()` case that passes after the fix.
4. **Test preconditions must not contradict the global seed.** If a test
   requires "no active plans" but global-setup unconditionally seeds plans,
   use test-local setup or a fixture — cleanup alone cannot establish
   absence.

## `/run e2e` always passes `--build`

Never run Playwright against a stale container. The compose `up` line in any
test entrypoint:

```bash
docker compose -f docker-compose.e2e.yml up -d --build
```

## Container rebuild after a fix OR before first run on a feature branch

Two situations require a rebuild before running specs:

1. **After any code change on a fix branch.** A stale Vite bundle or JVM
   process will mask the fix and cause "didn't work" false negatives.
2. **Before the FIRST run on a feature branch when the e2e stack was
   already up.** If the stack was started from `main` and you switched
   to or created a feature branch, the running containers still hold the
   pre-feature code. Specs will fail with selector-not-found errors that
   look like spec bugs — but the feature simply isn't built into the
   container yet. Rebuild before running.

Same commands cover both cases:

```bash
# Frontend touched frontend/**:
docker compose -f docker-compose.e2e.yml up -d --build frontend

# Backend touched backend/**:
docker compose -f docker-compose.e2e.yml up -d --build --force-recreate backend

# Both:
docker compose -f docker-compose.e2e.yml up -d --build
```

Run from inside the worktree directory so Docker's build context picks
up the feature branch's source. Confirm the compose output shows
`Recreated`, not just `Running`. If `Running`, force the rebuild again —
Docker cached and didn't pick up the new layer.

**Triage rule when a brand-new spec fails on first run:** before debugging
the spec, check whether the running container has the feature. Quick
check: `docker compose -f docker-compose.e2e.yml exec frontend find
/app/dist -newer /tmp -type f 2>/dev/null | head -5` — if nothing recent,
rebuild. Saves time chasing fictional spec bugs.

## Pre-flight

Before any run:

```bash
curl -sf http://localhost:8081/api/v1/health && echo "E2E backend OK"
```

If unhealthy: start the E2E stack via `/run e2e`.

## Reporting

**All pass:**
```
✅ N tests passed — suite clean.
```

**Failures:**
```
❌ N failures:
  - e2e/specs/{spec-name}.spec.ts — "{test name}"
```

A reproducible failure becomes a new `test()` case in an existing or new
spec — never a markdown bug brief.
