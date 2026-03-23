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

### Step 1 — Design spec (ui-ux-designer agent)

Use the ui-ux-designer agent with this instruction:
"Read docs/prd/$ARGUMENTS.md (user goals) and docs/sdd/$ARGUMENTS.md (API shape
and data fields). Read docs/design/system.md for the design system.
Produce a UI/UX design spec for the $ARGUMENTS feature.
Save it to docs/design/$ARGUMENTS.md.
After saving, update the Design column for this feature in the Implementation
Status table in CLAUDE.md to ✅."

Confirm the design spec file exists before continuing to Step 2.

### Step 2 — Interactive HTML prototype

After the design spec is saved, read docs/design/$ARGUMENTS.md yourself and
create a self-contained interactive HTML prototype at:
  docs/design/prototypes/$ARGUMENTS.html

The prototype must:
- Use Tailwind CSS via CDN (no build step — file must open directly in a browser)
- Apply the GymFlow design tokens: `bg-[#0F0F0F]` page bg, `bg-gray-900` cards,
  `bg-green-500` primary, `text-white` default text, `text-gray-400` muted
- Cover every screen and modal defined in the design spec
- Have a sticky state-switcher bar at the top listing every screen/state so the
  user can jump between them with one click
- Make modals interactive: open on button click, close on Escape or overlay click
- Simulate key happy-path flows with JS (e.g. "Confirm purchase" → navigate to
  the active-membership screen; "Cancel" → navigate to empty state)
- Show at least one error state per modal that has one

After creating the file, open it in the default browser:
  `open docs/design/prototypes/$ARGUMENTS.html`

## When done, report:
- Path of the design spec created
- Path of the prototype file
- How many screens/views were designed
- Any new components added to the design system
- Any gaps between the SDD's API shape and what the design needs
  (flag these — do not invent endpoints)
- Remind the user: review the design spec and prototype, then run /implement $ARGUMENTS