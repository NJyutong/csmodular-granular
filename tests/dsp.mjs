import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { GrainSamples } from '../../csmodular-main/src/csound/GrainSamples.js';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let core = await readFile(resolve(root, 'csound/GrainCore.txt'), 'utf8');
if (process.env.DSP_DEBUG) core = core.replace('    xout aLeft, aRight', '    printks "clock=%f active=%f gain=%f smooth=%f aout=%f\\n", 0.1, kClock,kCount,kGain,kSmoothedActive,k(aLeft)\n    xout aLeft, aRight');
const wrappers = await Promise.all(['GrainFreeze', 'GrainSample', 'GrainOsc'].map(n => readFile(resolve(root, 'modules', `${n}.txt`), 'utf8')));
const forbidden = /\b(partikkel|partikkelsync|grain|grain2|grain3|syncgrain|granule|diskgrain|fof|fof2|fog|sndwarp|sndwarpst|mincer|temposcal)\b/i;
for (const text of [core, ...wrappers]) assert(!forbidden.test(text.replace(/;.*/g, '')), 'Built-in granular opcode in DSP');
const server = createServer(async (req, res) => {
    if (req.url === '/') { res.end('<!doctype html><title>CsModular DSP tests</title>'); return; }
    try {
        const bytes = await readFile(resolve(root, 'node_modules/@csound/browser/dist/csound.js'));
        res.setHeader('Content-Type', 'text/javascript'); res.end(bytes);
    } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const executablePath = process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage();
const output = resolve(root, 'test-results');
const report = [];
await mkdir(output, { recursive: true });
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.evaluate(async () => { window.Csound = (await import('/csound.js')).Csound; });
const prelude = `sr=48000\nksmps=4\nnchnls=2\n0dbfs=1\nzakinit 64,64\ngiSin ftgen 1,0,16384,10,1\n`;
function parseWave(bytes) {
    const buffer = Buffer.from(bytes);
    let data, channels, rate, bits, format;
    for (let off = 12; off + 8 <= buffer.length;) {
        const tag = buffer.toString('ascii', off, off + 4), size = buffer.readUInt32LE(off + 4), start = off + 8;
        if (tag === 'fmt ') { format = buffer.readUInt16LE(start); channels = buffer.readUInt16LE(start + 2); rate = buffer.readUInt32LE(start + 4); bits = buffer.readUInt16LE(start + 14); }
        if (tag === 'data') data = buffer.subarray(start, start + size);
        off = start + size + size % 2;
    }
    assert(data && channels === 2 && rate === 48000 && bits === 32 && [3, 65534].includes(format), 'Float stereo WAV output');
    const samples = Float32Array.from({ length: data.length / 4 }, (_, i) => data.readFloatLE(i * 4));
    assert(samples.every(Number.isFinite), 'Finite audio');
    return { samples, hash: createHash('sha256').update(data).digest('hex') };
}
function rms(samples, channel = 0, from = 0, to = samples.length / 2) {
    let sum = 0;
    for (let i = from; i < to; i++) sum += samples[2 * i + channel] ** 2;
    return Math.sqrt(sum / Math.max(1, to - from));
}
async function render(name, body, { duration = 1, extra = '', score = '', files = [] } = {}) {
    const csd = `<CsoundSynthesizer>\n<CsOptions>\n-d -m0 -h -f -o result.raw\n</CsOptions>\n<CsInstruments>\n${prelude}${extra}\n${core}\n${body}\n</CsInstruments>\n<CsScore>\ni1 0 ${duration}\n${score}\ne\n</CsScore>\n</CsoundSynthesizer>`;
    const result = await page.evaluate(async ({ csd, files }) => {
        const cs = await window.Csound({ useWorker: true, useSAB: false });
        const messages = [];
        cs.on('message', msg => messages.push(String(msg)));
        try {
            for (const file of files) await cs.fs.writeFile(file.name, Uint8Array.from(file.bytes));
            const code = await cs.compileCSD(csd);
            if (code !== 0) throw new Error('Compile result ' + code + '\n' + messages.join('\n'));
            const done = new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('Render timeout')), 45000);
                cs.on('renderEnded', () => { clearTimeout(timer); resolve(); });
            });
            const started = performance.now();
            await cs.start();
            await done;
            await cs.reset();
            const bytes = Array.from(await cs.fs.readFile('result.raw'));
            return { bytes, messages, renderMs: performance.now() - started };
        } catch (e) { throw new Error(e.message + '\n' + messages.join('\n')); }
        finally { await cs.terminateInstance(); }
    }, { csd, files });
    assert(!result.messages.some(m => /INIT ERROR|PERF ERROR|error:|out of range/i.test(m)), result.messages.join('\n'));
    if (process.env.DSP_DEBUG) console.log(result.messages.join('\n'));
    // beta33's WASI seek corrupts rewritten WAV headers; raw output is append-only.
    // Add a transport header for inspection without changing the rendered samples.
    const wav = Buffer.alloc(44 + result.bytes.length);
    wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
    wav.writeUInt32LE(16, 16); wav.writeUInt16LE(3, 20); wav.writeUInt16LE(2, 22);
    wav.writeUInt32LE(48000, 24); wav.writeUInt32LE(384000, 28); wav.writeUInt16LE(8, 32); wav.writeUInt16LE(32, 34);
    wav.write('data', 36); wav.writeUInt32LE(result.bytes.length, 40); Buffer.from(result.bytes).copy(wav, 44);
    await writeFile(resolve(output, `${name}.wav`), wav);
    const audio = parseWave(wav);
    assert.equal(audio.samples.length, duration * 48000 * 2, 'Rendered duration');
    const peak = audio.samples.reduce((p, v) => Math.max(p, Math.abs(v)), 0);
    console.log(`${name}: rms=${rms(audio.samples).toFixed(6)}, peak=${peak.toFixed(6)}`);
    report.push({ name, duration, rms: rms(audio.samples), peak, sha256: audio.hash, renderMs: result.renderMs });
    return { ...audio, peak };
}
const call = ({ density = 24, size = 80, position = 0.2, jitter = 0.1, pitch = 0, pitchJitter = 0, window = 0, pan = 0.5, spread = 0.7, freeze = 0, seed = 19 } = {}) =>
    `aL,aR CMGrainCore aIn,2,giSin,16384,3604480,${density},${size},${position},${jitter},${pitch},${pitchJitter},${window},${pan},${spread},${freeze},${seed}`;
const body = options => `instr 1\naIn=0\n${call(options)}\nouts aL,aR\nendin`;
try {
    if (process.env.DSP_DEBUG) {
        await render('direct', 'instr 1\naA oscili 0.3,220\nouts aA,aA\nendin');
        await render('sanity', 'opcode Probe,aa,0\nsetksmps 1\naA oscili 0.3,220\nxout aA,aA\nendop\ninstr 1\naL,aR Probe\nouts aL,aR\nendin');
    }
    if (!process.env.WRAPPERS_ONLY) {
    const basic = await render('osc', body());
    assert(rms(basic.samples) > 0.01 && basic.peak <= 1);
    const repeat = await render('repeat', body());
    assert.equal(basic.hash, repeat.hash, 'Seed reproducibility');
    const different = await render('different-seed', body({ seed: 20 }));
    assert.notEqual(basic.hash, different.hash);
    const silent = await render('density-zero', body({ density: 0 }));
    assert.equal(silent.peak, 0);
    const stress = await render('saturation', body({ density: 200, size: 500, pitch: 48, jitter: 1, pitchJitter: 24, window: 1 }));
    assert(stress.peak <= 1 && stress.peak > 0.01);
    const pan = await render('pan-left', body({ pan: 0, spread: 0 }));
    assert.equal(rms(pan.samples, 1), 0);
    const isolated = await render('two-instances', `instr 1\naIn=0\n${call()}\naOtherL,aOtherR CMGrainCore aIn,2,giSin,16384,3604480,200,500,0.9,1,-24,24,1,0,1,0,999\nouts aL,aR\nendin`);
    assert.equal(basic.hash, isolated.hash, 'Instance-local RNG and voices');
    const tail = await render('density-tail', `instr 1\naIn=0\nkTime timeinsts\nkDensity=(kTime<0.4?40:0)\n${call({ density: 'kDensity', size: 100 })}\nouts aL,aR\nendin`);
    assert(rms(tail.samples, 0, 19200, 22000) > 0.01, 'Existing grains survive density zero');
    assert.equal(rms(tail.samples, 0, 26000), 0, 'Voices expire');
    const liveBody = after => `instr 1\niRing ftgentmp 0,0,-192000,-2,0\nkTime timeinsts\nkFreeze=(kTime>=4.3?1:0)\nkAmp=(kTime<4.3?0.4:${after})\naIn oscili kAmp,330\naL,aR CMGrainCore aIn,1,iRing,192000,sr,40,120,0.3,0.1,12,2,0,0.5,0.4,kFreeze,42\nouts aL,aR\nendin`;
    const frozen = await render('freeze-after-wrap', liveBody(0), { duration: 5 });
    const frozenChanged = await render('freeze-ignore-input', liveBody(0.9), { duration: 5 });
    assert.equal(frozen.hash, frozenChanged.hash, 'Frozen ring ignores all new input');
    assert(rms(frozen.samples, 0, 220000) > 0.01, 'Freeze continues playback');
    const emptyFrozen = await render('empty-frozen', 'instr 1\niRing ftgentmp 0,0,-192000,-2,0\naIn=0.5\naL,aR CMGrainCore aIn,1,iRing,192000,sr,200,500,1,1,48,24,1,0.5,1,1,1\nouts aL,aR\nendin');
    assert.equal(emptyFrozen.peak, 0, 'Unrecorded ring stays silent');
    const windowBody = shape => `instr 1\naIn=0\naL,aR CMGrainCore aIn,0,giConstant,2,sr,4,100,1,1,-48,0,${shape},0,0,0,7\nouts aL,aR\nendin`;
    for (const shape of [0, 1]) {
        const windowed = await render(`window-${shape}-short-source`, windowBody(shape), { extra: 'giConstant ftgen 0,0,2,-2,1,1' });
        // Constant two-frame source isolates the analytic window, lifespan and wrap.
        const first = windowed.samples.findIndex(v => Math.abs(v) > 1e-8) / 2;
        const start = first - 1;
        assert(Math.abs(start - 11999) <= 1, 'Sample-accurate density trigger');
        for (const age of [0, 1200, 2400, 4799]) {
            const phase = age / 4799;
            const envelope = shape ? 1 - Math.abs(2 * phase - 1) : 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);
            assert(Math.abs(windowed.samples[(start + age) * 2] - Math.tanh(envelope)) < 1e-5, 'Window shape and zero endpoints');
        }
    }
    }
    const wrapperArgs = [24,80,32,8,0,0,0,64,64,0,127,90,1];
    const wrapped = await render('zak-through-gain', `${wrappers[2]}\ninstr 1\nGrainOsc ${[...wrapperArgs,0,1,...Array(12).fill(1),2,3].join(',')}\naL zar 2\naR zar 3\nzaw aL*0.25,4\nzaw aR*0.25,5\naOutL zar 4\naOutR zar 5\nouts aOutL,aOutR\nendin`);
    assert(rms(wrapped.samples) > 0.01 && wrapped.peak < 0.25, 'Module outputs reach downstream Zak DSP');
    const wrappedLive = await render('freeze-wrapper', `${wrappers[0]}\ninstr 1\naSource oscili 0.4,330\nzaw aSource,6\nGrainFreeze ${[...wrapperArgs,6,...Array(12).fill(1),2,3].join(',')}\naL zar 2\naR zar 3\nouts aL,aR\nendin`);
    assert(rms(wrappedLive.samples) > 0.01);
    // Test input is synthesized here, not borrowed audio. JS only builds a fixture.
    const sampleBytes = Buffer.alloc(44 + 4410 * 2);
    sampleBytes.write('RIFF'); sampleBytes.writeUInt32LE(sampleBytes.length - 8,4); sampleBytes.write('WAVEfmt ',8);
    sampleBytes.writeUInt32LE(16,16); sampleBytes.writeUInt16LE(1,20); sampleBytes.writeUInt16LE(1,22);
    sampleBytes.writeUInt32LE(44100,24); sampleBytes.writeUInt32LE(88200,28); sampleBytes.writeUInt16LE(2,32); sampleBytes.writeUInt16LE(16,34);
    sampleBytes.write('data',36); sampleBytes.writeUInt32LE(8820,40);
    for(let i=0;i<4410;i++) sampleBytes.writeInt16LE(Math.round(16000*Math.sin(2*Math.PI*440*i/44100)),44+i*2);
    const bank = new GrainSamples();
    const entry = await bank.load(1, new File([sampleBytes], 'test.wav'));
    const sample = await render('sample-wrapper-44100', `${wrappers[1]}\ninstr 1\nGrainSample ${[...wrapperArgs,1,0,1,...Array(12).fill(1),2,3].join(',')}\naL zar 2\naR zar 3\nouts aL,aR\nendin`,
        { extra: bank.orchestra(), files: [{ name: entry.path, bytes: Array.from(entry.bytes) }] });
    assert(rms(sample.samples) > 0.01);
    const empty = await render('sample-empty', `${wrappers[1]}\ninstr 1\nGrainSample ${[...wrapperArgs,8,0,1,...Array(12).fill(1),2,3].join(',')}\naL zar 2\naR zar 3\nouts aL,aR\nendin`, { extra: new GrainSamples().orchestra() });
    assert.equal(empty.peak, 0);
    await writeFile(resolve(output, 'dsp-report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('Core DSP checks passed.');
} finally {
    await browser.close();
    server.close();
}
