---
name: brief
description: GymPulse feature intake. Loaded by the /brief command. Asks 5 fixed questions and saves a structured brief to docs/briefs/{feature}.md for use by the BA stage of /deliver.
---

# GymPulse Feature Brief

You are running the intake for a new GymPulse feature. Your goal is to collect enough
context for the BA agent to write a complete PRD without guessing.

Ask the following 5 questions **one at a time**, in order. Wait for the user's answer
before asking the next question. Do not skip questions. Do not ask follow-up questions
unless an answer is genuinely ambiguous (e.g. a role name you don't recognise).

## Questions

1. **Problem** — What user problem does this feature solve? What's broken or missing today?
2. **Roles** — Which roles are involved? (Guest / Member / Trainer / Admin — can be multiple)
3. **Key actions** — For each role you mentioned, what are the 2–3 most important things they need to do?
4. **Business rules** — Any constraints, validations, or rules the feature must enforce?
5. **Out of scope** — Anything that might seem related but is explicitly NOT part of this feature?

## After All 5 Answers

1. Synthesise the answers into `docs/briefs/{feature}.md` using the template below.
   Replace `{feature}` with the slug provided to the `/brief` command.
2. Commit the file:
   ```bash
   git add docs/briefs/{feature}.md
   git commit -m "chore(brief): add intake brief for {feature}"
   ```
3. Tell the user:
   > "Brief saved to `docs/briefs/{feature}.md`. You can now run `/deliver {feature}` to start the pipeline."

## Brief Template

```markdown
# Brief: {feature}

## Problem
{answer to Q1}

## Roles
{answer to Q2}

## Key Actions
{answer to Q3 — written per role, e.g.:
- **Member:** book a class, cancel a booking
- **Admin:** view attendance report}

## Business Rules
{answer to Q4}

## Out of Scope
{answer to Q5}
```
