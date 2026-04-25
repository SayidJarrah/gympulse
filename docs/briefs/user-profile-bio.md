# Brief: user-profile-bio

## Problem

The current member profile is purely transactional — name, contact, date of
birth, emergency contact, photo. There is no place for a member to capture
who they are beyond demographic fields. Members who want to express a
fitness goal, training history, or self-introduction have no surface for it,
and the profile screen feels flat compared to the rest of the Pulse-themed
app.

## Roles

Member (only role in scope).

## Key Actions

- **Member:** write a short personal bio on the profile screen.
- **Member:** edit or clear the bio at any time.
- **Member:** see their own bio rendered on the profile screen.

## Business Rules

- Bio is **optional**. A member with an empty bio is fully valid.
- Maximum length: **500 characters**. Server enforces; client surfaces a
  remaining-character counter.
- **Plain text only.** No markdown, no HTML, no rich formatting. Line
  breaks (`\n`) are preserved on render.
- **Privacy default:** the bio is visible only to the member themselves.
  It is NOT shown to other members, NOT shown to trainers, NOT included in
  any admin or trainer-facing view, NOT exposed in any list or search
  endpoint. This is a v1 constraint to keep the surface narrow.
- Bio is stored on `user_profiles`, not on `users`, since it is profile
  data (consistent with `firstName`, `lastName`, `phone`, `dob`).

## Out of Scope

- Showing the bio to other members or trainers (sharing is a future feature).
- Showing the bio in admin or trainer-facing views.
- Rich text, markdown, links, mentions, hashtags, emoji shortcuts.
- Bio in search, discovery, or trainer-match flows.
- Admin moderation, profanity filtering, or content review.
- Multi-language bios or per-language fields.
- Bio history / version log.
- Image-based bios (covered by existing entity-image-management for the
  profile photo).
