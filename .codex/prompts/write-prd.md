# Prompt: write-prd {feature-description}

Stage 1 of the GymFlow delivery pipeline: Requirements.

Feature to analyse: {ARGUMENTS}

## Clarification gate

Before invoking the agent, assess {ARGUMENTS}:
- Is the core user action clear?
- Is it obvious which user roles are involved?
- Is the scope specific enough to write acceptance criteria?

If too vague, stop and ask the user to clarify before proceeding.

## Invoke business-analyst

Use the business-analyst agent with this instruction:
"Write a PRD for: {ARGUMENTS}
Save it to docs/prd/{feature-slug}.md following your standard PRD template.
After saving, update the PRD column for this feature in AGENTS.md to ✅."

## When done, report:
- PRD file path
- Number of acceptance criteria written
- Any open questions flagged that need answers before the SDD can be written
- Next step: run write-sdd {feature-slug}
