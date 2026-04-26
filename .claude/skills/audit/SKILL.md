---
name: audit
description: GymPulse drift detection. Loaded by the /audit command. Scans
  product.md and architecture.md against the codebase, produces a single
  dated gap report. No code edits.
---

# GymPulse Audit Pipeline

One job — find drift between canonical docs and actual code or tests. Output
is a single report at `docs/gaps/{date}.md`. No fixes, no PRs — user decides
which drifts to feed into `/deliver`.

## Argument forms

Parse `$ARGUMENTS`:

| Form | Behaviour |
|---|---|
| _(empty)_ | Full project audit. Compare every product.md section against code/tests. |
| `{slug}` | Narrow audit to one feature section. |
| `--schema` | Domain/schema-only fast check. Useful before D-class changes. |

## Pipeline

### Stage 1 — Inventory

Read:
- `docs/product.md` — all sections.
- `docs/architecture.md` — full file.
- For schema mode: live DB schema via Postgres MCP.

### Stage 2 — Drift detection per section

For each in-scope feature section:

1. **Routes:** does `Owner of` list match actual `App.tsx` routes?
2. **Stores:** does `Owner of` list match actual `frontend/src/store/`
   files?
3. **Behavioural rules:** does each rule have a corresponding `test()` in
   `e2e/specs/{slug}.spec.ts`?
4. **Out-of-scope placeholders:** are named placeholders still load-bearing?
   (e.g. is `PLAN_PENDING` still referenced in code as documented?)
5. **Screens:** do listed screens exist as components/pages?

### Stage 3 — Cross-section contradictions

Compare every pair of sections that share a `Depends on` reference. Flag:
- Two sections claiming to own the same route/store/screen.
- Two sections with conflicting behavioural rules on the same flow.

### Stage 4 — Schema audit (if `--schema` or full mode)

Compare `architecture.md` schema map against:
- `information_schema.columns` via Postgres MCP
- Latest Flyway migration version applied

Flag: tables in DB not in map, columns in map not in DB, or vice versa.

### Stage 5 — Write the report

Single file at `docs/gaps/{YYYY-MM-DD}.md`:

```markdown
# Audit — {YYYY-MM-DD}

## Scope
{full project | feature: {slug} | schema only}

## Findings

### Routes/stores drift
- {finding} — section: {slug} → file: {path}

### Behavioural rule coverage gaps
- {section}::{rule} — no test in {spec path}

### Cross-section contradictions
- {section A} and {section B} both claim {route/store/screen}

### Schema drift (if applicable)
- table `X` in DB not in architecture.md::Schema map
- column `Y.z` in map not in DB

### Placeholder rot
- {section} declares `PLAN_PENDING` load-bearing; not found in code

## Recommended next steps
- Run `/deliver {slug}` for {N} sections with drift
- Patch architecture.md::Schema map for {N} schema findings
```

### Stage 6 — Cross-section dependency drift

Load `docs/product-deps.json`. For each section in `docs/product.md`:

1. Slice the section's text using its `lines` range.
2. Find every backticked slug reference (`/\`([a-z][a-z0-9-]*)\`/g`) inside
   the body, **excluding**:
   - the section's own slug,
   - slugs that appear inside `**Owner of:**` or `**Depends on:**` lines
     (declarative metadata, not behavioural references),
   - everything below `### Out of scope` and `### History` headings until
     the next `### ` heading or section break (these legitimately cite
     siblings without creating a behavioural dep).
3. Compare the resulting set against `dependsOn`. Any slug referenced in
   the body but absent from `dependsOn` is drift.

Report each drift entry as:

- **Section:** `{slug}`
- **Missing dependency:** `{referenced-slug}`
- **Evidence line:** the `product.md` line that referenced it.

Do not auto-fix — append findings to the dated gap report under a
"Stage 6: cross-section drift" heading. The owner of the section decides
whether to add the dep or rewrite the rule.

### Stage 7 — Demo-seeder coverage drift

Three checks against the auto-reflection invariant:

1. **Schema-map row → annotation.** For each row in
   `docs/architecture.md`'s schema map, verify a `**Demo seeder:**`
   annotation exists in the Notes column. Missing annotation = drift.
2. **Annotated owner file → exists.** For each row whose annotation cites
   a seeder file path, verify that file exists in the working tree.
   Citation of a missing file = drift.
3. **Seeded-tables map ↔ schema map.** Cross-reference the
   "Seeded tables and owner files" table at the top of
   `.claude/skills/demo-seeder-conventions/SKILL.md` against the schema-map
   annotations. Tables present in one but absent from the other = drift.

Report each drift entry as:

- **Table:** `{name}`
- **Issue:** missing annotation / file `{path}` not found / present in
  schema map but absent from skill map (or vice-versa).
- **Evidence:** file path + line.

Do not auto-fix — append findings to the dated gap report under a
"Stage 7: demo-seeder coverage" heading. The architect (for missing
annotations) or developer (for missing seeder code) closes the gap in a
follow-up PR.

## Hard rules

- **No code edits.** Pure diagnostic.
- **No per-feature gap files.** One dated file per audit run.
- **Resolve contradictions by UX intent, not majority vote.** When two
  sections disagree, surface the contradiction; never silently pick the
  one with more upstream references.
