# Fonts

GymFlow uses two Google-hosted families. No local TTF/WOFF files were in the source repo (`frontend/src/index.css` loads them via Google Fonts CSS). We load them the same way here.

## Families

| Role | Family | Weights | Source |
|---|---|---|---|
| Body / UI | Inter | 400, 500, 600, 700, 800 | Google Fonts |
| Display (hero headlines) | Barlow Condensed | 600, 700 | Google Fonts |

## Import

Already included in `colors_and_type.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Inter:wght@400;500;600;700;800&display=swap');
```

## Substitution note

No substitutions — both families are Google Fonts originals and match the codebase exactly (`frontend/src/index.css`). If you need to self-host TTF/WOFF2 files, download them from [fonts.google.com](https://fonts.google.com/?query=Inter) and drop them in this folder, then replace the `@import` with `@font-face` rules.
