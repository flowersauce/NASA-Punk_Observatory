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
        setTimeout: (callback, delay) => {
            timers.push({callback, delay});
            return timers.length;
        },
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
    assert.equal(env.timers[0].delay, 1500);
});

test('readiness timeout reveals the curtain', () => {
    const env = loadTransition();
    env.timers[0].callback();
    assert.equal(env.curtain.classList.contains('curtain-intro'), true);
    assert.equal(env.curtain.classList.contains('start-covered'), false);
});

test('navigation is single-flight and completes on animationend', () => {
    const env = loadTransition();
    env.api.navigate('earth.html');
    env.api.navigate('mars.html');
    assert.equal(env.timers.at(-1).delay, 900);
    env.curtainListeners.get('animationend')({animationName: 'wipe-in'});
    assert.equal(env.location.href, 'earth.html');
    env.timers.forEach((timer) => timer.callback());
    assert.deepEqual(env.navigations, ['earth.html']);
});
