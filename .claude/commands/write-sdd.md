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
After saving, update the SDD column for this feature in the Implementation
Status table in CLAUDE.md to ✅."

Confirm the SDD file exists before continuing to Step 2.

## Step 2 — DB Schema Review (db-architect agent)

Use the db-architect agent with this instruction:
"Read the Database Changes section of docs/sdd/$ARGUMENTS.md.
Review every table, column type, constraint, and index.
Check specifically for: missing indexes on foreign keys, race condition risks
on capacity/count operations, missing NOT NULL constraints, cascade delete gaps.
If changes are needed, edit docs/sdd/$ARGUMENTS.md directly and report what was changed."

## When done, report:
- Path of the SDD file
- Number of endpoints defined
- Number of Kotlin files to create
- Number of React components/pages to create
- Any schema changes the db-architect made
- Any open questions from the PRD that were not resolved in the design
- Remind the user: review the SDD task lists, then run /implement $ARGUMENTS