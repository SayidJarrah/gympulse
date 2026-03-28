Verify the running GymFlow stack with smoke tests and the full E2E suite.

Feature to scope (optional): $ARGUMENTS

## Responsibility chain (read before doing anything)
- **e2e-tester** — diagnoses failures; writes observation reports to `docs/bugs/`. Never fixes spec files during /verify.
- **@frontend-dev / @backend-dev** — investigates root cause via `/debug`. Never invoked directly from /verify.
- **Bug brief** (`docs/bugs/`) — the hand-off artefact. e2e-tester writes it; developer reads it.

/verify never fixes anything. It produces reports. That is all.

---

**Assumes the stack is already running.** If you are not sure, check first:
```bash
curl -sf http://localhost:8080/api/v1/health
```
If not healthy, stop and tell the user to run /run first.

## Step 1 — Smoke tests

```bash
# Backend health
curl -s http://localhost:8080/api/v1/health

# Frontend serves
curl -sf http://localhost:3000 -o /dev/null -w "%{http_code}"
```

If $ARGUMENTS names a specific feature, also run the example API requests
from docs/sdd/$ARGUMENTS.md (the API contract section). Use a test user if
auth is required.

## Step 2 — E2E regression suite

E2E tests run inside Docker so Playwright can reach the backend and frontend over
the internal Docker network. Do NOT run `npm run test:e2e` directly — it cannot
reach `localhost:8080` from a sandboxed environment.

```bash
docker-compose -f docker-compose.full.yml run --rm playwright
```

This streams the Playwright `list` reporter output to stdout.
Test artefacts (screenshots, traces) land in `frontend/test-results/` on the host
via the volume mount.

If all specs pass: report ✅ N tests passed across M spec files.

If any spec fails:
- Report which spec file and test name failed
- Invoke e2e-tester agent with this exact instruction:
  "Spec {name} failed in frontend/e2e/{feature}.spec.ts. The stack is running.
  Use Playwright MCP to diagnose what the browser shows for this flow.
  Write an observation report to docs/bugs/YYYYMMDD-HHMMSS-{feature}.md with
  screenshots, console errors, network logs, and a page snapshot.
  Do NOT fix any files. Do NOT decide if it is a spec bug or an app bug.
  Report the path of the observation report when done."

After the e2e-tester responds:
- Read the observation report it wrote
- Confirm it exists at docs/bugs/
- Include its path in your Step 3 report

## Step 3 — Report

Print a summary:
- ✅ / ❌ Backend healthy (http://localhost:8080)
- ✅ / ❌ Frontend serving (http://localhost:3000)
- ✅ / ❌ Each smoke test result
- ✅ / ❌ E2E suite (N passed / M failed)
- 📋 Observation report(s): `docs/bugs/{filename}` (one line per failure)

If all green: "Stack is verified. Open http://localhost:3000 to review manually."

If there are failures, for each one report:
- Spec file and test name
- Observation report path: `docs/bugs/{filename}`
- Next step: `/debug {slug} docs/bugs/{filename}`
- Suggested agent: @frontend-dev or @backend-dev

Do NOT invoke fixing agents directly from /verify. Hand off via observation report only.