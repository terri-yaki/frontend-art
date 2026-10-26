# Seven-exhibit Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five visually and behaviorally distinct exhibits to the existing one-page Koi/Sculpture gallery.

**Architecture:** Central gallery metadata and chrome, one independent Canvas 2D engine per new exhibit, active-only lifecycle and shared controls. Each engine has a separate implementation and review gate.

**Tech Stack:** HTML, CSS, vanilla JavaScript, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-27-seven-exhibit-collection-design.md`

## Global Constraints

- Seven direct-hash exhibits on one static page; no dependencies, WebGL, images or build step.
- Preserve existing koi/sculpture behavior and fixed-widest views; no zoom.
- Active-only animation/input; independent pause/state; reduced-motion and keyboard support.
- Responsive seven-item navigation, 44px targets, readable short landscape layouts.
- Temporary real-code tests only; remove before committing.

## Review Focus

- Invalid hashes/history cannot activate multiple engines.
- Shared Pause/Reset cannot leak into hidden engines.
- Navigation remains usable at 390px and short landscape sizes.
- Every exhibit is visually distinct, animated and interactive rather than a static placeholder.
- Themes remain readable and canvas/UI masks keep text clear.

---

### Task 1: Gallery architecture and five themes

**Files:** Modify `index.html`, `styles.css`, `gallery.js`, `sculpture.js`; create panel/script references for the five new engines.

- [ ] Test that seven normalized exhibits, metadata, navigation, history and per-exhibit chrome work; confirm missing behavior first.
- [ ] Centralize exhibit metadata/chrome, add five panels and distinct theme palettes, make seven-item navigation responsive, and keep existing koi/sculpture integration working.
- [ ] Verify all existing controls and direct hashes; independent review and fixes.

**Contract for new engines:** `window.frontendGallery.is(id)`, `show(id)`, `subscribe(cb)` and `gallery:change`; shared `#motion-toggle` and `#view-reset`; each engine owns its canvas and optional caption detail. Scripts must animate/input only while their id is active and expose diagnostics.

### Task 2: Neon Flow

**Files:** Create `neon-flow.js` using `#neon-canvas`.

- [ ] Failing-first lifecycle/flow checks; implement cyan/magenta particle flow on black with changing currents and pointer bending.
- [ ] Verify motion, interaction, reset/pause/reduced-motion and mobile; independent review.

### Task 3: Solar Bloom

**Files:** Create `solar-bloom.js` using `#bloom-canvas`.

- [ ] Failing-first lifecycle/growth checks; implement generative branching botanical ASCII forms in ochre/leaf/cream and click-to-plant blooms.
- [ ] Verify motion, interaction, reset/pause/reduced-motion and mobile; independent review.

### Task 4: Data Rain

**Files:** Create `data-rain.js` using `#rain-canvas`.

- [ ] Failing-first lifecycle/stream checks; implement electric-green falling glyph streams on near-black and click-to-inject streams.
- [ ] Verify motion, interaction, reset/pause/reduced-motion and mobile; independent review.

### Task 5: Ember

**Files:** Create `ember.js` using `#ember-canvas`.

- [ ] Failing-first lifecycle/particle checks; implement red/orange/gold fire particles, sparks and click bursts on charcoal.
- [ ] Verify motion, interaction, reset/pause/reduced-motion and mobile; independent review.

### Task 6: Prism

**Files:** Create `prism.js` using `#prism-canvas`.

- [ ] Failing-first lifecycle/projection checks; implement colorful refracting geometry on pale lilac with drag rotation and click color arrangement changes.
- [ ] Verify motion, interaction, reset/pause/reduced-motion and mobile; independent review.

### Task 7: Integration and deployment

**Files:** Modify `README.md` and delivery docs as needed; review the complete diff.

- [ ] Document all seven exhibits and actual controls; remove any temporary artifacts and run all syntax/diff checks.
- [ ] Whole-collection independent review plus browser checks of every exhibit, direct links, controls, reduced-motion and responsive navigation.
- [ ] Merge to `main`, deploy GitHub Pages, and verify the live gallery and representative interactions for all five new exhibits.
