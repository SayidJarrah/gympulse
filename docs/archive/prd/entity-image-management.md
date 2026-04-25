# PRD: Entity Image Management

## Overview
Entity Image Management adds first-class image support to the GymFlow entities that
currently lack a consistent visual layer across the product: the authenticated user's
profile, trainers, rooms, and classes.

In the current GymFlow model, admins do not create one-off generic "classes"; they create
`class templates` and then schedule concrete class instances from those templates. For
that reason, the class image in this feature is owned by the class template and is reused
where scheduled classes are displayed. This keeps the media model stable, avoids duplicate
uploads for recurring classes, and matches how the schedule already derives class identity.

This feature also normalizes the trainer-photo story. Trainer image upload already exists
in the Scheduler scope, but it is not treated as a shared product capability. This PRD
expands the same concept so all four supported entity types expose a clear image contract:
upload, replace, remove, and render the current image anywhere that entity is presented as
an identifiable card, summary, or detail surface.

The goal is not to build a general media library. Each supported entity gets one optional
primary image, with predictable fallbacks when no image exists.

## Goals
- Let a user upload and maintain one profile photo from the profile-management experience.
- Let an admin upload one primary photo while creating or editing a trainer, room, or class
  template.
- Ensure the current image is shown automatically in all relevant existing product surfaces
  where that entity is visually identified, rather than requiring duplicate configuration.
- Introduce a consistent cross-entity image contract that downstream backend, frontend, and
  design work can implement once and reuse.
- Preserve current GymFlow privacy and security rules by keeping uploads optional, validated,
  and limited to supported file types and sizes.

## User Roles Involved
- **User** - can upload, replace, and remove only their own profile photo.
- **Admin** - can upload, replace, and remove trainer, room, and class-template images.
- **Guest** - can view trainer and class-template images anywhere those read surfaces are
  already available to them; Guests have no upload rights.
- **Member** - can view all user-facing trainer and class-template images available inside
  authenticated product surfaces.

## User Stories

### Happy Path Stories
- As a User, I want to upload my own profile photo from the profile page so that GymFlow
  feels personal and my identity is recognisable across the portal.
- As a User, I want my uploaded profile photo to replace the initials fallback anywhere my
  account avatar is shown so that the UI stays consistent.
- As an Admin, I want to upload a trainer photo during trainer creation so that members can
  immediately recognise that trainer in discovery and scheduling surfaces.
- As an Admin, I want to upload a room photo during room creation so that rooms are easier
  to distinguish in admin and future member-facing room-aware views.
- As an Admin, I want to upload a class image during class-template creation so that every
  scheduled occurrence of that class inherits a consistent visual identity.
- As an Admin, I want to replace an existing entity image without recreating the entity so
  that seasonal campaigns, renovations, or staff changes are easy to reflect.
- As an Admin, I want entities without images to show a deliberate fallback state instead of
  a broken image so that the app remains polished even when media is missing.

### Edge Case Stories
- As a User or Admin, I want a clear validation error when I upload an unsupported file
  type or oversized image so that I know how to correct it.
- As a User, I want to be prevented from modifying another user's profile image so that
  profile privacy is enforced.
- As an Admin, I want to remove an outdated trainer, room, or class image and return to the
  default placeholder without deleting the underlying entity.
- As any viewer, I want pages to keep rendering when an image is unavailable so that a
  failed or missing asset does not break the surrounding experience.
- As an Admin, I want scheduled class occurrences to keep showing the class image inherited
  from the template after the schedule is generated, so that repeated classes remain
  visually consistent.

## Acceptance Criteria

### Shared Image Rules

1. The system supports one optional primary image per supported entity:
   `UserProfile`, `Trainer`, `Room`, and `ClassTemplate`.
2. Supported upload formats are JPEG, PNG, and WEBP.
3. Maximum upload size is 5 MB per image.
4. Uploading an unsupported format returns HTTP 400 with error code
   `INVALID_IMAGE_FORMAT`.
5. Uploading a file larger than 5 MB returns HTTP 400 with error code
   `IMAGE_TOO_LARGE`.
6. Replacing an image overwrites the previous primary image reference for that entity; the
   entity never keeps multiple active images in this version.
7. Removing an image clears the current image reference and returns the entity to its
   default fallback state.
8. Every read DTO that represents one of the supported entities in a UI surface that should
   render its image includes a nullable display field named `imageUrl`, `photoUrl`, or
   feature-specific equivalent already established by that entity contract.
9. When an entity has no uploaded image, the API returns `null` for the image field rather
   than a broken or empty string URL.
10. Frontend surfaces must render a defined placeholder for null image values:
    initials/avatar fallback for people, and a branded neutral placeholder for rooms and
    classes.

### User Profile Photo

11. An authenticated `USER` can upload, replace, and remove only their own profile photo
    from the profile-management feature; no endpoint accepts an arbitrary user ID from the
    client for this flow.
12. `GET /api/v1/profile/me` includes a nullable profile-photo field alongside the existing
    profile payload.
13. The profile page summary card displays the uploaded profile photo when present and falls
    back to initials when absent.
14. The authenticated navigation avatar displays the uploaded profile photo when present and
    falls back to the existing non-photo avatar treatment when absent.
15. Profile photo changes are reflected immediately after a successful upload, replacement,
    or removal without requiring the user to log out and back in.

### Trainer Photo

16. Admin trainer create and edit flows allow uploading, replacing, and removing the
    trainer's primary photo.
17. Existing trainer read surfaces continue to expose a nullable trainer-photo field that
    resolves to the current primary image when one exists.
18. The admin trainer list uses the uploaded trainer photo when present and falls back to
    initials/avatar styling when absent.
19. The Trainer Discovery list and trainer profile page use the uploaded trainer photo when
    present and fall back to the existing avatar placeholder when absent.
20. Any schedule or trainer-selection surface that already renders a trainer avatar or chip
    uses the uploaded trainer photo when present instead of a text-only or initials-only
    fallback.

### Room Photo

21. Admin room create and edit flows allow uploading, replacing, and removing one room
    photo.
22. Room list and room-detail-style admin surfaces display the room photo when present and a
    room placeholder when absent.
23. Any class-template or class-instance admin surface that presents the selected room as a
    visual card or summary block uses the current room photo when available.
24. Renaming or editing a room does not break the room photo association; the image remains
    attached to the room entity itself.

### Class Image

25. Admin class-template create and edit flows allow uploading, replacing, and removing one
    class image.
26. The class image belongs to the class template, not to each scheduled class instance.
27. Read DTOs for scheduled classes include the template-derived class image whenever the
    scheduled instance is linked to a class template that has one.
28. The admin class-template list and class-template detail surfaces display the uploaded
    class image when present and a class placeholder when absent.
29. User-facing class schedule surfaces display the template-derived class image wherever a
    class card, class summary, or class detail surface is designed to show class media.
30. Editing the class-template image updates future reads of all linked scheduled class
    instances without requiring an admin to re-upload images per instance.
31. A standalone scheduled class instance created from import or manual admin action without
    a linked template may render no class image and must fall back to the class placeholder.

### Display Consistency Across Relevant Surfaces

32. "Relevant sections" in current GymFlow scope means any existing page, card, modal,
    summary panel, table row, chip, or navigation affordance that already presents one of
    the supported entities as a recognisable visual object rather than raw text only.
33. Adding image support must not force image rendering into dense data-table cells or
    narrow mobile views that currently rely on text-only compaction; those surfaces may keep
    text-only rendering when showing the image would reduce readability.
34. When an entity image fails to load in the browser, the UI falls back to the same
    placeholder treatment used for a null image instead of showing a broken image icon.

## Out of Scope (for this version)
- Multiple images per entity, image galleries, or image ordering.
- User cropping, zooming, focal-point editing, or background removal.
- Drag-and-drop asset management or a shared media library.
- Video uploads, animated images, or document attachments.
- Public unauthenticated profile pages for users, trainers, rooms, or classes.
- Automatic AI-generated images.
- Historical versioning of replaced images.
- Per-occurrence scheduled-class image overrides distinct from the class template image.

## Open Questions
All major scope questions resolved by BA assumptions on 2026-04-03:

1. **Class ownership of images** - In GymFlow, "class photo" maps to the admin-managed
   class template. Scheduled instances inherit that image rather than storing their own.
2. **Relevant sections rule** - Images must appear in surfaces that already identify the
   entity visually, but the feature does not require every compact text-only table or list
   to become image-first.
3. **Storage strategy** - The PRD requires a stable display URL/endpoint contract but does
   not mandate database-vs-object-storage implementation. The SDD for this feature
   standardizes on DB-backed `BYTEA` storage for v1 and keeps it consistent across the
   four entity types.

## Technical Notes for the Architect
- Treat this as one cross-cutting media capability with per-entity authorization rules, not
  four isolated one-off upload implementations.
- Reuse current trainer-photo behaviour where practical, but normalize the public contract
  so frontend components can consume image fields consistently across entities.
- The `UserProfile` schema introduced by the profile feature will need a nullable image
  reference field or equivalent binary-storage support.
- The `rooms` and `class_templates` data models will need nullable image reference fields
  or equivalent binary-storage support.
- If the current trainer implementation still stores binary photo data directly in the
  database, the architect should explicitly decide whether the new feature standardizes on
  that approach or migrates to URL-backed storage for all supported entities.
- Scheduled-class read models should derive class image data from the linked class template
  in the same query path that already resolves class name and trainer data, to avoid
  frontend-side stitching.
- Fallback rendering rules should be shared UI primitives, not copy-pasted per page.
- Security and privacy rules remain unchanged: no raw file paths in client responses, no
  sensitive metadata in error payloads, and no access path that lets one user mutate
  another user's image.
