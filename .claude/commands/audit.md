You are running a bi-directional audit for: $ARGUMENTS

An audit checks whether code and documentation are consistent — in both directions.
Phase 1 produces a gap report. Phase 2 is driven by /deliver after you review.

## Phase 1 — Investigation (no code changes)

Spawn both agents simultaneously:

**Reviewer:**
> "You are in audit mode for: $ARGUMENTS
> Load gymflow-domain and design-standards skills.
> Read all available docs: docs/prd/$ARGUMENTS.md, docs/sdd/$ARGUMENTS.md,
> docs/design/$ARGUMENTS.md. Then read the actual implementation code.
>
> Check DOCS → CODE:
> - Is everything in the SDD actually implemented?
> - Does the UI match the design spec?
> - Are all business rules from the PRD enforced?
>
> Check CODE → DOCS:
> - Are there endpoints/services with no SDD coverage?
> - Are there UI screens with no design spec?
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
> Load test-manifest skill.
> Run the existing spec for $ARGUMENTS if it exists.
> Walk through each AC in docs/prd/$ARGUMENTS.md via Playwright MCP.
>
> Check DOCS → CODE: which ACs have passing specs? which have no spec?
> Check CODE → DOCS: are there user flows in the app with no spec coverage?
>
> Append test findings to docs/gaps/$ARGUMENTS.md under the test coverage sections."

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
- {UI element that differs from design spec}

### Missing Test Coverage
- AC {N}: {text} — no spec exists

## CODE → DOCS Gaps

### Undocumented Endpoints / Logic
- {endpoint or method with no SDD coverage}

### Undocumented UI
- {screen or component with no design spec}

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
