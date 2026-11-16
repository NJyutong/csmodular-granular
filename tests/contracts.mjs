import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CsoundGenerator } from '../../csmodular-main/src/csound/CsoundGenerator.js';
import { GrainSamples } from '../../csmodular-main/src/csound/GrainSamples.js';
import { CsoundEngine } from '../../csmodular-main/src/csound/CsoundEngine.js';
import { parseModuleDefinition } from '../../csmodular-main/src/api/libraryStore.js';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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
    for (const name of ['GrainFreeze', 'GrainSample', 'GrainOsc']) {
        const js = await readFile(resolve(root, `modules/${name}.js`), 'utf8');
        const udo = await readFile(resolve(root, `modules/${name}.txt`), 'utf8');
        const definition = parseModuleDefinition(js);
        assert(definition);
        assert.deepEqual(definition.params, definition.components.filter(c => ['Knob','ButtonIncDec'].includes(c.componentType)).map(c => Number(c.id)));
        const args = definition.params.length + definition.inputs.length + definition.outputs.length;
        assert.equal(udo.match(/^opcode \w+, 0, (k+)$/m)[1].length, args);
        assert.equal(udo.match(/^\s*(.*?) xin$/m)[1].split(',').length, args);
        assert.equal(definition.inputs.length, 13);
        assert.equal(definition.outputs.length, 2);
        assert(definition.components.filter(c => ['Input','Output'].includes(c.componentType)).every(c => c.bandwidth === 'static'));
        assert.equal((udo.match(/^opcode /gm) || []).length, 1);
        assert.match(udo, /^;@ requires GrainCore.txt/m);
    }
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
    for (const invalid of [new File(['bad'], 'input.wav'), wave({ rate: 1 }), wave({ channels: 3 }), wave({ frames: 1 }), wave({ rate: 8000, frames: 2400001 })]) {
        await assert.rejects(bank.load(1, invalid));
        assert.equal(bank.slots.get(1), original);
    }
    await assert.rejects(bank.load(0, wave()));
    await assert.rejects(bank.load(9, wave()));
    await assert.rejects(bank.load(1, { size: 257 * 1024 * 1024 }));
});

test('Sample bytes upload once per Csound instance; replacements use unique paths', async () => {
    const bank = new GrainSamples(), writes = [];
    const csound = { fs: { writeFile: async (path, bytes) => writes.push([path, bytes]) } };
    const first = await bank.load(1, wave());
    await bank.upload(csound);
    await bank.upload(csound);
    assert.equal(writes.length, 1);
    const second = await bank.load(1, wave());
    assert.notEqual(first.path, second.path);
    await bank.upload(csound);
    assert.equal(writes.length, 2);
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
    engine.stop = async () => { engine.state = 'idle'; };
    engine.init = async () => { engine.state = ++starts === 1 ? 'error' : 'running'; return starts > 1; };
    await assert.rejects(engine.loadGrainSample(1, wave()), /Csound/);
    assert.equal(engine.grainSamples.slots.get(1), previous);
    assert.equal(engine.state, 'running');
    assert.equal(engine._loadingGrainSample, false);
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
    const {getUiLanguage, localize} = await import('../../csmodular-main/src/utils/locale.js');
    assert.equal(getUiLanguage(['ru-RU','en-US']), 'ru');
    assert.equal(getUiLanguage(['zh-CN','ru-RU']), 'zh');
    assert.equal(getUiLanguage(['en-US','zh-CN']), 'en');
    assert.equal(getUiLanguage(['tr-TR']), 'en');
    assert.equal(localize({en:'English',ru:'Русский',zh:'中文'},'ru'), 'Русский');
});
