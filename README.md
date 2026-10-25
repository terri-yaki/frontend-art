# frontend-art

An evolving collection of small digital art studies, exhibited together on one page.

## Gallery

Switch between **001 Koi** and **002 Sculpture** with the navigation links or direct `#koi` / `#sculpture` URLs. Browser back/forward works, and unknown hashes fall back to Koi. Each exhibit preserves its own simulation, camera, and pause state; only the visible exhibit animates.

## 001 — Koi

A top-down ASCII pond with large block-mosaic koi, curved spines, articulated fins and forked tails, saturated markings, and individual swimming temperaments. All anatomy remains exactly 2× its original size, with directional volume lighting. Koi cruise, dart, brake, rest, and school loosely while layered caustics, currents, ripples, and soft shadows give the water depth.

The initial school is randomized from one fish up to the responsive safe capacity, with an absolute visible maximum of four. Fish enter from random edges, follow edge-to-edge journeys, and depart only after their full silhouettes clear the pond; replacements arrive from random edges after varied delays.

- Drag to orbit and tilt; use the wheel or pinch to zoom. Click or tap to make ripples.
- Arrow keys orbit and tilt; **+** / **=** zoom in and **-** / **_** zoom out.
- **Reset view**, double-click, or **R** resets the camera. **Pause motion** / **Resume motion** controls the active exhibit. Reduced-motion preferences are supported.

## 002 — Sculpture

An upright, integer-grid ASCII sculpture built from sampled three-dimensional **Orb**, **Torus**, and **Block** surfaces. Smooth automatic morphs, perspective projection, nearest-depth compositing, and directional lighting create volumetric form without WebGL or external assets.

- Drag or touch-drag to rotate; use the wheel or pinch to zoom. Arrow keys rotate; **+** / **=** zoom in and **-** / **_** zoom out.
- **Morph** or **M** advances to the next form. While paused or using reduced motion, manual morphs advance as static steps.
- **Reset view**, double-click, or **R** resets the camera. **Pause motion** / **Resume motion** or **Space** toggles motion. Reduced-motion preferences are supported.

## Run locally

No dependencies or build step are required.

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Deployment

The workflow in `.github/workflows/pages.yml` is configured to publish the repository root with GitHub Pages after changes are pushed to `main`. The two-exhibit gallery has not yet been merged, pushed, deployed, or verified on the live site.
