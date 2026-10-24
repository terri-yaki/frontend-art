# Volumetric ASCII koi and textured water

## Intent

Make the koi visually distinctive and convincingly volumetric as the camera orbits, while preserving the reference-inspired upright ASCII rendering. Add water texture that gives the pond depth without hiding the fish.

## Goals

- Stronger orange, red, ivory, and graphite koi markings with recognizable eyes, mouths, gills, scales, fins, and forked tails.
- Solid block-mosaic silhouettes inspired by the shark reference: a tight, square character grid dominated by dense `8`, `0`, `O`, `@`, and `#` glyphs, not wispy punctuation or thin outlines.
- Rounded raised backs and heads, height-separated fins/tails, camera-sensitive directional lighting, and soft ASCII shadows.
- Layered water caustics, drifting micro-currents, and subtle distorted shadows using smaller, fainter marks than the koi.
- Preserve smooth swimming, orbit/zoom/reset controls, mobile layout, pause, and reduced-motion support.

## Non-goals and constraints

- No WebGL, images, libraries, rotated glyphs, or smooth vector outlines.
- Every visible mark remains an upright character on the integer 2D text grid.
- Water remains subdued; gallery text and controls remain readable.

## Approaches

1. **Raised body model — delivered.** Height-aware projection and rounded body cross-sections retain the existing swimmer and ASCII renderer while giving the koi volume during orbit.
2. **Color/outline-only refinement.** Increase saturation and silhouette density without height. Simpler, but cannot produce convincing volume during orbit.
3. **Full mesh rasterizer.** Use a general 3D mesh and depth buffer. More flexible, but unnecessarily complex for this single exhibit.

## Delivered implementation

The camera projects world `x`, `y`, and height `z` with perspective; pointer positions are unprojected onto the pond plane so click ripples remain aligned during orbit and zoom. Rounded body cross-sections and extra head lift establish the koi volume, while fins and forked tails have separate animated heights and surface detail. Surface normals drive a directional light whose horizontal direction follows camera yaw, with tilt contributing to the vertical light term. Palette shading, dense block glyphs, and prioritized eyes, mouths, and gills preserve the mosaic features.

The pond plane carries two independently drifting, animated caustic-network layers and a separate micro-current layer. Sparse, offset fish shadows use gentle time-based distortion. Water, shadows, and ripples are composited before the koi, and grid occupancy plus interface masks keep them behind fish and gallery UI. Tail, fin, body, and feature cells render in ascending priority order. The existing interaction API, responsive fish count and layout, pause behavior, and reduced-motion initialization remain intact.

## Verification

Use failing-first checks for height-aware projection and volumetric rendering behavior, then browser-check top-down and orbited views at desktop and phone sizes. Verify drag/zoom/reset, pause, reduced motion, and deployment to GitHub Pages.
