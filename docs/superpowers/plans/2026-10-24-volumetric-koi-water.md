# Volumetric Koi and Textured Water Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the block-mosaic koi convincing height, detail, and lighting during camera orbit, and add subdued layered water texture.

**Architecture:** Keep the existing flat-world swimmer and integer-grid canvas renderer. Add height-aware perspective projection, raised koi cross-sections and appendages, camera-sensitive surface shading, and separate projected water/shadow layers composited behind the fish.

**Tech Stack:** Dependency-free HTML, CSS, JavaScript Canvas 2D, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-24-volumetric-koi-water-design.md`

## Global Constraints

- No WebGL, images, libraries, rotated glyphs, or smooth vector outlines.
- Every visible mark remains an upright character on the integer 2D text grid.
- Use solid block-mosaic koi dominated by `8`, `0`, `O`, `@`, and `#`; water is smaller and fainter.
- Preserve swimming, orbit/zoom/reset, click ripples, pause, reduced motion, and mobile usability.
- The project has no permanent test suite; use temporary real-code verification harnesses and remove them before committing.

## Review Focus

- Top-down projection must remain visually unchanged when height is zero.
- Orbiting must change raised-body highlights and projected fin/body relationships, not merely recolor a flat silhouette.
- Water and shadows must never overwrite koi cells or gallery UI masks.
- Pausing must freeze swimming, water, and camera damping; reduced motion must still render a static scene.
- Narrow screens must retain readable solid koi without turning the pond into an overlapping mass.

---

### Task 1: Raised block-mosaic koi

**Files:**
- Modify: `script.js` (`project`, body/fin/tail rasterization, palettes, debug API)
- Temporary verification: `.koi-volume-check.cjs` (removed before commit)

**Interfaces:**
- `project(x, y, z, out)` accepts world height `z`; existing callers migrate explicitly.
- Raised-body sampling returns a world position and surface normal/lighting weight for each glyph.
- `window.koiPond.camera` remains compatible; add volume diagnostics only if useful to verification.

- [ ] Write a temporary real-code harness asserting zero-height top-down compatibility, raised points shifting under tilt, stronger koi palette contrast, and block-glyph dominance. Run it and confirm failure because height/volume support is absent.
- [ ] Implement height-aware projection and inverse behavior needed by pointer ripples. Add rounded back/head height, raised animated fins, thick flowing tails, directional light and side shading, distinct eyes/mouth/gills, and saturated orange/red/ivory patchwork. Use a nearly square dense character grid and keep glyphs upright.
- [ ] Run the harness and `node --check script.js`; confirm all checks pass.
- [ ] Browser-check top-down plus orbited desktop and 390px views. Iterate on solid silhouettes and feature readability without reducing the large koi size.
- [ ] Request focused review, fix Critical/Important findings, and remove the temporary harness.

### Task 2: Layered textured water and shadows

**Files:**
- Modify: `script.js` (water, ripples, draw ordering)
- Temporary verification: `.koi-water-check.cjs` (removed before commit)

**Interfaces:**
- Consumes `project(x, y, z, out)` and existing grid occupancy/priorities.
- Produces subdued caustics, micro-currents, soft koi shadows/reflections behind all koi layers.

- [ ] Write temporary checks asserting multiple animated water layers, fish-over-water priority, no interface-mask overwrite, and static output while paused. Confirm failure on the pre-water implementation.
- [ ] Implement sparse fine caustic networks, drifting micro-ripples, and soft block-glyph fish shadows/reflections. Keep texture low-contrast and secondary to the koi; project every mark on the integer grid.
- [ ] Run checks and `node --check script.js`; confirm all pass. Browser-check that orbiting preserves depth and pausing freezes all texture.
- [ ] Request focused review, fix Critical/Important findings, and remove the temporary harness.

### Task 3: Release verification and deployment

**Files:**
- Modify if needed: `README.md`, `docs/superpowers/specs/2026-10-24-volumetric-koi-water-design.md`
- Review: all changes since `2dda6d8`

- [ ] Update user documentation briefly for volumetric koi and animated water; ensure design documentation matches the delivered block-mosaic approach.
- [ ] Run `node --check script.js`, `git diff --check`, and confirm no temporary harnesses remain.
- [ ] Independently review the complete diff and browser-test drag, tilt, zoom, reset, click ripples, pause/resume, reduced motion, and mobile layout.
- [ ] Commit the design, plan, implementation, and documentation; push `main` and monitor the Pages workflow.
- [ ] Verify the deployed HTML/JS/CSS and live HTTP response; report repository and live URLs.
