Debug the following issue in GymFlow: $ARGUMENTS

## Process

1. Identify the layer — DB / backend service / controller / frontend API call /
   frontend component / state management
2. Read the relevant files for that layer
3. Check the SDD for this feature in docs/sdd/ — confirm the implementation
   matches the spec
4. Run the relevant unit tests to reproduce if possible
5. Identify the root cause (be specific — name the file, method, and line)
6. Fix it
7. Verify: re-run the test or explain precisely why the fix resolves the issue

## Do not
- Fix symptoms without finding the root cause
- Change the API contract without updating the SDD in docs/sdd/
- Introduce workarounds that conflict with CLAUDE.md conventions

Report: root cause, what was changed, and how to verify the fix.