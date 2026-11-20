import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { getHostRoot } from './lib/host-root.mjs';
import { createHostWorkflowBrowserTools, getChromePath, loopbackViteOptions } from './lib/host-workflow-browser.mjs';
import { ensureResultsRoot, resultsRoot } from './lib/artifacts.mjs';
import { monoPcm16Wave } from './lib/wav-fixtures.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const host = getHostRoot(root);
const uiHost = process.env.CSMODULAR_UI_HOST_ROOT;
if (!process.env.CSMODULAR_HOST_ROOT) throw new Error('Set CSMODULAR_HOST_ROOT to the isolated host at 10136ca.');
if (!uiHost) throw new Error('Set CSMODULAR_UI_HOST_ROOT to the installed host snapshot at 9dbe666.');
const output = resultsRoot;
await ensureResultsRoot();

const sampleA = resolve(output, 'workflow-sample-a.wav');
const sampleB = resolve(output, 'workflow-sample-b.wav');
const invalidSample = resolve(output, 'workflow-invalid-sample.wav');
await writeFile(sampleA, monoPcm16Wave({ frequency: 220 }));
await writeFile(sampleB, monoPcm16Wave({ frequency: 440, shape: 'ramp' }));
await writeFile(invalidSample, Buffer.from('not a wave file'));

// Native config loading avoids Vite's temporary bundle under the host's read-only node_modules junction.
globalThis.__dirname = host;
const server = await createServer({
    root: host,
    configFile: resolve(host, 'vite.config.js'),
    configLoader: 'native',
    cacheDir: resolve(output, 'vite-cache-host-workflow'),
    server: await loopbackViteOptions(),
    logLevel: 'error',
});
await server.listen();
const browser = await chromium.launch({
    executablePath: getChromePath(),
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
});
const pageErrors = [];
const consoleErrors = [];

const { openApp, startEmpty, addModules, connect, setParameter, pressMomentary, addScope, waitForSignal, loadSample } = createHostWorkflowBrowserTools({
    browser, root, server, pageErrors, consoleErrors,
});

function gitCommit(cwd) {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim();
}

const report = {
    date: new Date().toISOString(),
    pulvisCandidateCommit: process.env.PULVIS_CANDIDATE_COMMIT || gitCommit(root),
    pluginCandidate: gitCommit(root),
    testHostBaseline: gitCommit(host),
    installedHostSnapshot: gitCommit(uiHost),
    workflows: {},
    localizedErrors: {},
};

try {
    const page = await openApp();
    const defaultConfiguration = await page.evaluate(async () => {
        const factory = window.system.moduleFactory;
        for (const name of ['GrainFreeze', 'GrainSample', 'GrainOsc']) {
            if (!factory.moduleRegistry[name] && !await factory.loadModule('pulvis', name)) throw new Error(`Cannot load pulvis/${name}`);
        }
        const registry = factory.moduleRegistry;
        const summarize = name => {
            const definition = registry[name];
            const controls = Object.fromEntries(definition.components
                .filter(component => ['Knob', 'ButtonIncDec', 'ButtonText'].includes(component.componentType))
                .map(component => [component.id, {
                    name: component.csoundName,
                    value: component.componentType === 'Knob' ? component.defaultValue
                        : component.componentType === 'ButtonText' ? (component.initialState ? 1 : 0) : component.initialIndex,
                    min: component.min,
                    max: component.max,
                    items: component.items,
                    text: component.text,
                }]));
            return { params: definition.params, inputs: definition.inputs, outputs: definition.outputs, controls };
        };
        return Object.fromEntries(['GrainFreeze', 'GrainSample', 'GrainOsc'].map(name => [name, summarize(name)]));
    });
    const freezeDefaults = defaultConfiguration.GrainFreeze.controls;
    const sampleDefaults = defaultConfiguration.GrainSample.controls;
    const oscDefaults = defaultConfiguration.GrainOsc.controls;
    for (const [moduleName, defaults] of Object.entries(defaultConfiguration)) {
        const densityLimit = moduleName === 'GrainOsc' ? 48 : 24;
        const densityDefault = moduleName === 'GrainOsc' ? 24 : 12;
        assert.deepEqual([defaults.controls['1'].max, defaults.controls['1'].value], [densityLimit, densityDefault],
            `${moduleName} density range/default reflects measured DSP headroom`);
        assert.equal(defaults.controls['2'].max, 400, 'Module grain size range reflects the measured pool headroom');
        assert.deepEqual([defaults.controls['12'].min, defaults.controls['12'].max, defaults.controls['12'].value],
            [-24, 12, moduleName === 'GrainFreeze' ? -3 : -12], 'Visible output gain is calibrated in dB with source headroom');
        assert.deepEqual(defaults.outputs, [201, 202]);
    }
    assert.equal(freezeDefaults['11'].name, 'Mix', 'Freeze retains its dry/wet control');
    assert.deepEqual([freezeDefaults['16'].items, freezeDefaults['17'].min, freezeDefaults['17'].max, freezeDefaults['17'].value],
        ['Live,Snapshot', 0, 0.95, 0], 'Freeze exposes a private snapshot source and zero-default feedback');
    assert.deepEqual([freezeDefaults['18'].text, freezeDefaults['18'].value], ['Capture snapshot', 0], 'Freeze has a released momentary capture control');
    assert(defaultConfiguration.GrainFreeze.inputs.includes(101), 'Freeze retains its live audio input');
    assert(!defaultConfiguration.GrainSample.inputs.includes(101) && !defaultConfiguration.GrainOsc.inputs.includes(101),
        'Sample and Osc are independent audio sources');
    assert(!sampleDefaults['11'] && !oscDefaults['11'], 'Sample and Osc have no dry/wet control');
    assert.deepEqual([sampleDefaults['14'].value, sampleDefaults['15'].value], [1, 0], 'Sample starts at slot 1 with scanning stopped');
    assert.deepEqual([sampleDefaults['17'].items, sampleDefaults['17'].value], ['Forward,Reverse', 0], 'Sample starts in forward playback');
    assert.deepEqual([freezeDefaults['7'].items, sampleDefaults['7'].items, oscDefaults['7'].items],
        ['Hann,Triangle,Blackman', 'Hann,Triangle,Blackman', 'Hann,Triangle,Blackman'], 'All modules expose three zero-ended windows');
    assert.deepEqual([oscDefaults['3'].value, oscDefaults['4'].value, oscDefaults['14'].value], [0, 0, 0],
        'Osc starts with zero warp, zero phase jitter, and sine wave');
    for (const [name, id] of [['GrainFreeze', '14'], ['GrainSample', '16'], ['GrainOsc', '15']]) {
        assert.deepEqual([defaultConfiguration[name].controls[id].min, defaultConfiguration[name].controls[id].max,
            defaultConfiguration[name].controls[id].value], [0, 100, 0], `${name} timing scatter is independent and off by default`);
        assert(defaultConfiguration[name].inputs.includes(115), `${name} exposes independent timing-scatter modulation`);
    }
    report.defaultConfiguration = defaultConfiguration;

    // Exercise the real canvas menu on each panel, including its localized modal dialog.
    await startEmpty(page);
    const names = ['GrainFreeze', 'GrainSample', 'GrainOsc'];
    await addModules(page, names.map(type => ({ type, library: 'pulvis' })));
    async function panelPoint(name, x, y) {
        return page.evaluate(({name, x, y}) => {
            const sys = window.system;
            const panel = sys.components.find(item => item.jsonName === name);
            sys.scale = 1;
            sys.offsetX = 80 - panel.gridX * 20;
            sys.offsetY = 80 - panel.gridY * 15;
            sys.forceRedraw();
            const rect = sys.canvas.getBoundingClientRect();
            return [rect.left + 80 + x, rect.top + 80 + y];
        }, {name, x, y});
    }
    for (const [i, language] of ['zh', 'ru', 'en'].entries()) {
        const pos = await panelPoint(names[i], 30, 12);
        await page.mouse.click(...pos, { button: 'right' });
        const menu = page.locator('#module-context-menu');
        await menu.locator('select').selectOption(language);
        const about = menu.getByRole('button', {name: ['关于', 'О модуле', 'About'][i], exact: true});
        await about.click();
        const dialog = page.getByRole('dialog', { name: ['关于 Pulvis', 'О Pulvis', 'About Pulvis'][i] });
        assert(await dialog.evaluate(el => el.matches(':modal')));
        const rect = await dialog.boundingBox();
        const viewport = page.viewportSize();
        assert(Math.abs(rect.x + rect.width / 2 - viewport.width / 2) <= 1);
        assert(Math.abs(rect.y + rect.height / 2 - viewport.height / 2) <= 1);
        const url = 'https://github.com/NJyutong/csmodular-pulvis';
        assert.equal(await dialog.getByRole('link', {name: url}).getAttribute('href'), url);
        assert.equal(await dialog.getByRole('link', {name: 'MIT'}).getAttribute('href'), url + '/blob/HEAD/LICENSE');
        assert.match(await dialog.innerText(), /Zhang Shengwei/);
        assert.match(await dialog.innerText(), /v\d+\.\d+\.\d+/);
        if (i === 0) await page.keyboard.press('Escape');
        else if (i === 1) await page.mouse.click(3, 3);
        else await dialog.getByRole('button', {name: 'Close'}).click();
        await dialog.waitFor({state: 'detached'});
        const panels = await page.evaluate(() => window.system.components.filter(m => m.pulvisControls)
            .map(m => [m.uiLanguage, m.title, m.width, m.gridWidth, m.pulvisControls.get('Window').currentItem]));
        assert.equal(panels.length, 3);
        assert(panels.every(([lang, title, width, grid, window]) =>
            lang === language && title && width === 500 && grid === 25 && window === ['汉宁窗','Ханн','Hann'][i]));
        await page.keyboard.press('Escape');
    }
    await page.mouse.click(...await panelPoint('GrainSample', 88, 42)); // slot 4
    await page.mouse.click(...await panelPoint('GrainSample', 80, 66)); // load the bundled WAV
    await page.waitForFunction(() => window.system.csoundEngine.grainSamples.slots.get(4)?.frames > 0);
    await page.mouse.click(...await panelPoint('GrainOsc', 380, 60));
    assert.equal(await page.evaluate(() => window.system.components.find(m => m.jsonName === 'GrainOsc')
        .pulvisControls.get('Window').getValue()), 1);
    await page.mouse.click(...await panelPoint('GrainOsc', 30, 12), {button:'right'});
    await page.locator('#module-context-menu select').selectOption('auto');
    assert.equal(await page.evaluate(() => localStorage.getItem('pulvis-ui-language')), null);
    await page.keyboard.press('Escape');

    // Freeze: create a new graph, feed a live oscillator into its audio input, fill and wrap the 8 s history, then test both mix ends.
    await startEmpty(page);
    await addModules(page, [
        { type: 'GrainOsc', library: 'pulvis' },
        { type: 'GrainFreeze', library: 'pulvis' },
        { type: 'Outs2', library: 'my-lib' },
    ]);
    await connect(page, [
        { from: 'GrainOsc', fromJack: '201', to: 'GrainFreeze', toJack: '101' },
        { from: 'GrainFreeze', fromJack: '201', to: 'Outs2', toJack: '2' },
        { from: 'GrainFreeze', fromJack: '202', to: 'Outs2', toJack: '1' },
    ]);
    await addScope(page, 1);
    assert(await page.evaluate(() => window.system.csoundEngine.init()), 'Freeze graph starts');
    const recordingStart = Date.now();
    const initialDefault = await waitForSignal(page);
    const defaultStartDelayMs = Date.now() - recordingStart;
    assert(initialDefault.observed, `Freeze defaults produce audio during live recording: ${JSON.stringify(initialDefault)}`);
    await page.waitForTimeout(Math.max(0, 8200 - defaultStartDelayMs)); // Fill and wrap its 384,000-frame ring at 48 kHz.
    await setParameter(page, 'GrainFreeze', '3', 100);
    await page.waitForTimeout(250);
    const lookback = await waitForSignal(page);
    assert(lookback.observed, `Grain Freeze plays back from the selected lookback position: ${JSON.stringify(lookback)}`);
    await setParameter(page, 'GrainFreeze', '10', 1);
    await page.waitForTimeout(400);
    const frozen = await waitForSignal(page);
    assert(frozen.peak > 0.001 && frozen.rms > 0, 'Frozen grains continue to reach Outs2');
    await setParameter(page, 'GrainFreeze', '16', 1);
    const captureButton = await pressMomentary(page, 'GrainFreeze', '18');
    await setParameter(page, 'GrainFreeze', '10', 0); // The live ring resumes; snapshot playback stays selected.
    await page.waitForTimeout(300);
    const snapshot = await waitForSignal(page);
    assert(captureButton.released && snapshot.observed,
        `Freeze snapshot is captured by the momentary button and remains audible during new recording: ${JSON.stringify({ captureButton, snapshot })}`);
    await setParameter(page, 'GrainFreeze', '15', 1);
    await setParameter(page, 'GrainFreeze', '7', 2);
    await setParameter(page, 'GrainFreeze', '17', 0.95);
    await page.waitForTimeout(250);
    const reversedFeedback = await waitForSignal(page);
    assert(reversedFeedback.observed && reversedFeedback.peak <= 1.00001,
        `Reverse, Blackman and maximum feedback stay bounded through Zak: ${JSON.stringify(reversedFeedback)}`);
    await setParameter(page, 'GrainFreeze', '11', 0);
    await page.waitForTimeout(200);
    const dry = await waitForSignal(page);
    await setParameter(page, 'GrainFreeze', '11', 127);
    await page.waitForTimeout(200);
    const wet = await waitForSignal(page);
    assert(dry.peak > 0 && wet.peak > 0 && frozen.peak > 0,
        `Live input, frozen grains and both mix endpoints are audible through the Zak cable: ${JSON.stringify({ frozen, dry, wet })}`);
    const fx = await page.evaluate(async () => {
        const system = window.system;
        for (const module of system.csoundGen.modules.values()) module.layer = 'fx';
        const orchestra = await system.csoundGen.generateOrc();
        return { ok: await system.csoundEngine.recompile(), orchestra };
    });
    assert(fx.ok && /instr 2[\s\S]*GrainFreeze[\s\S]*endin/.test(fx.orchestra), 'Freeze compiles into the FX instrument');
    await setParameter(page, 'GrainFreeze', '11', 0); // Recompile clears the ring; use the live dry input to verify FX Zak routing.
    const fxSignal = await waitForSignal(page);
    assert(fxSignal.observed, `Freeze outputs nonzero Zak audio from FX: ${JSON.stringify(fxSignal)}`);
    assert(await page.evaluate(async () => {
        await window.system.csoundEngine.stop();
        return window.system.csoundEngine.state !== 'running' && await window.system.csoundEngine.init();
    }), 'Freeze engine stops and starts again');
    await page.waitForFunction(() => {
        const sys = window.system;
        return ['GrainOsc','GrainFreeze'].every(name => {
            const panel = sys.components.find(m => m.jsonName === name);
            return sys.csoundEngine.getScopeBuffer(panel.moduleId)?.some(v => Math.abs(v) > 0.00001)
                && sys.csoundEngine.getScopeBuffer(panel.moduleId + ':spectrum')?.some(v => v > 0.00001);
        });
    });
    report.workflows.freeze = { initialDefault, defaultStartDelayMs, liveInput: dry, lookback, frozen, snapshot, captureButton, reversedFeedback,
        dry, wet, fxSignal, ringSeconds: 8, snapshotPrivateToFreeze: true, voiceZak: true, fxZak: true, stopStart: true };

    // Sample: exercise the menu and VFS against a WAV fixture, replace it, reject an invalid file, and retain the old slot.
    await startEmpty(page);
    await addModules(page, [
        { type: 'GrainSample', library: 'pulvis' },
        { type: 'Outs2', library: 'my-lib' },
    ]);
    await connect(page, [
        { from: 'GrainSample', fromJack: '201', to: 'Outs2', toJack: '2' },
        { from: 'GrainSample', fromJack: '202', to: 'Outs2', toJack: '1' },
    ]);
    await addScope(page, 0);
    assert(await page.evaluate(() => window.system.csoundEngine.init()), 'Sample graph starts');
    await loadSample(page, 'GrainSample', 2, sampleA);
    const first = await page.evaluate(() => {
        const slot = window.system.csoundEngine.grainSamples.slots.get(2);
        return { path: slot?.path, name: slot?.name, frames: slot?.frames, running: window.system.csoundEngine.state };
    });
    assert(first.path && first.frames === 48000 && first.running === 'running', 'Slot 2 imports and restarts audio');
    const sampleSignal = await waitForSignal(page);
    await page.waitForFunction(() => {
        const sys = window.system;
        const panel = sys.components.find(p => p.jsonName === 'GrainSample');
        const bins = sys.csoundEngine.getScopeBuffer(panel.moduleId + ':spectrum');
        if (!bins || bins.length !== 1025) return false;
        const peak = Math.max(...bins);
        const peakHz = bins.indexOf(peak) * 48000 / 2048;
        return peak > 0.00001 && Math.abs(peakHz - 220) < 30;
    });
    await loadSample(page, 'GrainSample', 2, sampleB);
    const second = await page.evaluate(() => {
        const slot = window.system.csoundEngine.grainSamples.slots.get(2);
        return { path: slot?.path, name: slot?.name, frames: slot?.frames, running: window.system.csoundEngine.state };
    });
    assert.notEqual(second.path, first.path, 'Replacing a slot uses a new VFS revision');
    await setParameter(page, 'GrainSample', '17', 1);
    await setParameter(page, 'GrainSample', '7', 2);
    assert(await page.evaluate(() => window.system.csoundEngine.recompile()), 'Sample reverse and Blackman window compile');
    const reverseSampleSignal = await waitForSignal(page);
    assert(reverseSampleSignal.observed && reverseSampleSignal.maxAdjacentStep < 0.3,
        `Imported WAV plays backward with the third window without a hard seam: ${JSON.stringify(reverseSampleSignal)}`);
    assert.equal(second.name, 'workflow-sample-b.wav');
    await loadSample(page, 'GrainSample', 2, invalidSample);
    const rollback = await page.evaluate(() => {
        const slot = window.system.csoundEngine.grainSamples.slots.get(2);
        return { path: slot?.path, name: slot?.name, running: window.system.csoundEngine.state };
    });
    assert.deepEqual(rollback, { path: second.path, name: second.name, running: 'running' }, 'Invalid replacement rolls back to the prior sample');
    const failedUpload = await page.evaluate(async bytes => {
        const engine = window.system.csoundEngine;
        const previous = engine.grainSamples.slots.get(2);
        const bank = engine.grainSamples;
        const upload = bank.upload.bind(bank);
        let injected = false;
        bank.upload = async csound => {
            const fs = csound.fs;
            const write = fs.writeFile.bind(fs);
            fs.writeFile = async (...args) => {
                if (!injected && String(args[0]).startsWith('grain-2-')) {
                    injected = true;
                    throw new Error('injected VFS write failure');
                }
                return write(...args);
            };
            try { return await upload(csound); }
            finally { fs.writeFile = write; }
        };
        let message = '';
        try { await engine.loadGrainSample(2, new File([Uint8Array.from(bytes)], 'rollback.wav')); }
        catch (error) { message = error.message; }
        finally { bank.upload = upload; }
        const current = engine.grainSamples.slots.get(2);
        return { injected, message, previous: previous?.path, current: current?.path, state: engine.state };
    }, [...new Uint8Array(await readFile(sampleA))]);
    assert(failedUpload.injected, `The test reaches the VFS failure path: ${JSON.stringify(failedUpload)}`);
    assert.equal(failedUpload.current, failedUpload.previous, 'A failed running upload restores the existing slot');
    assert.equal(failedUpload.state, 'running', 'A failed upload restores the running engine');
    assert(await page.evaluate(() => window.system.csoundEngine.recompile()), 'Sample recompile succeeds');
    const sampleAfterCompile = await page.evaluate(() => {
        const engine = window.system.csoundEngine;
        const slot = engine.grainSamples.slots.get(2);
        return { running: engine.state, slot: slot?.path, bytes: slot?.bytes.length };
    });
    assert(sampleAfterCompile.running === 'running' && sampleAfterCompile.slot === second.path, 'Sample remains loaded after recompile');
    assert(await page.evaluate(async () => {
        await window.system.csoundEngine.stop();
        return window.system.csoundEngine.state !== 'running' && await window.system.csoundEngine.init();
    }), 'Sample engine stops and starts again');
    report.workflows.sample = { first, second, rollback, failedUpload, sampleSignal, reverseSampleSignal, reverse: true, blackman: true, recompile: true, stopStart: true };

    // Osc: all four wave choices, independent warp/jitter controls, and an LFO-to-warp CV connection.
    await startEmpty(page);
    await addModules(page, [
        { type: 'LFO', library: 'my-lib' },
        { type: 'GrainOsc', library: 'pulvis' },
        { type: 'Outs2', library: 'my-lib' },
    ]);
    await connect(page, [
        { from: 'LFO', fromJack: '1', to: 'GrainOsc', toJack: '104' },
        { from: 'LFO', fromJack: '1', to: 'GrainOsc', toJack: '115' },
        { from: 'GrainOsc', fromJack: '201', to: 'Outs2', toJack: '2' },
        { from: 'GrainOsc', fromJack: '202', to: 'Outs2', toJack: '1' },
    ]);
    await addScope(page, 1);
    assert(await page.evaluate(() => window.system.csoundEngine.init()), 'Osc graph with CV starts');
    const waves = [];
    for (let waveIndex = 0; waveIndex < 4; waveIndex++) {
        waves.push(await setParameter(page, 'GrainOsc', '14', waveIndex));
    }
    assert.deepEqual(waves, [0, 1, 2, 3], 'All waveform knob values are selectable');
    await setParameter(page, 'GrainOsc', '3', 127);
    await setParameter(page, 'GrainOsc', '4', 127);
    await setParameter(page, 'GrainOsc', '13', 19);
    await setParameter(page, 'GrainOsc', '15', 100);
    await setParameter(page, 'GrainOsc', '16', 1);
    await setParameter(page, 'GrainOsc', '7', 2);
    assert(await page.evaluate(() => window.system.csoundEngine.recompile()), 'Osc modulation and phase controls recompile');
    const oscSignal = await waitForSignal(page);
    const oscOrchestra = await page.evaluate(() => window.system.csoundGen.generateOrc());
    assert.match(oscOrchestra, /LFO/);
    assert.match(oscOrchestra, /GrainOsc/);
    assert(oscSignal.observed, `Modulated Osc reaches Outs2: ${JSON.stringify(oscSignal)}`);
    assert(await page.evaluate(async () => {
        await window.system.csoundEngine.stop();
        return window.system.csoundEngine.state !== 'running' && await window.system.csoundEngine.init();
    }), 'Osc engine stops and starts again');
    report.workflows.osc = { waveforms: waves, phaseWarp: 127, phaseJitter: 127, timingScatter: 100, seed: 19,
        direction: 'reverse', window: 'Blackman', phaseWarpCv: true, timingScatterCv: true, oscSignal, stopStart: true };

    // Save a current-version project built from blank, reload the app, reopen the patch, then reimport its external WAV.
    await startEmpty(page);
    await addModules(page, [
        { type: 'LFO', library: 'my-lib' },
        { type: 'GrainOsc', library: 'pulvis' },
        { type: 'GrainFreeze', library: 'pulvis' },
        { type: 'GrainSample', library: 'pulvis' },
        { type: 'Outs2', library: 'my-lib' },
    ]);
    await connect(page, [
        { from: 'LFO', fromJack: '1', to: 'GrainOsc', toJack: '104' },
        { from: 'LFO', fromJack: '1', to: 'GrainOsc', toJack: '115' },
        { from: 'GrainOsc', fromJack: '201', to: 'GrainFreeze', toJack: '101' },
        { from: 'GrainFreeze', fromJack: '201', to: 'Outs2', toJack: '2' },
        { from: 'GrainFreeze', fromJack: '202', to: 'Outs2', toJack: '1' },
    ]);
    await setParameter(page, 'GrainSample', '14', 2);
    await setParameter(page, 'GrainOsc', '15', 75);
    await setParameter(page, 'GrainOsc', '16', 1);
    await setParameter(page, 'GrainOsc', '7', 2);
    await setParameter(page, 'GrainFreeze', '16', 1);
    await setParameter(page, 'GrainFreeze', '17', 0.95);
    await loadSample(page, 'GrainSample', 2, sampleB);
    const downloadPromise = page.waitForEvent('download');
    assert(await page.evaluate(() => window.system.savePatch('host-workflow.json')), 'Patch save reports success');
    const download = await downloadPromise;
    const projectPath = resolve(output, 'host-workflow.json');
    await download.saveAs(projectPath);
    const savedProject = JSON.parse(await readFile(projectPath, 'utf8'));
    savedProject.filename = 'host-workflow.json';
    assert.equal(savedProject.modules.length, 5);
    assert.equal(savedProject.cables.length, 5);
    await page.reload();
    await page.waitForFunction(() => window.system?.csoundGen);
    if (await page.locator('#splash-root').count()) {
        await page.locator('#splash-root input[type=checkbox]').uncheck();
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('#splash-root'));
    }
    const chooserPromise = page.waitForEvent('filechooser');
    const openPromise = page.evaluate(() => window.system.loadJsonPatch());
    await (await chooserPromise).setFiles(projectPath);
    assert(await openPromise, 'The saved project opens through the host file loader');
    const reopened = await page.evaluate(() => {
        const system = window.system;
        const modules = Object.values(system.patchLoader.moduleMap.byId);
        return {
            count: system.csoundGen.modules.size,
            cables: system.patchManager.cables.length,
            types: modules.map(module => module.jsonName).sort(),
            sampleRestored: system.csoundEngine.grainSamples.slots.size,
            sampleSlot: modules.find(module => module.jsonName === 'GrainSample')?.components
                .find(component => String(component.id) === '14')?.getValue(),
            timingScatter: modules.find(module => module.jsonName === 'GrainOsc')?.components
                .find(component => String(component.id) === '15')?.getValue(),
            freezeSource: modules.find(module => module.jsonName === 'GrainFreeze')?.components
                .find(component => String(component.id) === '16')?.getValue(),
            freezeFeedback: modules.find(module => module.jsonName === 'GrainFreeze')?.components
                .find(component => String(component.id) === '17')?.getValue(),
            oscDirection: modules.find(module => module.jsonName === 'GrainOsc')?.components
                .find(component => String(component.id) === '16')?.getValue(),
            oscWindow: modules.find(module => module.jsonName === 'GrainOsc')?.components
                .find(component => String(component.id) === '7')?.getValue(),
        };
    });
    assert.equal(reopened.count, 5);
    assert.equal(reopened.cables, 5);
    assert.deepEqual(reopened.types, ['GrainFreeze', 'GrainOsc', 'GrainSample', 'LFO', 'Outs2']);
    assert.equal(reopened.sampleRestored, 0, 'Sample bytes are session data and must be reimported after app reload');
    assert.equal(reopened.sampleSlot, 2, 'The selected sample slot is saved in the project');
    assert.equal(reopened.timingScatter, 75, 'Timing scatter control restores with the current-version project');
    assert.deepEqual([reopened.freezeSource, reopened.freezeFeedback], [1, 0.95], 'Freeze source and feedback settings restore');
    assert.deepEqual([reopened.oscDirection, reopened.oscWindow], [1, 2], 'Osc direction and window settings restore');
    await loadSample(page, 'GrainSample', 2, sampleB);
    assert(await page.evaluate(() => window.system.csoundEngine.init()), 'Reopened project compiles after sample reimport');
    const reopenedOrchestra = await page.evaluate(() => window.system.csoundGen.generateOrc());
    assert.match(reopenedOrchestra, /opcode CMGrainCore,/);
    report.project = { path: 'host-workflow.json', moduleCount: reopened.count, cableCount: reopened.cables, reopened, sampleReimported: true };
    await writeFile(projectPath, JSON.stringify(savedProject, null, 2) + '\n');

    // The same invalid-header path returns distinct English, Chinese and Russian messages.
    for (const [locale, expected] of [
        ['en-US', { error: 'Choose a valid WAV file.', display: 'Pulvis Grain Freeze', capture: 'Capture snapshot', source: 'Live,Snapshot', window: 'Hann,Triangle,Blackman', feedbackJack: 'Feedback CV', outputJack: 'L' }],
        ['zh-CN', { error: '请选择有效的 WAV 文件。', display: '微粒 · 颗粒冻结', capture: '捕捉快照', source: '实时,快照', window: '汉宁窗,三角窗,布莱克曼窗', feedbackJack: '反馈 调制输入', outputJack: '左' }],
        ['ru-RU', { error: 'Выберите корректный файл WAV.', display: 'Пульвис · Гранулярная заморозка', capture: 'Сохранить снимок', source: 'Вход,Снимок', window: 'Ханн,Треуг.,Блэкман', feedbackJack: 'Модуляция: Обратная связь', outputJack: 'Л' }],
    ]) {
        const localizedPage = await openApp(locale);
        const localizedPanel = await localizedPage.evaluate(async () => {
            const factory = window.system.moduleFactory;
            await factory.loadModule('pulvis', 'GrainFreeze');
            const definition = factory.moduleRegistry.GrainFreeze;
            const component = id => definition.components.find(item => String(item.id) === String(id));
            return {
                display: definition.displayName,
                capture: component(18).text,
                source: component(16).items,
                window: component(7).items,
                feedbackJack: component(117).ConnectorName,
                outputJack: component(201).ConnectorName,
            };
        });
        assert.deepEqual(localizedPanel, { display: expected.display, capture: expected.capture, source: expected.source,
            window: expected.window, feedbackJack: expected.feedbackJack, outputJack: expected.outputJack }, `${locale} panel, controls and jacks`);
        const message = await localizedPage.evaluate(async () => {
            try { await window.system.csoundEngine.grainSamples.load(1, new File(['bad'], 'bad.wav')); }
            catch (error) { return error.message; }
            return '';
        });
        assert.equal(message, expected.error, `${locale} invalid-WAV message`);
        report.localizedErrors[locale] = message;
        (report.localizedPanels ??= {})[locale] = localizedPanel;
        await localizedPage.close();
    }

    assert.deepEqual(pageErrors, [], pageErrors.join('\n'));
    const unexpectedConsoleErrors = consoleErrors.filter(line => !line.includes("ws://127.0.0.1:8765/ws"));
    const expectedInjectedFailure = unexpectedConsoleErrors.filter(line => line.includes('injected VFS write failure'));
    const realConsoleErrors = unexpectedConsoleErrors.filter(line => !line.includes('injected VFS write failure'));
    assert.deepEqual(realConsoleErrors, [], realConsoleErrors.join('\n'));
    report.runtime = {
        browser: await browser.version(),
        node: process.version,
        csound: '7.0.0-beta33 WASM',
        expectedOptionalOscMessages: consoleErrors.filter(line => line.includes("ws://127.0.0.1:8765/ws")).length,
        injectedUploadFailureMessages: expectedInjectedFailure.length,
        pageErrors,
    };
    await writeFile(resolve(output, 'host-workflow-report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
    console.log('Blank-project workflows, sample recovery, localized errors and save/reopen passed.');
    await page.close();
} finally {
    await browser.close();
    await server.close();
}
