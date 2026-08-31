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
