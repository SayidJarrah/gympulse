Fix failing E2E specs by running a scoped dev fix loop. Used when `/run e2e` reports
failures and the context is smaller than a feature (so `/deliver` would be overkill).

Load the `fix-tests` skill before doing anything else. All fix-loop logic lives there.

## Argument forms

Parse `$ARGUMENTS`:

| Form | Behaviour |
|---|---|
| _(empty)_ | Fix all failing specs from the latest Playwright report. If no report exists or it is stale, run `/run e2e` first to get a fresh signal. |
| `{spec-name}` or `{spec-file}` | Fix only the named spec (e.g. `onboarding-plan-pt-booking` or `onboarding-plan-pt-booking.spec.ts`). Other failures are ignored for this run. |
| `--max-iterations N` | Override the default 3-iteration cap (combine with any of the above). |

The skill also accepts `--no-regression` to skip the final full-suite re-run; default is
to always run the full suite after failing specs go green.

Once the mode is identified, follow the `fix-tests` skill end to end.
