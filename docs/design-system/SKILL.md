---
name: gymflow-design
description: Use this skill to generate well-branded interfaces and assets for GymFlow, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for protoyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick reference

- **Colors:** Primary `#22C55E`, accent `#F97316`, page `#0F0F0F`, surface-1 `#111827`, surface-2 `#1F2937`.
- **Type:** Inter body, Barlow Condensed display (hero headlines only).
- **Tone:** Operational, calm, direct. Sentence case. Uppercase tracked eyebrows. No emoji.
- **Iconography:** Heroicons v2 outline (solid for active nav only).
- **Motion:** 100/200/300ms; ease-out enter, ease-in-out hover. No bounce.
- **Cards:** `rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-md shadow-black/50`.

See `README.md` for full voice, visual, and iconography guidance. Import tokens from `colors_and_type.css`. Grab components from `ui_kits/member_app/components.jsx` or `ui_kits/admin_console/components.jsx`.
