# Product Deps Index — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make cross-feature dependencies in `docs/product.md` machine-readable so every per-slug agent (`architect`, `developer`, `tester`, `critic`, `product-author`, `designer`) can detect rules in sibling features that affect the slug it is working on. Today only `challenger` and `audit` see the full file; the other five agents read only `{slug}` and miss invariants like `maxBookingsPerMonth` (owned by `membership-plans`, enforced in `class-booking`, product.md:76) — those land in code without a checkpoint.

**Architecture:** Each feature section in `product.md` already declares a `**Depends on:**` line (the convention is mentioned in the preamble at line 5 and used at lines 16 / 57). A small Node script parses headers + dep lines into `docs/product-deps.json` (forward map, reverse map, `lines` range per slug). A GitHub Actions workflow runs the same script in `--check` mode to fail PRs that drift the JSON out of sync with `product.md`. Each per-slug agent gets a "Read protocol" block instructing it to load `product-deps.json` first, then read its own slug **and** the `Rules and invariants` block of every linked slug (forward + reverse).

**Tech stack:** Node 20 ESM (`.mjs`, no build step, `node:fs` + `node:test` only). Regex-based parsing. GitHub Actions for the sync check.

**Branch / worktree:** `chore/product-deps-index` at `.worktrees/product-deps-index`.

---

## File Structure

**Created:**
- `scripts/build-product-deps.mjs` — parser + index builder + CLI (write / `--check`)
- `scripts/build-product-deps.test.mjs` — `node --test` suite
- `docs/product-deps.json` — generated artefact, committed
- `.github/workflows/product-deps-check.yml` — CI sync check

**Modified:**
- `docs/product.md` — audit + complete `**Depends on:**` lines (most exist already); tighten the preamble convention
- `.claude/agents/{architect,developer,tester,critic,product-author,designer}.md` — add Read protocol block
- `.claude/skills/audit/SKILL.md` — add Stage 6: cross-section dep drift

---

## Task 1: Audit `Depends on:` lines in `docs/product.md`

**Files:** Modify `docs/product.md`.

**Goal:** Every `## Feature — \`slug\`` header has a `**Depends on:**` line directly below `**Owner of:**`. Format: `**Depends on:** \`slug-a\`, \`slug-b\`` — or `**Depends on:** —` (em dash) when none. Each declared dep must match an existing slug exactly.

- [ ] **Step 1: Enumerate headers and existing deps.**

```bash
awk '/^## .* — `[a-z][a-z0-9-]*`$/ {h=NR" "$0; next} /^\*\*Depends on:\*\*/ {print h; print NR" "$0; print "---"}' docs/product.md
```

Expected: 16 paired entries. Any header without a paired `Depends on:` line is a gap.

- [ ] **Step 2: Fill gaps.**

For each missing or stale section, read its `What user can do` and `Rules and invariants` blocks. Add `**Depends on:**` listing every slug whose contract this feature reads, writes, or enforces against. Use `—` (em dash, U+2014) when none.

Worked example — `class-booking`:
- references `maxBookingsPerMonth` from `membership-plans` → include `membership-plans`
- requires login → include `auth`
- displays from schedule → include `group-classes-schedule-view`
- result: `**Depends on:** \`auth\`, \`membership-plans\`, \`group-classes-schedule-view\``

- [ ] **Step 3: Validate slugs exist.**

```bash
node -e '
  const fs = require("fs");
  const src = fs.readFileSync("docs/product.md","utf8");
  const slugs = new Set([...src.matchAll(/^## .* — `([a-z][a-z0-9-]*)`$/gm)].map(m=>m[1]));
  const deps = [...src.matchAll(/^\*\*Depends on:\*\* (.+)$/gm)];
  for (const [whole, rhs] of deps) {
    if (rhs.trim() === "—") continue;
    for (const m of rhs.matchAll(/`([a-z][a-z0-9-]*)`/g)) {
      if (!slugs.has(m[1])) console.log("UNKNOWN:", m[1]);
    }
  }
'
```

Expected: no output.

- [ ] **Step 4: Commit.**

```bash
git add docs/product.md
git commit -m "docs(product): audit and complete Depends on: lines"
```

---

## Task 2: Tighten the preamble convention

**Files:** Modify `docs/product.md` lines 1–10.

- [ ] **Step 1: Replace the existing cross-reference paragraph.**

Find:

```
Cross-references between sections use slug syntax (e.g. ``Depends on: `auth`, `membership-plans` ``).
```

Replace with:

```
Each feature section MUST declare its dependencies on a line immediately
below `**Owner of:**`:

    **Depends on:** `slug-a`, `slug-b`

Use `**Depends on:** —` (em dash) when the feature has no deps. Slugs must
match an existing `## Feature — \`slug\`` header exactly. List every slug
whose `Rules and invariants` block this feature reads, writes, or enforces
against. The reverse map is computed — never maintain it by hand.
`docs/product-deps.json` is generated from these lines; the
`product-deps-check` GitHub Actions workflow fails PRs where it drifts.
```

- [ ] **Step 2: Commit.**

```bash
git add docs/product.md
git commit -m "docs(product): formalise Depends on: convention in preamble"
```

---

## Task 3: Generator script (parser + builder, TDD)

**Files:**
- Create `scripts/build-product-deps.test.mjs`
- Create `scripts/build-product-deps.mjs`

The script must be importable as a library (no CLI side effects on import) and runnable as a CLI. Pattern: `if (process.argv[1] === fileURLToPath(import.meta.url))`.

- [ ] **Step 1: Write the failing parser test.**

`scripts/build-product-deps.test.mjs`:

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSections, buildIndex, renderJson } from "./build-product-deps.mjs";

const SAMPLE = `# Title

prelude

---

## Auth — \`auth\`

**Status:** active
**Owner of:** /login
**Depends on:** —

### Rules and invariants
- foo

---

## Class Booking — \`class-booking\`

**Status:** active
**Owner of:** /classes
**Depends on:** \`auth\`, \`membership-plans\`

### Rules and invariants
- bar
`;

test("parseSections extracts slug, 1-indexed line range, dependsOn", () => {
  const sections = parseSections(SAMPLE);
  assert.equal(sections.length, 2);
  assert.deepEqual(sections[0], {
    slug: "auth",
    title: "Auth",
    startLine: 7,
    endLine: 17,
    dependsOn: [],
  });
  assert.equal(sections[1].slug, "class-booking");
  assert.equal(sections[1].startLine, 18);
  assert.deepEqual(sections[1].dependsOn, ["auth", "membership-plans"]);
});
```

- [ ] **Step 2: Run, expect failure.**

```bash
node --test scripts/build-product-deps.test.mjs
```

Expected: `Cannot find module './build-product-deps.mjs'`.

- [ ] **Step 3: Implement parser.**

`scripts/build-product-deps.mjs`:

```javascript
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const HEADER_RE = /^## (.+) — `([a-z][a-z0-9-]*)`$/;
const DEPS_RE = /^\*\*Depends on:\*\* (.+)$/;
const SLUG_TOKEN_RE = /`([a-z][a-z0-9-]*)`/g;

export function parseSections(source) {
  const lines = source.split("\n");
  const sections = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(HEADER_RE);
    if (headerMatch) {
      if (current) {
        current.endLine = i; // 1-indexed line right before next header
        sections.push(current);
      }
      current = {
        slug: headerMatch[2],
        title: headerMatch[1],
        startLine: i + 1, // 1-indexed line of this header
        endLine: -1,
        dependsOn: [],
      };
      continue;
    }
    if (!current) continue;

    const depsMatch = line.match(DEPS_RE);
    if (depsMatch) {
      const rhs = depsMatch[1].trim();
      if (rhs === "—") {
        current.dependsOn = [];
      } else {
        const found = [...rhs.matchAll(SLUG_TOKEN_RE)].map((m) => m[1]);
        current.dependsOn = [...new Set(found)];
      }
    }
  }

  if (current) {
    current.endLine = lines.length;
    sections.push(current);
  }
  return sections;
}
```

- [ ] **Step 4: Run, expect parser test to pass; `buildIndex` / `renderJson` import errors are still fine because the next steps add them.**

```bash
node --test scripts/build-product-deps.test.mjs
```

Expected: parser test passes; harness reports unresolved `buildIndex`/`renderJson` imports — that's the next steps' work.

- [ ] **Step 5: Add buildIndex tests.**

Append to `scripts/build-product-deps.test.mjs`:

```javascript
test("buildIndex computes reverse-deps and section ranges", () => {
  const sections = [
    { slug: "auth", startLine: 1, endLine: 10, dependsOn: [] },
    { slug: "class-booking", startLine: 11, endLine: 20, dependsOn: ["auth", "membership-plans"] },
    { slug: "membership-plans", startLine: 21, endLine: 30, dependsOn: ["auth"] },
  ];
  const index = buildIndex(sections);
  assert.deepEqual(index["auth"].dependedOnBy, ["class-booking", "membership-plans"]);
  assert.deepEqual(index["class-booking"].dependsOn, ["auth", "membership-plans"]);
  assert.equal(index["class-booking"].lines, "11-20");
  assert.deepEqual(index["membership-plans"].dependedOnBy, ["class-booking"]);
});

test("buildIndex throws on unknown slug in dependsOn", () => {
  const sections = [
    { slug: "auth", startLine: 1, endLine: 10, dependsOn: ["nonexistent"] },
  ];
  assert.throws(() => buildIndex(sections), /unknown dep `nonexistent` in `auth`/);
});
```

- [ ] **Step 6: Implement `buildIndex`.**

Append to `scripts/build-product-deps.mjs`:

```javascript
export function buildIndex(sections) {
  const knownSlugs = new Set(sections.map((s) => s.slug));
  const index = {};

  for (const s of sections) {
    for (const dep of s.dependsOn) {
      if (!knownSlugs.has(dep)) {
        throw new Error(`unknown dep \`${dep}\` in \`${s.slug}\``);
      }
    }
    index[s.slug] = {
      lines: `${s.startLine}-${s.endLine}`,
      dependsOn: [...s.dependsOn],
      dependedOnBy: [],
    };
  }

  for (const s of sections) {
    for (const dep of s.dependsOn) {
      index[dep].dependedOnBy.push(s.slug);
    }
  }

  for (const slug of Object.keys(index)) {
    index[slug].dependedOnBy.sort();
  }

  return index;
}
```

- [ ] **Step 7: Add `renderJson` test.**

Append:

```javascript
test("renderJson sorts top-level keys and ends with newline", () => {
  const index = {
    "z-feature": { lines: "10-20", dependsOn: [], dependedOnBy: [] },
    "a-feature": { lines: "1-9", dependsOn: ["z-feature"], dependedOnBy: [] },
  };
  const out = renderJson(index);
  const parsed = JSON.parse(out);
  assert.deepEqual(Object.keys(parsed), ["a-feature", "z-feature"]);
  assert.match(out, /\n$/);
});
```

- [ ] **Step 8: Implement `renderJson` + CLI.**

Append:

```javascript
export function renderJson(index) {
  const sortedKeys = Object.keys(index).sort();
  const sorted = {};
  for (const k of sortedKeys) sorted[k] = index[k];
  return JSON.stringify(sorted, null, 2) + "\n";
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const checkMode = process.argv.includes("--check");
  const productPath = "docs/product.md";
  const outPath = "docs/product-deps.json";

  const source = readFileSync(productPath, "utf8");
  const sections = parseSections(source);
  const index = buildIndex(sections);
  const next = renderJson(index);

  if (checkMode) {
    let current = "";
    try { current = readFileSync(outPath, "utf8"); } catch {}
    if (current !== next) {
      console.error(
        `${outPath} is out of sync with ${productPath}.\n` +
        `Run: node scripts/build-product-deps.mjs`
      );
      process.exit(1);
    }
    console.log(`${outPath} is in sync (${Object.keys(index).length} slugs).`);
  } else {
    writeFileSync(outPath, next);
    console.log(`Wrote ${outPath} (${Object.keys(index).length} slugs).`);
  }
}
```

- [ ] **Step 9: Run all tests, expect pass.**

```bash
node --test scripts/build-product-deps.test.mjs
```

Expected: 4 tests passing.

- [ ] **Step 10: Generate the index for real.**

```bash
node scripts/build-product-deps.mjs
```

Expected: `Wrote docs/product-deps.json (16 slugs).`

- [ ] **Step 11: Sanity-check `--check` succeeds and fails as expected.**

```bash
node scripts/build-product-deps.mjs --check && \
  printf "  " >> docs/product-deps.json && \
  ! node scripts/build-product-deps.mjs --check && \
  git checkout docs/product-deps.json && \
  node scripts/build-product-deps.mjs --check
```

Expected: prints in-sync, then drift error, then back in sync.

- [ ] **Step 12: Commit.**

```bash
git add scripts/build-product-deps.mjs scripts/build-product-deps.test.mjs docs/product-deps.json
git commit -m "feat(scripts): generate docs/product-deps.json with --check mode"
```

---

## Task 4: GitHub Actions sync check

**Files:** Create `.github/workflows/product-deps-check.yml`.

The repo has no `.github/workflows/` directory yet — this introduces it. Single-job, fast (just runs Node tests + `--check`).

- [ ] **Step 1: Create workflow.**

```yaml
name: product-deps-check

on:
  pull_request:
    paths:
      - "docs/product.md"
      - "docs/product-deps.json"
      - "scripts/build-product-deps.mjs"
      - "scripts/build-product-deps.test.mjs"
      - ".github/workflows/product-deps-check.yml"
  push:
    branches: [main]
    paths:
      - "docs/product.md"
      - "docs/product-deps.json"
      - "scripts/build-product-deps.mjs"

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Run parser tests
        run: node --test scripts/build-product-deps.test.mjs
      - name: Verify product-deps.json is in sync
        run: node scripts/build-product-deps.mjs --check
```

- [ ] **Step 2: Commit.**

```bash
git add .github/workflows/product-deps-check.yml
git commit -m "ci: add product-deps sync workflow"
```

---

## Task 5: Add Read protocol to per-slug agents

**Files:**
- Modify `.claude/agents/architect.md`
- Modify `.claude/agents/developer.md`
- Modify `.claude/agents/tester.md`
- Modify `.claude/agents/critic.md`
- Modify `.claude/agents/product-author.md`
- Modify `.claude/agents/designer.md`

Today these agents read only the `{slug}` section. After this change they also load `docs/product-deps.json` and read the `Rules and invariants` block of each forward and reverse dep.

- [ ] **Step 1: Define the canonical Read-protocol block.**

This exact text goes into each agent (adjust nothing; the agents share one source of truth):

```markdown
## Read protocol for `docs/product.md`

Before reading the `{slug}` section, do this:

1. Read `docs/product-deps.json`. Look up `{slug}` to get:
   - `lines`: the 1-indexed line range of the `{slug}` section
   - `dependsOn`: slugs whose contracts this feature reads, writes, or enforces
   - `dependedOnBy`: slugs that read, write, or enforce against this feature
2. Read the `{slug}` section using `Read` with `offset` and `limit` derived
   from `lines` (offset = startLine, limit = endLine − startLine + 1).
3. For every slug in `dependsOn` and `dependedOnBy`, read at least its
   `### Rules and invariants` block. Use that slug's `lines` field from
   `docs/product-deps.json` to locate the section.

If your work introduces or contradicts a rule in any related slug, flag
it before writing code or specs — do not silently override.
```

- [ ] **Step 2: Insert the block in each of the six agents.**

Insert immediately after the existing `## What you read` heading in each file. Where the current text says something like *"Read only the `{slug}` section of `docs/product.md`"*, replace that line with: *"Read the `{slug}` section per the Read protocol above (which also loads forward + reverse deps)."*

Apply identically to: `architect.md`, `developer.md`, `tester.md`, `critic.md`, `product-author.md`, `designer.md`.

- [ ] **Step 3: Verify YAML frontmatter is intact in each file.**

```bash
for f in architect developer tester critic product-author designer; do
  head -1 ".claude/agents/$f.md" | grep -q '^---$' || echo "BROKEN: $f"
done
```

Expected: no `BROKEN` output.

- [ ] **Step 4: Commit.**

```bash
git add .claude/agents/architect.md .claude/agents/developer.md \
  .claude/agents/tester.md .claude/agents/critic.md \
  .claude/agents/product-author.md .claude/agents/designer.md
git commit -m "chore(agents): add product-deps Read protocol to per-slug readers"
```

---

## Task 6: Audit skill — Stage 6 cross-section dep drift

**Files:** Modify `.claude/skills/audit/SKILL.md`.

Add a stage that catches the second failure mode the critic identified: rules in section X mentioning slug Y when Y is **not** in X's `Depends on:`.

- [ ] **Step 1: Append Stage 6 below the existing final stage.**

```markdown
## Stage 6 — Cross-section dependency drift

Load `docs/product-deps.json`. For each section in `docs/product.md`:

1. Slice the section's text using its `lines` range.
2. Find every backticked slug reference (`/\`([a-z][a-z0-9-]*)\`/g`) inside
   the body, **excluding** the section's own slug and the slugs that
   appear inside `**Owner of:**` or `**Depends on:**` lines (those are
   declarative metadata, not behavioural references).
3. Compare the resulting set against `dependsOn`. Any slug referenced in
   the body but absent from `dependsOn` is drift.

Report each drift entry as:

- **Section:** `{slug}`
- **Missing dependency:** `{referenced-slug}`
- **Evidence line:** the `product.md` line that referenced it.

Do not auto-fix — append findings to the dated gap report under a
"Stage 6: cross-section drift" heading. The owner of the section decides
whether to add the dep or rewrite the rule.
```

- [ ] **Step 2: Commit.**

```bash
git add .claude/skills/audit/SKILL.md
git commit -m "chore(audit): add Stage 6 — cross-section dependency drift"
```

---

## Task 7: End-to-end validation

**Files:** read-only.

- [ ] **Step 1: Pick a known cross-feature case and verify the index reflects it.**

```bash
node -e '
  const idx = JSON.parse(require("fs").readFileSync("docs/product-deps.json","utf8"));
  const slug = "class-booking";
  console.log(JSON.stringify(idx[slug], null, 2));
'
```

Expected: `dependsOn` includes `membership-plans`, `auth`, and (likely) `group-classes-schedule-view`. `dependedOnBy` may include `personal-training-booking`.

- [ ] **Step 2: Manual smoke test of the new agent protocol.**

Invoke the `developer` agent on a dummy task: *"Pretend you are about to fix a small bug in `class-booking`. Read the Rules block of every slug listed in `Depends on:` and `Depended on by` for `class-booking`. Summarise each rule that affects booking quotas."*

Expected: the agent reads `docs/product-deps.json`, then the `class-booking` section, then the `membership-plans` Rules block (and the others). The summary mentions `maxBookingsPerMonth` even though it lives in `membership-plans`.

If the agent skips the deps step, tighten the Read-protocol wording in Task 5 (move it earlier in `## What you read`, make the imperative stronger).

- [ ] **Step 3: Manual drift test of the audit skill.**

Pick a section, e.g. `personal-training-booking`. Add a dummy backticked reference to a slug it does not currently depend on (e.g. add a sentence containing `\`scheduler\`` in its `Rules and invariants`). Run `/audit`. Expected: Stage 6 flags the new drift entry.

Revert the dummy edit before opening the PR.

- [ ] **Step 4: Open the PR.**

```bash
git push -u origin chore/product-deps-index
gh pr create --title "Add product-deps reverse-dependency index" --body "$(cat <<'EOF'
## Summary
- Generate `docs/product-deps.json` from `**Depends on:**` lines in `docs/product.md`
- CI sync check via `.github/workflows/product-deps-check.yml`
- Read protocol added to architect / developer / tester / critic / product-author / designer
- Audit skill gains Stage 6: cross-section dependency drift

## Why
Closes the cross-feature blindness gap identified by the critic on
2026-04-26: 5 of 7 agents read only `{slug}` and silently miss invariants
that live in sibling features (e.g. `maxBookingsPerMonth` defined in
`membership-plans` but enforced in `class-booking`). After this change,
every per-slug agent reads forward and reverse deps before writing.

## Test plan
- [ ] CI: `product-deps-check` workflow passes
- [ ] Manual: developer agent invoked on a `class-booking` task surfaces the `membership-plans` `maxBookingsPerMonth` rule before editing
- [ ] Manual: introducing a backticked slug ref without updating `Depends on:` is flagged by `/audit` Stage 6
EOF
)"
```

---

## Self-review checklist (run before handing off)

1. **Spec coverage.** Five agents, generator, CI, audit stage — all present? ✓ (Tasks 5, 3, 4, 6).
2. **Placeholders.** No "TBD" / "implement later". ✓.
3. **Type consistency.** `parseSections` returns `{slug, title, startLine, endLine, dependsOn}`; `buildIndex` consumes the same shape; `renderJson` emits the same `lines/dependsOn/dependedOnBy` shape across tasks. ✓.
4. **Path consistency.** `docs/product-deps.json`, `scripts/build-product-deps.mjs`, `.github/workflows/product-deps-check.yml`, `.claude/agents/{...}.md` consistent across tasks. ✓.

---

## Open questions (resolve before execution)

1. Does `audit` Stage 6 need to suppress matches inside `### Out of scope` and `### History` blocks? (Recommendation: yes — those sections legitimately cite other slugs without being behavioural deps. Encode as: skip lines after `### Out of scope` or `### History` until next `### ` heading.) Decide before implementing Task 6 Step 1.
2. Should `challenger` and `audit` (which already read full `product.md`) also adopt the Read protocol, or is full-read still cheaper for them? (Recommendation: leave them alone — they already cover the full file; adding indirection through the JSON saves nothing.)
