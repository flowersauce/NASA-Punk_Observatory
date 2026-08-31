# Million-Particle Observatory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give all nine celestial-body pages progressively generated million-particle surfaces, planet-specific detail, adaptive draw profiles, and flash-free NASA-styled navigation.

**Architecture:** Keep each planet's procedural sampling in its existing runtime file and add one shared scheduler that fills preallocated typed arrays in short browser-idle batches. Static million-particle surfaces use `BufferGeometry.setDrawRange`; smaller dynamic layers retain animation. A single readiness event coordinates the first visible particle tranche with the existing transition curtain.

**Tech Stack:** Static HTML, browser JavaScript, Three.js global build, SimplexNoise, CSS custom properties, Node.js built-in `node:test`, `assert`, and `vm`.

**Spec:** `docs/superpowers/specs/2026-09-01-million-particle-observatory-design.md`

## Global Constraints

- Preserve direct `file://` opening, offline use, and Lively Wallpaper compatibility.
- Add no dependency, package manager, bundler, worker, or build step.
- High profile uses the exact approved surface counts: Sun 1,600,000; Mercury 1,000,000; Venus 1,200,000; Earth 1,250,000; Mars 1,050,000; Jupiter 1,500,000; Saturn 1,350,000; Uranus 1,200,000; Neptune 1,200,000.
- Dynamic layer ceilings are: Sun 80,000; Mercury 30,000; Venus 60,000; Earth 50,000; Mars 40,000; Jupiter 80,000; Saturn 60,000; Uranus 40,000; Neptune 60,000.
- First visible tranche is 250,000 surface particles.
- Generation batches target 4-6 ms and use `requestIdleCallback` with `requestAnimationFrame` fallback.
- Profiles expose 100%, 75%, 50%, and 250,000 recovery draw counts without geometry recreation.
- Initial readiness waits at most 1,500 ms; exit navigation waits for animation completion with a 900 ms fallback.
- High profile targets approximately 60 FPS at 1080p; lower profiles must remain at or above 30 FPS.
- Production code changes follow red-green-refactor and must leave one runnable regression check per non-trivial behavior.

---

## File Map

- Create `scripts/core/particle-builder.js`: allocation fallback, batch scheduling, draw-count selection, readiness emission, and cancellation.
- Create `test/particle-builder.test.cjs`: deterministic scheduler/profile/allocation tests through a VM-loaded browser script.
- Create `test/transition.test.cjs`: transition readiness and single-navigation behavior using a minimal fake DOM/event target.
- Modify `scripts/planets/config.js`: approved particle budgets and progress-row markup.
- Modify `scripts/components/planetUi.js`: stable `#particle-build-progress` target.
- Modify `scripts/core/transition.js`: readiness-gated reveal and transition-end navigation.
- Modify `styles/tokens.css`, `styles/base.css`, and `styles/transition.css`: approved palette and opaque first paint.
- Modify `index.html` and all nine body HTML files: load the builder before page/runtime scripts.
- Modify all files under `scripts/planets/`: progressive surface generation, static/dynamic separation, and removal of hot-loop allocations.
- Modify `scripts/pages/index.page.js`: emit readiness after the home UI/background first render.
- Modify `docs/runtime-refactor-notes.md`: record the new runtime contract and verification command.

---

### Task 1: Shared Progressive Particle Builder

**Files:**
- Create: `scripts/core/particle-builder.js`
- Create: `test/particle-builder.test.cjs`

**Interfaces:**
- Consumes: browser `performance.now`, `requestIdleCallback`, `requestAnimationFrame`, `window.dispatchEvent`, and `CustomEvent`.
- Produces: `ParticleBuilder.allocate(counts)`, `ParticleBuilder.visibleCount(maxCount, profile)`, `ParticleBuilder.build(options)`, and `ParticleBuilder.markReady(detail)`.
- `build(options)` accepts `{total, readyCount, initialBatchSize, writeBatch(start, end), setDrawCount(count), onReady(count), onProgress(percent), onComplete(), onError(error), schedule?, now?}` and returns `{cancel()}`.

- [ ] **Step 1: Write the failing builder tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadBuilder(extra = {}) {
    const events = [];
    const sandbox = {
        window: {dispatchEvent: (event) => events.push(event)},
        CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
        performance: {now: () => 0},
        requestAnimationFrame: (callback) => callback(),
        console,
        ...extra
    };
    sandbox.window.window = sandbox.window;
    vm.runInNewContext(fs.readFileSync('scripts/core/particle-builder.js', 'utf8'), sandbox);
    return {api: sandbox.window.ParticleBuilder, events};
}

test('visibleCount selects approved profile counts', () => {
    const {api} = loadBuilder();
    assert.equal(api.visibleCount(1_600_000, 'high'), 1_600_000);
    assert.equal(api.visibleCount(1_600_000, 'balanced'), 1_200_000);
    assert.equal(api.visibleCount(1_600_000, 'low'), 800_000);
    assert.equal(api.visibleCount(1_600_000, 'recovery'), 250_000);
});

test('allocate falls through to the first feasible count', () => {
    const {api} = loadBuilder();
    const result = api.allocate([1_000_000, 750_000, 500_000, 250_000], (count) => {
        if (count > 500_000) throw new RangeError('allocation failed');
        return new Float32Array(count * 3);
    });
    assert.equal(result.count, 500_000);
    assert.equal(result.value.length, 1_500_000);
});

test('build writes contiguous batches and exposes the first tranche', async () => {
    const {api} = loadBuilder();
    const ranges = [];
    const draws = [];
    const progress = [];
    const ready = [];
    const queue = [];
    const done = new Promise((resolve, reject) => api.build({
        total: 600_000,
        readyCount: 250_000,
        initialBatchSize: 10_000,
        writeBatch: (start, end) => ranges.push([start, end]),
        setDrawCount: (count) => draws.push(count),
        onReady: (count) => ready.push(count),
        onProgress: (percent) => progress.push(percent),
        onComplete: resolve,
        onError: reject,
        schedule: (callback) => queue.push(callback),
        now: (() => { let time = 0; return () => ++time; })()
    }));
    while (queue.length) queue.shift()();
    await done;
    assert.deepEqual(ranges[0], [0, 10_000]);
    assert.equal(ready.length, 1);
    assert.ok(ready[0] >= 250_000);
    assert.equal(ranges.at(-1)[1], 600_000);
    assert.equal(draws.at(-1), 600_000);
    assert.equal(progress.at(-1), 100);
});

test('cancel prevents queued batches from writing', () => {
    const {api} = loadBuilder();
    const queue = [];
    let writes = 0;
    const job = api.build({
        total: 500_000,
        readyCount: 250_000,
        initialBatchSize: 10_000,
        writeBatch: () => writes++,
        setDrawCount: () => {},
        schedule: (callback) => queue.push(callback)
    });
    job.cancel();
    while (queue.length) queue.shift()();
    assert.equal(writes, 0);
});
```

- [ ] **Step 2: Run the tests and verify the expected failure**

Run: `node --test test/particle-builder.test.cjs`

Expected: FAIL because `scripts/core/particle-builder.js` does not exist.

- [ ] **Step 3: Implement the minimal browser-global API**

```js
(function initParticleBuilder(global) {
    const PROFILE_RATIOS = {high: 1, balanced: 0.75, low: 0.5};

    function visibleCount(maxCount, profile) {
        if (profile === 'recovery') return Math.min(maxCount, 250000);
        return Math.floor(maxCount * (PROFILE_RATIOS[profile] || 1));
    }

    function allocate(counts, factory) {
        let lastError;
        for (const count of counts) {
            try { return {count, value: factory(count)}; }
            catch (error) { lastError = error; }
        }
        throw lastError;
    }

    function defaultSchedule(callback) {
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(callback, {timeout: 50});
        } else {
            requestAnimationFrame(callback);
        }
    }

    function build(options) {
        let cursor = 0;
        let cancelled = false;
        let readySent = false;
        let batchSize = Math.min(options.initialBatchSize || 10000, options.total);
        let lastPercent = -1;
        const schedule = options.schedule || defaultSchedule;
        const now = options.now || (() => performance.now());

        function run() {
            if (cancelled) return;
            const started = now();
            const end = Math.min(options.total, cursor + batchSize);
            try {
                options.writeBatch(cursor, end);
                cursor = end;
                options.setDrawCount(cursor);
                if (!readySent && cursor >= (options.readyCount || 250000)) {
                    readySent = true;
                    if (options.onReady) options.onReady(cursor);
                }
                const percent = Math.floor(cursor / options.total * 100);
                if (percent !== lastPercent) {
                    lastPercent = percent;
                    if (options.onProgress) options.onProgress(percent);
                }
            } catch (error) {
                if (options.onError) options.onError(error);
                return;
            }
            const elapsed = Math.max(1, now() - started);
            batchSize = Math.min(50000, Math.max(1000, Math.round(batchSize * 5 / elapsed)));
            if (cursor < options.total) schedule(run); else if (options.onComplete) options.onComplete();
        }

        schedule(run);
        return {cancel() { cancelled = true; }};
    }

    function markReady(detail) {
        global.dispatchEvent(new CustomEvent('observatory:ready', {detail}));
    }

    global.ParticleBuilder = {allocate, build, markReady, visibleCount};
})(window);
```

- [ ] **Step 4: Run the builder tests**

Run: `node --test test/particle-builder.test.cjs`

Expected: 4 tests PASS, 0 failures.

- [ ] **Step 5: Commit the builder**

```powershell
git add scripts/core/particle-builder.js test/particle-builder.test.cjs
git commit -m "feat: add progressive particle builder"
```

---

### Task 2: Approved Particle Budgets and Progress UI

**Files:**
- Modify: `scripts/planets/config.js:1-137`
- Modify: `scripts/components/planetUi.js:3-109`
- Modify: `test/particle-builder.test.cjs`

**Interfaces:**
- Consumes: `PLANET_UI_CONFIG[planetName]`.
- Produces: `PLANET_PARTICLE_CONFIG[planetName] = {surface, dynamic}` and `#particle-build-progress`.

- [ ] **Step 1: Add a failing config/UI contract test**

Append a VM test that loads `scripts/planets/config.js` and asserts the exact approved counts, then loads `planetUi.js` with a stub `ObservatoryUI` and asserts the generated layout contains `id="particle-build-progress"` and initial text `SURFACE_GEN: 0%`.

```js
test('planet config exposes every approved particle budget', () => {
    const sandbox = {};
    const source = fs.readFileSync('scripts/planets/config.js', 'utf8') +
        '\n;globalThis.__particleConfig = PLANET_PARTICLE_CONFIG;';
    vm.runInNewContext(source, sandbox);
    const config = sandbox.__particleConfig;
    assert.equal(config.sun.surface, 1_600_000);
    assert.equal(config.mercury.surface, 1_000_000);
    assert.equal(config.venus.surface, 1_200_000);
    assert.equal(config.earth.surface, 1_250_000);
    assert.equal(config.mars.surface, 1_050_000);
    assert.equal(config.jupiter.surface, 1_500_000);
    assert.equal(config.saturn.surface, 1_350_000);
    assert.equal(config.uranus.surface, 1_200_000);
    assert.equal(config.neptune.surface, 1_200_000);
    assert.deepEqual(
        Object.fromEntries(Object.entries(config).map(([name, value]) => [name, value.dynamic])),
        {sun: 80_000, mercury: 30_000, venus: 60_000, earth: 50_000, mars: 40_000,
            jupiter: 80_000, saturn: 60_000, uranus: 40_000, neptune: 60_000}
    );
});

test('planet layout exposes surface generation progress', () => {
    const sandbox = {
        PLANET_UI_CONFIG: {},
        ObservatoryUI: {
            buildRightDock: (config) => config.footerRow,
            buildVerticalZoomControl: () => ''
        },
        document: {getElementById: () => null}
    };
    sandbox.window = sandbox;
    vm.runInNewContext(fs.readFileSync('scripts/components/planetUi.js', 'utf8'), sandbox);
    const html = sandbox.buildPlanetLayout({active: 'earth', rows: []});
    assert.match(html, /id="particle-build-progress">0%/);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test --test-name-pattern="planet config" test/particle-builder.test.cjs`

Expected: FAIL because `PLANET_PARTICLE_CONFIG` is undefined.

- [ ] **Step 3: Add the exact configuration and progress row**

Add this constant before `PLANET_UI_CONFIG`:

```js
const PLANET_PARTICLE_CONFIG = {
    sun:     {surface: 1600000, dynamic: 80000},
    mercury: {surface: 1000000, dynamic: 30000},
    venus:   {surface: 1200000, dynamic: 60000},
    earth:   {surface: 1250000, dynamic: 50000},
    mars:    {surface: 1050000, dynamic: 40000},
    jupiter: {surface: 1500000, dynamic: 80000},
    saturn:  {surface: 1350000, dynamic: 60000},
    uranus:  {surface: 1200000, dynamic: 40000},
    neptune: {surface: 1200000, dynamic: 60000}
};
```

Set the dock footer to two rows while preserving the zoom ID:

```js
const PLANET_ZOOM_FOOTER = '&gt; CAM_ZOOM: <span id="zoom-text-display">100%</span>' +
    '<br>&gt; SURFACE_GEN: <span id="particle-build-progress">0%</span>';
```

- [ ] **Step 4: Run all builder/config tests**

Run: `node --test test/particle-builder.test.cjs`

Expected: PASS.

- [ ] **Step 5: Commit the contract**

```powershell
git add scripts/planets/config.js scripts/components/planetUi.js test/particle-builder.test.cjs
git commit -m "feat: define planet particle budgets"
```

---

### Task 3: Flash-Free Readiness and Navigation

**Files:**
- Modify: `scripts/core/transition.js:1-151`
- Modify: `styles/tokens.css:29-57`
- Modify: `styles/base.css:7-21`
- Modify: `styles/transition.css:6-66`
- Create: `test/transition.test.cjs`

**Interfaces:**
- Consumes: `observatory:ready` on `window`.
- Produces: `TransitionManager.init()`, `TransitionManager.navigate(url)`, one reveal after ready/1,500 ms, and one navigation after `animationend`/900 ms.

- [ ] **Step 1: Write failing transition tests with a fake curtain**

Create a minimal fake `window`, `document`, `classList`, event listener registry, and timers. Assert that readiness adds `curtain-intro`, timeout also reveals, two `navigate()` calls produce only one destination assignment, and `animationend` completes navigation before the fallback timer.

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadTransition() {
    const classes = new Set(['transition-curtain', 'start-covered']);
    const curtainListeners = new Map();
    const windowListeners = new Map();
    const timers = [];
    const navigations = [];
    const curtain = {
        classList: {
            add: (...names) => names.forEach((name) => classes.add(name)),
            remove: (...names) => names.forEach((name) => classes.delete(name)),
            contains: (name) => classes.has(name)
        },
        addEventListener: (type, callback) => curtainListeners.set(type, callback),
        offsetWidth: 1
    };
    const location = {};
    Object.defineProperty(location, 'href', {
        get: () => navigations.at(-1),
        set: (value) => navigations.push(value)
    });
    const window = {
        location,
        addEventListener: (type, callback) => windowListeners.set(type, callback)
    };
    const document = {
        body: {appendChild: () => {}},
        getElementById: (id) => id === 'global-curtain' ? curtain : null,
        addEventListener: (type, callback) => {
            if (type === 'DOMContentLoaded') callback();
        }
    };
    const sandbox = {
        window,
        document,
        setTimeout: (callback) => { timers.push(callback); return timers.length; },
        requestAnimationFrame: (callback) => callback(),
        console
    };
    vm.runInNewContext(fs.readFileSync('scripts/core/transition.js', 'utf8'), sandbox);
    return {api: window.TransitionManager, curtain, curtainListeners, windowListeners, timers, location, navigations};
}

test('ready reveals the curtain once', () => {
    const env = loadTransition();
    env.windowListeners.get('observatory:ready')();
    assert.equal(env.curtain.classList.contains('curtain-intro'), true);
    assert.equal(env.curtain.classList.contains('start-covered'), false);
});

test('navigation is single-flight and completes on animationend', () => {
    const env = loadTransition();
    env.api.navigate('earth.html');
    env.api.navigate('mars.html');
    env.curtainListeners.get('animationend')({animationName: 'wipe-in'});
    assert.equal(env.location.href, 'earth.html');
    env.timers.forEach((callback) => callback());
    assert.deepEqual(env.navigations, ['earth.html']);
});
```

- [ ] **Step 2: Run the transition test and verify it fails**

Run: `node --test test/transition.test.cjs`

Expected: FAIL because the current implementation reveals on `load`, has no readiness listener, and navigates after a fixed 600 ms.

- [ ] **Step 3: Replace the unused effect registry with the direct curtain flow**

Implement these state variables and timings directly in `TransitionManager`:

```js
const READY_TIMEOUT_MS = 1500;
const NAV_TIMEOUT_MS = 900;
let revealed = false;
let navigating = false;

function reveal() {
    if (revealed) return;
    revealed = true;
    const curtain = ensureCurtain();
    curtain.classList.remove('start-covered');
    curtain.classList.add('curtain-intro');
}

function navigate(url) {
    if (navigating) return;
    navigating = true;
    const curtain = ensureCurtain();
    curtain.classList.remove('curtain-intro', 'start-covered');
    void curtain.offsetWidth;
    curtain.classList.add('curtain-exit');
    let finished = false;
    const finish = () => {
        if (finished) return;
        finished = true;
        window.location.href = url;
    };
    curtain.addEventListener('animationend', finish, {once: true});
    setTimeout(finish, NAV_TIMEOUT_MS);
}
```

`init()` registers `window.addEventListener('observatory:ready', reveal, {once: true})` and `setTimeout(reveal, READY_TIMEOUT_MS)`.

- [ ] **Step 4: Apply the approved opaque palette**

Set tokens exactly:

```css
--bg-navy: #070b12;
--panel-navy: #101821;
--const-red: #c8434d;
--const-orange: #e06236;
--const-yellow: #d7ab61;
--const-blue: #5b789c;
--text-white: #e7e3da;
```

Set `html`, `body`, `#canvas-container`, and `#ui-layer` to the same dark background or transparent-over-dark contract. Keep `.transition-curtain` opaque and fixed. Set `.c1` to `var(--bg-navy)`, `.c2` to `var(--const-blue)`, `.c3` to `var(--const-yellow)`, and `.c4` to `var(--const-orange)`; no transition state may use white.

- [ ] **Step 5: Run transition and builder tests**

Run: `node --test test/*.test.cjs`

Expected: PASS with 0 failures.

- [ ] **Step 6: Commit transition and palette**

```powershell
git add scripts/core/transition.js styles/tokens.css styles/base.css styles/transition.css test/transition.test.cjs
git commit -m "fix: gate transitions on rendered readiness"
```

---

### Task 4: Load the Builder and Signal Home Readiness

**Files:**
- Modify: `index.html:17-35`
- Modify: `sun.html`, `mercury.html`, `venus.html`, `earth.html`, `mars.html`, `jupiter.html`, `saturn.html`, `uranus.html`, `neptune.html`
- Modify: `scripts/pages/index.page.js:127-151`
- Modify: `test/particle-builder.test.cjs`

**Interfaces:**
- Consumes: `window.ParticleBuilder.markReady(detail)`.
- Produces: builder loaded before every planet runtime; home emits `{page: 'index'}` after its first animation frame.

- [ ] **Step 1: Add a failing static script-order test**

```js
test('every HTML entry loads particle-builder before its page runtime', () => {
    for (const name of ['index', 'sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
        const html = fs.readFileSync(`${name}.html`, 'utf8');
        const builder = html.indexOf('./scripts/core/particle-builder.js');
        const runtime = name === 'index'
            ? html.indexOf('./scripts/pages/index.page.js')
            : html.indexOf(`./scripts/planets/${name}.js`);
        assert.ok(builder >= 0 && builder < runtime, `${name}.html script order`);
    }
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test --test-name-pattern="HTML entry" test/particle-builder.test.cjs`

Expected: FAIL because none of the entries load the builder.

- [ ] **Step 3: Add the script tag to all ten entries**

Insert `<script src="./scripts/core/particle-builder.js"></script>` after `transition.js` and before page/config/runtime code.

- [ ] **Step 4: Signal home readiness after one rendered frame**

At the end of `index.page.js`, after layout and background initialization:

```js
requestAnimationFrame(() => ParticleBuilder.markReady({page: 'index'}));
```

- [ ] **Step 5: Run the test and syntax sweep**

Run: `node --test test/*.test.cjs`

Run: `Get-ChildItem scripts -Recurse -Filter *.js | Where-Object FullName -notmatch '\\vendor\\' | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE) { exit $LASTEXITCODE } }`

Expected: all tests and syntax checks PASS.

- [ ] **Step 6: Commit entry integration**

```powershell
git add *.html scripts/pages/index.page.js test/particle-builder.test.cjs
git commit -m "feat: load particle runtime from every entry"
```

---

### Task 5: Migrate Rocky-Body Surfaces

**Files:**
- Modify: `scripts/planets/mercury.js`
- Modify: `scripts/planets/venus.js`
- Modify: `scripts/planets/earth.js`
- Modify: `scripts/planets/mars.js`
- Modify: `test/particle-builder.test.cjs`

**Interfaces:**
- Consumes: `PLANET_PARTICLE_CONFIG`, `ParticleBuilder.allocate`, `ParticleBuilder.build`, `ParticleBuilder.markReady`.
- Produces: one progressive static surface `THREE.Points` per rocky body and existing independent dynamic/outline/satellite layers.

- [ ] **Step 1: Add failing source-contract tests for rocky bodies**

For each file, assert it references its approved config, calls `ParticleBuilder.build`, updates `geometry.setDrawRange`, and marks readiness. Assert Venus no longer contains `new SimplexNoise('venus-atmosphere-flow')` inside `animate` and no longer calls `colBase.clone()` inside the 45,000-particle loop.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `node --test --test-name-pattern="rocky" test/particle-builder.test.cjs`

Expected: FAIL because the runtimes still build small synchronous arrays.

- [ ] **Step 3: Convert each surface to one preallocated geometry**

Use this exact lifecycle in each planet-owned `create*Surface` function, substituting the existing planet-specific radius/noise/color formulas inside `writeBatch`:

```js
const budget = PLANET_PARTICLE_CONFIG[planetName].surface;
const tiers = [budget, Math.floor(budget * 0.75), Math.floor(budget * 0.5), 250000];
const allocation = ParticleBuilder.allocate(tiers, (count) => ({
    positions: new Float32Array(count * 3),
    colors: new Float32Array(count * 3)
}));
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(allocation.value.positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(allocation.value.colors, 3));
geometry.setDrawRange(0, 0);
const points = new THREE.Points(geometry, surfaceMaterial);
surfaceGroup.add(points);

ParticleBuilder.build({
    total: allocation.count,
    readyCount: Math.min(250000, allocation.count),
    initialBatchSize: 10000,
    writeBatch(start, end) {
        for (let i = start; i < end; i++) sampleSurfaceParticle(i, allocation.value.positions, allocation.value.colors);
        geometry.attributes.position.updateRange = {offset: start * 3, count: (end - start) * 3};
        geometry.attributes.color.updateRange = {offset: start * 3, count: (end - start) * 3};
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
    },
    setDrawCount(count) { geometry.setDrawRange(0, count); },
    onReady() {
        renderer.render(scene, camera);
        ParticleBuilder.markReady({page: planetName});
    },
    onProgress(percent) { document.getElementById('particle-build-progress').textContent = `${percent}%`; },
    onComplete() { document.getElementById('particle-build-progress').textContent = 'READY'; },
    onError(error) { console.error(`[${planetName}] surface generation stopped`, error); }
});
```

Each `sampleSurfaceParticle` must copy the existing distribution exactly:

- Mercury: cratered gray surface and wireframe remain under `planetSpinGroup`; sodium tail remains dynamic and capped at 30,000.
- Venus: magma surface remains under `venusSurfaceGroup`; cloud layer remains separate at no more than 60,000.
- Earth: land/ocean surface remains under `earthSystemGroup`; clouds, LEO assets, Moon, tilt, and orbit radii remain unchanged.
- Mars: iron-oxide surface remains under `marsSurfaceGroup`; atmosphere, Phobos, and Deimos remain separate.

Call `ParticleBuilder.markReady({page: planetName})` exactly once from `onReady`, after the accumulated batches reach 250,000 particles and `renderer.render(scene, camera)` has completed.

- [ ] **Step 4: Remove duplicate initialization and resize work**

Delete the immediate `sharedTopoBackground.resize()` because `createTopoBackground()` already calls `resize()`. Keep `ResizeObserver` for `resizeScene`; the `window.resize` handler only calls `sharedTopoBackground.resize()`.

- [ ] **Step 5: Remove Venus hot-loop allocations**

Create the flow noise and base color once beside `cloudPoints`; reuse one `THREE.Color`, or write `r * brightness`, `g * brightness`, `b * brightness` directly. Keep the cloud animation visually equivalent.

- [ ] **Step 6: Run tests and syntax checks**

Run: `node --test test/*.test.cjs`

Run the first-party syntax sweep from Task 4.

Expected: PASS.

- [ ] **Step 7: Commit rocky-body migration**

```powershell
git add scripts/planets/mercury.js scripts/planets/venus.js scripts/planets/earth.js scripts/planets/mars.js test/particle-builder.test.cjs
git commit -m "feat: stream million-particle rocky surfaces"
```

---

### Task 6: Migrate Giant-Planet Surfaces and Ring Systems

**Files:**
- Modify: `scripts/planets/jupiter.js`
- Modify: `scripts/planets/saturn.js`
- Modify: `scripts/planets/uranus.js`
- Modify: `scripts/planets/neptune.js`
- Modify: `test/particle-builder.test.cjs`

**Interfaces:** Same builder contract as Task 5; rings and moons remain independent geometry.

- [ ] **Step 1: Add failing source-contract tests for giant planets**

Assert each runtime uses its exact `PLANET_PARTICLE_CONFIG` budget, a progressive surface builder, a draw range, and one readiness signal. Assert Saturn/Uranus ring creation remains a separate function and Neptune retains Triton/ring-arc creation.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `node --test --test-name-pattern="giant" test/particle-builder.test.cjs`

Expected: FAIL on the missing progressive calls.

- [ ] **Step 3: Apply the Task 5 lifecycle to each giant surface**

Keep exact body-specific sampling ownership:

- Jupiter: latitude bands, turbulent modulation, Great Red Spot, and `jupiterSpinGroup`; retain principal moon layouts and storm overlay within the 80,000 dynamic ceiling.
- Saturn: latitude bands and polar hexagon under `planetSpinGroup`; ring density and Titan/other moons stay separate from the 1,350,000 surface budget.
- Uranus: tilted atmosphere under `uranusSpinGroup`; dark rings and moons remain separate from the 1,200,000 surface budget.
- Neptune: blue band/storm surface under `planetSpinGroup`; ring arcs, minor moons, and Triton remain separate.

Use preallocated `Float32Array` attributes, incremental `setDrawRange`, integer progress updates, one readiness signal after the first rendered tranche, and one console error on failure.

- [ ] **Step 4: Remove duplicate resize and dead zoom state**

As in Task 5, remove immediate background redraws and duplicate `resizeScene` calls. Replace `currentZoom = updateInteraction(...)` with `updateInteraction(...)` where the returned number is never read, and initialize the camera from `INITIAL_ZOOM` directly.

- [ ] **Step 5: Run all tests and syntax checks**

Run: `node --test test/*.test.cjs`

Run the first-party syntax sweep.

Expected: PASS.

- [ ] **Step 6: Commit giant migration**

```powershell
git add scripts/planets/jupiter.js scripts/planets/saturn.js scripts/planets/uranus.js scripts/planets/neptune.js test/particle-builder.test.cjs
git commit -m "feat: stream million-particle giant surfaces"
```

---

### Task 7: Migrate the Sun and Eliminate Animation Allocations

**Files:**
- Modify: `scripts/planets/sun.js`
- Modify: `test/particle-builder.test.cjs`

**Interfaces:** Uses the same surface builder; corona, loops, and eruptions remain dynamic and total no more than 80,000 particles.

- [ ] **Step 1: Add a failing Sun contract/allocation test**

Assert the Sun uses the 1,600,000 surface budget, progressive draw range, and readiness signal. Extract the `animate` source substring and assert it does not contain `new THREE.Color` or `new THREE.Vector3`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test --test-name-pattern="Sun" test/particle-builder.test.cjs`

Expected: FAIL on both progressive generation and per-frame constructors.

- [ ] **Step 3: Split the Sun into a static million-particle photosphere and dynamic overlays**

Build the 1,600,000-point photosphere progressively with the existing spherical/noise/palette distribution frozen at its initial phase. Retain a separate dynamic surface overlay, corona, flare loops, and eruption system within the 80,000 dynamic ceiling. Signal readiness after the first 250,000 static particles render.

- [ ] **Step 4: Hoist all animation temporaries**

Define palette colors and scratch values once above `animate`:

```js
const colCore = new THREE.Color('#ffffff');
const colSurface = new THREE.Color('#ffb84d');
const colEdge = new THREE.Color('#cc4400');
const colSpot = new THREE.Color('#8a1c00');
const colEruptHot = new THREE.Color('#ffffff');
const colEruptMid = new THREE.Color('#ffcc00');
const colEruptCool = new THREE.Color('#8a1c00');
const scratchColor = new THREE.Color();
const directionToCenter = new THREE.Vector3();
```

Inside loops, replace constructors with `scratchColor.copy(...)` and `directionToCenter.set(-cx, -cy, -cz).normalize()`. Write color components immediately before the shared scratch object is reused.

- [ ] **Step 5: Run all tests and syntax checks**

Run: `node --test test/*.test.cjs`

Run the first-party syntax sweep.

Expected: PASS.

- [ ] **Step 6: Commit the Sun migration**

```powershell
git add scripts/planets/sun.js test/particle-builder.test.cjs
git commit -m "feat: stream the million-particle solar surface"
```

---

### Task 8: Runtime Profile Sampling and Recovery

**Files:**
- Modify: `scripts/core/particle-builder.js`
- Modify: `test/particle-builder.test.cjs`
- Modify: all nine `scripts/planets/*.js` runtime files

**Interfaces:**
- Produces: `ParticleBuilder.createFrameSampler({geometry, maxCount, setDynamicStride, sampleSize?})` returning `{sample(timestamp), profile, dynamicStride}`.
- Profile changes only move downward: high → balanced → low → recovery.

- [ ] **Step 1: Write failing frame-profile tests**

Use deterministic timestamps to assert the first slow sample window changes dynamic stride from 1 to 2 without reducing the surface. A second slow window lowers the draw profile. Assert recovery uses `geometry.setDrawRange(0, 250000)` and repeated good frames never raise the profile.

```js
test('frame sampler reduces dynamic cadence before static draw count', () => {
    const {api} = loadBuilder();
    const draws = [];
    const strides = [];
    const sampler = api.createFrameSampler({
        geometry: {setDrawRange: (start, count) => draws.push([start, count])},
        maxCount: 1_000_000,
        setDynamicStride: (stride) => strides.push(stride),
        sampleSize: 4
    });
    [0, 40, 80, 120, 160].forEach((time) => sampler.sample(time));
    assert.equal(sampler.profile, 'high');
    assert.equal(sampler.dynamicStride, 2);
    [200, 240, 280, 320].forEach((time) => sampler.sample(time));
    assert.equal(sampler.profile, 'recovery');
    assert.deepEqual(draws.at(-1), [0, 250_000]);
    [337, 354, 371, 388].forEach((time) => sampler.sample(time));
    assert.equal(sampler.profile, 'recovery');
    assert.deepEqual(strides, [2]);
});
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `node --test --test-name-pattern="frame profile" test/particle-builder.test.cjs`

Expected: FAIL because `createFrameSampler` does not exist.

- [ ] **Step 3: Implement one-way frame sampling**

Collect 120 frame deltas after initial readiness, discard deltas above 250 ms as tab/background pauses, calculate average FPS, and choose the next lower profile. Apply `visibleCount(maxCount, profile)` via `setDrawRange`; use the first slow sample window to reduce dynamic update cadence to every second frame and only lower the surface after the next slow window.

```js
function createFrameSampler(options) {
    const order = ['high', 'balanced', 'low', 'recovery'];
    const sampleSize = options.sampleSize || 120;
    let profile = 'high';
    let dynamicStride = 1;
    let lastTime = null;
    let deltas = [];

    function sample(timestamp) {
        if (lastTime !== null) {
            const delta = timestamp - lastTime;
            if (delta > 0 && delta <= 250) deltas.push(delta);
        }
        lastTime = timestamp;
        if (deltas.length < sampleSize) return;
        const fps = 1000 / (deltas.reduce((sum, value) => sum + value, 0) / deltas.length);
        deltas = [];
        if (fps >= 55) return;
        if (dynamicStride === 1) {
            dynamicStride = 2;
            options.setDynamicStride(2);
            return;
        }
        const candidate = fps < 30 ? 'recovery' : fps < 40 ? 'low' : fps < 50 ? 'balanced' : 'high';
        if (order.indexOf(candidate) > order.indexOf(profile)) {
            profile = candidate;
            options.geometry.setDrawRange(0, visibleCount(options.maxCount, profile));
        }
    }

    return {
        sample,
        get profile() { return profile; },
        get dynamicStride() { return dynamicStride; }
    };
}
```

- [ ] **Step 4: Call the sampler from each animation loop**

Create one sampler per page after the surface geometry exists. Call `sampler.sample(timestamp)` from the existing `animate(timestamp)` loop. Increment one frame counter and guard only dynamic attribute updates with `frame % sampler.dynamicStride === 0`; rotation, interaction, telemetry, and rendering continue every frame. Do not add a second animation loop.

- [ ] **Step 5: Run tests and syntax checks**

Run all Node tests and the first-party syntax sweep.

Expected: PASS.

- [ ] **Step 6: Commit adaptive profiles**

```powershell
git add scripts/core/particle-builder.js scripts/planets/*.js test/particle-builder.test.cjs
git commit -m "feat: adapt particle draw profiles to frame rate"
```

---

### Task 9: Browser Acceptance, Documentation, and Final Verification

**Files:**
- Modify: `docs/runtime-refactor-notes.md`

**Interfaces:** Documents the completed runtime contract and exact verification commands.

- [ ] **Step 1: Start a local static server for repeatable browser checks**

Run: `python -m http.server 4173`

Expected: server listens on `http://127.0.0.1:4173/` without changing repository files.

- [ ] **Step 2: Verify all ten entries in a real browser**

Open `index.html`, then visit Sun, Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune. For every page record:

- transition curtain remains opaque until the first particle tranche;
- no white frame during forward or return navigation;
- progress advances from 0% to READY;
- drag, zoom, telemetry, outline, atmosphere, rings, and satellites still work;
- console contains no uncaught error or repeated allocation warning;
- high profile approaches 60 FPS at 1080p, or the page falls to a lower profile while remaining at least 30 FPS.

- [ ] **Step 3: Verify direct local-file compatibility**

Open `index.html` directly from Explorer and navigate to at least Earth, Saturn, and Sun. Confirm no worker/CORS errors, because the implementation uses only browser globals and same-page scripts.

- [ ] **Step 4: Update runtime documentation**

Document:

- `ParticleBuilder` public methods and the readiness event;
- approved particle budgets;
- the static-surface/dynamic-overlay rule;
- `node --test test/*.test.cjs` and the syntax command;
- browser acceptance at HTTP and `file://` entry points.

- [ ] **Step 5: Run fresh final verification**

Run: `node --test test/*.test.cjs`

Run: `Get-ChildItem scripts -Recurse -Filter *.js | Where-Object FullName -notmatch '\\vendor\\' | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE) { exit $LASTEXITCODE } }`

Run: `git diff --check HEAD`

Expected: 0 test failures, 0 syntax failures, and no whitespace errors.

- [ ] **Step 6: Commit documentation and verified acceptance notes**

```powershell
git add docs/runtime-refactor-notes.md
git commit -m "docs: record million-particle runtime verification"
```

---

## Completion Gate

Before claiming completion, compare the implementation against every acceptance criterion in the linked spec. Do not substitute source inspection for the real browser checks, and do not claim a performance tier without a fresh 1080p measurement from that tier.
