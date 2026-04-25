UI/UX rework of an existing feature. Use when the change is visual /
interaction polish, not a new user capability.

Load the `redesign` skill before doing anything else. All redesign logic
lives there.

## Argument forms

Parse `$ARGUMENTS`:

| Form | Behaviour |
|---|---|
| `{slug}` | Standard redesign — designer audit → classify → developer → critic |
| `--challenge {slug}` | Inserts challenger after designer to detect pivot |

If `$ARGUMENTS` is empty, ask the user for a slug before proceeding.

Once the mode is identified, follow the matching part of the `redesign`
skill end to end.
