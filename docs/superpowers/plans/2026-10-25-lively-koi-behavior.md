# Lively Double-Size Koi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the koi behavior feel alive and double their visible size without losing pond or UI readability.

**Architecture:** Add a small per-fish behavior-state simulation ahead of the existing environment steering and history renderer. Feed actual speed and angular motion into body mechanics, then scale anatomy and responsive school layout together.

**Tech Stack:** Dependency-free JavaScript Canvas 2D, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-24-lively-koi-behavior-design.md`

## Global Constraints

- Preserve raised block-mosaic geometry, water, camera, pause/reduced-motion, and all controls.
- No random jitter, instant velocity changes, rigid schools, constant-speed swimming, or perpetual darting.
- Every glyph remains upright on the integer grid; no dependencies or assets.
- Double all anatomical dimensions relative to `de93e8e`; reduce fish count and expand avoidance to maintain clearance.
- No permanent test suite: use temporary real-code harnesses and remove them before committing.

## Review Focus

- Behavior must remain bounded and stable across long simulated runs and variable frame deltas.
- Neighbor influence must not create rigid schools, oscillation, or unresolved collisions.
- Tail/fin animation must respond to actual speed rather than wall-clock alone.
- Pause/reduced-motion must freeze behavior timers, velocities, and animation phase.
- Doubled fish must remain usable at 390px and must not cover gallery controls.

---

### Task 1: Living behavior and movement mechanics

**Files:**
- Modify: `script.js` (`Fish`, initialization, `steer`, tail/fin mechanics, debug diagnostics if useful)
- Temporary: `.koi-behavior-check.cjs`, removed before commit

**Interfaces:**
- Per-fish state includes velocity, behavior state/timer, temperament, and actual speed.
- `steer(fish, dt)` remains the simulation entry point; rendering consumes actual speed/angular state.

- [x] Write failing-first checks for cruise/dart/brake/rest transitions, acceleration and turn limits, neighbor influence, speed-driven tail frequency, and paused state timers. Run and confirm failure against constant-speed behavior.
- [x] Implement seeded per-fish temperaments and bounded cruise/dart/brake/rest/curiosity states with smooth velocity integration and loose schooling. Preserve environment/UI avoidance and seeded initialization.
- [x] Drive tail beats, fin braking, and banking from actual motion. Keep animation stable across clamped frame deltas and pause/reduced-motion.
- [x] Run checks plus `node --check script.js`; browser-observe multiple behavior cycles and camera interactions. Request task review and address Critical/Important findings; remove temporary harness.

### Task 2: Double-size anatomy and spacious layout

**Files:**
- Modify: `script.js` (anatomical sizing, fish count, placement/avoidance)
- Temporary: `.koi-size-check.cjs`, removed before commit

**Interfaces:**
- Consumes Task 1 behavior and existing silhouette-margin helpers.
- Doubles body length/width and fin/tail dimensions relative to `de93e8e` at the same viewport/scale.

- [x] Write failing-first checks for the 2× size multiplier, reduced responsive school count, full-silhouette clearance, and preserved integer-grid projection. Confirm failure before implementation.
- [x] Implement a single clear 2× anatomy multiplier applied consistently to body, fins, tail, eyes/gills, history, and shadows. Reduce school size to 4/3/1 and adjust initial distribution/avoidance for larger animals without shrinking them again indirectly.
- [x] Run checks and syntax/diff validation. Browser-check 1440×900, 1280×720, and 390×844 through swimming and orbit; iterate on spacing only while preserving true 2× anatomy.
- [x] Request task review, address Critical/Important findings, and remove temporary harness.

### Task 3: Release and deployment

**Files:**
- Modify: `README.md` and design documentation as needed
- Review: full diff from `de93e8e`

- [x] Update concise behavior/size documentation and ensure design matches delivery, including responsive 4/3/1 counts and preserved-camera cropping at extreme zoom/tilt.
- [x] Run syntax/diff checks and confirm no temporary harnesses remain. Review the complete diff and use the recorded browser evidence for behavior, camera, pause/reduced-motion, and mobile layout.
- [x] Commit the design doc, plan doc, and README only.
- [ ] Merge the reviewed branch to `main`, push, monitor Pages deployment, and verify the live release.
