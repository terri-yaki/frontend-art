# frontend-art

An evolving collection of small digital art studies, exhibited together on one page.

## 001 — Koi

A top-down ASCII pond rendered on a canvas. Each koi has a curved spine, articulated fins and tail, and its own swimming temperament. Includes procedural water, pointer ripples, responsive rendering, pause/resume, and reduced-motion support.

## Run locally

No dependencies or build step are required.

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Deployment

The site is published with GitHub Pages using the workflow in `.github/workflows/pages.yml`. Every push to `main` deploys the repository root as a static site.
