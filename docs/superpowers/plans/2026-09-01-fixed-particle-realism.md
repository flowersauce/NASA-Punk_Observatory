# Fixed-Scale Particle Realism Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render every celestial body with a fixed 320,000-particle surface and scientifically recognizable, GPU-friendly dynamic particle layers.

**Architecture:** A single browser-global helper preallocates typed arrays and progressively fills one static surface geometry per page. Planet files retain their existing sampling formulas and visual ownership; only continuously changing surface, storm, cloud, and ring effects move to shader uniforms or group transforms.

**Tech Stack:** Direct HTML, browser JavaScript, bundled Three.js, bundled Simplex Noise, Node.js built-in test runner, real Chrome.

**Spec:** `docs/superpowers/specs/2026-09-01-fixed-particle-realism-design.md`

## Global Constraints

- Every body has exactly 320,000 static surface particles.
- There is no quality selector, adaptive count, or fallback particle tier.
- The first 40,000 surface particles are synchronous; remaining batches use `requestIdleCallback` with `requestAnimationFrame` fallback.
- Static surface buffers are never rewritten from animation loops.
- Renderer DPR is capped with `Math.min(window.devicePixelRatio, 1.5)`.
- No package manager, build step, worker, downloaded asset, or new dependency.
- Existing UI, telemetry, interaction, transitions, topographic background, rings, and satellites remain functional.
- Windows desktop, Lively Wallpaper, Chrome/Edge, HTTP, and `file://` remain supported.

---

### Task 1: Shared Fixed Surface Builder

**Files:**
- Create: `scripts/core/particle-surface.js`
- Create: `test/particle-surface.test.cjs`

**Interfaces:**
- Consumes: browser `requestIdleCallback`, `requestAnimationFrame`, and a supplied `THREE` object.
- Produces: `ParticleSurface.SURFACE_PARTICLE_COUNT` and `ParticleSurface.build({THREE, parent, material, sample, schedule?, onComplete?, onError?})`.
- `sample(index, positions, colors)` writes one particle at `index * 3`.
- `build()` returns `{geometry, points, cancel()}`.

- [ ] **Step 1: Write failing builder tests**

Create a VM sandbox with minimal `BufferGeometry`, `BufferAttribute`, and `Points` stubs. Assert the fixed count, immediate 40,000 samples, scheduled completion at 320,000, progressive draw ranges, and cancellation:

```js
test('builds one fixed 320000-particle surface progressively', () => {
    const {api, flush, fakeThree} = loadSurface();
    let samples = 0;
    const parent = {add() {}};
    const result = api.build({
        THREE: fakeThree,
        parent,
        material: {},
        sample() { samples++; }
    });

    assert.equal(api.SURFACE_PARTICLE_COUNT, 320000);
    assert.equal(samples, 40000);
    assert.deepEqual(result.geometry.drawRange, [0, 40000]);
    flush();
    assert.equal(samples, 320000);
    assert.deepEqual(result.geometry.drawRange, [0, 320000]);
});

test('cancel stops later surface batches', () => {
    const {api, flush, fakeThree} = loadSurface();
    let samples = 0;
    const result = api.build({
        THREE: fakeThree,
        parent: {add() {}},
        material: {},
        sample() { samples++; }
    });
    result.cancel();
    flush();
    assert.equal(samples, 40000);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/particle-surface.test.cjs`

Expected: FAIL because `scripts/core/particle-surface.js` does not exist.

- [ ] **Step 3: Implement the minimal helper**

Implement one IIFE with fixed constants:

```js
(function initParticleSurface(global) {
    const SURFACE_PARTICLE_COUNT = 320000;
    const INITIAL_COUNT = 40000;
    const BATCH_SIZE = 10000;

    function defaultSchedule(callback) {
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(callback, {timeout: 50});
        } else {
            requestAnimationFrame(() => callback());
        }
    }

    function build(options) {
        const positions = new Float32Array(SURFACE_PARTICLE_COUNT * 3);
        const colors = new Float32Array(SURFACE_PARTICLE_COUNT * 3);
        const geometry = new options.THREE.BufferGeometry();
        const position = new options.THREE.BufferAttribute(positions, 3);
        const color = new options.THREE.BufferAttribute(colors, 3);
        geometry.setAttribute('position', position);
        geometry.setAttribute('color', color);
        geometry.setDrawRange(0, 0);
        const points = new options.THREE.Points(geometry, options.material);
        options.parent.add(points);
        let cursor = 0;
        let cancelled = false;
        const schedule = options.schedule || defaultSchedule;

        function fill(end) {
            const start = cursor;
            for (; cursor < end; cursor++) options.sample(cursor, positions, colors);
            position.updateRange = {offset: start * 3, count: (cursor - start) * 3};
            color.updateRange = {offset: start * 3, count: (cursor - start) * 3};
            position.needsUpdate = true;
            color.needsUpdate = true;
            geometry.setDrawRange(0, cursor);
        }

        function step() {
            if (cancelled) return;
            try {
                fill(Math.min(cursor + BATCH_SIZE, SURFACE_PARTICLE_COUNT));
                if (cursor < SURFACE_PARTICLE_COUNT) schedule(step);
                else if (options.onComplete) options.onComplete(points);
            } catch (error) {
                if (options.onError) options.onError(error);
                else console.error('[ParticleSurface] generation stopped', error);
            }
        }

        fill(INITIAL_COUNT);
        schedule(step);
        return {geometry, points, cancel() { cancelled = true; }};
    }

    global.ParticleSurface = {SURFACE_PARTICLE_COUNT, build};
})(window);
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test test/particle-surface.test.cjs`

Expected: 2 tests pass, 0 fail.

- [ ] **Step 5: Commit the builder**

```powershell
git add scripts/core/particle-surface.js test/particle-surface.test.cjs
git commit -m "feat: add fixed particle surface builder"
```

---

### Task 2: Entry Wiring, Budgets, and Renderer Cost

**Files:**
- Modify: `sun.html`, `mercury.html`, `venus.html`, `earth.html`, `mars.html`, `jupiter.html`, `saturn.html`, `uranus.html`, `neptune.html`
- Modify: `scripts/planets/config.js`
- Modify: all nine files under `scripts/planets/`
- Modify: `test/particle-surface.test.cjs`

**Interfaces:**
- Consumes: `ParticleSurface.SURFACE_PARTICLE_COUNT` loaded before `scripts/planets/config.js`.
- Produces: `PLANET_PARTICLE_CONFIG[name] = {surface, dynamic}` and a 1.5 DPR cap on each page.

- [ ] **Step 1: Add failing static integration tests**

```js
const planetNames = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

test('planet entries load particle surface before config and runtime', () => {
    for (const name of planetNames) {
        const html = fs.readFileSync(`${name}.html`, 'utf8');
        const helper = html.indexOf('./scripts/core/particle-surface.js');
        const config = html.indexOf('./scripts/planets/config.js');
        const runtime = html.indexOf(`./scripts/planets/${name}.js`);
        assert.ok(helper >= 0 && helper < config && config < runtime, name);
    }
});

test('all planet renderers cap DPR at 1.5', () => {
    for (const name of planetNames) {
        const source = fs.readFileSync(`scripts/planets/${name}.js`, 'utf8');
        assert.match(source, /setPixelRatio\(Math\.min\(window\.devicePixelRatio, 1\.5\)\)/, name);
    }
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test --test-name-pattern="entries|DPR" test/particle-surface.test.cjs`

Expected: FAIL on missing helper tags and uncapped DPR.

- [ ] **Step 3: Wire the helper and fixed budgets**

Insert `<script src="./scripts/core/particle-surface.js"></script>` immediately before `config.js` in all nine entries. Add:

```js
const PLANET_PARTICLE_CONFIG = {
    sun:     {surface: ParticleSurface.SURFACE_PARTICLE_COUNT, dynamic: 32000},
    mercury: {surface: ParticleSurface.SURFACE_PARTICLE_COUNT, dynamic: 8000},
    venus:   {surface: ParticleSurface.SURFACE_PARTICLE_COUNT, dynamic: 40000},
    earth:   {surface: ParticleSurface.SURFACE_PARTICLE_COUNT, dynamic: 44000},
    mars:    {surface: ParticleSurface.SURFACE_PARTICLE_COUNT, dynamic: 20000},
    jupiter: {surface: ParticleSurface.SURFACE_PARTICLE_COUNT, dynamic: 52000},
    saturn:  {surface: ParticleSurface.SURFACE_PARTICLE_COUNT, dynamic: 86000},
    uranus:  {surface: ParticleSurface.SURFACE_PARTICLE_COUNT, dynamic: 69000},
    neptune: {surface: ParticleSurface.SURFACE_PARTICLE_COUNT, dynamic: 49000}
};
```

Replace every renderer call with `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));`.

- [ ] **Step 4: Verify GREEN and syntax**

Run: `node --test test/particle-surface.test.cjs`

Run:

```powershell
Get-ChildItem scripts -Recurse -Filter *.js | Where-Object FullName -notmatch '\\vendor\\' | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE) { exit $LASTEXITCODE } }
```

Expected: tests and syntax checks pass.

- [ ] **Step 5: Commit entry integration**

```powershell
git add *.html scripts/planets/config.js scripts/planets/*.js test/particle-surface.test.cjs
git commit -m "feat: wire fixed particle budgets"
```

---

### Task 3: Mercury, Earth, and Mars Surfaces

**Files:**
- Modify: `scripts/planets/mercury.js`
- Modify: `scripts/planets/earth.js`
- Modify: `scripts/planets/mars.js`
- Modify: `test/particle-surface.test.cjs`

**Interfaces:**
- Consumes: `ParticleSurface.build()` and each file's existing seeded noise/color formulas.
- Produces: one 320,000-point static surface under the existing spin group for each rocky body.

- [ ] **Step 1: Add failing migration contracts**

```js
test('Mercury Earth and Mars use the fixed surface builder', () => {
    for (const name of ['mercury', 'earth', 'mars']) {
        const source = fs.readFileSync(`scripts/planets/${name}.js`, 'utf8');
        assert.match(source, /ParticleSurface\.build\(/, name);
        assert.doesNotMatch(source, /const (particleCount|landParticles|surfaceParticles) = (45000|50000|60000)/, name);
    }
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --test-name-pattern="Mercury Earth and Mars" test/particle-surface.test.cjs`

Expected: FAIL because all three surfaces still allocate ordinary arrays synchronously.

- [ ] **Step 3: Migrate each existing surface function**

In `createMercury`, `createEarth`, and `createMarsSurface`, keep the existing noise, radius, crater/continent/polar-cap decisions, colors, material, parent group, wireframe, atmosphere, moons, and tail. Replace only the surface arrays and loop with:

```js
ParticleSurface.build({
    THREE,
    parent: planetSpinGroup, // use earthSystemGroup or marsSurfaceGroup in its file
    material: surfaceMaterial,
    sample(i, positions, colors) {
        const offset = i * 3;
        // Run the existing body-specific spherical sample and noise/color mapping once.
        positions[offset] = x;
        positions[offset + 1] = y;
        positions[offset + 2] = z;
        colors[offset] = color.r;
        colors[offset + 1] = color.g;
        colors[offset + 2] = color.b;
    },
    onError(error) { console.error('[planet] surface generation stopped', error); }
});
```

Use one scratch `THREE.Color` declared outside each `sample` callback. Do not create arrays, colors, or noise generators inside `sample`.

- [ ] **Step 4: Verify GREEN and syntax**

Run: `node --test test/particle-surface.test.cjs`

Run: `node --check scripts/planets/mercury.js; node --check scripts/planets/earth.js; node --check scripts/planets/mars.js`

Expected: all commands pass.

- [ ] **Step 5: Commit rocky surfaces**

```powershell
git add scripts/planets/mercury.js scripts/planets/earth.js scripts/planets/mars.js test/particle-surface.test.cjs
git commit -m "feat: densify rocky planet surfaces"
```

---

### Task 4: Venus Surface and GPU Cloud Flow

**Files:**
- Modify: `scripts/planets/venus.js`
- Modify: `test/particle-surface.test.cjs`

**Interfaces:**
- Consumes: `ParticleSurface.build()`.
- Produces: a static volcanic surface plus a 40,000-point shader-driven sulfuric cloud deck.

- [ ] **Step 1: Add failing Venus tests**

```js
test('Venus uses fixed surface and no CPU cloud hot loop', () => {
    const source = fs.readFileSync('scripts/planets/venus.js', 'utf8');
    const animate = source.slice(source.indexOf('function animate'));
    assert.match(source, /ParticleSurface\.build\(/);
    assert.match(source, /new THREE\.ShaderMaterial\(/);
    assert.doesNotMatch(animate, /new SimplexNoise|new THREE\.Color|needsUpdate/);
    assert.match(source, /const cloudParticles = 40000/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --test-name-pattern="Venus" test/particle-surface.test.cjs`

Expected: FAIL on the missing surface builder and current per-frame cloud color loop.

- [ ] **Step 3: Migrate the surface and cloud material**

Use the Task 3 typed-array callback pattern in `createVenusSurface`, preserving volcanic noise and retrograde rotation. Change the cloud count to 40,000 and replace `PointsMaterial` with a shader that passes vertex color, offsets brightness with `sin(position.y * 2.4 + uTime)`, renders a soft circular point, and keeps `transparent: true`, `depthWrite: false`.

Declare `const cloudUniforms = {uTime: {value: 0}};`. In `animate`, keep group rotation and set only `cloudUniforms.uTime.value = Date.now() * 0.0002;`. Delete the per-particle noise/color loop.

- [ ] **Step 4: Verify GREEN and syntax**

Run: `node --test --test-name-pattern="Venus" test/particle-surface.test.cjs`

Run: `node --check scripts/planets/venus.js`

Expected: both commands pass.

- [ ] **Step 5: Commit Venus**

```powershell
git add scripts/planets/venus.js test/particle-surface.test.cjs
git commit -m "feat: render Venus clouds on the GPU"
```

---

### Task 5: Giant Planet Surfaces and Storms

**Files:**
- Modify: `scripts/planets/jupiter.js`
- Modify: `scripts/planets/saturn.js`
- Modify: `scripts/planets/uranus.js`
- Modify: `scripts/planets/neptune.js`
- Modify: `test/particle-surface.test.cjs`

**Interfaces:**
- Consumes: `ParticleSurface.build()` and the existing Saturn ring shader pattern.
- Produces: four fixed surfaces with existing rings and moons preserved; Jupiter's Great Red Spot animates without CPU buffer uploads.

- [ ] **Step 1: Add failing giant contracts**

```js
test('giant planets use fixed surfaces without CPU storm uploads', () => {
    for (const name of ['jupiter', 'saturn', 'uranus', 'neptune']) {
        const source = fs.readFileSync(`scripts/planets/${name}.js`, 'utf8');
        assert.match(source, /ParticleSurface\.build\(/, name);
    }
    const jupiterAnimate = fs.readFileSync('scripts/planets/jupiter.js', 'utf8').split('function animate')[1];
    assert.doesNotMatch(jupiterAnimate, /redSpotMesh\.geometry\.attributes\.position\.needsUpdate/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --test-name-pattern="giant planets" test/particle-surface.test.cjs`

Expected: FAIL on all four missing surface-builder calls and Jupiter's CPU upload.

- [ ] **Step 3: Migrate the four surface generators**

Apply one typed-array builder call inside `createJupiter`, `createGasGiant`, `createUranus`, and `createNeptune`. Preserve these existing mappings exactly:

- Jupiter: latitude bands, turbulent boundaries, oblate Y scale, Great Red Spot placement, fast spin, faint rings, and moons.
- Saturn: pale bands, polar treatment, oblate Y scale, Cassini-gap ring shader, Titan, and other moons.
- Uranus: cyan methane palette, weak banding, approximately 98-degree tilt, five ring densities, and moons.
- Neptune: deep blue bands, dark storms, bright clouds, partial ring arcs, Triton, and minor moons.

Each callback writes directly to supplied arrays and reuses one scratch color.

- [ ] **Step 4: Move Jupiter storm motion to its material**

Replace the Red Spot `PointsMaterial` with a `ShaderMaterial` whose vertex shader rotates local X/Y around the spot center using `uTime`, with speed scaled by radial distance. Update only `redSpotUniforms.uTime.value` in `animate`; delete the CPU particle loop and `needsUpdate` call.

- [ ] **Step 5: Verify GREEN and syntax**

Run: `node --test test/particle-surface.test.cjs`

Run: `node --check scripts/planets/jupiter.js; node --check scripts/planets/saturn.js; node --check scripts/planets/uranus.js; node --check scripts/planets/neptune.js`

Expected: all commands pass.

- [ ] **Step 6: Commit giant planets**

```powershell
git add scripts/planets/jupiter.js scripts/planets/saturn.js scripts/planets/uranus.js scripts/planets/neptune.js test/particle-surface.test.cjs
git commit -m "feat: densify giant planet systems"
```

---

### Task 6: Solar Surface Shader and Bounded Activity

**Files:**
- Modify: `scripts/planets/sun.js`
- Modify: `test/particle-surface.test.cjs`

**Interfaces:**
- Consumes: `ParticleSurface.build()`.
- Produces: a 320,000-point photosphere shader and at most 32,000 corona/loop/eruption particles.

- [ ] **Step 1: Add failing Sun contracts**

```js
test('Sun keeps its surface on the GPU and respects its dynamic ceiling', () => {
    const source = fs.readFileSync('scripts/planets/sun.js', 'utf8');
    const animate = source.slice(source.indexOf('function animate'));
    assert.match(source, /ParticleSurface\.build\(/);
    assert.match(source, /new THREE\.ShaderMaterial\(/);
    assert.doesNotMatch(animate, /sunGeometry\.attributes\.(position|color)\.needsUpdate/);
    assert.doesNotMatch(animate, /new THREE\.(Color|Vector3)/);
    assert.doesNotMatch(animate, /new SimplexNoise/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --test-name-pattern="Sun" test/particle-surface.test.cjs`

Expected: FAIL on the current 30,000-point CPU-animated surface and animation allocations.

- [ ] **Step 3: Build the static photosphere and shader**

Rename `createDynamicSun` to `createSunSurface`. Generate the existing spherical photosphere once through `ParticleSurface.build`. Its `ShaderMaterial` must:

- displace vertices slightly with position and `uTime` sinusoidal granulation;
- blend spot, edge, surface, and hot colors from vertex color and view-facing depth;
- render circular additive points;
- receive only `uTime` updates from `animate`.

Keep the existing core, twelve magnetic loops, 6,000 corona points, 2,000 eruption pool, and grids. These remain below the 32,000 dynamic ceiling.

- [ ] **Step 4: Remove animation allocations**

Hoist eruption colors and one scratch `THREE.Color`/`THREE.Vector3` above `animate`. Update only active eruption entries, set buffer update ranges to the active span, and remove full photosphere position/color uploads.

- [ ] **Step 5: Verify GREEN and syntax**

Run: `node --test test/particle-surface.test.cjs`

Run: `node --check scripts/planets/sun.js`

Expected: both commands pass.

- [ ] **Step 6: Commit the Sun**

```powershell
git add scripts/planets/sun.js test/particle-surface.test.cjs
git commit -m "feat: render solar activity on the GPU"
```

---

### Task 7: Full Verification and Runtime Documentation

**Files:**
- Modify: `docs/runtime-refactor-notes.md`

**Interfaces:**
- Documents: fixed count, builder lifecycle, body-specific behavior, verification commands, and measured browser results.

- [ ] **Step 1: Run all automated checks**

Run: `node --test test/*.test.cjs`

Run:

```powershell
Get-ChildItem scripts -Recurse -Filter *.js | Where-Object FullName -notmatch '\\vendor\\' | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE) { exit $LASTEXITCODE } }
```

Run: `git diff --check HEAD`

Expected: 0 test failures, 0 syntax failures, and 0 whitespace errors.

- [ ] **Step 2: Run HTTP Chrome acceptance**

Start: `python -m http.server 4173 --bind 127.0.0.1`

At 1920x1080, visit Sun, Earth, Jupiter, Saturn, Uranus, and Neptune. For each page, wait until `geometry.drawRange.count === 320000`, sample `requestAnimationFrame` for ten seconds, and record average FPS, uncaught errors, canvas dimensions, and `devicePixelRatio`. Confirm drag, wheel zoom, telemetry, background, rings, and satellites remain active.

Expected: no uncaught errors and at least 60 average rendered FPS per page on the target machine.

- [ ] **Step 3: Run direct-file acceptance**

Open `earth.html`, `saturn.html`, and `sun.html` through `file://`. Confirm progressive generation reaches 320,000, shaders compile, interaction works, and no CORS/worker error occurs.

- [ ] **Step 4: Inspect representative visuals**

Capture 1920x1080 screenshots of Sun, Earth, Jupiter, Saturn, Uranus, and Neptune. Verify the body-specific traits in the spec are visible and no opaque square point sprites, white transition frames, clipping, or empty particle batches appear.

- [ ] **Step 5: Update runtime notes**

Document `ParticleSurface.build`, the fixed 320,000 count, direct typed-array writes, GPU animation rule, exact automated commands, HTTP/file acceptance, and the measured FPS table in `docs/runtime-refactor-notes.md`.

- [ ] **Step 6: Run fresh final verification and commit**

Repeat Step 1 after documentation changes.

```powershell
git add docs/runtime-refactor-notes.md
git commit -m "docs: record fixed particle verification"
```

## Completion Gate

Before claiming completion, compare all changes against `docs/superpowers/specs/2026-09-01-fixed-particle-realism-design.md`. Do not claim a body-specific visual trait without inspecting its screenshot, and do not claim 60 FPS without a fresh ten-second real-Chrome sample at 1920x1080.
