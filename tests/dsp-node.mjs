// Browser-free DSP regression suite. Runs csound/GrainCore.txt and the three module
// wrappers on the Csound WASM that ships with the app, and compares the production engine
// with the per-sample reference implementation in tests/reference.
//   node tests/dsp-node.mjs
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { renderCsd, csdText } from './lib/csound-node.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const core = await readFile(resolve(root, 'csound/GrainCore.txt'), 'utf8');
const reference = await readFile(resolve(root, 'tests/reference/GrainCoreReference.txt'), 'utf8');
const [freezeWrapper, sampleWrapper, oscWrapper] = await Promise.all(['GrainFreeze', 'GrainSample', 'GrainOsc'].map(n => readFile(resolve(root, `modules/${n}.txt`), 'utf8')));
const forbidden = /\b(partikkel|partikkelsync|grain|grain2|grain3|syncgrain|granule|diskgrain|fof|fof2|fog|sndwarp|sndwarpst|mincer|temposcal)\b/i;
for (const text of [core, freezeWrapper, sampleWrapper, oscWrapper]) assert(!forbidden.test(text.replace(/;.*/g, '')), 'Built-in granular opcode in DSP');

const prelude = (ksmps = 4) => `sr=48000\nksmps=${ksmps}\nnchnls=2\n0dbfs=1\nzakinit 64,64\ngiSin ftgen 1,0,16384,10,1\n`;
const hash = samples => createHash('sha256').update(Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength)).digest('hex');
const rms = (samples, channel = 0, from = 0, to = samples.length / 2) => {
    let sum = 0;
    for (let i = from; i < to; i++) sum += samples[2 * i + channel] ** 2;
    return Math.sqrt(sum / Math.max(1, to - from));
};
const report = [];
async function render(name, body, { duration = 1, extra = '', engine = core, ksmps = 4, files = {} } = {}) {
    const result = await renderCsd(csdText(`${prelude(ksmps)}${extra}\n${engine}\n${body}`, `i1 0 ${duration}\ne`), { files });
    assert(!result.messages.some(m => /INIT ERROR|PERF ERROR|error:|samples out of range:\s*[1-9]/i.test(m)), result.messages.join(''));
    assert.equal(result.samples.length, duration * 48000 * 2, `${name}: rendered duration`);
    assert(result.samples.every(Number.isFinite), `${name}: finite audio`);
    const peak = result.samples.reduce((p, v) => Math.max(p, Math.abs(v)), 0);
    console.log(`${name}: rms=${rms(result.samples).toFixed(6)}, peak=${peak.toFixed(6)}, ${(result.renderMs / (duration * 10)).toFixed(1)}% of real time`);
    report.push({ name, duration, rms: rms(result.samples), peak, sha256: hash(result.samples), renderMs: Math.round(result.renderMs) });
    return { samples: result.samples, hash: hash(result.samples), peak, renderMs: result.renderMs };
}
const call = ({ density = 24, size = 80, position = 0.2, jitter = 0.1, pitch = 0, pitchJitter = 0, window = 0, pan = 0.5, spread = 0.7, freeze = 0, seed = 19 } = {}) =>
    `aL,aR CMGrainCore aIn,2,giSin,16384,3604480,${density},${size},${position},${jitter},${pitch},${pitchJitter},${window},${pan},${spread},${freeze},${seed}`;
const body = options => `instr 1\naIn=0\n${call(options)}\nouts aL,aR\nendin`;

// ---- Engine behaviour -------------------------------------------------------------------
const basic = await render('osc', body());
assert(rms(basic.samples) > 0.01 && basic.peak <= 1);
assert.equal(basic.hash, (await render('repeat', body())).hash, 'Seed reproducibility');
assert.notEqual(basic.hash, (await render('different-seed', body({ seed: 20 }))).hash);
assert.equal((await render('density-zero', body({ density: 0 }))).peak, 0);
const stress = await render('saturation', body({ density: 200, size: 500, pitch: 48, jitter: 1, pitchJitter: 24, window: 1 }));
assert(stress.peak <= 1 && stress.peak > 0.01);
assert.equal(rms((await render('pan-left', body({ pan: 0, spread: 0 }))).samples, 1), 0);
const isolated = await render('two-instances', `instr 1\naIn=0\n${call()}\naOtherL,aOtherR CMGrainCore aIn,2,giSin,16384,3604480,200,500,0.9,1,-24,24,1,0,1,0,999\nouts aL,aR\nendin`);
assert.equal(basic.hash, isolated.hash, 'Instance-local RNG and voices');
const tail = await render('density-tail', `instr 1\naIn=0\nkTime timeinsts\nkDensity=(kTime<0.4?40:0)\n${call({ density: 'kDensity', size: 100 })}\nouts aL,aR\nendin`);
assert(rms(tail.samples, 0, 19200, 22000) > 0.01, 'Existing grains survive density zero');
assert.equal(rms(tail.samples, 0, 26000), 0, 'Voices expire');
const liveBody = after => `instr 1\niRing ftgentmp 0,0,-192000,-2,0\nkTime timeinsts\nkFreeze=(kTime>=4.3?1:0)\nkAmp=(kTime<4.3?0.4:${after})\naIn oscili kAmp,330\naL,aR CMGrainCore aIn,1,iRing,192000,sr,40,120,0.3,0.1,12,2,0,0.5,0.4,kFreeze,42\nouts aL,aR\nendin`;
const frozen = await render('freeze-after-wrap', liveBody(0), { duration: 5 });
assert.equal(frozen.hash, (await render('freeze-ignore-input', liveBody(0.9), { duration: 5 })).hash, 'Frozen ring ignores all new input');
assert(rms(frozen.samples, 0, 220000) > 0.01, 'Freeze continues playback');
assert.equal((await render('empty-frozen', 'instr 1\niRing ftgentmp 0,0,-192000,-2,0\naIn=0.5\naL,aR CMGrainCore aIn,1,iRing,192000,sr,200,500,1,1,48,24,1,0.5,1,1,1\nouts aL,aR\nendin')).peak, 0, 'Unrecorded ring stays silent');
for (const shape of [0, 1]) {
    const windowed = await render(`window-${shape}-short-source`, `instr 1\naIn=0\naL,aR CMGrainCore aIn,0,giConstant,2,sr,4,100,1,1,-48,0,${shape},0,0,0,7\nouts aL,aR\nendin`, { extra: 'giConstant ftgen 0,0,2,-2,1,1' });
    // A constant two-frame source isolates the analytic window, lifespan and wrap.
    const start = windowed.samples.findIndex(v => Math.abs(v) > 1e-8) / 2 - 1;
    assert(Math.abs(start - 11999) <= 1, 'Sample-accurate density trigger');
    for (const age of [0, 1200, 2400, 4799]) {
        const phase = age / 4799;
        const envelope = shape ? 1 - Math.abs(2 * phase - 1) : 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);
        assert(Math.abs(windowed.samples[(start + age) * 2] - Math.tanh(envelope)) < 1e-5, 'Window shape and zero endpoints');
    }
    assert.equal(windowed.samples[(start + 4800) * 2], 0, 'Grain is silent after its last sample');
}

// ---- Module wrappers --------------------------------------------------------------------
const wrapperArgs = [24, 80, 32, 8, 0, 0, 0, 64, 64, 0, 127, 90, 1];
const wrapped = await render('zak-through-gain', `${oscWrapper}\ninstr 1\nGrainOsc ${[...wrapperArgs, 0, 1, ...Array(12).fill(1), 2, 3].join(',')}\naL zar 2\naR zar 3\nzaw aL*0.25,4\nzaw aR*0.25,5\naOutL zar 4\naOutR zar 5\nouts aOutL,aOutR\nendin`);
assert(rms(wrapped.samples) > 0.01 && wrapped.peak < 0.25, 'Module outputs reach downstream Zak DSP');
const wrappedLive = await render('freeze-wrapper', `${freezeWrapper}\ninstr 1\naSource oscili 0.4,330\nzaw aSource,6\nGrainFreeze ${[...wrapperArgs, 6, ...Array(12).fill(1), 2, 3].join(',')}\naL zar 2\naR zar 3\nouts aL,aR\nendin`);
assert(rms(wrappedLive.samples) > 0.01);
// Synthetic 44.1 kHz fixture, mirrors GrainSamples.orchestra() of the host.
const wav = Buffer.alloc(44 + 4410 * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(44100, 24); wav.writeUInt32LE(88200, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(8820, 40);
for (let i = 0; i < 4410; i++) wav.writeInt16LE(Math.round(16000 * Math.sin(2 * Math.PI * 440 * i / 44100)), 44 + i * 2);
const bankOrchestra = loaded => [
    ...Array.from({ length: 8 }, (_, i) => loaded.has(i + 1) ? `giGrainSample${i + 1} ftgen 0, 0, 0, -1, "sample-test.wav", 0, 0, 1` : `giGrainSample${i + 1} ftgen 0, 0, 2, -2, 0`),
    `giGrainSampleTables[] fillarray ${Array.from({ length: 8 }, (_, i) => `giGrainSample${i + 1}`).join(', ')}`,
    `giGrainSampleFrames[] fillarray ${Array.from({ length: 8 }, (_, i) => `ftlen(giGrainSample${i + 1})`).join(', ')}`,
    `giGrainSampleRates[] fillarray ${Array.from({ length: 8 }, (_, i) => loaded.has(i + 1) ? `ftsr(giGrainSample${i + 1})` : 'sr').join(', ')}`,
].join('\n');
const sampleBody = (slot, scan = 0, args = wrapperArgs) => `${sampleWrapper}\ninstr 1\nGrainSample ${[...args, slot, scan, 1, ...Array(12).fill(1), 2, 3].join(',')}\naL zar 2\naR zar 3\nouts aL,aR\nendin`;
const sample = await render('sample-wrapper-44100', sampleBody(1), { extra: bankOrchestra(new Set([1])), files: { 'sample-test.wav': wav } });
assert(rms(sample.samples) > 0.01);
assert.equal((await render('sample-empty', sampleBody(8), { extra: bankOrchestra(new Set()) })).peak, 0);


// ---- Voice pool: 64 grains --------------------------------------------------------------
// A quiet constant source keeps tanh linear, so the number of sounding grains shows up as level:
// the smoother divides the sum by sqrt(count), hence level ~ sqrt(count) until the pool is full.
const levelAt = async (density, size) => {
    const r = await render(`pool-${density}x${size}`, `instr 1\naIn=0\naL,aR CMGrainCore aIn,0,giConstantPool,2,sr,${density},${size},0.5,0,0,0,0,0.5,0,0,1\nouts aL,aR\nendin`, { duration: 3, extra: 'giConstantPool ftgen 0,0,2,-2,0.02,0.02' });
    return rms(r.samples, 0, 96000, 144000);
};
const lvl = { few: await levelAt(20, 100), forty: await levelAt(100, 400), fortyEightOverlap: await levelAt(120, 400), full: await levelAt(200, 500) };
console.log('  pool levels (2 / 40 / 48 / 100 requested overlap):', Object.values(lvl).map(v => v.toFixed(3)).join(' / '));
assert(lvl.forty > lvl.few * 3.5, 'Level follows sqrt of the overlap (40 vs 2 grains)');
assert(lvl.fortyEightOverlap > lvl.forty * 1.04, 'More than 32 grains really sound together: level keeps growing past 40 overlapping grains');
assert(lvl.full > lvl.fortyEightOverlap * 1.0 && lvl.full < lvl.fortyEightOverlap * 1.25, 'Growth stops near sqrt(64/48) once the 64-grain pool is full');

// ---- Grain Osc waveforms ----------------------------------------------------------------
const goertzel = (samples, frequency, from = 48000, count = 48000) => {
    let re = 0, im = 0;
    for (let i = 0; i < count; i++) { const x = samples[2 * (from + i)], a = 2 * Math.PI * frequency * i / 48000; re += x * Math.cos(a); im -= x * Math.sin(a); }
    return Math.hypot(re, im) / count;
};
// 110 grains/s = one grain every two periods of the 220 Hz root, so overlapping grains add coherently into a steady tone.
const oscWave = (wave, phaseWarp = 0, phaseJitter = 0, seed = 1) => render(`osc-wave-${wave}-${phaseWarp}-${phaseJitter}-${seed}`, `${oscWrapper}\ninstr 1\nGrainOsc ${[110, 30, phaseWarp, phaseJitter, 0, 0, 0, 64, 0, 0, 127, 127, seed, wave, 1, ...Array(12).fill(1), 2, 3].join(',')}\naL zar 2\naR zar 3\nouts aL,aR\nendin`, { duration: 2 });
const harmonics = {};
const waveOutputs = {};
for (const wave of [0, 1, 2, 3]) {
    const r = await oscWave(wave);
    waveOutputs[wave] = r;
    harmonics[wave] = [1, 2, 3].map(h => goertzel(r.samples, 220 * h));
}
console.log('  osc harmonics 1..3 per wave:', Object.entries(harmonics).map(([w, h]) => `${w}: ${h.map(v => v.toFixed(3)).join('/')}`).join('  '));
const [h1, h2, h3] = [0, 1, 2].map(i => [0, 1, 2, 3].map(w => harmonics[w][i]));
const ratio = (w, i) => harmonics[w][i] / harmonics[w][0];
assert(ratio(0, 1) < 0.03 && ratio(1, 1) < 0.03 && ratio(3, 1) < 0.03, 'Sine, triangle and square have no second harmonic');
assert(ratio(2, 1) > 0.25, 'Saw has a strong second harmonic');
assert(ratio(3, 2) > 0.2 && ratio(3, 2) > 2 * ratio(0, 2), 'Square has a strong third harmonic');
assert(ratio(1, 2) < ratio(3, 2) / 2 && ratio(1, 2) > ratio(0, 2) * 0.8, 'Triangle third harmonic is weaker than the square one');
assert.equal((await oscWave(7)).hash, (await oscWave(3)).hash, 'Out-of-range waveform clamps to the last wave');

// Phase warp changes the phase progression once per cycle. Measure harmonic
// magnitudes over a steady 1 s segment and compare the actual rendered waveforms.
const harmonicSpectrum = samples => Array.from({ length: 24 }, (_, i) => goertzel(samples, 220 * (i + 1)));
const relativeSpectrumDifference = (a, b) => {
    const denominator = a.reduce((sum, value) => sum + value * value, 0);
    return Math.sqrt(a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0) / Math.max(denominator, 1e-30));
};
const relativeWaveDifference = (a, b) => {
    let error = 0, signal = 0;
    for (let i = 48000; i < 96000; i++) {
        const x = a[2 * i], difference = x - b[2 * i];
        error += difference * difference;
        signal += x * x;
    }
    return Math.sqrt(error / Math.max(signal, 1e-30));
};
const meanLevel = samples => {
    let sum = 0;
    for (let i = 48000; i < 96000; i++) sum += samples[2 * i];
    return sum / 48000;
};
const phaseWarpReport = [];
for (const wave of [2, 3]) {
    const baseline = waveOutputs[wave];
    const warped = await oscWave(wave, 127);
    const spectrumDifference = relativeSpectrumDifference(harmonicSpectrum(baseline.samples), harmonicSpectrum(warped.samples));
    const waveformDifference = relativeWaveDifference(baseline.samples, warped.samples);
    const dcOffset = meanLevel(warped.samples);
    console.log(`  phase warp wave ${wave}: harmonic-spectrum delta=${(100 * spectrumDifference).toFixed(1)}%, waveform delta=${(100 * waveformDifference).toFixed(1)}%, DC=${dcOffset.toFixed(5)}`);
    assert(spectrumDifference > 0.05, `Phase warp measurably changes wave ${wave} harmonic magnitudes`);
    assert(waveformDifference > 0.05, `Phase warp measurably changes wave ${wave} waveform`);
    assert(Math.abs(dcOffset) < 0.01, `Phase warp keeps wave ${wave} DC offset small`);
    phaseWarpReport.push({ wave, normalizedHarmonicSpectrumDifference: spectrumDifference, normalizedWaveformDifference: waveformDifference, dcOffset });
}
// A freshly created Grain Osc must be the plain wave it says it is: take the knob defaults from the module itself.
const oscDefinition = JSON.parse((await readFile(resolve(root, 'modules/GrainOsc.js'), 'utf8')).replace(/^[^=]*=/, '').trim().replace(/;$/, ''));
const oscDefaults = oscDefinition.params.map(id => { const c = oscDefinition.components.find(k => k.id === String(id) && ['Knob', 'ButtonIncDec'].includes(k.componentType)); return c.componentType === 'Knob' ? c.defaultValue : c.initialIndex; });
oscDefaults[0] = 110; oscDefaults[1] = 30; // lock grains to the 220 Hz root so overlapping grains add into a steady tone
const defaultOsc = await render('osc-module-defaults', `${oscWrapper}\ninstr 1\nGrainOsc ${[...oscDefaults, 1, ...Array(12).fill(1), 2, 3].join(',')}\naL zar 2\naR zar 3\nouts aL,aR\nendin`, { duration: 2 });
const defaultH1 = goertzel(defaultOsc.samples, 220);
console.log(`  new Grain Osc defaults: h2/h1=${(goertzel(defaultOsc.samples, 440) / defaultH1).toFixed(4)}, h3/h1=${(goertzel(defaultOsc.samples, 660) / defaultH1).toFixed(4)}`);
assert(goertzel(defaultOsc.samples, 440) / defaultH1 < 0.01, 'A new Grain Osc starts as a clean sine (no second harmonic)');
assert(goertzel(defaultOsc.samples, 660) / defaultH1 < 0.05, 'A new Grain Osc starts as a clean sine (small third harmonic)');
const fullWarp = await oscWave(3, 127);
assert.equal((await oscWave(3, 127)).hash, fullWarp.hash, 'Phase warp is repeatable with a fixed Seed');
const jittered = await oscWave(3, 0, 127, 19);
assert.equal((await oscWave(3, 0, 127, 19)).hash, jittered.hash, 'Per-grain start-phase jitter is repeatable with a fixed Seed');
assert.notEqual(jittered.hash, waveOutputs[3].hash, 'Start-phase jitter changes the square-wave render');

// Knob tooltips show the rounded value, so a slot/waveform knob at 1.6 must act as 2.
const slotTwo = (await render('slot-2-loaded', sampleBody(2), { extra: bankOrchestra(new Set([2])), files: { 'sample-test.wav': wav } })).hash;
assert.equal((await render('slot-1.6-rounds-to-2', sampleBody(1.6), { extra: bankOrchestra(new Set([2])), files: { 'sample-test.wav': wav } })).hash, slotTwo, 'Slot knob rounds like its tooltip');
assert.equal((await oscWave(1.6)).hash, (await oscWave(2)).hash, 'Waveform knob rounds like its tooltip');
assert.equal((await oscWave(1.4)).hash, (await oscWave(1)).hash, 'Waveform knob rounds down below .5');

// ---- Grain Sample scan ------------------------------------------------------------------
// A linear ramp file: the mean level of the output follows the read position through the file.
const ramp = Buffer.alloc(44 + 44100 * 4 * 2);
ramp.write('RIFF'); ramp.writeUInt32LE(ramp.length - 8, 4); ramp.write('WAVEfmt ', 8);
ramp.writeUInt32LE(16, 16); ramp.writeUInt16LE(1, 20); ramp.writeUInt16LE(1, 22);
ramp.writeUInt32LE(44100, 24); ramp.writeUInt32LE(88200, 28); ramp.writeUInt16LE(2, 32); ramp.writeUInt16LE(16, 34);
ramp.write('data', 36); ramp.writeUInt32LE(44100 * 4 * 2, 40);
for (let i = 0; i < 44100 * 4; i++) ramp.writeInt16LE(Math.round(-20000 + 40000 * i / (44100 * 4)), 44 + i * 2);
const scanArgs = [60, 40, 80, 0, 0, 0, 0, 64, 0, 0, 127, 127, 1]; // density, size, position 0.63 (room to move both ways), no jitter, no pitch, wet, level max
const meanOf = (samples, from, to) => { let sum = 0; for (let i = from; i < to; i++) sum += samples[2 * i]; return sum / (to - from); };
const scanRun = (name, scan, args = scanArgs, duration = 3) => render(name, sampleBody(1, scan, args), { duration, extra: bankOrchestra(new Set([1])), files: { 'sample-test.wav': ramp } });
const still = await scanRun('scan-0', 0), forward = await scanRun('scan-forward', 10), backward = await scanRun('scan-backward', -10);
// Compare 0.25-0.75 s with 1.5-2.0 s: at 10 %/s the position moves 0.125 of the file, with no wrap-around yet.
const drift = r => meanOf(r.samples, 72000, 96000) - meanOf(r.samples, 12000, 36000);
console.log(`  scan drift of mean level: 0 -> ${drift(still).toFixed(3)}, +10 %/s -> ${drift(forward).toFixed(3)}, -10 %/s -> ${drift(backward).toFixed(3)}`);
assert(Math.abs(drift(still)) < 0.01, 'Scan 0 keeps the knob position');
assert(drift(forward) > 0.04 && drift(backward) < -0.04, 'Scan moves the position forward and backward through the file');
// Hold (Freeze) pauses the scan: switch it on from the start and nothing moves.
const held = await scanRun('scan-held', 10, [...scanArgs.slice(0, 9), 1, ...scanArgs.slice(10)]);
assert(Math.abs(drift(held)) < 0.01, 'Hold pauses the scan');

// ---- Equivalence with the per-sample reference engine -----------------------------------
// Deterministic init-time tables (no gigantic ftgen argument lists).
const tables = `giNoise ftgen 2,0,-48000,-2,0\ngiTiny ftgen 3,0,2,-2,1,-1\ngiRing ftgen 4,0,-192000,-2,0\ngiSaw ftgen 5,0,-9000,-2,0
iN = 0
while iN < 48000 do
    tableiw frac(sin(iN * 12.9898) * 43758.5453) * 2 - 1, iN, giNoise
    iN += 1
od
iN = 0
while iN < 9000 do
    tableiw (iN / 9000) * 2 - 1, iN, giSaw
    iN += 1
od`;
// The historical reference predates phase warp, so its periodic-source parity
// cases use zero warp; the new warped output is covered by the spectral checks above.
const scenarios = {
    osc_default: { duration: 4, body: `aL,aR CMGrainCore aIn,2,giSin,16384,${220 * 16384},24,80,0,0.1,0,0,0,0.5,0.7,0,19` },
    osc_dense_triangle: { duration: 4, body: `aL,aR CMGrainCore aIn,2,giSin,16384,${220 * 16384},200,500,0,1,0,24,1,0.5,0.7,0,19` },
    osc_modulated: { duration: 6, body: `kD = 40 + 30*oscili(1,0.5)\nkW = (timeinsts() > 3 ? 1 : 0)\naL,aR CMGrainCore aIn,2,giSin,16384,${220 * 16384},kD,150,0,0.5,3,6,kW,0.3,0.8,0,7` },
    sample_noise: { duration: 4, body: 'aL,aR CMGrainCore aIn,0,giNoise,48000,44100,40,120,0.3,0.5,7,3,0,0.5,0.9,0,3' },
    sample_tiny_extreme: { duration: 3, body: 'aL,aR CMGrainCore aIn,0,giTiny,2,48000,200,5,0.5,0.5,48,0,0,0.5,0.7,0,9' },
    sample_pitch_down: { duration: 4, body: 'aL,aR CMGrainCore aIn,0,giSaw,9000,48000,60,300,0.8,0.5,-36,12,0,0,1,0,11' },
    sample_hold: { duration: 5, body: 'kP = 0.1 + 0.8*oscili(0.5,0.4)+0.4\nkF = (timeinsts() > 2 && timeinsts() < 4 ? 1 : 0)\naL,aR CMGrainCore aIn,0,giNoise,48000,48000,50,90,kP,0.05,0,0,0,0.5,0.9,kF,5' },
    live_modulated_freeze: { duration: 8, input: 'aIn = 0.4*oscili(1, 220 + 40*oscili(1,0.7)) + 0.2*oscili(1, 777)', body: 'kPos = 0.1 + 0.8*abs(oscili(1,0.2))\nkFr = (timeinsts() > 4 && timeinsts() < 6 ? 1 : 0)\naL,aR CMGrainCore aIn,1,giRing,192000,48000,30,100,kPos,0.1,0,2,0,0.5,0.6,kFr,21' },
    live_extreme_lookback: { duration: 6, input: 'aIn = 0.4*oscili(1, 330)', body: 'aL,aR CMGrainCore aIn,1,giRing,192000,48000,120,400,1,0,-12,0,0,0.5,0.5,0,5' },
    live_fast_pitch_freeze: { duration: 5, input: 'aIn = 0.4*oscili(1, 441)', body: 'kFr = (timeinsts() > 2 && timeinsts() < 3.1 ? 1 : 0)\naL,aR CMGrainCore aIn,1,giRing,192000,48000,80,60,0.9,0.2,24,5,1,0.5,0.7,kFr,2' },
    table_switch_mid_grain: { duration: 5, body: 'kT = (timeinsts() > 2 ? 2 : 5)\nkF = (timeinsts() > 2 ? 48000 : 9000)\naL,aR CMGrainCore aIn,0,kT,kF,48000,50,200,0.3,0.2,0,0,0,0.5,0.7,0,9' },
    seed_change: { duration: 4, body: 'kS = (timeinsts() > 2 ? 100 : 5)\naL,aR CMGrainCore aIn,2,giSin,16384,' + 220 * 16384 + ',60,60,0,0.4,0,3,0,0.5,1,0,kS' },
};
const speedups = [];
for (const [ksmps, tolerance] of [[1, 0], [4, 2e-3]]) {
    for (const [name, scenario] of Object.entries(scenarios)) {
        if (ksmps === 1 && !['osc_default', 'sample_noise', 'live_modulated_freeze', 'live_extreme_lookback', 'table_switch_mid_grain', 'sample_tiny_extreme'].includes(name)) continue;
        const make = engine => render(`${name} @ksmps=${ksmps}`, `instr 1\naIn = 0\n${scenario.input ?? ''}\n${scenario.body}\nouts aL,aR\nendin`, { duration: scenario.duration, ksmps, extra: tables, engine });
        const [expected, actual] = [await make(reference), await make(core)];
        let squaredError = 0, squaredSignal = 0, maxError = 0;
        for (let i = 0; i < expected.samples.length; i++) {
            const e = Math.abs(expected.samples[i] - actual.samples[i]);
            squaredError += e * e; squaredSignal += expected.samples[i] ** 2; maxError = Math.max(maxError, e);
        }
        const relative = Math.sqrt(squaredError / Math.max(squaredSignal, 1e-30));
        console.log(`  equivalence ${name} @ksmps=${ksmps}: relative RMS ${relative.toExponential(2)}, max ${maxError.toExponential(2)}`);
        if (tolerance === 0) assert.equal(expected.hash, actual.hash, `${name}: bit-identical to the per-sample reference at ksmps=1`);
        else assert(relative <= tolerance, `${name}: relative RMS ${relative} exceeds ${tolerance} at ksmps=${ksmps}`);
        if (ksmps === 4) speedups.push({ name, factor: expected.renderMs / actual.renderMs });
    }
}
console.log('Speed-up over the per-sample reference at ksmps=4:', speedups.map(s => `${s.name} ${s.factor.toFixed(1)}x`).join(', '));
assert(speedups.every(s => s.factor > 1.5), 'The block renderer must be clearly faster than the per-sample reference');
await mkdir(resolve(root, 'test-results'), { recursive: true });
await writeFile(resolve(root, 'test-results/dsp-node-report.json'), JSON.stringify({ report, speedups, phaseWarp: phaseWarpReport }, null, 2) + '\n');
console.log('Node DSP checks passed.');
