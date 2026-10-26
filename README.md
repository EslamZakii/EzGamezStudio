# EZ GAMEZ website
Easy to play. Hard to master.

Static site (HTML/CSS/JS + Three.js, vendored in `js/vendor`). No build step.

## Run locally
    python3 -m http.server 8000   # then open http://localhost:8000

## Deploy on GitHub Pages
1. Push this folder to a GitHub repo (e.g. `ez-gamez`).
2. Settings → Pages → Source: "Deploy from a branch" → `main` / `(root)`.
3. Site goes live at `https://<user>.github.io/ez-gamez/`.

## Edit content
- Games, news, email, socials: `index.html`
- Colors: CSS variables at the top of `css/style.css`
- 3D scene: `js/scene.js`
