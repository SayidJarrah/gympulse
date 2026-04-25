# Challenge: user-profile-bio — 2026-04-25

## Verdict
CONCERNS

## 1. Contradiction with architecture.md
No invariant violation, but `architecture.md` §1 (UserProfile) enumerates editable fields explicitly and `bio` is not among them; §2 (schema map) lists every column on `user_profiles` and `bio` is absent. The patch adds behaviour to a field that does not exist in the canonical domain model. Whoever lands this must patch `architecture.md` (UserProfile entity + schema-map row + migration version bump from V28) in the same change — otherwise product.md and architecture.md drift on day one.

## 2. Overlap with another feature
Soft overlap with `trainer-discovery`: `Trainer.bio` already exists (≤1000 chars, **publicly returned** via `/trainers/{id}` DTO). The patch introduces a second `bio` namespace with different limit (500) and opposite visibility (member-private). Not a contradiction, but the asymmetry needs a one-line note so future readers don't assume parity. No overlap with `home-page-redesign`, `landing-page` (activity feed uses `actorName` only), or `entity-image-management`.

## 3. Classification
EXTENSION — adds one optional field to an existing entity/endpoint. No behaviour replaced, no surface retired.

## 4. Unstated assumptions / alternative framings
- **XSS / sanitisation is asserted, not enforced.** "Plain text only — no markdown, no HTML" is a rule the SDD/code must implement (server-side strip or reject). The patch states the policy but doesn't name an error code for HTML detection or specify whether unsanitised input is rejected (`INVALID_BIO`) or silently stripped. Pick one.
- **The 500-char limit is unjustified vs. the existing Trainer.bio cap of 1000.** Author didn't address why members get half the runway trainers do. Either align the caps or write one line on why member bios are shorter (e.g. "members aren't selling themselves; trainers are").
- **"Member-private" boundary needs the negative list.** The patch says bio is NOT in trainer/admin/list/search endpoints, but says nothing about admin user-detail surfaces (`/admin/users/{id}` is referenced in architecture §4 and used for booking history). If admin-viewing-profiles is genuinely deferred (already in Out of scope), make that explicit for `bio` too — otherwise the next admin-profile feature inherits an ambiguous rule.

## Recommended action
Proceed with EXTENSION classification but fold three edits into the patch before commit: (1) add an explicit sanitisation rule with an error code for HTML/control-char rejection, (2) one-line note in Rules acknowledging Trainer.bio asymmetry (or align the cap), (3) add admin user-detail surfaces to the member-private negative list. Then patch `architecture.md` UserProfile + schema map in the same /deliver pass — do not let product.md ship ahead of the domain model.
