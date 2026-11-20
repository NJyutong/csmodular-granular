import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { GrainOscModule } from '../modules/GrainOsc.js';
import { csdText, renderCsd } from './lib/csound-node.mjs';

const sampleRate = 48000;
const framesPerCase = 2 * sampleRate;
const root = fileURLToPath(new URL('../', import.meta.url));
const [core, osc] = await Promise.all([
    readFile(new URL('../csound/GrainCore.txt', import.meta.url), 'utf8'),
    readFile(new URL('../modules/GrainOsc.txt', import.meta.url), 'utf8'),
]);
const controls = new Map(GrainOscModule.components.map(component => [String(component.id), component]));
const overrides = {
    Density: 'p4',
    Size: 80,
    PhaseWarp: 0,
    PosJitter: 'p5',
    Pitch: -12,
    PitchJitter: 0,
    Window: 0,
    Pan: 64,
    Spread: 0,
    Level: 90,
    Seed: 19,
    Wave: 0,
};
const args = GrainOscModule.params.map(id => {
    const control = controls.get(String(id));
    return overrides[control.csoundName] ?? control.defaultValue ?? control.initialIndex ?? 0;
});
args.push(...GrainOscModule.inputs.map(() => 1), 2, 3);

const cases = [
    { density: 32, jitter: 0 },
    { density: 40, jitter: 0 },
    { density: 48, jitter: 0 },
    { density: 90, jitter: 0 },
    { density: 110, jitter: 0 },
    { density: 120, jitter: 0 },
    { density: 40, jitter: 127 },
    { density: 40, jitter: 127 },
];
const score = [...cases.map(({ density, jitter }, index) => `i1 ${2 * index} 2 ${density} ${jitter}`), 'e'].join('\n');
const { samples, messages } = await renderCsd(csdText(`sr=${sampleRate}
ksmps=4
nchnls=2
0dbfs=1
zakinit 16,16
giSin ftgen 1,0,16384,10,1
${core}
${osc}
instr 1
GrainOsc ${args.join(', ')}
aL zar 2
aR zar 3
outs aL,aR
endin`, score));
assert.equal(samples.length, cases.length * framesPerCase * 2, messages.join(''));
assert(samples.every(Number.isFinite), 'Osc renders finite audio');

const stable = index => samples.subarray(2 * (index * framesPerCase + sampleRate), 2 * (index + 1) * framesPerCase);
function amplitude(signal, frequency) {
    const coefficient = 2 * Math.cos(2 * Math.PI * frequency / sampleRate);
    let prev = 0;
    let older = 0;
    for (let i = 0; i < signal.length; i += 2) {
        const next = signal[i] + coefficient * prev - older;
        older = prev;
        prev = next;
    }
    return 2 * Math.sqrt(Math.max(0, prev * prev + older * older - coefficient * prev * older)) / sampleRate;
}

const levels = [];
for (const [index, { density, jitter }] of cases.entries()) {
    if (jitter !== 0) continue;
    const signal = stable(index);
    const target = amplitude(signal, 110);
    const clockPeaks = Math.max(...[96, 120, 200].map(frequency => amplitude(signal, frequency)));
    assert(target > 0.05 && target > 2 * clockPeaks, `${density} grains/s retains the 110 Hz carrier (target ${target}, clock peaks ${clockPeaks})`);
    let squares = 0;
    for (let i = 0; i < signal.length; i += 2) squares += signal[i] ** 2;
    levels.push(10 * Math.log10(squares / sampleRate));
}
assert(Math.max(...levels) - Math.min(...levels) < 12, 'Changing density avoids deep cancellation');
assert.notDeepEqual(stable(1), stable(6), 'Independent phase jitter changes the render with zero warp');
assert.deepEqual(stable(6), stable(7), 'Phase jitter repeats exactly with the same seed');
console.log(`Osc carrier and phase-jitter checks passed (${root}, ${levels.map(level => level.toFixed(1)).join(', ')} dBFS).`);
