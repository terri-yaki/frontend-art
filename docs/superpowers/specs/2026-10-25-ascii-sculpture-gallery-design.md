# ASCII sculpture gallery design

## Delivery status

Implementation is complete through `283a4ac`, including the gallery controller, koi traversal/spawning, and the Orb/Torus/Block sculpture with manual **Morph** / **M** controls. Task 1–3 reports record the real-code and browser verification. Merge, push, GitHub Pages deployment, and live-site verification remain pending.

## Intent

Expand frontend-art from a single koi exhibit into a one-page gallery and add exhibit 002: an interactive three-dimensional ASCII sculpture.

## Goals

- One static GitHub Pages document with accessible 001 Koi and 002 Sculpture switching, including direct hash links.
- A dependency-free Canvas 2D sculpture rendered as upright ASCII on an integer grid with perspective and depth compositing.
- Slowly morphing parametric forms, directional lighting, solid block-mosaic surfaces, drag rotation, zoom, reset, and pause.
- Independent exhibit state: switching does not reset koi behavior, sculpture rotation, or either exhibit's pause preference.

## Constraints

- No WebGL, images, libraries, rotated glyphs, or external assets.
- Preserve the completed koi simulation and all existing controls.
- Warm-white editorial gallery aesthetic, readable mobile layout, 44px control targets, reduced-motion support.
- Only one simulation animates at a time; hidden exhibits retain state without consuming animation work.

## Approach

Use a small gallery controller to own exhibit selection and shared chrome. Each engine reads the active exhibit and ignores input/animation while hidden. Build the sculpture from sampled 3D parametric surfaces with a depth buffer and directional light, morphing between forms and projecting into the existing ASCII visual language.

Alternatives considered: separate pages would violate the one-page gallery goal; CSS-only fake 3D would not provide actual depth or morphing geometry; WebGL is unnecessary and conflicts with the dependency-free ASCII approach.

## Verification

Use temporary failing-first real-code checks for gallery state, depth projection/occlusion, morph bounds, pause/reset/input, and hidden-exhibit suspension. Browser-test both exhibits, direct hash links, desktop/mobile, and all controls before GitHub Pages deployment.
