# E2E Flow Coverage Process

## Purpose

`docs/qa/e2e-flow-coverage.csv` is the source of truth for business-flow E2E coverage.
It answers one question: "Which user journeys from the PRDs are covered by Playwright
today?"

`docs/qa/e2e-test-cases-catalog.md` can still exist, but it should be treated as a deep
scenario backlog. It is no longer the source of truth for coverage status.

## CSV Schema

```csv
feature,flow_id,flow_name,user_role,journey_type,priority,prd_file,prd_refs,current_e2e_status,current_test_ids,current_spec_files,smoke,notes,last_reviewed
```

Column meaning:

- `feature`: PRD feature name.
- `flow_id`: stable flow identifier. Format: `<FEATURE>-FLOW-##`.
- `flow_name`: user-visible business journey or edge flow.
- `user_role`: roles involved in the flow.
- `journey_type`: `happy_path`, `edge_case`, `access_control`, `responsive`, `admin_ops`,
  or another short stable label.
- `priority`: business criticality. Use `P0`, `P1`, or `P2`.
- `prd_file`: source PRD file.
- `prd_refs`: the exact PRD anchors used to derive the row, usually stories and AC ranges.
- `current_e2e_status`: one of `Covered`, `Partial`, or `Missing`.
- `current_test_ids`: Playwright test IDs that intentionally cover the flow. Use `|`
  between IDs.
- `current_spec_files`: spec files containing those tests. Use `|` between files.
- `smoke`: `yes` if this flow must stay in the release smoke set; otherwise `no`.
- `notes`: short explanation for why the row is covered, partial, or missing.
- `last_reviewed`: date the row was last checked against PRD + suite reality.

## Row Granularity

One row should represent one stable business flow, not one test case.

Good rows:

- "Eligible user purchases membership from the plans page"
- "Schedule load errors show a safe retry state"
- "Guest and non-member access is blocked from member schedule"

Avoid rows for micro-assertions:

- "Button label is blue"
- "Modal closes on Escape"

If multiple Playwright tests support the same business flow, keep one row and list all
relevant test IDs in `current_test_ids`.

## Status Rules

- `Covered`: at least one Playwright test intentionally proves the flow end to end with
  meaningful assertions.
- `Partial`: the suite touches the flow, but a critical branch, role variant, or assertion
  is missing.
- `Missing`: no intentional Playwright flow exists yet.

Do not mark a flow `Covered` just because another broad test happens to pass through it.

## Update Triggers

Update the CSV in the same PR when any of the following happen:

1. A PRD is added.
2. A PRD changes user stories or acceptance criteria in a way that affects a user journey.
3. A Playwright test is added, removed, renamed, or moved to another spec.
4. A test ID changes.
5. A flow moves between `Missing`, `Partial`, and `Covered`.

## Ownership

- PRD author or feature owner:
  update or add rows when requirements change.
- E2E author:
  update `current_e2e_status`, `current_test_ids`, `current_spec_files`, and `last_reviewed`
  when test coverage changes.
- PR reviewer:
  verify the CSV change matches the PRD and the actual test diff.

## PR Checklist

Before merging a feature PR:

1. Check whether the PR changes an existing user journey or adds a new one.
2. Add or update the matching row in `docs/qa/e2e-flow-coverage.csv`.
3. If Playwright coverage changed, update `current_e2e_status`, `current_test_ids`, and
   `last_reviewed`.
4. If more detailed scenario planning is useful, update
   `docs/qa/e2e-test-cases-catalog.md`, but do not rely on that file for coverage status.

## Review Cadence

- Feature PR: update affected rows immediately.
- Release branch cut: review all `P0` rows and the entire `smoke=yes` subset.
- Larger refactor of tests: re-check `current_test_ids` against actual test titles.

## Naming Rules

- Keep Playwright test IDs stable and visible in test titles, for example `AUTH-01`,
  `MEM-08`, `IMG-04`.
- Keep `flow_id` stable even if the exact tests change.
- If one flow becomes two meaningfully different journeys, split the CSV row and retire the
  old mapping in the same PR.

## Recommended Next Step

Add a small validation script later that:

- parses `frontend/e2e/*.spec.ts`
- extracts test IDs from titles
- compares them with `current_test_ids` in the CSV
- flags unknown IDs and stale mappings in CI

That will keep the file current without turning maintenance into manual archaeology.
