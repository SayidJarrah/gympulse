You are running the GymPulse delivery pipeline for: $ARGUMENTS

Load the `deliver` skill before doing anything else. All pipeline logic lives there.

## Mode

Parse `$ARGUMENTS`:

| Form | Mode | Section in skill |
|---|---|---|
| `{slug}` | Standard delivery | `## Mode: Standard` |
| `--audit {slug}` | Bi-directional audit (writes gap report, then resumes standard delivery) | `## Mode: Audit` |
| `--redesign {slug}` | UI/UX redesign (handoff at `{slug}-redesign`, no tester, manual QA checklist) | `## Mode: Redesign` |

If `$ARGUMENTS` is empty, ask the user for a slug before proceeding.

Once the mode is identified, follow the matching section of the deliver skill end to end.
