You are running Stage 1 of the GymFlow delivery pipeline: Requirements.

Feature to analyse: $ARGUMENTS

## Clarification gate — run this before invoking the agent

Before calling the business-analyst agent, assess the feature description yourself:
- Is the core user action clear?
- Is it obvious which user roles are involved?
- Is the scope specific enough to write acceptance criteria?

If the description is too vague to answer those questions, **stop here and ask the
user for clarification**. Do not invoke the agent on an underspecified input.
Only proceed once the description is specific enough for the agent to work with.

## What to do

Use the business-analyst agent to produce a PRD for this feature.

Pass the agent this instruction:
"Write a PRD for: $ARGUMENTS
Save it to docs/prd/{feature-slug}.md following your standard PRD template.
After saving, update the PRD column for this feature in the Implementation
Status table in CLAUDE.md to ✅."

## When done, report:
- The path of the PRD file created
- How many acceptance criteria were written
- Any open questions the BA flagged that need answers before proceeding to SDD
- Remind the user: review the PRD, answer any open questions, then run /write-sdd