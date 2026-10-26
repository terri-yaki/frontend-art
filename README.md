# frontend-art

An evolving collection of small digital art studies, exhibited together on one page.

## Gallery

Switch between **001 Koi**, **002 Sculpture**, **003 Neon Flow**, **004 Solar Bloom**, **005 Data Rain**, **006 Ember**, and **007 Prism** with the navigation links or direct `#koi`, `#sculpture`, `#neon`, `#bloom`, `#rain`, `#ember`, and `#prism` URLs. Browser back/forward works, and unknown hashes fall back to Koi.

Each exhibit preserves its own simulation and pause state; camera-based exhibits also preserve their views. Only the visible exhibit animates or receives input. **Pause motion** / **Resume motion** and **Reset view** affect only the active exhibit, and reduced-motion preferences are supported. Koi and Sculpture retain their fixed widest views, Prism uses a fixed camera zoom, and no exhibit offers zoom.

## 001 — Koi

A top-down ASCII pond with large block-mosaic koi, curved spines, articulated fins and forked tails, saturated markings, and individual swimming temperaments. All anatomy remains exactly 2× its original size, with directional volume lighting. Koi cruise, dart, brake, rest, and school loosely while layered caustics, currents, ripples, and soft shadows give the water depth.

The school targets the responsive safe capacity: four fish on desktop-sized ponds and two on smaller screens. Fish enter from random edges, follow edge-to-edge journeys, and depart only after their full silhouettes clear the pond; replacements arrive from random edges after varied delays.

- Drag or touch-drag to orbit and tilt; arrow keys orbit and tilt. Click or tap to make ripples.
- The camera stays at its fixed widest view (0.80×); zoom is unavailable.
- **Reset view**, double-click, or **R** resets the camera. **Pause motion** / **Resume motion** toggles motion.

## 002 — Sculpture

An upright, integer-grid ASCII sculpture built from sampled three-dimensional **Orb**, **Torus**, and **Block** surfaces. Smooth automatic morphs, perspective projection, nearest-depth compositing, and directional lighting create volumetric form without WebGL or external assets.

- Drag or touch-drag to rotate; arrow keys rotate. The camera stays at its fixed widest view (0.65×); zoom is unavailable.
- **Morph** or **M** advances to the next form. While paused or using reduced motion, manual morphs advance as static steps.
- **Reset view**, double-click, or **R** resets the camera. **Pause motion** / **Resume motion** or **Space** toggles motion.

## 003 — Neon Flow

Cyan, blue, violet, and magenta particles trace a changing flow field on near-black, leaving luminous trails and responding to local impulses.

- Move or drag to bend the current; click or tap to add an impulse. Arrow keys move the pointer (hold **Shift** for larger steps), **Enter** or **I** adds an impulse, and **Escape** clears the pointer.
- **Reset view** or **R** resets the flow. **Pause motion** / **Resume motion** or **Space** toggles motion.

## 004 — Solar Bloom

Branching botanical specimens grow in ochre, leaf green, and cream, with stems and petal-like geometry rendered as an upright ASCII garden.

- Click or tap to plant a bloom at that position. **B** or **Enter** plants at a sequence of keyboard positions.
- **Reset view** or **R** restores the initial garden. **Pause motion** / **Resume motion** or **Space** toggles growth.

## 005 — Data Rain

Electric-green glyph streams with bright heads, varied speeds, and changing characters fall through a near-black field.

- Click or tap to inject a stream at that column; **Enter** injects one at the center.
- **Reset view** or **R** resets the stream field. **Pause motion** / **Resume motion** or **Space** toggles motion.

## 006 — Ember

Layered flames, smoke, sparks, and wisps rise from glowing coals in red, orange, and gold on charcoal.

- Click or tap to add a burst at that position; **B** or **Enter** adds a keyboard-triggered burst.
- **Reset view** or **R** resets the particles and coals. **Pause motion** / **Resume motion** or **Space** toggles motion.

## 007 — Prism

Layered translucent polyhedra and refracted light beams turn through four rainbow palettes on pale lilac, with perspective projection and depth-sorted facets.

- Drag or touch-drag to rotate; arrow keys rotate. Click or tap without dragging, **C**, or **Enter** cycles the color palette.
- **Reset view** or **R** resets the camera, which uses fixed 1× zoom. **Pause motion** / **Resume motion** or **Space** toggles motion.

## Run locally

No dependencies or build step are required.

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Deployment

The existing two-exhibit gallery is [live on GitHub Pages](https://terri-yaki.github.io/frontend-art/). This seven-exhibit collection on `collection-seven` is **not live yet**. After these changes reach `main`, the workflow in `.github/workflows/pages.yml` publishes the repository root to GitHub Pages. Deployment and live-site verification for this collection remain pending.
