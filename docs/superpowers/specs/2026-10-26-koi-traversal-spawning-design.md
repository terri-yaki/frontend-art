# Koi traversal and random spawning design

## Delivery status

Implemented in `5505079` and integrated through `283a4ac`. Task 2 records 10/10 passing real-code checks plus desktop/mobile browser observation, including repeated journeys, responsive capacity, replenishment, and suspension. Deployment and live-site verification remain pending.

## Requirement

Koi swim across the visible pond rather than remaining near fixed homes. Fish enter and leave through the pond edges, with a randomly replenished school capped at four visible fish.

## Behavior

- Each fish receives an edge-to-edge journey with an inward spawn heading and a distant exit target.
- Cruise, dart, brake, rest and curiosity continue during the central journey, but fixed-home return no longer prevents complete traversal.
- A fish departs only after its entire body and tail have left the visible world-space pond.
- After a randomized delay, a replacement enters from a random edge with a heading toward the opposite region and varied speed/temperament.
- Initial population and replacements are randomized from one up to the safe responsive capacity, with an absolute maximum of four visible fish. Small screens may allow fewer to preserve exact 2× anatomy and clearance.
- Existing volume, water, gallery switching, orbit/zoom/reset, pause and reduced-motion behavior remain intact.

## Constraints

- Never exceed four active/visible fish, including during replacement scheduling and resize.
- No teleporting across the visible pond, abrupt heading flips, center respawning, or permanent fish loss after repeated traversals.
- Hidden gallery exhibits and paused/reduced-motion states must not advance spawn timers or journeys.
- UI masks and normal on-screen collision avoidance remain active; off-screen exit progress must not be blocked by edge steering.

## Verification

Use temporary real-code failing-first checks for initial/random counts, the four-fish cap, edge entry, full-silhouette exit, replacement scheduling, repeated traversal, pause/hidden suspension, and responsive capacity. Browser-observe fish crossing and new arrivals at desktop and mobile before deployment.
