# frontend-art

An evolving collection of small digital art studies, exhibited together on one page.

## 001 — Koi

A top-down ASCII pond rendered on a canvas, with large block-mosaic koi, curved spines, articulated fins and forked tails, saturated markings, and individual swimming temperaments. Koi cruise, dart, brake, rest, and show curiosity toward neighbors with loose schooling; tail beats, banking spines, and braking fins respond to actual movement. All anatomy is exactly 2× its original size, with a responsive school of 4 fish on desktop, 3 on tablet, and 1 on phone. Rounded raised bodies and heads use directional volume lighting that responds to the camera, while layered animated caustics, drifting micro-currents, click ripples, and soft distorted shadows give the water depth without obscuring the fish.

Drag to orbit and tilt, use the wheel or pinch to zoom, and click to make ripples. Use **Reset view**, double-click, or **R** to reset; arrow keys orbit and tilt, while **+/-** zoom. Includes responsive rendering, pause/resume, and reduced-motion support.

## Run locally

No dependencies or build step are required.

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Deployment

The site is published with GitHub Pages using the workflow in `.github/workflows/pages.yml`. Every push to `main` deploys the repository root as a static site.
