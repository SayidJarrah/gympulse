You are running Stage 2.5 of the GymFlow delivery pipeline: UI/UX Design.

Feature to design: $ARGUMENTS
(PRD at docs/prd/$ARGUMENTS.md, SDD at docs/sdd/$ARGUMENTS.md)

## Clarification gate

Verify prerequisites before invoking the agent:
1. docs/sdd/$ARGUMENTS.md must exist and have a frontend section (Section 4).
   If missing: stop — tell the user to run /write-sdd $ARGUMENTS first.
2. docs/design/system.md must exist.
   If missing: invoke the ui-ux-designer agent to create it first:
   "Create the initial design system document at docs/design/system.md for GymFlow."
   Stop until both files exist.

## Invoke ui-ux-designer

Use the ui-ux-designer agent with this instruction:
"Read docs/prd/$ARGUMENTS.md (user goals and acceptance criteria),
docs/sdd/$ARGUMENTS.md (API shape, data fields, error codes), and
docs/design/system.md (design tokens and component patterns).

Produce two deliverables for the $ARGUMENTS feature:

1. Design spec at docs/design/$ARGUMENTS.md using the standard structure:
   user flows, screens and components, component states table,
   error code → UI message mapping, responsive behaviour, accessibility notes.

2. Interactive HTML prototype at docs/design/prototypes/$ARGUMENTS.html:
   - Self-contained: Tailwind CSS via CDN, no build step, opens directly in a browser
   - GymFlow tokens: bg-[#0F0F0F] page bg, bg-gray-900 cards, bg-green-500 primary,
     text-white default, text-gray-400 muted
   - Covers every screen and modal defined in the design spec
   - Sticky state-switcher bar at the top — one click to jump to any screen/state
   - Modals: open on button click, close on Escape or overlay click
   - Simulates key happy-path flows with JS (e.g. confirm → success screen)
   - At least one error state per modal that has a failure case

After saving both files, update the Design column for $ARGUMENTS in AGENTS.md to ✅."

After the agent finishes, open the prototype:
`open docs/design/prototypes/$ARGUMENTS.html`

## When done, report:
- Path of design spec and prototype
- Number of screens/views designed
- Any new patterns added to the design system
- Any gaps between the SDD API shape and what the design needs (do not invent endpoints)
- Next step: run /implement $ARGUMENTS