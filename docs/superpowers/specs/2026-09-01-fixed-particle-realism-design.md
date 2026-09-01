# Fixed-Scale Particle Realism Design

## Goal

Rebuild all nine celestial-body pages around one fixed particle scale while preserving the project's offline, no-build, direct-HTML workflow. Each page must use particles to express the body's recognizable physical structure rather than treating every body as the same recolored sphere.

The target is Windows desktop and Lively Wallpaper at 1920x1080. There is no quality selector or automatic high/balanced/low profile.

This specification supersedes `2026-09-01-million-particle-observatory-design.md` and its matching implementation plan. The older million-particle budgets and adaptive profiles must not be implemented.

## Fixed Particle Budget

Every body uses exactly **320,000 static surface particles**. Smaller dynamic layers are budgeted by the physical features they represent.

| Body | Static surface | Dynamic layers | Maximum page total |
| --- | ---: | --- | ---: |
| Sun | 320,000 | corona, magnetic loops, eruptions: 32,000 | 352,000 |
| Mercury | 320,000 | sodium exosphere/tail: 8,000 | 328,000 |
| Venus | 320,000 | dense sulfuric cloud deck: 40,000 | 360,000 |
| Earth | 320,000 | clouds and Moon: 44,000 | 364,000 |
| Mars | 320,000 | thin atmosphere, Phobos, Deimos: 20,000 | 340,000 |
| Jupiter | 320,000 | upper atmosphere and Great Red Spot: 52,000 | 372,000 |
| Saturn | 320,000 | haze, rings, and moons: 86,000 | 406,000 |
| Uranus | 320,000 | methane atmosphere, rings, and moons: 69,000 | 389,000 |
| Neptune | 320,000 | atmosphere/storms, ring arcs, and moons: 49,000 | 369,000 |

Dynamic ceilings are maxima, not quotas. A layer may contain fewer particles when the existing geometry already communicates the feature.

## Rendering Architecture

Add one browser-global helper under `scripts/core/particle-surface.js`. It has one responsibility: allocate a position and color `Float32Array`, fill them in short batches through a planet-owned sampling callback, and reveal the finished ranges with `BufferGeometry.setDrawRange`.

The helper exposes a single fixed constant, `SURFACE_PARTICLE_COUNT = 320000`, and a `build(options)` function. It does not contain quality profiles, FPS heuristics, UI controls, or planet-specific appearance logic.

Each planet runtime keeps ownership of:

- its surface radius and deformation formula;
- its seeded noise and color mapping;
- its axial tilt and rotation direction;
- its atmosphere, rings, storms, satellites, and interaction behavior;
- its planet-specific shader uniforms.

The first 40,000 particles are produced immediately. Remaining particles are generated with `requestIdleCallback`, with `requestAnimationFrame` as the local-file-compatible fallback. The final geometry always reaches 320,000 particles; progressive generation is only startup scheduling, not a quality tier.

All pages cap renderer pixel ratio at `Math.min(window.devicePixelRatio, 1.5)`.

## Animation Rule

Static surface arrays are never rewritten after generation. Rotation is applied to the containing `THREE.Group`.

Continuous visual changes use `ShaderMaterial` and a small set of uniforms such as `uTime`, `uActivity`, and `uCameraPosition`. This applies to Venus cloud flow, solar granulation, solar corona, Jupiter's storm circulation, and ring rotation. The existing Saturn ring shader is the local pattern to reuse.

CPU animation remains only for small bounded systems such as moons and active eruption particles. No animation loop may allocate `THREE.Color`, `THREE.Vector3`, noise generators, or arrays per particle.

## Body-Specific Appearance

- **Sun:** granular photosphere, limb darkening, sunspots, differential-looking surface motion, corona, magnetic loops, and occasional eruptions. Surface motion is shader displacement rather than CPU buffer rewriting.
- **Mercury:** airless cratered gray surface, strong day-side contrast, slow prograde rotation, and a sparse sodium tail directed away from the Sun.
- **Venus:** volcanic surface mostly obscured by a thick yellow-orange cloud deck. Surface rotation is retrograde and cloud super-rotation is visibly faster.
- **Earth:** blue ocean, noise-derived continents, polar ice, separate moving white clouds, axial tilt, and the Moon.
- **Mars:** iron-oxide surface, darker basalt regions, polar caps, thin dusty atmosphere, Phobos, and Deimos.
- **Jupiter:** latitude-dependent ammonia bands, turbulent boundaries, fast rotation, flattened appearance, and a persistent Great Red Spot with shader-driven circulation.
- **Saturn:** pale hydrogen-helium bands, subdued polar hexagon, oblate shape, dense structured rings with a Cassini gap, Titan, and representative moons.
- **Uranus:** cyan methane atmosphere, weak banding, approximately 98-degree axial tilt, narrow dark rings, and representative moons.
- **Neptune:** deep-blue methane atmosphere, fast bright cloud bands, dark storm regions, incomplete ring arcs, Triton, and representative moons.

The presentation is scientifically informed rather than scale-accurate: orbital distances, body sizes, and rotation speeds remain compressed so all features stay legible in the observatory interface.

## Memory and Failure Handling

One 320,000-particle surface with float positions and colors uses about 7.7 MB of attribute data. Generation writes directly into typed arrays; ordinary JavaScript arrays and a second full-size surface copy are not allowed.

If allocation or generation fails, stop the builder, retain any completed draw range, log one error, and keep navigation and UI interaction available. Do not silently fall back to a smaller particle count because the product has one fixed rendering scale.

## Files and Integration

- Add `scripts/core/particle-surface.js`.
- Add the helper script before planet runtimes in all nine planet HTML entries.
- Add fixed budgets to `scripts/planets/config.js`.
- Migrate all nine files under `scripts/planets/` to the shared surface builder.
- Reuse the existing planet groups, interaction helpers, telemetry, UI, topographic background, and satellite systems.
- Do not add a package manager, build step, worker, physics engine, texture download, or new dependency.

## Verification

Automated checks use Node's built-in test runner and must verify:

- the shared surface constant is exactly 320,000;
- every planet entry loads the shared helper before its runtime;
- every planet surface uses the shared builder;
- all renderers cap device pixel ratio at 1.5;
- static surface attributes are not marked for per-frame upload;
- Venus and Sun animation loops contain no per-frame noise or Three.js object construction;
- all first-party JavaScript parses successfully.

Real Chrome acceptance runs at 1920x1080 on Sun, Earth, Jupiter, Saturn, Uranus, and Neptune. After generation completes, each page must render for ten seconds without uncaught errors, preserve interaction and telemetry, display the required body-specific features, and maintain an average of at least 60 rendered frames per second on the target machine.

Direct `file://` acceptance covers Earth, Saturn, and Sun to prove that progressive scheduling and shaders do not depend on a server.

## Out of Scope

- particle quality tiers or adaptive particle counts;
- mobile, touch, keyboard, or accessibility expansion;
- physically exact scale or orbital simulation;
- WebGPU-only code, compute shaders, workers, fluid solvers, audio changes, or downloaded assets;
- redesigning the existing observatory UI.
