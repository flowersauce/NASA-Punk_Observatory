# NASA-Punk Observatory Runtime Refactor Notes

## Scope

This note focuses on the current planet runtime layer:

- `scripts/planets/*.js`
- historical legacy `js/*.js` planet scripts

The goal is to identify safe extraction opportunities without changing the visual or interaction result established by
the latest committed version.

## Current state

### 1. Planet entry files now host the runtime implementation

The planet pages now execute their runtime directly from `scripts/planets/`.

Migrated files:

- `scripts/planets/sun.js`
- `scripts/planets/mercury.js`
- `scripts/planets/venus.js`
- `scripts/planets/earth.js`
- `scripts/planets/mars.js`
- `scripts/planets/jupiter.js`
- `scripts/planets/saturn.js`
- `scripts/planets/uranus.js`
- `scripts/planets/neptune.js`

The corresponding legacy files under `js/` have been removed.

### 2. Shared systems already extracted

These cross-cutting pieces are already extracted and in active use:

- Topography renderer entry: `createTopoBackground(...)`
- Interaction system: `initInteraction(...)`, `updateInteraction(...)`
- Telemetry update: `updatePlanetTelemetry(...)`
- Transition system
- Shared page UI shell and config

### 3. Background duplication has already been removed from planet runtimes

The old per-file canvas background implementation has been removed from the migrated planet runtimes.

Planet pages now rely on:

- `createTopoBackground(...)`
- `sharedTopoBackground.resize()`

## Safe extraction candidates

These are the best next refactor targets under the non-regression constraint.

### A. Keep topography rendering centralized

Reason:

- The shared background module is already mounted in each page.
- The duplicated local canvas renderer has already been removed from the migrated runtimes.
- Future planet work should continue using the shared background module only.

Risk level:

- Low.

Recommended method:

1. Compare each legacy file's `drawTopo()` customizations against `createTopoBackground(...)` options already passed in
   that file.
2. Only remove the duplicated local functions after confirming the shared call expresses the same tint/offset.
3. Refactor one planet at a time and verify no background drift.

### B. Extract common scene bootstrap helper

Repeated patterns across most planet files:

- `const scene = new THREE.Scene()`
- `const camera = new THREE.PerspectiveCamera(...)`
- initial zoom setup
- `const renderer = new THREE.WebGLRenderer(...)`
- `renderer.setSize(...)`
- `renderer.setPixelRatio(...)`
- mount to `#canvas-container`
- `const group = new THREE.Group(); scene.add(group);`

Risk level:

- Medium to high.

Why:

- Even small ordering differences in Three.js initialization can produce subtle rendering regressions.
- Some planets use different initial zoom distances and slightly different grouping semantics.

Recommendation:

- Do not extract this yet until the dead background duplication is removed first.

### C. Extract common animation-loop tail

Repeated patterns:

- `requestAnimationFrame(animate)`
- rotation or scene updates
- `renderer.render(scene, camera)`
- `updateInteraction(group, camera)`
- `updatePlanetTelemetry(...)`

Risk level:

- High.

Why:

- Per-planet animation order often matters.
- Telemetry targets differ.
- Some bodies use sign adjustments or different spin groups.

Recommendation:

- Keep per-planet animation loops local for now.

## Unsafe or premature extraction targets

These should stay planet-specific until the runtime layer is more stable.

### Planet mesh generation and procedural geometry

Reason:

- This is the most identity-defining part of each page.
- Similarity at a glance does not mean the parameterization is safely shared.

### Spin group and telemetry target wiring

Examples:

- Earth uses `earthSystemGroup`
- Jupiter uses `jupiterSpinGroup`
- Uranus uses `uranusSpinGroup` with sign inversion
- Venus uses `cloudGroup` with a custom telemetry sign factor

Reason:

- These are semantically different and affect the output directly.

## Recommended next implementation order

1. Keep planet runtime code in `scripts/planets/{planet}.js`.
2. Confirm shared background options reproduce that planet's exact tint and noise behavior.
3. Evaluate whether scene bootstrap code should stay local or be extracted carefully.
4. Re-evaluate whether any shared scene bootstrap should be extracted further.

## Definition of success for runtime refactor

A runtime refactor is safe when:

- The rendered scene looks identical to the prior committed version.
- The background tint/noise behavior is unchanged.
- Camera zoom and drag behavior remain unchanged.
- Telemetry updates remain attached to the same target group with the same sign behavior.
- The legacy file becomes shorter because dead duplicate infrastructure was removed, not because planet-specific logic
  was hidden behind an unstable abstraction.

## Million-particle runtime contract

The current planet runtime keeps a preallocated typed-array surface layer and
uses a smaller dynamic overlay for clouds, storms, coronae, tails, eruptions,
rings, and satellite motion. `ParticleBuilder.build(...)` fills the surface in
idle batches (with a `requestAnimationFrame` fallback), updates the geometry
draw range, reports integer progress, and calls `onReady` after the first
250,000 particles. `ParticleBuilder.markReady(detail)` dispatches the shared
`observatory:ready` event consumed by the transition curtain.

Public builder methods:

- `allocate([high, balanced, low, recovery], factory)` selects the first
  allocatable typed-array tier.
- `visibleCount(maxCount, profile)` returns the draw count for `high` (100%),
  `balanced` (75%), `low` (50%), or `recovery` (250,000).
- `build(options)` returns `cancel()` and accepts `writeBatch`, draw-range,
  progress, ready, completion, and error callbacks.
- `markAttributeRange(attribute, offset, count)` merges pending typed-array
  upload ranges until Three.js resets the range after a render.
- `selectInitialProfile(signals)` and
  `createFrameSampler({geometry, maxCount, setDynamicStride, signals})` use
  deterministic hardware hints before the first visible draw, then lower
  dynamic update cadence before lowering static draw range; profiles only move
  down.

Active builds are cancelled centrally on `observatory:navigate-start` and
`pagehide`, so planet runtimes do not need per-page unload handlers.

Approved high-profile surface budgets and dynamic-layer ceilings:

| Body | Surface | Dynamic |
| --- | ---: | ---: |
| Sun | 1,600,000 | 80,000 |
| Mercury | 1,000,000 | 30,000 |
| Venus | 1,200,000 | 60,000 |
| Earth | 1,250,000 | 50,000 |
| Mars | 1,050,000 | 40,000 |
| Jupiter | 1,500,000 | 80,000 |
| Saturn | 1,350,000 | 60,000 |
| Uranus | 1,200,000 | 40,000 |
| Neptune | 1,200,000 | 60,000 |

Rings are independent auxiliary geometry. Static surfaces are not updated per
frame; only dynamic overlays upload changing attributes. When frame sampling
finds sustained slowdown, the runtime first changes dynamic updates to every
second frame, then selects `balanced`, `low`, or `recovery`. It never raises a
profile automatically during the same page session.

## Run and validation

The project remains build-free and works from HTTP or `file://` entry points.
For repeatable browser checks, run `python -m http.server 4173` from the
project root and check `http://127.0.0.1:4173/index.html` plus all nine planet
pages at 1920×1080. Also open `earth.html`, `saturn.html`, and `sun.html`
directly from Explorer to cover the local-file path.

Automated validation uses only Node's built-ins:

```powershell
node --test test/*.test.cjs
Get-ChildItem scripts -Recurse -Filter *.js |
    Where-Object FullName -notmatch '\\vendor\\' |
    ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE) { exit $LASTEXITCODE } }
git diff --check HEAD
```

Browser acceptance should record the opaque first paint, progressive `0%` to
`READY` state, readiness event, controls and navigation, console/page errors,
observed surface draw count, and a fresh 1080p frame sample for each entry.
