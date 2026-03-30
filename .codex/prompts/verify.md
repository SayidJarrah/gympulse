# Prompt: verify

Run the full E2E suite against the running stack.

```bash
docker-compose -f docker-compose.e2e.yml run --rm playwright
```

Report the result:
- ✅ N tests passed — done.
- ❌ List each failed spec file and test name — done. Do not investigate or fix anything.
