const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const planetNames = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

function loadSurface()
{
    const callbacks = [];
    const fakeThree = {
        BufferGeometry: class
        {
            constructor()
            {
                this.attributes = {};
                this.drawRange = [0, 0];
            }

            setAttribute(name, attribute)
            {
                this.attributes[name] = attribute;
            }

            setDrawRange(start, count)
            {
                this.drawRange = [start, count];
            }
        },
        BufferAttribute: class
        {
            constructor(array, itemSize)
            {
                this.array = array;
                this.itemSize = itemSize;
                this.needsUpdate = false;
                this.updateRange = {offset: 0, count: 0};
            }
        },
        Points: class
        {
            constructor(geometry, material)
            {
                this.geometry = geometry;
                this.material = material;
            }
        }
    };
    const context = {
        console,
        window: {},
        requestIdleCallback: (callback) => callbacks.push(callback),
        requestAnimationFrame: (callback) => callbacks.push(callback)
    };
    vm.runInNewContext(
        fs.readFileSync(path.join(root, 'scripts/core/particle-surface.js'), 'utf8'),
        context
    );

    return {
        api: context.window.ParticleSurface,
        fakeThree,
        flush()
        {
            while (callbacks.length)
            {
                callbacks.shift()();
            }
        }
    };
}

test('builds one fixed 320000-particle surface progressively', () =>
{
    const {api, flush, fakeThree} = loadSurface();
    let samples = 0;
    const result = api.build({
        THREE: fakeThree,
        parent: {add() {}},
        material: {},
        sample() { samples++; }
    });

    assert.equal(api.SURFACE_PARTICLE_COUNT, 320000);
    assert.equal(samples, 40000);
    assert.deepEqual(result.geometry.drawRange, [0, 40000]);
    flush();
    assert.equal(samples, 320000);
    assert.deepEqual(result.geometry.drawRange, [0, 320000]);
    assert.equal(result.geometry.attributes.position.updateRange.offset, 0);
    assert.equal(result.geometry.attributes.position.updateRange.count, 320000 * 3);
    assert.equal(result.geometry.attributes.color.updateRange.offset, 0);
    assert.equal(result.geometry.attributes.color.updateRange.count, 320000 * 3);
});

test('cancel stops later surface batches', () =>
{
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

test('reports initial generation errors without scheduling more work', () =>
{
    const {api, flush, fakeThree} = loadSurface();
    let samples = 0;
    let errors = 0;
    const result = api.build({
        THREE: fakeThree,
        parent: {add() {}},
        material: {},
        sample() {
            samples++;
            throw new Error('sample failed');
        },
        onError() { errors++; }
    });
    flush();
    assert.equal(samples, 1);
    assert.equal(errors, 1);
    assert.deepEqual(result.geometry.drawRange, [0, 0]);
});

test('reports setup errors and returns a safe handle without scheduling', () =>
{
    const {api, flush, fakeThree} = loadSurface();
    fakeThree.BufferGeometry = class
    {
        constructor()
        {
            throw new Error('setup failed');
        }
    };
    let errors = 0;
    let scheduled = 0;
    const result = api.build({
        THREE: fakeThree,
        parent: {add() {}},
        material: {},
        sample() {},
        schedule() { scheduled++; },
        onError() { errors++; }
    });
    flush();
    assert.equal(errors, 1);
    assert.equal(scheduled, 0);
    assert.equal(result.geometry, null);
    assert.equal(result.points, null);
    assert.doesNotThrow(() => result.cancel());
});

test('planet entries load particle surface before config and runtime', () =>
{
    for (const name of planetNames)
    {
        const html = fs.readFileSync(path.join(root, `${name}.html`), 'utf8');
        const helper = html.indexOf('./scripts/core/particle-surface.js');
        const config = html.indexOf('./scripts/planets/config.js');
        const runtime = html.indexOf(`./scripts/planets/${name}.js`);
        assert.ok(helper >= 0 && helper < config && config < runtime, name);
    }
});

test('all planet renderers cap DPR at 1.5', () =>
{
    for (const name of planetNames)
    {
        const source = fs.readFileSync(path.join(root, 'scripts/planets', `${name}.js`), 'utf8');
        assert.match(source, /setPixelRatio\(Math\.min\(window\.devicePixelRatio, 1\.5\)\)/, name);
    }
});

test('Mercury Earth and Mars use the fixed surface builder', () =>
{
    for (const name of ['mercury', 'earth', 'mars'])
    {
        const source = fs.readFileSync(path.join(root, 'scripts/planets', `${name}.js`), 'utf8');
        assert.match(source, /ParticleSurface\.build\(/, name);
        assert.doesNotMatch(source, /const (particleCount|landParticles|surfaceParticles) = (45000|50000|60000)/, name);
    }
});

test('Venus uses fixed surface and no CPU cloud hot loop', () =>
{
    const source = fs.readFileSync(path.join(root, 'scripts/planets/venus.js'), 'utf8');
    const animate = source.slice(source.indexOf('function animate'));
    assert.match(source, /ParticleSurface\.build\(/);
    assert.match(source, /new THREE\.ShaderMaterial\(/);
    assert.doesNotMatch(animate, /new SimplexNoise|new THREE\.Color|needsUpdate/);
    assert.match(source, /const cloudParticles = 40000/);
});

test('giant planets use fixed surfaces without CPU storm uploads', () =>
{
    for (const name of ['jupiter', 'saturn', 'uranus', 'neptune'])
    {
        const source = fs.readFileSync(path.join(root, 'scripts/planets', `${name}.js`), 'utf8');
        assert.match(source, /ParticleSurface\.build\(/, name);
    }
    const jupiterAnimate = fs.readFileSync(path.join(root, 'scripts/planets/jupiter.js'), 'utf8').split('function animate')[1];
    assert.doesNotMatch(jupiterAnimate, /redSpotMesh\.geometry\.attributes\.position\.needsUpdate/);
});

test('Sun keeps its surface on the GPU and respects its dynamic ceiling', () =>
{
    const source = fs.readFileSync(path.join(root, 'scripts/planets/sun.js'), 'utf8');
    const animate = source.slice(source.indexOf('function animate'));
    assert.match(source, /ParticleSurface\.build\(/);
    assert.match(source, /new THREE\.ShaderMaterial\(/);
    assert.doesNotMatch(animate, /sunGeometry\.attributes\.(position|color)\.needsUpdate/);
    assert.doesNotMatch(animate, /new THREE\.(Color|Vector3)/);
    assert.doesNotMatch(animate, /new SimplexNoise/);
});
