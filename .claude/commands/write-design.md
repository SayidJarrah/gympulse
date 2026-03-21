You are running Stage 2.5 of the GymFlow delivery pipeline: UI/UX Design.

Feature to design: $ARGUMENTS
(Pass the feature slug, e.g. "class-booking". PRD at docs/prd/$ARGUMENTS.md,
SDD at docs/sdd/$ARGUMENTS.md)

## Clarification gate — run this before invoking the agent

Read docs/sdd/$ARGUMENTS.md and confirm Section 4 (Frontend Data Models) exists.
If the SDD has no frontend section, tell the user to run /write-sdd $ARGUMENTS first.

Also confirm docs/design/system.md exists. If it does not, tell the user:
"The design system hasn't been set up yet. Ask the ui-ux-designer agent to
create it first: @ui-ux-designer Create the initial design system document
at docs/design/system.md for GymFlow."
Stop here until both files exist.

## What to do

Use the ui-ux-designer agent with this instruction:
"Read docs/prd/$ARGUMENTS.md (user goals) and docs/sdd/$ARGUMENTS.md (API shape
and data fields). Read docs/design/system.md for the design system.
Produce a UI/UX design spec for the $ARGUMENTS feature.
Save it to docs/design/$ARGUMENTS.md.
After saving, update the Design column for this feature in the Implementation
Status table in CLAUDE.md to ✅."

## When done, report:
- Path of the design spec created
- How many screens/views were designed
- Any new components added to the design system
- Any gaps between the SDD's API shape and what the design needs
  (flag these — do not invent endpoints)
- Remind the user: review the design spec, then run /implement $ARGUMENTS