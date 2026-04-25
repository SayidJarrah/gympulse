Find drift between canonical docs (`docs/product.md`,
`docs/architecture.md`) and the actual code/tests. Used when you want a
diagnostic snapshot before deciding what to fix.

Load the `audit` skill before doing anything else. All audit logic lives
there.

## Argument forms

Parse `$ARGUMENTS`:

| Form | Behaviour |
|---|---|
| _(empty)_ | Full project audit |
| `{slug}` | Narrow to one feature section |
| `--schema` | Domain/schema-only fast check |

Once the mode is identified, follow the `audit` skill end to end. Output
goes to `docs/gaps/{date}.md`. No code edits.
