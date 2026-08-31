# Million-Particle Observatory Design

Date: 2026-09-01

## Objective

Upgrade every celestial-body page to a data-informed, million-particle presentation while preserving the project's offline, no-build, direct-HTML workflow. The target environment is Windows desktop and Lively Wallpaper at 1080p. High-profile rendering targets approximately 60 FPS; lower profiles may reduce visible particles to preserve at least 30 FPS.

The upgrade covers:

- planet-specific particle counts and visual behavior;
- million-scale static surface detail;
- customized outlines, atmospheres, rings, storms, and satellites;
- delayed, progressive generation that does not block initial navigation;
- transition sequencing that avoids white flashes;
- a unified modern NASA-inspired palette.

## Selected Rendering Approach

Use a hybrid particle architecture:

- Each body receives a static surface layer containing 1.0-1.6 million particles in the high profile.
- Smaller dynamic layers continue to animate clouds, storms, coronae, tails, and eruptions.
- Surface data is stored in preallocated typed arrays and generated progressively.
- Dynamic layers remain deliberately smaller so the runtime never performs per-frame CPU updates across a million objects.
- Rings use independent geometry and budgets; ring particles do not consume the surface budget.

This retains the existing planet-specific procedural implementations. A shared scheduler coordinates batches, but it does not replace the individual visual algorithms with a generic planet generator.

## Particle and Visual Mapping

| Body | High-profile surface particles | Dynamic layer ceiling | Distinguishing visual treatment |
| --- | ---: | ---: | --- |
| Sun | 1,600,000 | 80,000 | Corona, flares, eruptions, restrained pulsation |
| Mercury | 1,000,000 | 30,000 | Craters, terminator contrast, sodium tail |
| Venus | 1,200,000 | 60,000 | Volcanic surface, dense clouds, retrograde super-rotation |
| Earth | 1,250,000 | 50,000 | Land/ocean separation, clouds, atmospheric limb, Moon and orbital assets |
| Mars | 1,050,000 | 40,000 | Iron-oxide terrain, polar detail, thin atmosphere, Phobos and Deimos |
| Jupiter | 1,500,000 | 80,000 | Atmospheric bands, Great Red Spot, flows, principal moons |
| Saturn | 1,350,000 | 60,000 | Bands, polar hexagon, independently generated dense rings |
| Uranus | 1,200,000 | 40,000 | Axial tilt, ice-giant atmosphere, dark rings and moons |
| Neptune | 1,200,000 | 60,000 | High-speed storms, deep-blue atmosphere, Triton and ring arcs |

The values are visual budgets informed by body scale and feature complexity, not literal ratios of astronomical surface area. Literal ratios would make the gas giants dominate memory and would not produce a useful comparative experience.

## Shared Progressive Builder

Add one small shared browser script responsible for progressive typed-array population. It accepts:

- the requested high-profile count;
- the position and color typed arrays;
- a planet-owned callback that writes a contiguous range;
- progress, completion, and failure callbacks.

Scheduling rules:

1. Prefer `requestIdleCallback` when available.
2. Fall back to `requestAnimationFrame` for local-file and browser compatibility.
3. Target approximately 4-6 ms of generation work per batch.
4. Adjust the next batch size from the measured duration of the previous batch.
5. Publish progress only when the displayed integer percentage changes.
6. Stop cleanly when the page unloads or when a generation callback fails.

No worker, new dependency, bundler, or build step is introduced. This avoids `file://` worker-origin differences and keeps direct HTML opening and Lively Wallpaper support.

## Startup and Progressive Display

Each page follows this sequence:

1. Render the topographic background, HUD, controls, and empty Three.js scene immediately.
2. Allocate the highest feasible typed-array tier.
3. Generate and display an initial tranche of approximately 250,000 surface particles.
4. Render one successful frame and dispatch `observatory:ready`.
5. Reveal the transition curtain.
6. Continue filling the surface geometry in idle batches.
7. Reuse an existing dock data row to display integer generation progress.
8. Remove or replace the progress text when generation completes.

The geometry uses a draw range so completed particles appear progressively without constructing a new geometry for every batch.

## Performance Profiles

The preflight profile selects a starting target from available browser signals. Runtime frame sampling may lower the visible draw range without rebuilding geometry.

| Profile | Visible high-profile count | Intended result |
| --- | ---: | --- |
| High | 100% | Approximately 60 FPS on the target 1080p desktop |
| Balanced | 75% | Reduced GPU load while retaining million-level detail where the body budget permits |
| Low | 50% | At least 30 FPS on weaker devices |
| Recovery | 250,000 | Last-resort scene retained after allocation or generation failure |

The runtime lowers dynamic update frequency before reducing the static surface draw range. It never raises a profile automatically during the same page session, avoiding repeated oscillation.

## Per-Frame Allocation Rules

Million-scale surface layers are static after generation. Existing animation loops must not create objects per particle per frame.

- Noise generators and palette colors are created once outside animation loops.
- Temporary `THREE.Color`, `THREE.Vector3`, and matrix instances are reused.
- Color components are written directly into typed arrays where practical.
- Only dynamic-layer attributes are marked for GPU upload during animation.
- Static surface buffers are uploaded incrementally during generation and then remain unchanged.

This specifically removes the current Venus behavior that creates a noise generator and tens of thousands of colors per frame, and the Sun behavior that creates colors and vectors inside large per-frame loops.

## Planet-Specific Structure

Planet runtime files retain ownership of their procedural identity:

- Rocky bodies control crater, elevation, polar, and terminator distributions.
- Gas and ice giants control latitude bands, storms, atmospheric falloff, and limb color.
- Saturn and Uranus retain separate ring-density functions.
- Satellite count, orbit radius, inclination, visual size, and motion remain per-body data.
- The Sun retains distinct surface, corona, flare-loop, and eruption layers.

Only the scheduling and profile-selection mechanics are shared. Scene-specific generation and animation order remain local to prevent visual regressions.

## Transition and Flash Prevention

Initial entry:

- The transition curtain remains covering the page until `observatory:ready`.
- A 1.5-second maximum wait prevents a failed renderer from trapping navigation.
- The home page emits readiness after its UI and background render successfully.
- Planet pages emit readiness after the initial particle tranche renders successfully.

Exit navigation:

- Curtain exit begins before assigning `window.location.href`.
- Navigation occurs on the relevant CSS `transitionend` event.
- A roughly 900 ms timeout remains as a failure fallback.
- Repeated clicks cannot schedule multiple navigations.

Flash prevention:

- `html`, `body`, WebGL containers, and the transition curtain share a dark base color from the first painted frame.
- The curtain stays viewport-fixed and opaque during navigation.
- No transition state uses white or transparent page backgrounds.

## Visual Palette

The shared palette is:

| Role | Color |
| --- | --- |
| Deep-space background | `#070b12` |
| Instrument panel | `#101821` |
| NASA signal orange | `#e06236` |
| Amber highlight | `#d7ab61` |
| Warning red | `#c8434d` |
| Cold technical blue | `#5b789c` |
| Warm instrument white | `#e7e3da` |

The four curtain columns progress from deep blue to cold blue, amber, and orange-red. Planet colors remain body-specific, while shared HUD and transition elements use the common palette.

## Failure Handling

- Typed-array allocation tries the high, balanced, low, and recovery counts in order.
- A failed generation batch stops further generation but preserves all completed particles.
- The transition timeout still reveals the page when readiness is not emitted.
- Navigation remains available even when particle generation fails.
- WebGL or generation failures are reported to the console once, without repeated per-frame logging.
- Existing background and HUD layers remain usable as a visual fallback.

## Files and Scope

Expected changes are limited to:

- one shared progressive particle builder under `scripts/core/`;
- the transition system and transition styles;
- shared palette tokens and the minimum related component styles;
- the nine body runtime files;
- planet HTML script loading where required;
- one small built-in Node test file and concise maintenance documentation.

Unrelated UI architecture, page markup, vendor libraries, and build tooling are outside scope.

## Verification

Automated checks use Node's built-in `node:test` and `assert` modules, with no added dependency. Tests cover:

- batch boundaries and completion;
- adaptive batch sizing limits;
- high, balanced, low, and recovery profile selection;
- allocation fallback order;
- cancellation and generation errors;
- readiness timeout and single-navigation behavior;
- all first-party JavaScript syntax.

Manual browser verification covers:

- the home page and all nine celestial-body pages;
- forward and return navigation;
- no white frame during entry or exit;
- progressive particle appearance and HUD progress;
- zoom, drag, telemetry, rings, storms, and satellites;
- console errors and WebGL warnings;
- high-profile performance at 1080p near 60 FPS;
- degraded-profile performance at or above 30 FPS.

## Acceptance Criteria

The work is complete when:

- every body has at least 1,000,000 high-profile surface particles;
- each body retains visibly distinct procedural structure and auxiliary features;
- initial interaction is available before full particle generation completes;
- particle generation progresses without a long blocking task;
- navigation exposes no white flash in tested entry and exit paths;
- high, balanced, low, and recovery modes function without geometry recreation;
- automated checks pass without warnings or failures;
- all nine pages pass the browser verification checklist at 1080p.
