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

test('visibleCount selects approved profile counts', () => {
    const {api} = loadBuilder();
    assert.equal(api.visibleCount(1_600_000, 'high'), 1_600_000);
    assert.equal(api.visibleCount(1_600_000, 'balanced'), 1_200_000);
    assert.equal(api.visibleCount(1_600_000, 'low'), 800_000);
    assert.equal(api.visibleCount(1_600_000, 'recovery'), 250_000);
});

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

const ROCKY_BUDGETS = {mercury: 1_000_000, venus: 1_200_000, earth: 1_250_000, mars: 1_050_000};
const GIANT_BUDGETS = {jupiter: 1_500_000, saturn: 1_350_000, uranus: 1_200_000, neptune: 1_200_000};
const SUN_BUDGET = 1_600_000;
const DYNAMIC_CEILINGS = {sun: 80_000, jupiter: 80_000, saturn: 60_000, uranus: 40_000, neptune: 60_000};

function loadPlanetRuntime(planetName, {allocationCount = 300000} = {}) {
    const allocations = [];
    const builds = [];
    const readiness = [];
    const readinessDrawCounts = [];
    const drawRanges = [];
    const renderEvents = [];
    const animationCallbacks = [];
    const builderCallbacks = [];
    const progressValues = [];
    const completionEvents = [];
    const errors = [];
    const noiseLabels = [];
    const samplers = [];
    const surfacePoints = [];
    const points = [];
    const lines = [];
    let colorClones = 0;
    let clock = 0;

    class Object3D {
        constructor() {
            this.children = [];
            this.rotation = {x: 0, y: 0, z: 0};
            this.position = {x: 0, y: 0, z: 0};
            this.scale = {
                x: 1, y: 1, z: 1,
                set: (x, y, z) => {
                    this.scale.x = x;
                    this.scale.y = y;
                    this.scale.z = z;
                }
            };
            this.position.set = (x, y, z) => {
                this.position.x = x;
                this.position.y = y;
                this.position.z = z;
            };
        }

        add(...objects) {
            objects.forEach((object) => { object.parent = this; });
            this.children.push(...objects);
        }

        clear() {
            this.children.length = 0;
        }

        computeLineDistances() {}
    }

    class BufferGeometry {
        constructor() {
            this.attributes = {};
        }

        setAttribute(name, attribute) {
            this.attributes[name] = attribute;
            return this;
        }

        setDrawRange(start, count) {
            this.drawRange = {start, count};
            drawRanges.push([start, count]);
        }

        setFromPoints(points) {
            this.setAttribute('position', new BufferAttribute(new Float32Array(points.length * 3), 3));
            return this;
        }
    }

    class Vector3 {
        constructor(x = 0, y = 0, z = 0) {
            this.set(x, y, z);
        }

        set(x, y, z) {
            this.x = x;
            this.y = y;
            this.z = z;
            return this;
        }

        setFromSphericalCoords(radius, phi, theta) {
            return this.set(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.sin(phi) * Math.sin(theta),
                radius * Math.cos(phi)
            );
        }

        copy(vector) {
            return this.set(vector.x, vector.y, vector.z);
        }

        clone() {
            return new Vector3(this.x, this.y, this.z);
        }

        add(vector) {
            return this.set(this.x + vector.x, this.y + vector.y, this.z + vector.z);
        }

        addScaledVector(vector, scalar) {
            return this.set(
                this.x + vector.x * scalar,
                this.y + vector.y * scalar,
                this.z + vector.z * scalar
            );
        }

        multiplyScalar(scalar) {
            return this.set(this.x * scalar, this.y * scalar, this.z * scalar);
        }

        normalize() {
            const length = Math.hypot(this.x, this.y, this.z) || 1;
            return this.multiplyScalar(1 / length);
        }

        lerp(vector, alpha) {
            return this.set(
                this.x + (vector.x - this.x) * alpha,
                this.y + (vector.y - this.y) * alpha,
                this.z + (vector.z - this.z) * alpha
            );
        }
    }

    class BufferAttribute {
        constructor(array, itemSize) {
            this.array = array;
            this.itemSize = itemSize;
            this.needsUpdate = false;
            this.updateRanges = [];
            this._updateRange = {offset: 0, count: -1};
            Object.defineProperty(this, 'updateRange', {
                enumerable: true,
                get: () => this._updateRange,
                set: (range) => {
                    this._updateRange = range;
                    this.updateRanges.push(range);
                }
            });
        }
    }

    class Float32BufferAttribute extends BufferAttribute {
        constructor(array, itemSize) {
            super(array instanceof Float32Array ? array : new Float32Array(array), itemSize);
        }
    }

    class Color {
        constructor(value = 0) {
            this.set(value);
        }

        set(value) {
            if (typeof value === 'string' && value.startsWith('#')) {
                const numeric = Number.parseInt(value.slice(1), 16);
                this.r = ((numeric >> 16) & 255) / 255;
                this.g = ((numeric >> 8) & 255) / 255;
                this.b = (numeric & 255) / 255;
            } else if (typeof value === 'number') {
                this.r = ((value >> 16) & 255) / 255;
                this.g = ((value >> 8) & 255) / 255;
                this.b = (value & 255) / 255;
            } else {
                this.r = this.g = this.b = 0;
            }
            return this;
        }

        copy(color) {
            this.r = color.r;
            this.g = color.g;
            this.b = color.b;
            return this;
        }

        clone() {
            colorClones++;
            return new Color().copy(this);
        }

        lerp(color, alpha) {
            this.r += (color.r - this.r) * alpha;
            this.g += (color.g - this.g) * alpha;
            this.b += (color.b - this.b) * alpha;
            return this;
        }

        multiplyScalar(scalar) {
            this.r *= scalar;
            this.g *= scalar;
            this.b *= scalar;
            return this;
        }

        addScalar(scalar) {
            this.r += scalar;
            this.g += scalar;
            this.b += scalar;
            return this;
        }
    }

    class SimplexNoise {
        constructor(label) {
            noiseLabels.push(label);
        }

        noise3D() {
            return 0;
        }

        noise2D() {
            return 0;
        }

        noise4D() {
            return 0;
        }
    }

    class EllipseCurve {
        getPoints(count) {
            return new Array(count + 1).fill({x: 0, y: 0});
        }
    }

    class SphereGeometry extends BufferGeometry {
        scale() {}
    }

    class CubicBezierCurve3 {
        getPoints(count) {
            return new Array(count + 1).fill(null).map(() => new Vector3());
        }
    }

    class WebGLRenderer {
        constructor() {
            this.domElement = {};
        }

        setSize() {}
        setPixelRatio() {}
        render() { renderEvents.push('render'); }
    }

    class PerspectiveCamera extends Object3D {
        updateProjectionMatrix() {}
    }

    class Material { constructor(options) { this.options = options; } }
    class PointsMaterial extends Material {}
    class LineBasicMaterial extends Material {}
    class LineDashedMaterial extends Material {}
    class MeshBasicMaterial extends Material {}
    class Points extends Object3D {
        constructor(geometry, material) {
            super();
            this.geometry = geometry;
            this.material = material;
            surfacePoints.push(this);
            points.push(this);
        }
    }
    class Line extends Object3D {
        constructor(geometry, material) {
            super();
            this.geometry = geometry;
            this.material = material;
            lines.push(this);
        }
    }
    class LineSegments extends Object3D {}
    class Mesh extends Object3D {}
    class ShaderMaterial extends Material {}

    const THREE = {
        Scene: class extends Object3D {},
        Group: class extends Object3D {},
        PerspectiveCamera,
        WebGLRenderer,
        Vector3,
        BufferGeometry,
        BufferAttribute,
        Float32BufferAttribute,
        Color,
        PointsMaterial,
        Points,
        WireframeGeometry: class extends BufferGeometry {},
        SphereGeometry,
        LineBasicMaterial,
        LineDashedMaterial,
        Line,
        LineSegments,
        EllipseCurve,
        CubicBezierCurve3,
        Mesh,
        BoxGeometry: class extends BufferGeometry {},
        MeshBasicMaterial,
        IcosahedronGeometry: SphereGeometry,
        ShaderMaterial,
        AdditiveBlending: 2,
        NormalBlending: 1,
        MathUtils: {clamp: (value, min, max) => Math.min(max, Math.max(min, value))}
    };

    const canvasContainer = {appendChild() {}};
    let progressText = '0%';
    const progress = {};
    Object.defineProperty(progress, 'textContent', {
        get: () => progressText,
        set: (value) => {
            progressText = value;
            progressValues.push(value);
        }
    });
    const document = {
        getElementById(id) {
            if (id === 'canvas-container') return canvasContainer;
            if (id === 'particle-build-progress') return progress;
            return null;
        },
        querySelector() { return {}; }
    };

    function requestAnimationFrame(callback) {
        if (callback.name === 'animate') animationCallbacks.push(callback);
        else builderCallbacks.push(callback);
        return animationCallbacks.length + builderCallbacks.length;
    }

    const window = {
        devicePixelRatio: 1,
        addEventListener() {},
        dispatchEvent(event) {
            if (event.type === 'observatory:ready') {
                readiness.push(event.detail);
                readinessDrawCounts.push(surfacePoints[0].geometry.drawRange.count);
                renderEvents.push('ready');
            }
        },
        requestAnimationFrame,
    };
    window.window = window;

    const runtimeConsole = {
        error(...args) { errors.push(args); },
        log() {},
        warn() {}
    };
    const sandbox = {
        window,
        document,
        THREE,
        SimplexNoise,
        PLANET_PARTICLE_CONFIG: {[planetName]: {surface: planetName === 'sun' ? SUN_BUDGET : ROCKY_BUDGETS[planetName] || GIANT_BUDGETS[planetName]}},
        DisplayArea: {getSize: () => ({width: 100, height: 100})},
        createTopoBackground: () => ({resize() {}}),
        initInteraction() {},
        updateInteraction: (_group, _camera, _display, zoom) => zoom,
        updatePlanetTelemetry() {},
        InteractionState: {},
        requestAnimationFrame,
        performance: {now: () => ++clock},
        CustomEvent: class {
            constructor(type, init) {
                this.type = type;
                this.detail = init.detail;
            }
        },
        console: runtimeConsole
    };

    vm.runInNewContext(fs.readFileSync('scripts/core/particle-builder.js', 'utf8'), sandbox, {
        filename: 'scripts/core/particle-builder.js'
    });
    const ParticleBuilder = sandbox.ParticleBuilder = window.ParticleBuilder;
    const originalAllocate = ParticleBuilder.allocate;
    ParticleBuilder.allocate = (counts, factory) => {
        allocations.push(Array.from(counts));
        const allocation = originalAllocate([allocationCount], factory);
        return allocation;
    };
    const originalCreateFrameSampler = ParticleBuilder.createFrameSampler;
    ParticleBuilder.createFrameSampler = (options) => {
        const sampler = originalCreateFrameSampler(options);
        samplers.push({options, sampler});
        return sampler;
    };
    const originalBuild = ParticleBuilder.build;
    ParticleBuilder.build = (options) => {
        builds.push(options);
        const onComplete = options.onComplete;
        options.onComplete = () => {
            completionEvents.push(true);
            onComplete();
        };
        const onError = options.onError;
        options.onError = (error) => {
            errors.push(error);
            onError(error);
        };
        return originalBuild(options);
    };

    vm.runInNewContext(fs.readFileSync(`scripts/planets/${planetName}.js`, 'utf8'), sandbox, {
        filename: `scripts/planets/${planetName}.js`
    });

    return {
        allocations,
        builds,
        readiness,
        readinessDrawCounts,
        drawRanges,
        renderEvents,
        animationCallbacks,
        builderCallbacks,
        progressValues,
        completionEvents,
        errors,
        noiseLabels,
        samplers,
        points,
        lines,
        surface: surfacePoints[0],
        allocationCount,
        dynamicCeiling: DYNAMIC_CEILINGS[planetName],
        driveBuild() {
            while (builderCallbacks.length) builderCallbacks.shift()();
        },
        get colorClones() { return colorClones; }
    };
}

const loadRockyRuntime = loadPlanetRuntime;

test('rocky runtimes complete progressive surface builds within bounds', () => {
    for (const planetName of Object.keys(ROCKY_BUDGETS)) {
        const env = loadRockyRuntime(planetName);
        const budget = ROCKY_BUDGETS[planetName];
        assert.deepEqual(env.allocations[0], [budget, Math.floor(budget * 0.75), Math.floor(budget * 0.5), 250000]);
        assert.equal(env.builds.length, 1, `${planetName} build count`);
        assert.equal(env.builds[0].total, env.allocationCount, `${planetName} total`);
        assert.equal(env.builds[0].readyCount, 250000, `${planetName} ready count`);
        assert.equal(env.builds[0].initialBatchSize, 10000, `${planetName} batch size`);
        env.renderEvents.length = 0;
        env.driveBuild();

        assert.equal(env.readiness.length, 1, `${planetName} readiness count`);
        assert.equal(env.readiness[0].page, planetName);
        assert.ok(env.readinessDrawCounts[0] >= 250000, `${planetName} readiness threshold`);
        assert.ok(env.readinessDrawCounts[0] <= budget, `${planetName} readiness bound`);
        assert.deepEqual(env.renderEvents.slice(0, 2), ['render', 'ready'], `${planetName} render order`);
        assert.equal(env.completionEvents.length, 1, `${planetName} completion count`);
        assert.ok(env.progressValues.includes('100%'), `${planetName} progress completion`);
        assert.equal(env.progressValues.at(-1), 'READY', `${planetName} completion status`);
        assert.equal(env.errors.length, 0, `${planetName} error count`);

        assert.deepEqual(env.drawRanges[0], [0, 0], `${planetName} initial draw range`);
        assert.equal(env.drawRanges.at(-1)[1], env.allocationCount, `${planetName} final draw range`);
        assert.ok(env.drawRanges.every(([, count]) => count >= 0 && count <= env.allocationCount), `${planetName} draw bounds`);
        assert.ok(env.drawRanges.every((range, index) => index === 0 || range[1] >= env.drawRanges[index - 1][1]), `${planetName} draw progression`);

        const position = env.surface.geometry.attributes.position;
        const color = env.surface.geometry.attributes.color;
        assert.equal(position.array.length, env.allocationCount * 3, `${planetName} position bounds`);
        assert.equal(color.array.length, env.allocationCount * 3, `${planetName} color bounds`);
        assert.ok(position.updateRanges.length > 0, `${planetName} position update ranges`);
        assert.ok(color.updateRanges.length > 0, `${planetName} color update ranges`);
        for (const attribute of [position, color]) {
            assert.ok(attribute.updateRanges.every(({offset, count}) => offset >= 0 && count > 0 && offset + count <= env.allocationCount * 3), `${planetName} attribute update bounds`);
            const last = attribute.updateRanges.at(-1);
            assert.equal(last.offset + last.count, env.allocationCount * 3, `${planetName} attribute final update`);
            assert.equal(attribute.needsUpdate, true, `${planetName} attribute update flag`);
            assert.ok(attribute.array.every(Number.isFinite), `${planetName} finite attribute values`);
        }
    }
});

test('giant runtimes complete progressive surfaces without consuming auxiliary geometry budgets', () => {
    for (const planetName of Object.keys(GIANT_BUDGETS)) {
        const env = loadPlanetRuntime(planetName);
        const budget = GIANT_BUDGETS[planetName];
        assert.deepEqual(env.allocations[0], [budget, Math.floor(budget * 0.75), Math.floor(budget * 0.5), 250000]);
        assert.equal(env.builds.length, 1, `${planetName} build count`);
        assert.equal(env.builds[0].total, env.allocationCount, `${planetName} total`);
        assert.equal(env.builds[0].readyCount, 250000, `${planetName} ready count`);
        assert.equal(env.builds[0].initialBatchSize, 10000, `${planetName} batch size`);

        env.renderEvents.length = 0;
        env.driveBuild();

        assert.equal(env.readiness.length, 1, `${planetName} readiness count`);
        assert.equal(env.readiness[0].page, planetName);
        assert.ok(env.readinessDrawCounts[0] >= 250000, `${planetName} readiness threshold`);
        assert.ok(env.readinessDrawCounts[0] <= budget, `${planetName} readiness bound`);
        assert.deepEqual(env.renderEvents.slice(0, 2), ['render', 'ready'], `${planetName} render order`);
        assert.equal(env.completionEvents.length, 1, `${planetName} completion count`);
        assert.ok(env.progressValues.includes('100%'), `${planetName} progress completion`);
        assert.equal(env.progressValues.at(-1), 'READY', `${planetName} completion status`);
        assert.equal(env.errors.length, 0, `${planetName} error count`);

        assert.deepEqual(env.drawRanges[0], [0, 0], `${planetName} initial draw range`);
        assert.equal(env.drawRanges.at(-1)[1], env.allocationCount, `${planetName} final draw range`);
        assert.ok(env.drawRanges.every(([, count]) => count >= 0 && count <= env.allocationCount), `${planetName} draw bounds`);
        assert.ok(env.drawRanges.every((range, index) => index === 0 || range[1] >= env.drawRanges[index - 1][1]), `${planetName} draw progression`);

        const position = env.surface.geometry.attributes.position;
        const color = env.surface.geometry.attributes.color;
        assert.equal(position.array.length, env.allocationCount * 3, `${planetName} position bounds`);
        assert.equal(color.array.length, env.allocationCount * 3, `${planetName} color bounds`);
        for (const attribute of [position, color]) {
            assert.ok(attribute.updateRanges.length > 0, `${planetName} attribute update ranges`);
            assert.ok(attribute.updateRanges.every(({offset, count}) => offset >= 0 && count > 0 && offset + count <= env.allocationCount * 3), `${planetName} attribute update bounds`);
            const last = attribute.updateRanges.at(-1);
            assert.equal(last.offset + last.count, env.allocationCount * 3, `${planetName} attribute final update`);
            assert.equal(attribute.needsUpdate, true, `${planetName} attribute update flag`);
            assert.ok(attribute.array.every(Number.isFinite), `${planetName} finite attribute values`);
        }

        const auxiliaryCounts = env.points.slice(1).map((point) =>
            (point.geometry.attributes.position?.array.length || 0) / 3);
        assert.ok(auxiliaryCounts.some((count) => count > 0), `${planetName} auxiliary geometry retained`);
        assert.ok(auxiliaryCounts.every((count) => count <= env.dynamicCeiling), `${planetName} auxiliary particle ceiling`);
        assert.ok(env.points.slice(1).some((point) => point.parent !== env.surface.parent), `${planetName} auxiliary geometry is independent`);
    }
});

test('Sun streams its million-particle photosphere without animate allocations', () => {
    const source = fs.readFileSync('scripts/planets/sun.js', 'utf8');
    const animateSource = source.slice(source.indexOf('function animate()'));
    assert.doesNotMatch(animateSource, /new THREE\.(Color|Vector3)/);

    const env = loadPlanetRuntime('sun');
    assert.deepEqual(env.allocations[0], [SUN_BUDGET, Math.floor(SUN_BUDGET * 0.75), Math.floor(SUN_BUDGET * 0.5), 250000]);
    assert.equal(env.builds.length, 1, 'Sun build count');
    assert.equal(env.builds[0].total, env.allocationCount, 'Sun total');
    assert.equal(env.builds[0].readyCount, 250000, 'Sun ready count');
    assert.equal(env.builds[0].initialBatchSize, 10000, 'Sun batch size');

    env.renderEvents.length = 0;
    env.driveBuild();

    assert.equal(env.readiness.length, 1, 'Sun readiness count');
    assert.equal(env.readiness[0].page, 'sun');
    assert.ok(env.readinessDrawCounts[0] >= 250000, 'Sun readiness threshold');
    assert.ok(env.readinessDrawCounts[0] <= SUN_BUDGET, 'Sun readiness bound');
    assert.deepEqual(env.renderEvents.slice(0, 2), ['render', 'ready'], 'Sun render order');
    assert.equal(env.completionEvents.length, 1, 'Sun completion count');
    assert.equal(env.progressValues.at(-1), 'READY', 'Sun completion status');

    const surface = env.surface.geometry;
    assert.equal(surface.attributes.position.array.length, env.allocationCount * 3, 'Sun position bounds');
    assert.equal(surface.attributes.color.array.length, env.allocationCount * 3, 'Sun color bounds');
    assert.equal(env.drawRanges[0][1], 0, 'Sun starts hidden');
    assert.equal(env.drawRanges.at(-1)[1], env.allocationCount, 'Sun final draw range');
    assert.ok(env.points.slice(1).every((point) =>
        (point.geometry.attributes.position?.array.length || 0) / 3 <= env.dynamicCeiling), 'Sun dynamic particle ceiling');
});

test('saturn keeps its polar hexagon as static geometry under the spin group', () => {
    const env = loadPlanetRuntime('saturn');
    const hexagons = env.lines.filter((line) => line.geometry.attributes.position?.array.length === 21);
    assert.equal(hexagons.length, 1, 'one closed six-vertex polar hexagon');
    assert.equal(hexagons[0].parent, env.surface.parent, 'polar hexagon shares planetSpinGroup with the surface');
    assert.equal(hexagons[0].geometry.attributes.position.needsUpdate, false, 'polar hexagon remains static');
});

test('earth fills non-land samples with spherical ocean points', () => {
    const env = loadRockyRuntime('earth');
    env.driveBuild();
    const positions = env.surface.geometry.attributes.position.array;
    const colors = env.surface.geometry.attributes.color.array;
    const ocean = [0x1a / 255, 0x2b / 255, 0x4a / 255];
    let allSpherical = true;
    for (let i = 0; i < positions.length; i += 3) {
        const radius = Math.hypot(positions[i], positions[i + 1], positions[i + 2]);
        if (radius <= 4.9) {
            allSpherical = false;
            break;
        }
    }
    assert.equal(allSpherical, true, 'earth non-land positions remain spherical and non-zero');
    assert.equal(colors.every((value, index) => Math.abs(value - ocean[index % 3]) < 1e-6), true, 'earth non-land slots use ocean color');
});

test('venus creates no per-particle cloud clones during initialization or animation', () => {
    const env = loadRockyRuntime('venus');
    assert.equal(env.colorClones, 0, 'initialization color clones');
    const flowNoiseCount = env.noiseLabels.filter((label) => label === 'venus-atmosphere-flow').length;
    const cloneCount = env.colorClones;
    env.animationCallbacks[0]();
    assert.equal(env.noiseLabels.filter((label) => label === 'venus-atmosphere-flow').length, flowNoiseCount);
    assert.equal(env.colorClones, cloneCount);
});

test('every planet runtime samples profile state in its existing animation loop', () => {
    for (const planetName of [...Object.keys(ROCKY_BUDGETS), ...Object.keys(GIANT_BUDGETS), 'sun']) {
        const env = loadPlanetRuntime(planetName);
        assert.equal(env.samplers.length, 1, `${planetName} sampler count`);
        const sampler = env.samplers[0].sampler;
        const sampled = [];
        const sample = sampler.sample;
        sampler.sample = (time) => {
            sampled.push(time);
            return sample(time);
        };
        const tick = (time) => {
            const callback = env.animationCallbacks.shift();
            assert.equal(typeof callback, 'function', `${planetName} animation callback`);
            callback(time);
        };

        tick(16);
        assert.deepEqual(sampled, [16], `${planetName} frame sample`);
    }
});

test('particle builder reports a batch error without completing', () => {
    const {api} = loadBuilder();
    const queue = [];
    const errors = [];
    let completions = 0;
    api.build({
        total: 300000,
        readyCount: 250000,
        initialBatchSize: 10000,
        writeBatch: () => { throw new Error('sample failed'); },
        setDrawCount: () => {},
        onComplete: () => completions++,
        onError: (error) => errors.push(error.message),
        schedule: (callback) => queue.push(callback)
    });
    queue.shift()();
    assert.deepEqual(errors, ['sample failed']);
    assert.equal(completions, 0);
});
