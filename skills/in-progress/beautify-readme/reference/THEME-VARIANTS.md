# Light and dark variants

Read this when the user wants the README, or an asset set, to follow GitHub's light and dark themes. A single theme is the default: every variant doubles the assets and the places a change must land.

## Derive light from dark (or the reverse)

Freeze one palette table with a hex per role in both themes before drawing, then produce the second theme by mapping roles, not by redesigning:

```text
Role        Dark      Light
background  #0E1116   #F4F1EA
card        #161B22   #FFFFFF
border      #262D38   #D9D4C7
foreground  #F4F1EA   #0E1116
muted       #8B93A1   #5A6270
accent      #7CE0B0   #12805A
```

- Re-pick every accent for contrast on its new background: a light accent that reads on dark often fails on light. Essential text needs at least `4.5:1`.
- Keep layout, copy, and geometry identical so a copy change is one edit applied to both.
- A hybrid hero reuses the same transparent subject. Inspect it on both backgrounds, and set the SVG ground shadow per theme (stronger on dark, softer on light).
- A panel may stay dark inside the light hero when it carries the project's terminal identity.

## Name and store

```text
assets/readme/
├── hero-dark.webp
├── hero-light.webp
├── workflow-dark.svg
├── workflow-light.svg
└── source/
    ├── hero-layout-dark.svg
    ├── hero-layout-light.svg
    ├── hero-subject.png
    └── hero-prompt.txt
```

Suffix every themed asset `-dark` or `-light`. Share one subject and one prompt record.

## Embed

Use the fragment form, which GitHub ties to its own theme setting. It switched correctly on github.com when toggling the theme:

```html
<p align="center">
  <img src="./assets/readme/hero-dark.webp#gh-dark-mode-only" width="100%" alt="Project name and plain-language value">
  <img src="./assets/readme/hero-light.webp#gh-light-mode-only" width="100%" alt="Project name and plain-language value">
</p>
```

It shows both images in any renderer except github.com, so local previews look doubled.

Avoid `<picture>` with `prefers-color-scheme`: in a real README it kept showing the dark variant under GitHub's light theme.

## Verify

- Render every variant with a renderer that has real fonts, then inspect each on a white and on a dark page background.
- `audit_readme.py` checks each `<img>`, so both variants are covered.
- Only github.com decides the theme. After the push, toggle Settings > Appearance and confirm each theme shows its own variant; a hard refresh clears cached images.
