You are running Stage 2 of the GymFlow delivery pipeline: Technical Design.

PRD to design from: $ARGUMENTS
(Pass the feature slug, e.g. "class-booking". The PRD is at docs/prd/$ARGUMENTS.md)

## Clarification gate — run this before invoking the agent

Read docs/prd/$ARGUMENTS.md yourself first. Check the Open Questions section.

If any open question would materially affect the DB schema or API contract
(e.g. an unanswered policy decision that changes table structure), **stop here
and surface those questions to the user** before invoking the solution-architect.
It is much cheaper to answer a question now than to redesign the SDD after
the architect has already written it.

Only proceed once blocking open questions are resolved or explicitly assumed.

## Step 1 — Architecture (solution-architect agent)

Use the solution-architect agent with this instruction:
"Read docs/prd/$ARGUMENTS.md and produce the SDD.
Save it to docs/sdd/$ARGUMENTS.md following your standard SDD template.
As part of the DB schema design, review every table, column type, constraint, and index.
Check specifically for: missing indexes on foreign keys, race condition risks
on capacity/count operations, missing NOT NULL constraints, cascade delete gaps.
After saving, update the SDD column for this feature in the Implementation
Status table in CLAUDE.md to ✅."

## When done, report:
- Path of the SDD file
- Number of endpoints defined
- Number of Kotlin files to create
- Number of React components/pages to create
- Any open questions from the PRD that were not resolved in the design
- Remind the user: review the SDD task lists, then run /implement $ARGUMENTS