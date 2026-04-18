# GymFlow Design System — Handoff to Claude Code

This folder is the **design system layer** for the GymFlow (`gympulse`) repo. Commit it once, then let Claude Code read it as the source of truth while implementing redesigns.

---

## Where this goes in the repo

Recommended path: **`docs/design-system/`** in `SayidJarrah/gympulse`.

```
gympulse/
└── docs/
    └── design-system/          ← drop this folder here
        ├── README.md           (voice, visual rules, component patterns)
        ├── SKILL.md            (skill metadata)
        ├── INTEGRATION.md      (this file)
        ├── colors_and_type.css (CSS custom-property tokens)
        ├── tailwind.gymflow.cjs (Tailwind config extract)
        ├── assets/             (logo SVGs, favicon)
        └── fonts/              (font loading notes)
```

---

## One-time integration steps

### 1. Fonts
Already loaded via Google Fonts in `frontend/src/index.css`. No change needed. If you self-host later, see `fonts/README.md`.

### 2. Tokens
You have two options — pick one, don't mix:

**Option A — Tailwind-native (recommended, matches existing codebase):**
```js
// frontend/tailwind.config.js
const gymflow = require('../docs/design-system/tailwind.gymflow.cjs');

module.exports = {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: { extend: gymflow.extend },
  plugins: [],
};
```
Then use classes like `bg-surface-1`, `text-brand-primary-light`, `border-line-card`, `shadow-glow-primary`.

**Option B — CSS variables (if you want runtime theming later):**
```css
/* frontend/src/index.css */
@import '../../docs/design-system/colors_and_type.css';
```
Then reference `var(--color-primary)`, `var(--color-bg-surface-1)`, etc.

### 3. Assets
Copy `assets/logo-*.svg` and `assets/favicon.svg` into `frontend/public/` or `frontend/src/assets/` — your call based on how other SVGs are handled in the codebase.

---

## Workflow after this

### This project (design side)
- You and Claude iterate on **screen redesigns** here — plans page, scheduler, member home, etc.
- Each redesign produces an HTML mock + a short spec.
- Tokens/components get updated here first.

### gympulse repo (implementation side)
- Claude Code reads `docs/design-system/` as reference.
- Per redesign, you drop the mock + spec into a feature branch.
- Claude Code implements it against the real React components, referencing tokens from Tailwind or CSS vars.

### When tokens change
- Update `colors_and_type.css` and `tailwind.gymflow.cjs` **together** in this project.
- Push that single commit to `docs/design-system/` in gympulse.
- Claude Code picks up the new tokens automatically on next build.

---

## How to point Claude Code at this

In your gympulse repo, add a note to `CLAUDE.md` (or create one):

```
## Design system

The source of truth for design tokens, voice, and visual rules is
`docs/design-system/`. Before making UI changes, read:

- docs/design-system/README.md     — voice, visual direction, component patterns
- docs/design-system/colors_and_type.css  — token values

For redesigns, I'll drop mocks + specs into docs/design-system/handoffs/<feature>/.
Implement against these, using existing React components in frontend/src/components/.
```

This way every Claude Code session starts grounded in the system.

---

## What's intentionally **not** here

- `ui_kits/` (the React prototype kits) — these are for **design iteration** in this project, not for shipping. Your real components already exist in `frontend/src/components/`; we'll redesign those directly rather than replace them.
- `preview/` spec pages — nice living docs, but optional in the repo. Include only if you want the team to browse them.

---

## Quick checklist

- [ ] Copy `docs/design-system/` folder into gympulse repo
- [ ] Wire `tailwind.gymflow.cjs` into `frontend/tailwind.config.js`
- [ ] Copy logo + favicon into `frontend/public/`
- [ ] Add design-system section to `CLAUDE.md`
- [ ] Commit + push
- [ ] Come back here for the first redesign
