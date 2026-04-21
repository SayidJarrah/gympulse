You are running a bi-directional audit for: $ARGUMENTS

An audit checks whether code and documentation are consistent — in both directions.
Phase 1 produces a gap report. Phase 2 is driven by /deliver after you review.

## Phase 1 — Investigation (no code changes)

**Feature audit vs discovery audit — pick the right shape first.**

- **Feature audit** (default): the slug names a user-facing feature with existing
  PRD/SDD/design docs. Use the reviewer + tester dispatch below.
- **Discovery audit**: the slug names an infra/cross-cutting concern with no PRD/SDD/design
  (e.g. "seeding", "error-handling", "logging"). Skip the tester (no ACs to walk).
  Dispatch ONE reviewer in discovery mode: instruct it to inventory every location in the
  codebase where the concern is implemented and produce the gap report as a map of
  "current state → target state", not a doc-vs-code diff. Do NOT use `subagent_type: Explore`
  for this — Explore cannot write files. Use `subagent_type: "reviewer"` as normal and tell
  it explicitly: "you are in discovery mode; write the gap report to docs/gaps/{slug}.md".

Spawn both agents simultaneously (feature audit only):

**Reviewer** (`subagent_type: "reviewer"` — NOT `superpowers:code-reviewer`):
> "You are in audit mode for: $ARGUMENTS
> Load design-standards skill.
> Read all available docs: docs/prd/$ARGUMENTS.md, docs/sdd/$ARGUMENTS.md,
> docs/design-system/handoffs/$ARGUMENTS/ (if present), plus
> docs/design-system/README.md and colors_and_type.css for tokens and voice.
> Then read the actual implementation code.
>
> Check DOCS → CODE:
> - Is everything in the SDD actually implemented?
> - Does the UI match the handoff (docs/design-system/handoffs/$ARGUMENTS/)?
> - Are all business rules from the PRD enforced?
>
> Check CODE → DOCS:
> - Are there endpoints/services with no SDD coverage?
> - Are there UI screens with no handoff coverage?
> - Are there behaviours not in any AC?
>
> Check CROSS-SDD CONTRADICTIONS:
> - Read all other SDD files in docs/sdd/ and check whether any of them document
>   the same behaviours (redirects, nav rules, auth logic, routing) differently.
> - If a contradiction is found, determine which SDD is newer/authoritative and
>   flag the stale one. Do not resolve by majority vote — reason about which spec
>   reflects the current intended design.
> - Report any stale SDD sections under "SDD Contradictions" in the gap report.
>
> Write DOCS→CODE findings to docs/gaps/$ARGUMENTS.md."

**Tester:**
> "You are in audit mode for: $ARGUMENTS
> Run the existing spec at e2e/specs/$ARGUMENTS.spec.ts if it exists (via /verify).
> Walk through the primary user journey for $ARGUMENTS via Playwright MCP.
>
> Check DOCS → CODE: is the primary journey covered by a passing spec?
> Check CODE → DOCS: are there user flows in the app with no spec coverage?
>
> Append findings to docs/gaps/$ARGUMENTS.md under the test coverage sections."

## Gap Report Format

`docs/gaps/$ARGUMENTS.md`:

```markdown
# Gap Report: $ARGUMENTS
Date: {today}

## SDD Contradictions

- {stale SDD file + section}: documents X, but {authoritative SDD} supersedes it with Y — needs update

## DOCS → CODE Gaps

### Missing Functionality
- {item in SDD not found in code}

### Broken Flows
- {flow that exists but does not work correctly}

### Design Divergence
- {UI element that differs from handoff at docs/design-system/handoffs/$ARGUMENTS/}

### Missing Test Coverage
- AC {N}: {text} — no spec exists

## CODE → DOCS Gaps

### Undocumented Endpoints / Logic
- {endpoint or method with no SDD coverage}

### Undocumented UI
- {screen or component with no handoff coverage in docs/design-system/handoffs/}

### Undocumented Behaviours
- {user-visible behaviour not in any AC}

### Untested Code Paths
- {flow with no E2E coverage}

## Suggested Fix Order
1. {highest priority gap}
```

## Phase 2

Review docs/gaps/$ARGUMENTS.md and decide what to address.
Then run: `/deliver $ARGUMENTS`

The deliver command detects the gap report and starts from the appropriate stage.
