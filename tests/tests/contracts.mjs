import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getHostRoot } from './lib/host-root.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const host = getHostRoot(root);
const hostModule = path => import(pathToFileURL(resolve(host, path)).href);
const [{ CsoundGenerator }, { GrainSamples }, { CsoundEngine }, { parseModuleDefinition }] = await Promise.all([
    hostModule('src/csound/CsoundGenerator.js'),
    hostModule('src/csound/GrainSamples.js'),
    hostModule('src/csound/CsoundEngine.js'),
    hostModule('src/api/libraryStore.js'),
]);

test('Shared dependencies load once before every caller; missing/cyclic dependencies fail', async () => {
    const generator = new CsoundGenerator();
    generator.includes = new Set(['A.txt', 'B.txt']);
    const sources = { 'A.txt': ';@ requires Shared.txt\nopcode A,0,0\nendop', 'B.txt': ';@ requires Shared.txt\nopcode B,0,0\nendop', 'Shared.txt': 'opcode Shared,0,0\nendop' };
    generator._loadUdoByPath = async path => sources[path];
    assert.deepEqual(await generator.loadAllUdoContents(), [sources['Shared.txt'], sources['A.txt'], sources['B.txt']]);
    delete sources['Shared.txt'];
    await assert.rejects(generator.loadAllUdoContents(), /dependency not available/);
    sources['Shared.txt'] = ';@ requires A.txt\nopcode Shared,0,0\nendop';
    await assert.rejects(generator.loadAllUdoContents(), /Circular/);
});

test('Public module definitions match the actual Csound signatures and static jack contract', async () => {
    const expected = {
        GrainFreeze: { params: 18, inputs: [101, ...Array.from({ length: 12 }, (_, i) => i + 102), 115, 116, 117] },
        GrainSample: { params: 16, inputs: [...Array.from({ length: 10 }, (_, i) => i + 102), 113, 115, 116] },
        GrainOsc: { params: 15, inputs: [...Array.from({ length: 10 }, (_, i) => i + 102), 113, 115, 116] },
    };
    for (const [name, contract] of Object.entries(expected)) {
        const js = await readFile(resolve(root, `modules/${name}.js`), 'utf8');
        const udo = await readFile(resolve(root, `modules/${name}.txt`), 'utf8');
        const definition = parseModuleDefinition(js);
        assert(definition);
        assert.deepEqual(definition.params, definition.components.filter(c => ['Knob','ButtonIncDec','ButtonText'].includes(c.componentType)).map(c => Number(c.id)));
        const args = definition.params.length + definition.inputs.length + definition.outputs.length;
        assert.equal(udo.match(/^opcode \w+, 0, (k+)$/m)[1].length, args);
        assert.equal(udo.match(/^\s*(.*?) xin$/m)[1].split(',').length, args);
        assert.equal(definition.params.length, contract.params);
        assert.deepEqual(definition.inputs, contract.inputs);
        assert.equal(definition.outputs.length, 2);
        const density = definition.components.find(c => c.componentType === 'Knob' && c.csoundName === 'Density');
        const densityLimit = name === 'GrainOsc' ? 48 : 24;
        assert.deepEqual([density.min, density.max, density.defaultValue], [0, densityLimit, name === 'GrainOsc' ? 24 : 12]);
        assert.match(udo, new RegExp(`kDensity = kDensity \\+ kDensityCV \\* ${densityLimit}`));
        assert.match(udo, new RegExp(`kDensity limit kDensity, 0, ${densityLimit}`));
        const timing = definition.components.find(c => c.componentType === 'Knob' && c.csoundName === 'TimeJitter');
        assert.deepEqual([timing.min, timing.max, timing.defaultValue], [0, 100, 0]);
        assert(definition.components.some(c => c.componentType === 'Input' && c.id === '115'), 'Timing scatter has an independent CV jack');
        assert(definition.components.filter(c => ['Input','Output'].includes(c.componentType)).every(c => c.bandwidth === 'static'));
        assert.equal((udo.match(/^opcode /gm) || []).length, 1);
        assert.match(udo, /^;@ requires GrainCore.txt/m);
        const window = definition.components.find(c => c.csoundName === 'Window');
        assert.equal(window.itemsI18n.en.split(',').length, 3, 'three selectable grain windows');
        assert.equal(window.indexValue, true, 'three-way window selection preserves its full index');
        assert(definition.components.some(c => c.csoundName === 'Reverse'), 'grain direction control');
    }
    for (const name of ['GrainSample', 'GrainOsc']) {
        const js = await readFile(resolve(root, `modules/${name}.js`), 'utf8');
        const udo = await readFile(resolve(root, `modules/${name}.txt`), 'utf8');
        const definition = parseModuleDefinition(js);
        assert(!definition.components.some(c => c.componentType === 'Input' && c.id === '101'), `${name} has no dry audio input`);
        assert(!definition.components.some(c => c.csoundName === 'Mix'), `${name} has no dry/wet control`);
        assert(!/^\s*aDry zar /m.test(udo), `${name} reads no audio input Zak bus`);
        assert(!/kMix/.test(udo), `${name} has no dry/wet UDO argument`);
        assert.match(udo, /aOutL limit aWetL \* aLevel/);
        assert.match(udo, /aOutR limit aWetR \* aLevel/);
    }
});

test('Grain Osc phase warp reuses the saved Phase slot and CV jack', async () => {
    const js = await readFile(resolve(root, 'modules/GrainOsc.js'), 'utf8');
    const definition = parseModuleDefinition(js);
    const phase = definition.components.find(c => c.componentType === 'Knob' && c.id === '3');
    const phaseLabel = definition.components.find(c => c.componentType === 'TextLabel' && c.id === '302');
    const phaseCv = definition.components.find(c => c.componentType === 'Input' && c.id === '104');
    const jitterLabel = definition.components.find(c => c.componentType === 'TextLabel' && c.id === '303');
    assert.equal(phase.csoundName, 'PhaseWarp');
    // A new Grain Osc must start as the plain wave: zero warp, zero phase jitter. Old patches keep their saved value.
    assert.deepEqual([phase.min, phase.max, phase.defaultValue], [0, 127, 0]);
    assert.equal(definition.components.find(c => c.componentType === 'Knob' && c.id === '4').defaultValue, 0);
    const wave = definition.components.find(c => c.componentType === 'Knob' && c.id === '14');
    assert.equal(phase.y, wave.y, 'Phase warp sits next to Waveform in the Tone section');
    assert.equal(definition.components.find(c => c.componentType === 'TextLabel' && c.id === '309').text, 'Hold warp', 'Hold holds the warp amount, not a phase');
    assert.equal(phaseLabel.text, 'Phase warp');
    assert.equal(phaseCv.ConnectorName, 'Phase warp CV');
    assert.equal(jitterLabel.text, 'Phase jitter');
    assert.equal(definition.components.find(c => c.componentType === 'Input' && c.id === '105').ConnectorName, 'Phase jitter CV');
    assert.equal(definition.params[2], 3);

    // The demo patch stands in for a saved project from before the DSP change:
    // its existing value remains at the same serialized parameter index.
    const patch = JSON.parse(await readFile(resolve(root, 'examples/pulvis-demo.json'), 'utf8'));
    const saved = JSON.parse(patch.modules.find(m => m.name === 'GrainOsc').parameters);
    assert.equal(saved[3], 0);
    assert.equal(saved.length, Math.max(...definition.params) + 1);
});

function wave({ rate = 44100, frames = 8, channels = 2, bits = 16 } = {}) {
    const align = channels * bits / 8;
    const b = Buffer.alloc(44 + frames * align);
    b.write('RIFF'); b.writeUInt32LE(b.length - 8, 4); b.write('WAVEfmt ', 8);
    b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(channels, 22);
    b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * align, 28); b.writeUInt16LE(align, 32); b.writeUInt16LE(bits, 34);
    b.write('data', 36); b.writeUInt32LE(frames * align, 40);
    return new File([b], 'input.wav');
}

test('WAV validation rejects malformed inputs without replacing a valid slot', async () => {
    const bank = new GrainSamples();
    const original = await bank.load(1, wave());
    const truncated = Buffer.from(await wave().arrayBuffer());
    truncated.writeUInt32LE(36, 4);
    for (const invalid of [null, new File([truncated], 'bad-riff.wav'), new File(['bad'], 'input.wav'), wave({ rate: 1 }), wave({ channels: 3 }), wave({ frames: 1 }), wave({ rate: 8000, frames: 2400001 })]) {
        await assert.rejects(bank.load(1, invalid));
        assert.equal(bank.slots.get(1), original);
    }
    await assert.rejects(bank.load(0, wave()));
    await assert.rejects(bank.load(9, wave()));
    await assert.rejects(bank.load(1, { size: 257 * 1024 * 1024 }));
});

test('Sample bytes upload once per Csound instance; replacements use unique paths', async () => {
    const bank = new GrainSamples(), writes = [], removed = [];
    const csound = { fs: { writeFile: async (path, bytes) => writes.push([path, bytes]), unlink: async path => removed.push(path) } };
    const first = await bank.load(1, wave());
    await bank.upload(csound);
    await bank.upload(csound);
    assert.equal(writes.length, 1);
    const second = await bank.load(1, wave());
    assert.notEqual(first.path, second.path);
    await bank.upload(csound);
    assert.equal(writes.length, 2);
    assert.deepEqual(removed, [first.path]);
    await bank.upload({ fs: csound.fs });
    assert.equal(writes.length, 3);
    assert.match(bank.orchestra(), /ftsr\(giGrainSample1\)/);
    assert.equal((bank.orchestra().match(/ ftgen /g) || []).length, 8);
});

test('Failed running sample import restores the old slot and restarts it', async () => {
    const engine = new CsoundEngine({});
    const previous = await engine.grainSamples.load(1, wave());
    engine.state = 'running';
    let starts = 0;
    engine._stop = async () => { engine.state = 'idle'; };
    engine._init = async () => { engine.state = ++starts === 1 ? 'error' : 'running'; return starts > 1; };
    await assert.rejects(engine.loadGrainSample(1, wave()), /Csound/);
    assert.equal(engine.grainSamples.slots.get(1), previous);
    assert.equal(engine.state, 'running');
    assert.equal(engine._loadingGrainSample, false);
});


test('a transport stop during file reading finishes after the sample transaction', async () => {
    const engine = new CsoundEngine({});
    engine.state = 'running';
    engine._stop = async () => { engine.state = 'idle'; };
    engine._init = async () => { engine.state = 'running'; return true; };
    const file = wave();
    let release;
    const blocked = new Promise(resolve => { release = resolve; });
    const loading = engine.loadGrainSample(1, { size: file.size, arrayBuffer: async () => {
        await blocked;
        return file.arrayBuffer();
    } });
    const stopping = engine.stop();
    await assert.rejects(engine.loadGrainSample(1, file));
    release();
    await Promise.all([loading, stopping]);
    assert.equal(engine.state, 'idle');
    assert.equal(engine.grainSamples.slots.size, 1);
});

test('WAV import accepts more than 32 MiB and more than 60 seconds', async () => {
    const bank = new GrainSamples();
    const file = wave({frames: 8_700_000});
    assert(file.size > 32 * 1024 * 1024);
    const entry = await bank.load(1, file);
    assert.equal(entry.bytes.length, file.size);
    assert.equal(entry.frames, 8_700_000);
});

test('Language preferences select independent Chinese, Russian and English locales', async () => {
    const {getUiLanguage, localize} = await hostModule('src/utils/locale.js');
    assert.equal(getUiLanguage(['ru-RU','en-US']), 'ru');
    assert.equal(getUiLanguage(['zh-CN','ru-RU']), 'zh');
    assert.equal(getUiLanguage(['en-US','zh-CN']), 'en');
    assert.equal(getUiLanguage(['tr-TR']), 'en');
    assert.equal(localize({en:'English',ru:'Русский',zh:'中文'},'ru'), 'Русский');
});

test('Generated modules expose the expected parameter and jack interfaces', async () => {
    const expected = {
        GrainFreeze: { params: Array.from({ length: 18 }, (_, i) => i + 1), inputs: [101, ...Array.from({ length: 12 }, (_, i) => i + 102), 115, 116, 117] },
        GrainSample: { params: [...Array.from({ length: 10 }, (_, i) => i + 1), 12, 13, 14, 15, 16, 17], inputs: [...Array.from({ length: 10 }, (_, i) => i + 102), 113, 115, 116] },
        GrainOsc: { params: [...Array.from({ length: 10 }, (_, i) => i + 1), 12, 13, 14, 15, 16], inputs: [...Array.from({ length: 10 }, (_, i) => i + 102), 113, 115, 116] },
    };
    for (const [name, contract] of Object.entries(expected)) {
        const { [`${name}Module`]: definition } = await import(pathToFileURL(resolve(root, `modules/${name}.js`)).href + `?contract=${Date.now()}`);
        assert.deepEqual(definition.params, contract.params, `${name} parameter IDs`);
        assert.deepEqual(definition.inputs, contract.inputs, `${name} input IDs`);
        assert.deepEqual(definition.outputs, [201, 202], `${name} output IDs`);
    }
});
