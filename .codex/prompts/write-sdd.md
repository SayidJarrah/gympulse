# Prompt: write-sdd {feature-slug}

Stage 2 of the GymFlow delivery pipeline: Technical Design.

Feature slug: {ARGUMENTS}
PRD: docs/prd/{ARGUMENTS}.md

## Clarification gate

Read docs/prd/{ARGUMENTS}.md and check the Open Questions section.
If any open question would materially affect DB schema or API contract, stop and
surface it to the user before invoking the agent.

Only proceed once blocking open questions are resolved or explicitly assumed.

## Invoke solution-architect

Use the solution-architect agent with this instruction:
"Read docs/prd/{ARGUMENTS}.md and produce the SDD.
Save it to docs/sdd/{ARGUMENTS}.md following your standard SDD template.
As part of the DB schema design, review every table, column type, constraint, and index.
Check specifically for: missing indexes on foreign keys, race condition risks
on capacity/count operations, missing NOT NULL constraints, cascade delete gaps.
After saving, update the SDD column for this feature in AGENTS.md to ✅."

## When done, report:
- SDD file path
- Number of endpoints defined
- Number of Kotlin files to create
- Number of React components/pages to create
- Any open questions from the PRD not resolved in the design
- Next step: run write-design {ARGUMENTS}
