import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpus, platform, release, totalmem } from 'node:os';
import { renderCsd, csdText } from './lib/csound-node.mjs';
import { ensureResultsRoot, resultPath } from './lib/artifacts.mjs';
import { windowedAmplitude } from './lib/audio-metrics.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const core = await readFile(resolve(root, 'csound/GrainCore.txt'), 'utf8');
const reader = /        if iMode == 2 then\r?\n            ; Oscillator tables are already band-limited by their harmonic bank;\r?\n[\s\S]*?        endif\r?\n(?=        if iMode == 0 && kSeamWidthNow)/;
const linearCore = core.replace(reader, '        aSample tablexkt aIndex, kBlockSource[kVoice], 0, 2, 0, 0, 1\n');
assert.notEqual(linearCore, core, 'linear-reader comparison block');
assert(linearCore.includes('kOffset = 0'), 'comparison keeps the production scheduler');

const sr = 48000;
const prelude = `sr=${sr}\nksmps=4\nnchnls=2\n0dbfs=1\nzakinit 64,64\ngiSine ftgen 1,0,16384,10,1\ngiRing ftgen 3,0,-192000,-2,0\n`;
const sourceTable = (rate, tones) => `giProbe ftgen 2,0,-${rate},-2,0
iN=0
while iN < ${rate} do
    tableiw ${tones.map(({ hz, level }) => `${level}*sin(6.283185307179586*${hz}*iN/${rate})`).join(' + ')}, iN, giProbe
    iN += 1
od
`;
const wrapHz = hz => Math.abs(((hz + sr / 2) % sr + sr) % sr - sr / 2);
const amplitude = (samples, hz, from, seconds) => windowedAmplitude(samples, hz, sr, from, seconds);
const metrics = (r, duration, targetHz, spurHz, from, window) => {
    const target = amplitude(r.samples, targetHz, from, window);
    const spur = amplitude(r.samples, spurHz, from, window);
    let sum = 0, peak = 0;
    for (let i = 0; i < r.samples.length; i += 2) {
        const x = r.samples[i]; sum += x * x; peak = Math.max(peak, Math.abs(x));
    }
    return { targetHz, targetAmplitude: target, spurHz, spurAmplitude: spur,
        spurDbc: 20 * Math.log10(Math.max(spur, 1e-12) / Math.max(target, 1e-12)),
        rms: Math.sqrt(sum / (r.samples.length / 2)), peak, renderMs: Math.round(r.renderMs),
        realtimePercent: r.renderMs / (duration * 10) };
};
const render = async (engine, setup, body, duration) => {
    const r = await renderCsd(csdText(`${prelude}${setup}\n${engine}\n${body}`, `i1 0 ${duration}\ne`));
    assert.equal(r.samples.length, duration * sr * 2);
    assert(r.samples.every(Number.isFinite));
    assert(!r.messages.some(x => /INIT ERROR|PERF ERROR|error:|samples out of range:\s*[1-9]/i.test(x)), r.messages.join(''));
    return r;
};
const body = ({ mode = 0, table = 'giProbe', frames, rate, density = 40, size = 100,
    pitch = 48, freeze = '0', input = 'aInput=0', time = '' }) =>
    `instr 1\n${time}\n${input}\naL,aR CMGrainCoreExtended aInput,${mode},${table},${frames},${rate},${density},${size},0.5,0,${pitch},0,0,0.5,0,${freeze},19,0,0,0,0,0,0,0\nouts aL,aR\nendin`;
const report = {
    runtime: { node: process.version, platform: platform(), release: release(), cpu: cpus()[0]?.model ?? null, logicalCpus: cpus().length, totalMemory: totalmem() },
    interpolationImage: {}, sampleFoldback: [], freezeFoldback: {}, maxControlHighPitch: {},
};

// Linear interpolation image: 4 kHz table content at 1.5 samples/output becomes
// 6 kHz wanted output plus a distinct 18 kHz interpolation image.
{
    const setup = sourceTable(48000, [{ hz: 4000, level: 0.1 }]), b = body({ frames: 48000, rate: 72000, pitch: 0 });
    const [before, after] = await Promise.all([render(linearCore, setup, b, 1.5), render(core, setup, b, 1.5)]);
    const args = [6000, wrapHz((48000 - 4000) * 1.5), 0.35, 1];
    report.interpolationImage = { step: 1.5, linear: metrics(before, 1.5, ...args), bandlimited: metrics(after, 1.5, ...args) };
    console.log(`interpolation image: ${report.interpolationImage.linear.spurDbc.toFixed(1)} -> ${report.interpolationImage.bandlimited.spurDbc.toFixed(1)} dBc`);
}

// WAV rates covered by the plugin. A 400 Hz wanted tone lands at 6.4 kHz at
// +48 st; an 8 kHz source component folds to 16 kHz without bandlimiting.
for (const rate of [44100, 48000, 96000]) {
    const setup = sourceTable(rate, [{ hz: 400, level: 0.04 }, { hz: 8000, level: 0.04 }]);
    const b = body({ frames: rate, rate, pitch: 48 });
    const [before, after] = await Promise.all([render(linearCore, setup, b, 1.2), render(core, setup, b, 1.2)]);
    const result = { sourceRate: rate, step: 16 * rate / sr,
        linear: metrics(before, 1.2, 6400, 16000, 0.2, 0.8),
        bandlimited: metrics(after, 1.2, 6400, 16000, 0.2, 0.8) };
    report.sampleFoldback.push(result);
    console.log(`Sample ${rate} Hz +48 st foldback: ${result.linear.spurDbc.toFixed(1)} -> ${result.bandlimited.spurDbc.toFixed(1)} dBc`);
}

// Freeze live input and replay at +48 st. The browser workflow separately checks
// the module's 8 s ring; this 4 s ring makes the spectral comparison compact.
{
    const input = 'aLow oscili 0.04,400,giSine\naHigh oscili 0.04,8000,giSine\naInput=aLow+aHigh';
    const time = 'kT timeinsts\nkFreeze=(kT>=2?1:0)\nkDensity=(kT>=2?40:0)';
    const b = body({ mode: 1, table: 'giRing', frames: 192000, rate: sr, pitch: 48,
        freeze: 'kFreeze', input, time });
    const [before, after] = await Promise.all([render(linearCore, '', b, 3.5), render(core, '', b, 3.5)]);
    report.freezeFoldback = {
        linear: metrics(before, 3.5, 6400, 16000, 2.25, 1),
        bandlimited: metrics(after, 3.5, 6400, 16000, 2.25, 1),
    };
    console.log(`Freeze +48 st foldback: ${report.freezeFoldback.linear.spurDbc.toFixed(1)} -> ${report.freezeFoldback.bandlimited.spurDbc.toFixed(1)} dBc`);
}

// Short high-density/high-pitch stress render. Density 120 is deliberately above
// the public module cap; the 24/30 grain/s cases also compare two-instance loads.
{
    const setup = sourceTable(48000, [{ hz: 400, level: 0.04 }, { hz: 8000, level: 0.04 }]);
    const duration = 0.75;
    const max120 = await render(core, setup, body({ frames: 48000, rate: sr, pitch: 48, density: 120, size: 400 }), duration);
    const max30 = await render(core, setup, body({ frames: 48000, rate: sr, pitch: 48, density: 30, size: 400 }), duration);
    const max24 = await render(core, setup, body({ frames: 48000, rate: sr, pitch: 48, density: 24, size: 400 }), duration);
    const dualBody = `instr 1\naInput=0\na1L,a1R CMGrainCoreExtended aInput,0,giProbe,48000,${sr},30,400,0.5,0,48,0,0,0.5,0,0,19,0,0,0,0,0,0,0\na2L,a2R CMGrainCoreExtended aInput,0,giProbe,48000,${sr},30,400,0.5,0,48,0,0,0.5,0,0,20,0,0,0,0,0,0,0\nouts a1L+a2L,a1R+a2R\nendin`;
    const dual = await render(core, setup, dualBody, duration);
    const dual24 = await render(core, setup, dualBody.replaceAll(`${sr},30,400`, `${sr},24,400`), duration);
    report.maxControlHighPitch = {
        density120Size400: metrics(max120, duration, 6400, 16000, 0.2, 0.5),
        density30Size400: metrics(max30, duration, 6400, 16000, 0.2, 0.5),
        density24Size400: metrics(max24, duration, 6400, 16000, 0.2, 0.5),
        twoInstancesDensity30Size400: metrics(dual, duration, 6400, 16000, 0.2, 0.5),
        twoInstancesDensity24Size400: metrics(dual24, duration, 6400, 16000, 0.2, 0.5),
    };
    console.log(`+48 st density 120: ${report.maxControlHighPitch.density120Size400.realtimePercent.toFixed(1)}%; density 30: ${report.maxControlHighPitch.density30Size400.realtimePercent.toFixed(1)}%; two at 30: ${report.maxControlHighPitch.twoInstancesDensity30Size400.realtimePercent.toFixed(1)}%; two at 24: ${report.maxControlHighPitch.twoInstancesDensity24Size400.realtimePercent.toFixed(1)}% realtime`);
}

const reductions = report.sampleFoldback.map(x => x.linear.spurDbc - x.bandlimited.spurDbc);
assert(reductions.every(db => db >= 15), `Sample alias reduction <15 dB: ${reductions}`);
assert(report.freezeFoldback.linear.spurDbc - report.freezeFoldback.bandlimited.spurDbc >= 15, 'Freeze alias reduction <15 dB');
assert(report.interpolationImage.linear.spurDbc - report.interpolationImage.bandlimited.spurDbc >= 10, 'Interpolation image reduction <10 dB');
await ensureResultsRoot();
await writeFile(resultPath('spectral-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log('Spectral regression checks passed.');
