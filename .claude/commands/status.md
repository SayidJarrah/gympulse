Reconstruct the current state of all features from git branches and docs directory.
No table to maintain — this is derived on demand.

## Step 1 — Discover feature slugs

```bash
# From git branches
git branch -a | grep "feature/" | sed 's/.*feature\///' | sort -u

# From docs directories
ls docs/prd/ 2>/dev/null | sed 's/\.md//'
ls docs/gaps/ 2>/dev/null | sed 's/\.md//'
```

Merge these lists, deduplicate, sort alphabetically.

## Step 2 — Check artifact existence per feature

For each feature slug, check:

```bash
SLUG="{feature}"
echo "PRD:    $(ls docs/prd/$SLUG.md 2>/dev/null && echo ✅ || echo ❌)"
echo "Design: $(ls docs/design/$SLUG.md 2>/dev/null && echo ✅ || echo ❌)"
echo "SDD:    $(ls docs/sdd/$SLUG.md 2>/dev/null && echo ✅ || echo ❌)"
echo "Tests:  $(ls frontend/e2e/$SLUG.spec.ts 2>/dev/null && echo ✅ || echo ❌)"
echo "Gap:    $(ls docs/gaps/$SLUG.md 2>/dev/null && echo ⚠️  needs audit || echo —)"
echo "Branch: $(git branch -a | grep "feature/$SLUG" | head -1 | xargs || echo no branch)"
```

Check open PRs via GitHub MCP for each branch.

## Step 3 — Report

Present as a table:

```
Feature              | PRD | Design | SDD | Tests | Status
---------------------|-----|--------|-----|-------|-------
auth                 |  ✅  |   ✅   |  ✅  |  ✅   | shipped
class-booking        |  ✅  |   ✅   |  ✅  |  ❌   | in progress (feature/class-booking)
...
```

Status values:
- `shipped` — all artifacts ✅, no open branch
- `in progress` — open feature branch exists
- `needs audit` — gap report exists at docs/gaps/
- `design only` — PRD + design exist, SDD missing
- `specced` — PRD + SDD + design exist, no implementation
- `partial` — some artifacts exist, no clear pattern
