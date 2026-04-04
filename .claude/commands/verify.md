Run the full E2E suite against the running stack.

## Health Check First

```bash
curl -sf http://localhost:8080/api/v1/health && echo "Backend OK" || echo "Backend not healthy — run /run first"
```

If not healthy: **STOP.** Tell user to run `/run` first.

## Run Suite

```bash
docker-compose -f docker-compose.e2e.yml run --rm playwright
```

## Report

**All pass:**
```
✅ N tests passed — suite clean.
```

**Failures:**
```
❌ N failures:
  - frontend/e2e/{feature}.spec.ts — "{test name}"
  - ...

Invoke the tester agent to investigate and write bug briefs.
```

Do not investigate or fix anything here. Tester handles investigation.
