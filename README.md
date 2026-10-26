# frontend-art

An evolving collection of small digital art studies, exhibited together on one page.

## Gallery

Switch between **001 Koi** and **002 Sculpture** with the navigation links or direct `#koi` / `#sculpture` URLs. Browser back/forward works, and unknown hashes fall back to Koi. Each exhibit preserves its own simulation, camera, and pause state; only the visible exhibit animates.

## 001 — Koi

A top-down ASCII pond with large block-mosaic koi, curved spines, articulated fins and forked tails, saturated markings, and individual swimming temperaments. All anatomy remains exactly 2× its original size, with directional volume lighting. Koi cruise, dart, brake, rest, and school loosely while layered caustics, currents, ripples, and soft shadows give the water depth.

The school targets the responsive safe capacity: four fish on desktop-sized ponds and two on smaller screens. Fish enter from random edges, follow edge-to-edge journeys, and depart only after their full silhouettes clear the pond; replacements arrive from random edges after varied delays.

- Drag to orbit and tilt; arrow keys orbit and tilt. Click or tap to make ripples.
- The camera stays at its fixed widest view; zoom is unavailable.
- **Reset view**, double-click, or **R** resets the camera. **Pause motion** / **Resume motion** controls the active exhibit. Reduced-motion preferences are supported.

## 002 — Sculpture

An upright, integer-grid ASCII sculpture built from sampled three-dimensional **Orb**, **Torus**, and **Block** surfaces. Smooth automatic morphs, perspective projection, nearest-depth compositing, and directional lighting create volumetric form without WebGL or external assets.

- Drag or touch-drag to rotate; arrow keys rotate. The camera stays at its fixed widest view (0.65×); zoom is unavailable.
- **Morph** or **M** advances to the next form. While paused or using reduced motion, manual morphs advance as static steps.
- **Reset view**, double-click, or **R** resets the camera. **Pause motion** / **Resume motion** or **Space** toggles motion. Reduced-motion preferences are supported.

## Run locally

No dependencies or build step are required.

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Deployment

The two-exhibit gallery is [live on GitHub Pages](https://terri-yaki.github.io/frontend-art/). The workflow in `.github/workflows/pages.yml` publishes the repository root after changes are pushed to `main`.
