# Seven-exhibit collection design

## Intent

Expand the existing two-exhibit one-page gallery with five new, clearly differentiated frontend art projects while preserving Koi and Sculpture.

## New exhibits

- **003 Neon Flow:** cyan/magenta luminous particles following a changing flow field on near-black; pointer movement bends the current.
- **004 Solar Bloom:** ochre, leaf-green and cream botanical growth studies with branching stems and petal-like ASCII geometry; click plants a bloom.
- **005 Data Rain:** electric green falling glyphs and luminous streams on near-black; click injects a new stream.
- **006 Ember:** red/orange/gold fire particles, sparks and heat movement on charcoal; click adds a burst.
- **007 Prism:** rotating rainbow-refraction geometric forms on pale lilac; drag rotates and click cycles the color arrangement.

## Shared requirements

- One static GitHub Pages document with seven direct-hash exhibits and browser history.
- Each piece has a distinct rendering model, palette, typography-accent treatment and motion behavior.
- Existing fixed-widest-view cameras remain unchanged; no exhibit zoom.
- Shared Pause and Reset affect only the active engine. Sculpture-only Morph stays hidden elsewhere.
- Only the active engine animates or receives input; simulation and pause state survive switching.
- Reduced-motion support, keyboard accessibility, 44px controls, responsive navigation and short-landscape layouts.
- No libraries, WebGL, external assets, or build step. New engines use Canvas 2D and upright integer-grid ASCII where applicable.

## Architecture

Centralize exhibit metadata, navigation and chrome in `gallery.js`. Give each new engine one self-contained script and one canvas/caption region. Keep new engine code independent of the koi and sculpture engines. Use explicit active-exhibit gating and diagnostics for verification.

## Verification

Use focused real-code tests for lifecycle and each engine's core behavior. Browser-test all seven exhibits, direct hashes, navigation, reset/pause, interactions, reduced motion and responsive layouts. Review each new engine before final integration and live deployment.
