You are running the GymPulse delivery pipeline for: $ARGUMENTS

Load the `deliver` skill before doing anything else. All pipeline logic
lives there.

If `$ARGUMENTS` is empty, ask the user for a slug before proceeding.

The deliver skill auto-detects the starting stage from artifact state.
There are no `--audit` or `--redesign` flags — those are separate
commands (`/audit`, `/redesign`).

Once the slug is known, follow the `deliver` skill end to end.
