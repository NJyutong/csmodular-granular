import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { cpus, platform, release, totalmem } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csdText, renderCsd } from './lib/csound-node.mjs';
import { ensureResultsRoot, resultPath } from './lib/artifacts.mjs';
import { median } from './lib/audio-metrics.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const core = await readFile(resolve(root, 'csound/GrainCore.txt'), 'utf8');
const oscWrapper = await readFile(resolve(root, 'modules/GrainOsc.txt'), 'utf8');
const readerBlock = /        if iMode == 2 then\r?\n            ; Oscillator tables are already band-limited by their harmonic bank;\r?\n[\s\S]*?        endif\r?\n(?=        if iMode == 0 && kSeamWidthNow)/;
const flatRead = core.replace(readerBlock, '        aSample = 0\n');
assert.notEqual(flatRead, core, 'reader ablation matched production read block');
const flatEnvelope = core.replace(/        if kShapeNow == 0 then\r?\n            aEnvelope = 0\.5 - 0\.5 \* cos\(6\.283185307179586 \* aPhase\)\r?\n        elseif kShapeNow == 1 then\r?\n            aEnvelope = 1 - abs\(2 \* aPhase - 1\)\r?\n        else\r?\n            aEnvelope = 0\.42 - 0\.5 \* cos\(6\.283185307179586 \* aPhase\) \+ 0\.08 \* cos\(12\.566370614359172 \* aPhase\)\r?\n        endif/, '        aEnvelope = 1');
assert.notEqual(flatEnvelope, core, 'envelope ablation matched production envelope');
const noVoiceRender = core.replace(/    aSumL = 0\r?\n    aSumR = 0\r?\n[\s\S]*?\r?\n    ; Advance reusable state only after all snapshots have been rendered\./,
    '    aSumL = 0\n    aSumR = 0\n\n    ; Advance reusable state only after all snapshots have been rendered.');
assert.notEqual(noVoiceRender, core, 'voice-render ablation matched production render loop');
const noOldVoices = core.replace(/    ; Only voices that can expire inside this block need a snapshot:[\s\S]*?\r?\n    od\r?\n\r?\n    ; Sample-countdown scheduling/, '    ; Existing-voice path ablated\n    kBlockCount = 0\n\n    ; Sample-countdown scheduling');
assert.notEqual(noOldVoices, core, 'old-voice ablation matched production loop');

const duration = 1.5;
const orchestra = `sr=48000\nksmps=4\nnchnls=2\n0dbfs=1\nzakinit 64,64\ngiSin ftgen 1,0,16384,10,1\ngiRing ftgen 2,0,-384000,-2,0\n`;
const body = density => `instr 1\naInput=0\naL,aR CMGrainCoreExtended aInput,2,giSin,16384,${220 * 16384},${density},400,0,1,0,24,1,0.5,0.7,0,19,0,0,0,0,0,0,0\nouts aL,aR\nendin`;
const variants = [
    ['production', core],
    ['reader-bypassed', flatRead],
    ['envelope-flat', flatEnvelope],
    ['old-voices-bypassed', noOldVoices],
    ['voice-render-bypassed', noVoiceRender],
    ['zero-density-baseline', core],
];
const results = Object.fromEntries(variants.map(([name]) => [name, []]));

async function render(engine, seconds = duration, density = 120) {
    const csd = csdText(`${orchestra}${engine}\n${body(density)}`, `i1 0 ${seconds}\ne`);
    const result = await renderCsd(csd);
    assert.equal(result.samples.length, seconds * 48000 * 2);
    assert(result.samples.every(Number.isFinite));
    assert(!result.messages.some(m => /INIT ERROR|PERF ERROR|error:|samples out of range:\s*[1-9]/i.test(m)), result.messages.join(''));
    return result.renderMs;
}

async function renderInstrument(engine, instrument, seconds = duration) {
    const csd = csdText(`${orchestra}${engine}\n${instrument}`, `i1 0 ${seconds}\ne`);
    const result = await renderCsd(csd);
    assert.equal(result.samples.length, seconds * 48000 * 2);
    assert(result.samples.every(Number.isFinite));
    assert(!result.messages.some(m => /INIT ERROR|PERF ERROR|error:|samples out of range:\s*[1-9]/i.test(m)), result.messages.join(''));
    return result.renderMs;
}

// Warm each opcode path, then alternate paths over five rounds to reduce one-off
// JIT, process-start and background-load effects in this single-machine probe.
for (const [name, engine] of variants) await render(engine, 0.5, name === 'zero-density-baseline' ? 0 : 120);
for (let round = 0; round < 5; round++) {
    const order = [...variants].slice(round % variants.length).concat([...variants].slice(0, round % variants.length));
    for (const [name, engine] of order) results[name].push(await render(engine, duration, name === 'zero-density-baseline' ? 0 : 120));
}

const report = {
    timestamp: new Date().toISOString(),
    runtime: { node: process.version, platform: platform(), release: release(), cpu: cpus()[0]?.model ?? null, logicalCpus: cpus().length, totalMemory: totalmem() },
    workload: { sr: 48000, ksmps: 4, durationSeconds: duration, density: 120, sizeMs: 400, requestedOverlap: 48, window: 'triangle', pitch: 0, pitchJitter: 24 },
    measurement: 'Csound WASM offline wall time / audio duration; same machine, not a cross-device CPU percentage or callback dropout test',
    variants: Object.fromEntries(Object.entries(results).map(([name, times]) => [name, {
        renderMs: times.map(Math.round), medianMs: Math.round(median(times)),
        realtimePercent: median(times) / (duration * 10), minMs: Math.round(Math.min(...times)), maxMs: Math.round(Math.max(...times)),
    }])),
};
report.ablation = {
    estimatedReaderShare: Math.max(0, (report.variants.production.medianMs - report.variants['reader-bypassed'].medianMs) / report.variants.production.medianMs),
    estimatedEnvelopeShare: Math.max(0, (report.variants.production.medianMs - report.variants['envelope-flat'].medianMs) / report.variants.production.medianMs),
    estimatedOldVoicePathShare: Math.max(0, (report.variants.production.medianMs - report.variants['old-voices-bypassed'].medianMs) / report.variants.production.medianMs),
    estimatedVoiceRenderShare: Math.max(0, (report.variants.production.medianMs - report.variants['voice-render-bypassed'].medianMs) / report.variants.production.medianMs),
    note: 'Ablations are diagnostic estimates, not additive CPU accounting; bypassing old voices removes their rendering and voice-list management, not just state copies.',
};
await ensureResultsRoot();
await writeFile(resultPath('performance-report.json'), JSON.stringify(report, null, 2) + '\n');
for (const [name, value] of Object.entries(report.variants)) {
    console.log(`${name}: median ${value.medianMs} ms, range ${value.minMs}–${value.maxMs} ms, ${value.realtimePercent.toFixed(1)}% render time`);
}
console.log(`Ablation estimate: reader ${(100 * report.ablation.estimatedReaderShare).toFixed(1)}%, envelope ${(100 * report.ablation.estimatedEnvelopeShare).toFixed(1)}%, active-voice path ${(100 * report.ablation.estimatedOldVoicePathShare).toFixed(1)}%, render loop ${(100 * report.ablation.estimatedVoiceRenderShare).toFixed(1)}%`);

const moduleDuration = 1.5;
const zeroCv = Array(13).fill(0);
const moduleArgs = (density, size, wave = 0, window = 0, seed = 1, left = 2, right = 3, prefix = 'm') => {
    const values = [density, size, 0, 0, 0, 0, window, 64, 0, 0, -12, seed, wave, 0, 0, ...zeroCv, left, right];
    return `${values.map((value, index) => `k${prefix}${index} = ${value}`).join('\n')}\nGrainOsc ${values.map((_, index) => `k${prefix}${index}`).join(',')}`;
};
const oneModule = (density, size, wave, window, seed = 1) =>
    `instr 1\n${moduleArgs(density, size, wave, window, seed)}\naL zar 2\naR zar 3\nouts aL,aR\nendin`;
const moduleCases = [
    ['one-default-24x80', oneModule(24, 80, 0, 0)],
    ['one-24x400', oneModule(24, 400, 1, 1)],
    ['one-48x200', oneModule(48, 200, 1, 1)],
    ['one-max-48x400', oneModule(48, 400, 1, 1)],
    ['two-max-48x400', `instr 1\n${moduleArgs(48, 400, 1, 1, 1, 2, 3, 'a')}\n${moduleArgs(48, 400, 1, 1, 2, 4, 5, 'b')}\na1L zar 2\na1R zar 3\na2L zar 4\na2R zar 5\nouts a1L+a2L,a1R+a2R\nendin`],
];
const moduleTimes = Object.fromEntries(moduleCases.map(([name]) => [name, []]));
async function renderModule(orchestraBody, seconds = moduleDuration) {
    const csd = csdText(`${orchestra}${core}\n${oscWrapper}\n${orchestraBody}`, `i1 0 ${seconds}\ne`);
    const result = await renderCsd(csd);
    assert.equal(result.samples.length, seconds * 48000 * 2);
    assert(result.samples.every(Number.isFinite));
    assert(!result.messages.some(m => /INIT ERROR|PERF ERROR|error:|samples out of range:\s*[1-9]/i.test(m)), result.messages.join(''));
    return result.renderMs;
}
for (const [, caseBody] of moduleCases) await renderModule(caseBody, 0.5);
for (let round = 0; round < 5; round++) {
    const order = [...moduleCases].slice(round % moduleCases.length).concat([...moduleCases].slice(0, round % moduleCases.length));
    for (const [name, caseBody] of order) moduleTimes[name].push(await renderModule(caseBody));
}
const moduleSummary = Object.fromEntries(Object.entries(moduleTimes).map(([name, times]) => [name, {
    renderMs: times.map(Math.round), medianMs: Math.round(median(times)),
    realtimePercent: median(times) / (moduleDuration * 10), minMs: Math.round(Math.min(...times)), maxMs: Math.round(Math.max(...times)),
}]));
report.moduleWorkloads = moduleSummary;
console.log('Module wrapper medians:');
for (const [name, value] of Object.entries(moduleSummary)) {
    console.log(`  ${name}: ${value.medianMs} ms, range ${value.minMs}–${value.maxMs} ms, ${value.realtimePercent.toFixed(1)}% render time`);
}
await writeFile(resultPath('performance-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log('Same-machine performance regression passed.');

// Sample and Freeze switch to sinc interpolation on pitch-up. Measure that reader
// separately from Osc's band-limited wavetable path and from the active-voice loop.
const sampleInstrument = (density, pitch = 48, mode = 0, seed = 19, table = 'giSin', frames = 16384) =>
    `instr 1\naInput=${mode === 1 ? '0.2*oscili(1,440,giSin)' : '0'}\naL,aR CMGrainCoreExtended aInput,${mode},${table},${frames},48000,${density},400,0.5,0,${pitch},0,1,0.5,0.5,0,${seed},0,0,0,0,0,0,0\nouts aL,aR\nendin`;
const sampleCases = [
    ['one-sample-plus48-24x400', core, sampleInstrument(24)],
    ['one-sample-plus48-reader-bypassed', flatRead, sampleInstrument(24)],
    ['one-sample-pitch0-24x400', core, sampleInstrument(24, 0)],
    ['two-sample-plus48-24x400', core, `instr 1\naInput=0\na1L,a1R CMGrainCoreExtended aInput,0,giSin,16384,48000,24,400,0.5,0,48,0,1,0.5,0.5,0,19,0,0,0,0,0,0,0\na2L,a2R CMGrainCoreExtended aInput,0,giSin,16384,48000,24,400,0.5,0,48,0,1,0.5,0.5,0,20,0,0,0,0,0,0,0\nouts a1L+a2L,a1R+a2R\nendin`],
];
const sampleTimes = Object.fromEntries(sampleCases.map(([name]) => [name, []]));
for (const [, engine, instrument] of sampleCases) await renderInstrument(engine, instrument, 0.5);
for (let round = 0; round < 5; round++) {
    const order = [...sampleCases].slice(round % sampleCases.length).concat([...sampleCases].slice(0, round % sampleCases.length));
    for (const [name, engine, instrument] of order) sampleTimes[name].push(await renderInstrument(engine, instrument, 1.5));
}
report.sampleWorkloads = Object.fromEntries(Object.entries(sampleTimes).map(([name, times]) => [name, {
    renderMs: times.map(Math.round), medianMs: Math.round(median(times)),
    realtimePercent: median(times) / 15, minMs: Math.round(Math.min(...times)), maxMs: Math.round(Math.max(...times)),
}]));
await writeFile(resultPath('performance-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log('Sample/Freeze high-pitch wrapper-free medians:');
for (const [name, value] of Object.entries(report.sampleWorkloads)) {
    console.log(`  ${name}: ${value.medianMs} ms, range ${value.minMs}–${value.maxMs} ms, ${value.realtimePercent.toFixed(1)}% render time`);
}

// Fill the full eight-second ring before freezing, then measure the same 1.5 s
// high-pitch render against a recording-only baseline. This avoids timing mostly
// empty-ring startup as if it represented a frozen 400 ms grain workload.
const freezeDuration = 9.5;
const freezeLoadInstrument = active => `instr 1
kT timeinsts
kFreeze=${active ? '(kT >= 8 ? 1 : 0)' : '0'}
kDensity=${active ? '(kT >= 8 ? 24 : 0)' : '0'}
aInput=0.2*oscili(1,440,giSin)
aL,aR CMGrainCoreExtended aInput,1,giRing,384000,48000,kDensity,400,0.5,0,48,0,1,0.5,0.5,kFreeze,19,0,0,0,0,0,0,0
outs aL,aR
endin`;
const freezeTimes = { recordingOnly: [], fullRingThenPitchUp: [] };
for (let round = 0; round < 5; round++) {
    const order = round % 2 ? ['fullRingThenPitchUp', 'recordingOnly'] : ['recordingOnly', 'fullRingThenPitchUp'];
    for (const name of order) freezeTimes[name].push(await renderInstrument(core, freezeLoadInstrument(name === 'fullRingThenPitchUp'), freezeDuration));
}
const freezeSummary = Object.fromEntries(Object.entries(freezeTimes).map(([name, times]) => [name, {
    renderMs: times.map(Math.round), medianMs: Math.round(median(times)),
    realtimePercent: median(times) / (freezeDuration * 10), minMs: Math.round(Math.min(...times)), maxMs: Math.round(Math.max(...times)),
}]));
report.freezeWorkloads = {
    ringFrames: 384000, fillSeconds: 8, activeSeconds: 1.5,
    recordingOnly: freezeSummary.recordingOnly,
    fullRingThenPitchUp: freezeSummary.fullRingThenPitchUp,
    incrementalActiveRealtimePercent: Math.max(0, (freezeSummary.fullRingThenPitchUp.medianMs - freezeSummary.recordingOnly.medianMs) / (1.5 * 10)),
    note: 'The active case records for 8 s, freezes a full 8 s ring, then renders 1.5 s at +48 st, 24 grains/s, 400 ms. Incremental active percent subtracts the recording-only baseline.',
};
await writeFile(resultPath('performance-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Freeze full-ring +48 st active increment: ${report.freezeWorkloads.incrementalActiveRealtimePercent.toFixed(1)}% of one audio thread; total job ${freezeSummary.fullRingThenPitchUp.realtimePercent.toFixed(1)}%`);

// Measure the private snapshot-table allocation and its one-shot Csound copy cost.
const snapshotCopiesPerRender = 20;
const snapshotProbe = ({ tables, copies }) => `instr 1
${tables ? 'iSnapshotA ftgentmp 0,0,-384000,-2,0\niSnapshotB ftgentmp 0,0,-384000,-2,0\nkSnapshotA = iSnapshotA\nkSnapshotB = iSnapshotB' : 'kSnapshotA = 0\nkSnapshotB = 0'}
kTime timeinsts
${copies ? 'kNextCapture init 0\nif kTime >= kNextCapture then\n    kCapture = 1\n    kNextCapture = kNextCapture + 0.05\nelse\n    kCapture = 0\nendif' : 'kCapture = 0'}
aInput oscili 0.2,440,giSin
aL,aR CMGrainCoreExtended aInput,1,giRing,384000,48000,0,80,0.5,0,0,0,0,0.5,0,0,19,0,0,0,0,kSnapshotA,kSnapshotB,kCapture
outs aL,aR
endin`;
async function snapshotRender(options, seconds = 1) {
    const result = await renderCsd(csdText(`${orchestra}${core}\n${snapshotProbe(options)}`, `i1 0 ${seconds}\ne`));
    assert.equal(result.samples.length, seconds * 48000 * 2);
    assert(result.samples.every(Number.isFinite));
    assert(!result.messages.some(message => /INIT ERROR|PERF ERROR|error:|samples out of range:\s*[1-9]/i.test(message)), result.messages.join(''));
    return result;
}
const snapshotBaseline = await snapshotRender({ tables: false, copies: 0 });
const snapshotAllocated = await snapshotRender({ tables: true, copies: 0 });
const captureTimes = [], noCaptureTimes = [];
for (let round = 0; round < 5; round++) {
    const order = round % 2 ? [false, true] : [true, false];
    for (const capture of order) {
        const result = await snapshotRender({ tables: true, copies: capture ? snapshotCopiesPerRender : 0 });
        (capture ? captureTimes : noCaptureTimes).push(result.renderMs);
    }
}
const copyRenderDeltaMs = Math.max(0, median(captureTimes) - median(noCaptureTimes));
report.freezeSnapshots = {
    snapshotTablesPerFreeze: 2,
    measuredTableCopiesPerRender: snapshotCopiesPerRender,
    ringAndSnapshotFramesAt48k: 3 * 384000,
    wasmLinearMemoryWithoutSnapshotTables: snapshotBaseline.memoryBytes,
    wasmLinearMemoryWithTwoSnapshotTables: snapshotAllocated.memoryBytes,
    measuredAdditionalWasmLinearMemoryBytes: snapshotAllocated.memoryBytes - snapshotBaseline.memoryBytes,
    tableCopyRenderMs: { samples: captureTimes.map(value => Number(value.toFixed(2))), medianMs: Number(median(captureTimes).toFixed(2)) },
    noCopyRenderMs: { samples: noCaptureTimes.map(value => Number(value.toFixed(2))), medianMs: Number(median(noCaptureTimes).toFixed(2)) },
    incrementalCopyRenderMs: Number(copyRenderDeltaMs.toFixed(2)),
    estimatedMsPerTableCopy: Number((copyRenderDeltaMs / snapshotCopiesPerRender).toFixed(3)),
    note: 'WASM linear-memory growth compares otherwise identical Csound renders with and without two private 8 s snapshot tables; it includes 64 KiB page rounding. Copy cost is estimated from 20 rising-edge captures spaced 50 ms apart at zero density, subtracting an alternating no-copy render median.',
};
await writeFile(resultPath('performance-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Freeze snapshot tables add ${report.freezeSnapshots.measuredAdditionalWasmLinearMemoryBytes} WASM linear-memory bytes; 20 tablecopies add ${report.freezeSnapshots.incrementalCopyRenderMs} ms total (${report.freezeSnapshots.estimatedMsPerTableCopy} ms/copy).`);
console.log('Isolated high-pitch performance regression passed.');
