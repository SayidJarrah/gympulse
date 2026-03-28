Update a spec file based on a developer-filled observation report.

Bug brief path: $ARGUMENTS

## When to use this command

Run this **after** a developer has:
1. Investigated a bug brief produced by e2e-tester
2. Determined that the spec assertion/selector is wrong (not the app)
3. Filled in the `## Spec Fix Required` section of the bug brief

Do NOT run this command to fix app bugs. Use `/debug fix {slug} {brief}` for that.

---

## Steps

1. Read the bug brief at `$ARGUMENTS`.

2. Find the `## Spec Fix Required` section. If it is blank or missing, stop:
   > `## Spec Fix Required` is not filled in. Ask a developer to complete it first,
   > then re-run `/fix-spec $ARGUMENTS`.

3. Read the spec file named in `## Spec Fix Required`.

4. Apply **only** the change described. Do not refactor, rename, or change any other test.

5. Run the specific test to confirm it passes:
   ```bash
   cd frontend && npm run test:e2e -- --grep '{exact test name from brief}'
   ```

6. If the test passes: report the diff (old line → new line) and the test result.

7. If the test still fails: do NOT keep iterating. Stop and report:
   > Spec updated as instructed but test still fails. The fix described in the brief
   > may be incomplete. Please re-investigate with `/debug {slug} $ARGUMENTS`.

## Hard rules
- Only edit the spec file named in `## Spec Fix Required`.
- Only make the change described there. Nothing else.
- Never touch app source files.