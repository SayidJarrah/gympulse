# Prompt: verify

Run the E2E suite against the E2E stack.

```bash
docker compose -f docker-compose.e2e.yml up -d --build
for i in $(seq 1 12); do curl -sf http://localhost:8081/api/v1/health > /dev/null && break; sleep 5; done
cd e2e && npm ci && E2E_BASE_URL=http://localhost:5174 npx playwright test
```

Report the result:
- ✅ N tests passed — done.
- ❌ List each failed spec file and test name — done. Do not investigate or fix anything.
