# ASCII Sculpture Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a switchable second exhibit featuring a morphing three-dimensional ASCII sculpture while preserving the koi pond.

**Architecture:** A small gallery controller owns selection and shared UI state. Existing and new engines run only when their exhibit is active. The sculpture samples true 3D surfaces, morphs parametric forms, and uses depth-sorted ASCII shading on Canvas 2D.

**Tech Stack:** HTML, CSS, dependency-free JavaScript, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-25-ascii-sculpture-gallery-design.md`

## Global Constraints

- One static page; no libraries, WebGL, images, rotated glyphs, or external assets.
- Preserve all koi behavior and camera controls.
- Upright integer-grid ASCII, warm-white editorial style, responsive 44px controls.
- Independent exhibit pause/camera/simulation state; hidden exhibits stop animation work.
- Temporary real-code tests only, removed before commits.

## Review Focus

- Browser back/forward and invalid hashes must not leave both exhibits hidden or active.
- Shared buttons must affect only the active exhibit.
- Hidden exhibits must not advance frames or intercept pointer/keyboard input.
- Sculpture depth occlusion and morph interpolation must remain finite at all stages.
- Mobile controls and captions must remain readable without overlap.

---

### Task 1: One-page gallery controller and koi integration

**Files:**
- Modify: `index.html`, `styles.css`, `script.js`
- Create: `gallery.js`
- Temporary: `.gallery-check.cjs`, removed before commit

**Interfaces:**
- `window.frontendGallery`: `current`, `is(id)`, `show(id)`, `subscribe(callback)`.
- `document.body.dataset.exhibit` values `koi` and `sculpture`; `gallery:change` event carries the id.

- [x] Write failing-first checks for initial koi selection, show/hash/back-forward behavior, invalid hash fallback, active-only controls, and hidden-engine suspension. Confirm failure before implementation.
- [x] Implement accessible exhibit navigation, two canvas/caption regions, shared controls, direct hashes, and the gallery API. Integrate koi active-state checks without changing its simulation or camera behavior.
- [x] Run checks and `node --check` for all scripts; browser-test switching, koi state preservation, pause/reset and mobile navigation. Request task review and fix Critical/Important findings; remove temporary harness.

### Task 2: Edge-to-edge koi journeys and random spawning

**Files:**
- Modify: `script.js`
- Spec: `docs/superpowers/specs/2026-10-26-koi-traversal-spawning-design.md`
- Temporary: `.koi-traversal-check.cjs`, removed before commit

**Interfaces:**
- Preserves gallery lifecycle and `window.koiPond`; adds diagnostics for active count and spawn/exit state as useful.
- Absolute visible-fish cap is four; responsive safe capacity may be lower.

- [x] Write failing-first checks for randomized initial count, the four-fish cap, edge entry, full-silhouette exit, replacement delay, repeated traversal, and pause/hidden suspension. Confirm failure against fixed-home behavior.
- [x] Implement edge-to-edge journeys, randomized off-screen departure and edge-spawn replenishment without center teleporting or permanent fish loss. Preserve behavior states, exact 2× anatomy, collision avoidance and all camera/gallery controls.
- [x] Run checks and syntax/diff validation; browser-observe crossings and arrivals at desktop/mobile. Request task review and fix Critical/Important findings; remove temporary harness.

### Task 3: Morphing 3D ASCII sculpture

**Files:**
- Create: `sculpture.js`
- Modify: `index.html`, `styles.css` only for sculpture-specific presentation if needed
- Temporary: `.sculpture-check.cjs`, removed before commit

**Interfaces:**
- Consumes `window.frontendGallery` and shared `#motion-toggle` / `#view-reset`.
- Uses `#sculpture-canvas`, `#sculpture-caption`, and optional `#morph-toggle`.
- Exposes `window.asciiSculpture` diagnostics for frame, pause, camera, form and morph state.

- [x] Write failing-first checks for finite 3D projection, depth occlusion, morph bounds, actual camera changes, active-only input, pause/reset and hidden suspension. Confirm failure before implementation.
- [x] Implement sampled parametric forms, smooth morphing, directional lighting, depth compositing and dense upright ASCII rendering. Add drag/touch rotation, wheel/pinch zoom, reset, keyboard controls, pause/reduced-motion and optional manual morph.
- [x] Run checks and syntax/diff validation; browser-test both exhibits at desktop/mobile and iterate for clear sculptural volume. Request task review and fix Critical/Important findings; remove temporary harness.

### Task 4: Release and deployment

**Files:**
- Modify: `README.md` and delivery docs as needed
- Review: complete diff from `ce56dc4`

- [x] Document the two-exhibit gallery, traversal/spawning and sculpture controls; ensure docs match delivery.
- [x] Run syntax/diff checks and confirm no temporary harnesses.
- [ ] Independently review the complete diff and browser-test both exhibits, hash navigation, all controls, hidden suspension, reduced motion and mobile.
- [ ] Merge reviewed work to `main`, push, monitor GitHub Pages and verify both live exhibits.
