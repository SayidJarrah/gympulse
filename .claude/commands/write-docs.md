You are running the full GymFlow documentation pipeline for: $ARGUMENTS
(Pass the feature slug, e.g. "class-booking".)

This runs Stages 1 → 2 → 2.5 in sequence. Each stage must complete successfully
before the next begins. Do not start a stage if the previous one has open blocking
questions — surface them to the user first.

---

## Stage 1 — PRD (business-analyst)

Before invoking the agent, assess $ARGUMENTS:
- Is the core user action clear?
- Is it obvious which user roles are involved?
- Is the scope specific enough to write acceptance criteria?

If too vague, stop and ask the user to clarify before proceeding.

Use the business-analyst agent with this instruction:
"Write a PRD for: $ARGUMENTS
Save it to docs/prd/$ARGUMENTS.md following your standard PRD template.
After saving, update the PRD column for this feature in AGENTS.md to ✅."

Check the PRD's Open Questions section. If any open question would materially
affect DB schema or API contract, stop and surface it to the user before Stage 2.

---

## Stage 2 — SDD (solution-architect)

Use the solution-architect agent with this instruction:
"Read docs/prd/$ARGUMENTS.md and produce the SDD.
Save it to docs/sdd/$ARGUMENTS.md following your standard SDD template.
As part of the DB schema design, review every table, column type, constraint, and index.
Check specifically for: missing indexes on foreign keys, race condition risks
on capacity/count operations, missing NOT NULL constraints, cascade delete gaps.
After saving, update the SDD column for this feature in AGENTS.md to ✅."

---

## Stage 3 — Design (ui-ux-designer)

Verify prerequisites:
1. docs/sdd/$ARGUMENTS.md must have a frontend section (Section 4).
2. docs/design/system.md must exist. If not, invoke ui-ux-designer to create it first.

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

---

## When all three stages are done, report:
- PRD file path and acceptance criteria count
- SDD file path, endpoint count, Kotlin file count, React component count
- Design spec and prototype paths, screen count
- All open questions across the three stages (consolidated)
- Next step: review the docs, answer any open questions, then run /implement $ARGUMENTS