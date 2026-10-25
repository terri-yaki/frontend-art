# Lively koi behavior and double-size design

## Intent

Make the koi feel like living animals rather than independently moving sprites, and double their visible size while preserving a readable pond.

## Goals

- Behavior states: relaxed cruise, short dart, braking/drifting, rest, and curiosity toward nearby koi.
- Loose schooling through alignment, separation, and limited neighbor influence; no rigid formation.
- Speed-sensitive tail frequency/amplitude, banking spines, and braking fins driven by actual movement.
- Individual temperament, reaction timing, and smooth acceleration/deceleration.
- Double body length/width and fin/tail dimensions relative to the current release.

## Constraints and non-goals

- Preserve raised block-mosaic geometry, water, camera, pause/reduced-motion, and all controls.
- No random jitter, instant velocity changes, constant-speed swimming, rigid schools, or perpetual darting.
- Keep every glyph upright on the integer grid; no new dependencies or assets.
- Reduce active fish count and enlarge avoidance zones as needed so doubled koi have room and gallery UI stays clear.

## Approaches

1. **Behavior-state simulation — delivered.** A small per-fish state machine combined with neighbor steering and speed-driven body mechanics. This directly addresses realistic action while keeping the existing renderer.
2. **Random motion variation.** Rejected: easy to add but produces arbitrary, less believable movement.
3. **Schooling-only flocking.** Rejected: produces coordination but does not provide rest, bursts, curiosity, or individual behavior.

## Delivered implementation

Each koi has velocity, acceleration, behavior state and timers, temperament, and bounded neighbor awareness. Seeded cruise, dart, brake, rest, and curiosity transitions produce smooth acceleration and turning, with limited alignment, cohesion, and separation rather than rigid formations. Tail frequency and amplitude, braking fins, and spine banking derive from actual speed, acceleration, and angular motion.

`ANATOMY_SCALE = 2` doubles body length, width, and volume; fin and tail dimensions; eye/gill height; history coverage; and shadow geometry relative to `de93e8e`, including at non-unit individual scale. The responsive school contains 2 koi only when the viewport is at least 1000px wide and 700px high, and 1 otherwise. Dynamic placement and reflow assign accepted safe homes; expanded full-silhouette margins, safer seeded placement, stronger environment braking, and phone edge handling preserve normal top-view swimming clearance without reducing anatomy.

## Verification

Use temporary failing-first real-code checks for state transitions, acceleration limits, dart/brake behavior, speed-driven tail mechanics, exact doubled dimensions, responsive 2/1 counts and placement thresholds, accepted safe homes, and clearance. Browser-observe several behavior cycles on desktop and phone, then recheck orbit/reset, pause/reduced-motion, UI clearance, and GitHub Pages deployment.

Full-silhouette clearance applies to normal top-view world-space swimming. The preserved user-controlled camera projection may crop koi at extreme zoom or tilt; this does not relax the normal swimming-clearance requirement or change the camera controls.
