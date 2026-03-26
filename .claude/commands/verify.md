Verify the running GymFlow stack with smoke tests and the full E2E suite.

Feature to scope (optional): $ARGUMENTS

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

```bash
cd frontend && npm run test:e2e
```

If all specs pass: report ✅ N tests passed across M spec files.

If any spec fails:
- Report which spec file and test name failed
- Invoke e2e-tester agent in debug mode with this exact instruction:
  "Spec {name} failed in frontend/e2e/{feature}.spec.ts. The stack is running.
  Use Playwright MCP to diagnose what the browser shows for this flow.
  IMPORTANT: You may only edit files inside frontend/e2e/.
    - If the spec assertion is wrong → fix the spec.
    - If the app is broken → follow the Bug Reporting Procedure: write a bug brief
      to docs/bugs/YYYYMMDD-HHMMSS-{feature}.md with a screenshot and full description,
      then report the brief path. Do not touch app source files."

After the e2e-tester responds:
- If it fixed the spec → re-run the suite to confirm
- If it wrote a bug brief → read the brief, confirm it exists at docs/bugs/,
  and include its path in your Step 3 report

## Step 3 — Report

Print a summary:
- ✅ / ❌ Backend healthy (http://localhost:8080)
- ✅ / ❌ Frontend serving (http://localhost:3000)
- ✅ / ❌ Each smoke test result
- ✅ / ❌ E2E suite (N passed / M failed)

If all green: "Stack is verified. Open http://localhost:3000 to review manually."

If E2E failures remain after the debug step, for each unresolved failure report:
- Spec file and test name
- Bug brief path: `docs/bugs/{filename}`
- Suggested fix command: `/debug fix {slug} {filename}`
- Suggested agent: @frontend-dev or @backend-dev

Do NOT invoke fixing agents directly from /verify. Hand off via bug brief only.
