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
- Invoke e2e-tester agent in debug mode:
  "Spec {name} failed in frontend/e2e/{feature}.spec.ts. The stack is running.
   Use Playwright MCP to diagnose what the browser shows for this flow.
   IMPORTANT: You may only edit files inside frontend/e2e/.
   - If the spec assertion is wrong → fix the spec.
   - If the app is broken → take a screenshot, describe the bug, and report
     which agent should fix it (frontend-dev or backend-dev). Do not touch
     app source files."

## Step 3 — Report

Print a summary:
- ✅ / ❌ Backend healthy (http://localhost:8080)
- ✅ / ❌ Frontend serving (http://localhost:3000)
- ✅ / ❌ Each smoke test result
- ✅ / ❌ E2E suite (N passed / M failed)

If all green: "Stack is verified. Open http://localhost:3000 to review manually."

If E2E failures remain after the debug step, list each unresolved failure and
say exactly which agent to invoke and what to tell it.
