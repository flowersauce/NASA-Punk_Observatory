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

function loadRockyRuntime(planetName) {
    const budgets = {mercury: 1_000_000, venus: 1_200_000, earth: 1_250_000, mars: 1_050_000};
    const allocations = [];
    const builds = [];
    const readiness = [];
    const drawRanges = [];
    const renderEvents = [];
    const animationCallbacks = [];
    const noiseLabels = [];
    let colorClones = 0;

    class Object3D {
        constructor() {
            this.children = [];
            this.rotation = {x: 0, y: 0, z: 0};
            this.position = {x: 0, y: 0, z: 0};
            this.position.set = (x, y, z) => {
                this.position.x = x;
                this.position.y = y;
                this.position.z = z;
            };
        }

        add(...objects) {
            this.children.push(...objects);
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

    class BufferAttribute {
        constructor(array, itemSize) {
            this.array = array;
            this.itemSize = itemSize;
            this.needsUpdate = false;
            this.updateRange = {offset: 0, count: -1};
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
    }

    class SimplexNoise {
        constructor(label) {
            noiseLabels.push(label);
        }

        noise3D() {
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
    class Points extends Object3D { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; } }
    class Line extends Object3D {}
    class LineSegments extends Object3D {}
    class Mesh extends Object3D {}

    const THREE = {
        Scene: class extends Object3D {},
        Group: class extends Object3D {},
        PerspectiveCamera,
        WebGLRenderer,
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
        Mesh,
        BoxGeometry: class extends BufferGeometry {},
        MeshBasicMaterial,
        IcosahedronGeometry: SphereGeometry,
        AdditiveBlending: 2
    };

    const canvasContainer = {appendChild() {}};
    const progress = {textContent: '0%'};
    const document = {
        getElementById(id) {
            if (id === 'canvas-container') return canvasContainer;
            if (id === 'particle-build-progress') return progress;
            return null;
        },
        querySelector() { return {}; }
    };
    const window = {
        devicePixelRatio: 1,
        addEventListener() {},
        requestAnimationFrame(callback) {
            animationCallbacks.push(callback);
            return animationCallbacks.length;
        }
    };
    window.window = window;

    const ParticleBuilder = {
        allocate(counts, factory) {
            allocations.push(counts);
            return {count: counts[0], value: factory(1)};
        },
        build(options) {
            builds.push(options);
            options.writeBatch(0, 1);
            return {cancel() {}};
        },
        markReady(detail) {
            readiness.push(detail);
            renderEvents.push('ready');
        }
    };
    const sandbox = {
        window,
        document,
        THREE,
        SimplexNoise,
        ParticleBuilder,
        PLANET_PARTICLE_CONFIG: {[planetName]: {surface: budgets[planetName]}},
        DisplayArea: {getSize: () => ({width: 100, height: 100})},
        createTopoBackground: () => ({resize() {}}),
        initInteraction() {},
        updateInteraction: (_group, _camera, _display, zoom) => zoom,
        updatePlanetTelemetry() {},
        InteractionState: {},
        requestAnimationFrame: window.requestAnimationFrame,
        console
    };

    vm.runInNewContext(fs.readFileSync(`scripts/planets/${planetName}.js`, 'utf8'), sandbox, {
        filename: `scripts/planets/${planetName}.js`
    });

    return {allocations, builds, readiness, drawRanges, renderEvents, animationCallbacks, noiseLabels,
        get colorClones() { return colorClones; }};
}

test('rocky runtimes start configured progressive surface builds', () => {
    const budgets = {mercury: 1_000_000, venus: 1_200_000, earth: 1_250_000, mars: 1_050_000};
    for (const planetName of Object.keys(budgets)) {
        const env = loadRockyRuntime(planetName);
        const budget = budgets[planetName];
        assert.deepEqual(Array.from(env.allocations[0]), [budget, Math.floor(budget * 0.75), Math.floor(budget * 0.5), 250000]);
        assert.equal(env.builds.length, 1, `${planetName} build count`);
        assert.equal(env.builds[0].total, budget, `${planetName} total`);
        assert.equal(env.builds[0].readyCount, 250000, `${planetName} ready count`);
        assert.equal(env.builds[0].initialBatchSize, 10000, `${planetName} batch size`);
        env.builds[0].setDrawCount(123);
        assert.deepEqual(env.drawRanges.at(-1), [0, 123], `${planetName} draw range`);
        env.renderEvents.length = 0;
        env.builds[0].onReady();
        assert.deepEqual(env.renderEvents, ['render', 'ready'], `${planetName} readiness order`);
        assert.equal(env.readiness.length, 1, `${planetName} readiness count`);
        assert.equal(env.readiness[0].page, planetName);
    }
});

test('venus reuses flow noise and cloud colors during animation', () => {
    const env = loadRockyRuntime('venus');
    const flowNoiseCount = env.noiseLabels.filter((label) => label === 'venus-atmosphere-flow').length;
    const cloneCount = env.colorClones;
    env.animationCallbacks[0]();
    assert.equal(env.noiseLabels.filter((label) => label === 'venus-atmosphere-flow').length, flowNoiseCount);
    assert.equal(env.colorClones, cloneCount);
});
