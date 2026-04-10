---
name: gymflow-domain
description: DEPRECATED — do not load. Domain knowledge is now maintained in the SDD files under docs/sdd/. Loading this skill will produce stale and contradictory information.
---

# DEPRECATED

This skill is out of date and has been retired. The routing rules, entity statuses, and
business rules it contained were inconsistent with the implemented codebase.

Authoritative sources:
- Business rules and entity status values: read the relevant SDD in `docs/sdd/`
- Post-login routing: `docs/sdd/user-access-flow.md` and `docs/sdd/auth.md §7`
- Entity shapes: `docs/sdd/{feature}.md` Section 2 (API Contract) and Section 3 (Kotlin Classes)

Do not reference or load this skill.
