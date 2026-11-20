import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { GrainFreezeModule } from '../modules/GrainFreeze.js';
import { GrainOscModule } from '../modules/GrainOsc.js';
import { GrainSampleModule } from '../modules/GrainSample.js';
import { csdText, renderCsd } from './lib/csound-node.mjs';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [core, sample, osc, freeze] = await Promise.all([
    read('../csound/GrainCore.txt'), read('../modules/GrainSample.txt'), read('../modules/GrainOsc.txt'),
    read('../modules/GrainFreeze.txt'),
]);
const sampleRate = 48000;

function args(definition, overrides) {
    const params = definition.params.map(id => {
        const control = definition.components.find(component => Number(component.id) === id);
        if (control.csoundName === 'Level') return control.min < 0 ? -3 : 90;
        return overrides[control.csoundName] ?? control.defaultValue ?? control.initialIndex ?? (control.initialState ? 1 : 0);
    });
    return [...params, ...definition.inputs.map(id => id === 101 ? 3 : 0), 1, 2].join(', ');
}

const prelude = `sr = ${sampleRate}
ksmps = 128
nchnls = 2
0dbfs = 1
zakinit 16, 16
giSin ftgen 0, 0, 8192, 10, 1
`;
async function render(name, wrapper, definition, controls, setup = '', controlCode = '', duration = 2) {
    const { samples, messages } = await renderCsd(csdText(`${prelude}
${setup}
${core}
${wrapper}
instr 1
    ${controlCode}
    ${name} ${args(definition, controls)}
    aLeft zar 1
    aRight zar 2
    outs aLeft, aRight
endin`, `i1 0 ${duration}\ne`));
    assert.ok(samples.length >= sampleRate * duration * 2, messages.join(''));
    return Float32Array.from({ length: samples.length / 2 }, (_, i) => samples[2 * i]);
}

const tableBank = `giRamp ftgen 0, 0, -48000, -7, -0.5, 48000, 0.5
giScan ftgen 0, 0, -48000, -7, 0.05, 48000, 0.65
giGrainSampleTables[] fillarray giScan, giRamp, giScan, giScan, giScan, giScan, giScan, giScan
giGrainSampleFrames[] fillarray 48000, 48000, 48000, 48000, 48000, 48000, 48000, 48000
giGrainSampleRates[] fillarray sr, sr, sr, sr, sr, sr, sr, sr`;
const timeWindow = (frames, start, end) =>
    frames.subarray(Math.round(start * sampleRate), Math.round(end * sampleRate));
const rms = frames => Math.sqrt(frames.reduce((sum, sample) => sum + sample ** 2, 0) / frames.length);
const maxStep = frames => frames.reduce((max, sample, i) =>
    i ? Math.max(max, Math.abs(sample - frames[i - 1])) : max, 0);

test('the demo saves each control at its component ID', async () => {
    const demo = JSON.parse(await read('../examples/pulvis-demo.json'));
    assert.match(demo.textpad, /EN:[\s\S]*中文：[\s\S]*Русский:/, 'The starter patch introduces the Freeze snapshot workflow in all three languages');
    for (const definition of [GrainFreezeModule, GrainSampleModule, GrainOscModule]) {
        const values = JSON.parse(demo.modules.find(module => module.name === definition.type).parameters);
        for (const id of definition.params) {
            const control = definition.components.find(component => Number(component.id) === id);
            assert.equal(values[id], control.defaultValue ?? control.initialIndex ?? (control.initialState ? 1 : 0),
                `${definition.type} / ${control.csoundName} / ${id}`);
        }
    }
});

test('returning scan speed to zero holds the scan offset', async () => {
    const frames = await render('GrainSample', sample, GrainSampleModule, {
        Density: 80, Size: 20, Position: 13, PosJitter: 0, Spread: 0, Scan: 'kScan',
    }, tableBank, 'kScan = (timeinsts() < 1 ? 40 : 0)');
    const before = rms(timeWindow(frames, 0.92, 0.99));
    const after = rms(timeWindow(frames, 1.12, 1.22));
    const change = 20 * Math.log10(after / before);
    assert.ok(before > 0.05, `sample was silent: ${before}`);
    assert.ok(Math.abs(change) < 1.5, `stopping scan changed the level by ${change.toFixed(2)} dB`);
});

test('Sample attenuates the discontinuity when a grain wraps a file', async () => {
    const frames = await render('GrainSample', sample, GrainSampleModule, {
        Density: 4, Size: 100, Position: 121, PosJitter: 0, Spread: 0, Slot: 2,
    }, tableBank);
    const window = timeWindow(frames, 0.288, 0.307);
    const step = maxStep(window);
    assert.ok(rms(window) > 0.1, 'no audible grain at the seam');
    assert.ok(step < 0.04, `seam discontinuity was ${step.toFixed(4)} full scale`);
});

function binMagnitude(frames, frequency) {
    let real = 0;
    let imaginary = 0;
    for (let i = 0; i < frames.length; i++) {
        const phase = 2 * Math.PI * frequency * i / sampleRate;
        real += frames[i] * Math.cos(phase);
        imaginary += frames[i] * Math.sin(phase);
    }
    return Math.hypot(real, imaginary) * 2 / frames.length;
}

for (const [wave, name] of [[2, 'saw'], [3, 'square']]) {
    test('Grain Osc ' + name + ' suppresses the folded seventh harmonic at +48 st', async () => {
        const frames = await render('GrainOsc', osc, GrainOscModule, {
            Density: 100, Size: 40, PhaseWarp: 0, PosJitter: 0, Spread: 0, Wave: wave, Pitch: 48,
        });
        const window = timeWindow(frames, 0.5, 1.5);
        const fundamental = binMagnitude(window, 3520);
        const fifth = binMagnitude(window, 5 * 3520);
        const foldedSeventh = binMagnitude(window, sampleRate - 7 * 3520);
        assert.ok(fundamental > 0.1, 'missing 3520 Hz fundamental');
        assert.ok(fifth / fundamental > 0.12, 'the fifth harmonic should remain audible');
        const aliasDb = 20 * Math.log10(foldedSeventh / fundamental);
        // Older cores add some harmonic distortion after the wavetable read.
        assert.ok(aliasDb < -30, 'folded seventh harmonic is ' + aliasDb.toFixed(1) + ' dBc');
    });
}

test('Freeze can sustain a full 400 ms grain at +48 st after recording history', async () => {
    const frames = await render('GrainFreeze', freeze, GrainFreezeModule, {
        Density: 'kDensity', Size: 400, Position: 100, PosJitter: 0, Pitch: 48, Spread: 0, Freeze: 'kFreeze',
    }, '', `aInput oscili 0.45, 220, giSin
    zaw aInput, 3
    kFreeze = (timeinsts() >= 8 ? 1 : 0)
    kDensity = (timeinsts() >= 8 && timeinsts() < 8.3 ? 4 : 0)`, 9);
    assert.equal(rms(timeWindow(frames, 8.05, 8.2)), 0, 'grain starts early');
    assert.ok(rms(timeWindow(frames, 8.53, 8.59)) > 0.015, 'grain was shortened');
    assert.equal(rms(timeWindow(frames, 8.66, 8.9)), 0, 'grain lasts longer than 400 ms');
});

test('Sample reverse changes playback direction without unbounded edge steps', async () => {
    const renderDirection = Reverse => render('GrainSample', sample, GrainSampleModule, {
        Density: 36, Size: 120, Position: 50, PosJitter: 0, Spread: 0, Reverse,
    }, tableBank, '', 2);
    const forward = await renderDirection(0);
    const reverse = await renderDirection(1);
    const window = timeWindow(forward, 0.4, 1.8);
    const reversed = timeWindow(reverse, 0.4, 1.8);
    const delta = Math.sqrt(window.reduce((sum, value, index) => sum + (value - reversed[index]) ** 2, 0) / window.length);
    assert.ok(delta > 0.02, `direction should change the rendered waveform (RMS delta ${delta})`);
    assert.ok(maxStep(reversed) < 0.25, 'reverse playback stays smooth at loop boundaries');
});

test('Osc reverse direction changes the periodic grain read while preserving a finite output', async () => {
    const renderDirection = Reverse => render('GrainOsc', osc, GrainOscModule, {
        Density: 24, Size: 80, Wave: 2, Position: 0, PosJitter: 0, Pitch: 0, Spread: 0, Reverse,
    });
    const forward = await renderDirection(0);
    const reverse = await renderDirection(1);
    const delta = Math.sqrt(forward.reduce((sum, value, index) => sum + (value - reverse[index]) ** 2, 0) / forward.length);
    assert.ok(delta > 0.01, `Osc direction should change its waveform (RMS delta ${delta})`);
    assert([...reverse].every(Number.isFinite));
});

test('Blackman is the third zero-ended grain window', async () => {
    const constant = `giConst ftgen 0, 0, -48000, -7, 0.5, 48000, 0.5
giGrainSampleTables[] fillarray giConst, giConst, giConst, giConst, giConst, giConst, giConst, giConst
giGrainSampleFrames[] fillarray 48000, 48000, 48000, 48000, 48000, 48000, 48000, 48000
giGrainSampleRates[] fillarray sr, sr, sr, sr, sr, sr, sr, sr`;
    const levels = [];
    for (const Window of [0, 1, 2]) {
        const frames = await render('GrainSample', sample, GrainSampleModule, {
            Density: 30, Size: 120, Position: 50, PosJitter: 0, Spread: 0, Window,
        }, constant, '', 2);
        levels.push(rms(timeWindow(frames, 0.5, 1.8)));
        assert.ok(maxStep(frames) < 0.25, `window ${Window} has no hard edge`);
    }
    assert.ok(levels[2] < levels[0] && levels[2] < levels[1], `Blackman level ${levels[2]} should be below Hann/Triangle ${levels}`);
});

test('Freeze snapshots are private, stable while live recording continues, and replaceable', async () => {
    const frames = await render('GrainFreeze', freeze, GrainFreezeModule, {
        Density: 'kDensity', Size: 300, Position: 0, PosJitter: 0, Pitch: 0, Spread: 0,
        Freeze: 'kFreeze', Source: 1, Capture: 'kCapture',
    }, '', `aInput = (timeinsts() < 1.15 ? 0.4 : -0.4)
    zaw aInput, 3
    kFreeze = 0
    kDensity = (timeinsts() >= 0.95 ? 36 : 0)
    kCapture = ((timeinsts() >= 1 && timeinsts() < 1.01) || (timeinsts() >= 1.2 && timeinsts() < 1.21) ? 1 : 0)`, 2.5);
    const beforeReplace = rms(timeWindow(frames, 1.05, 1.18));
    const afterReplace = rms(timeWindow(frames, 1.35, 2.2));
    assert.ok(beforeReplace > 0.03, 'captured ring is audible after recording input changes');
    assert.ok(afterReplace > 0.03, 'replacement snapshot remains audible after further live writes');
    assert(!GrainSampleModule.params.some(id => ['Source','Capture'].includes(GrainSampleModule.components.find(c => Number(c.id) === id)?.csoundName)),
        'Freeze snapshots do not enter Sample WAV slots');
});

test('Freeze feedback remains bounded at its maximum setting', async () => {
    const frames = await render('GrainFreeze', freeze, GrainFreezeModule, {
        Density: 48, Size: 120, Position: 20, PosJitter: 0, Pitch: 0, Spread: 0,
        Freeze: 'kFreeze', Feedback: 0.95,
    }, '', `aTone oscili 1.4, 330, giSin
    aInput = aTone * (timeinsts() < 1 ? 1 : 0)
    zaw aInput, 3
    kFreeze = 0`, 8);
    assert.ok(frames.every(Number.isFinite), 'feedback never produces non-finite audio');
    const peak = frames.reduce((value, sample) => Math.max(value, Math.abs(sample)), 0);
    assert.ok(peak <= 1.00001, 'feedback write and Zak output stay within full scale');
    assert.ok(rms(timeWindow(frames, 3, 7.5)) > 0.001, 'feedback sustains a measurable wet tail');
});
