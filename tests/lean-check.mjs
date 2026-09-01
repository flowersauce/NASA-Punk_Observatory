import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const interactionSource = fs.readFileSync(path.join(root, 'scripts/core/interaction.js'), 'utf8');
const listeners = {};
const slider = {
    value: '50',
    min: '0',
    max: '100',
    step: '10',
    classList: {contains: () => false, add() {}, remove() {}},
    addEventListener(type, handler) { listeners[type] = handler; }
};
const context = {document: {body: {style: {}}, addEventListener() {}}, window: {addEventListener() {}, removeEventListener() {}}};

vm.runInNewContext(interactionSource, context);
let sliderValue;
context.initPrecisionSlider(slider, (value) => { sliderValue = Number(value); });
slider.value = '70';
listeners.input?.({target: slider});
assert.equal(sliderValue, 70, 'native range input must drive the zoom callback');

for (const file of fs.readdirSync(path.join(root, 'scripts/planets')).filter((name) => name.endsWith('.js') && name !== 'config.js'))
{
    const source = fs.readFileSync(path.join(root, 'scripts/planets', file), 'utf8');
    assert.equal(source.match(/sharedTopoBackground\.resize\(\);/g)?.length, 1, `${file} must resize topography only on viewport changes`);
    assert.doesNotMatch(source, /zoomDisplay|currentZoom\s*=\s*updateInteraction/, `${file} retains dead zoom plumbing`);
}

console.log('lean checks passed');
