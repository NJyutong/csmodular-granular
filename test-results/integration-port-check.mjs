import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const host = resolve(root, '../csmodular-main');
const server = await createServer({ root: host, configFile: resolve(host, 'vite.config.js'), server: { port: 28431, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined), headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ locale: 'en-US', viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', e => { errors.push(e.message); console.error('Page error:', e.message); });
page.on('console', m => { if (m.type() === 'error') console.error('Browser:', m.text()); });
await page.route('https://www.unpkg.com/@csound/browser@7.0.0-beta33/dist/csound.js', async route => {
    await route.fulfill({ contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: await readFile(resolve(root, 'node_modules/@csound/browser/dist/csound.js')) });
});
try {
    await page.goto(server.resolvedUrls.local[0]);
    await page.waitForFunction(() => window.system?.csoundGen);
    await page.locator('#splash-root input[type=checkbox]').uncheck();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#splash-root'));
    console.log('Application booted.');
    const patch = JSON.parse(await readFile(resolve(root, 'examples/granular-demo.json'), 'utf8'));
    const result = await page.evaluate(async patch => {
        const system = window.system;
        system.locked = false;
        const loaded = await system.loadPatchFromJson(patch);
        const scopeTable = system.csoundGen.addScopeTable(system.csoundGen._activeCables[1]);
        const orc = await system.csoundGen.generateOrc();
        const csMessages = [];
        system.csoundEngine.onMessage(m => csMessages.push(m));
        const started = await system.csoundEngine.init();
        return { loaded: loaded.success, scopeTable, orc, started, messages: csMessages.filter(m => /error|version|commit/i.test(m)), modules: [...system.csoundGen.modules.values()].map(m => m.typeId), cables: system.csoundGen._activeCables.length };
    }, patch);
    console.log(JSON.stringify({ ...result, orc: `${result.orc.length} characters` }, null, 2));
    assert(result.started, 'Engine starts with the real generated orchestra');
    assert.equal(result.modules.length, 4);
    assert.equal(result.cables, 3);
    assert.equal((result.orc.match(/opcode CMGrainCore,/g) || []).length, 1);
    assert(result.orc.indexOf('opcode CMGrainCore,') < result.orc.indexOf('opcode GrainFreeze,'));
    await mkdir(resolve(root, 'test-results'), { recursive: true });
    await writeFile(resolve(root, 'test-results/generated.orc'), result.orc);
    await page.waitForFunction(async () => {
        const entry = [...window.system.csoundGen._scopeTables.values()][0];
        const data = await window.system.csoundEngine.instance.tableCopyOut(entry.tableNum);
        return data.some(v => Math.abs(v) > 0.001);
    });
    const recompilation = await page.evaluate(async () => {
        const system = window.system;
        const recompiled = await system.csoundEngine.recompile();
        const samplePanel = [...system.patchLoader.moduleMap.byId ? Object.values(system.patchLoader.moduleMap.byId) : []].find(p => p.jsonName === 'GrainSample');
        system.moduleContextMenu.show(samplePanel, 100, 100);
        return { recompiled, menu: document.querySelector('#module-context-menu').textContent };
    });
    assert(recompilation.recompiled);
    assert.match(recompilation.menu, /Load WAV/);
    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByText('Load WAV → slot 1…', { exact: true }).click();
    await (await chooserPromise).setFiles(resolve(root, 'test-results/osc.wav'));
    await page.waitForFunction(() => window.system.csoundEngine.grainSamples.slots.has(1) && !window.system.csoundEngine._loadingGrainSample && window.system.csoundEngine.state === 'running');
    const persisted = await page.evaluate(async () => {
        const engine = window.system.csoundEngine;
        const ok = await engine.recompile();
        const sample = engine.grainSamples.slots.get(1);
        const bytes = await engine.instance.fs.readFile(sample.path);
        return ok && bytes.length === sample.bytes.length && bytes.every((value, i) => value === sample.bytes[i]);
    });
    assert(persisted, 'Sample survives recompile without beta33 file overwrite');
    // A successful file upload alone does not prove Grain Sample produces audio.
    const sampleStarted = await page.evaluate(async patch => {
        const s=window.system;
        await s.csoundEngine.stop();
        const modules=patch.modules.filter(m=>m.name==='GrainSample'||m.name==='Outs2');
        const sample=modules.find(m=>m.name==='GrainSample'),out=modules.find(m=>m.name==='Outs2');
        const cables=[0,1].map(jack=>({from:{id:sample.id,jack,pin:'out'},to:{id:out.id,jack,pin:'in'},type:'out-in',area:'VOICE'}));
        await s.loadPatchFromJson({modules,cables});
        s.csoundGen.addScopeTable(s.csoundGen._activeCables[0]);
        return s.csoundEngine.init();
    },patch);
    assert(sampleStarted,'Sample-only graph starts');
    await page.waitForFunction(async()=>{
        const s=window.system;
        const entry=[...s.csoundGen._scopeTables.values()][0];
        const data=await s.csoundEngine.instance.tableCopyOut(entry.tableNum);
        return data.some(v=>Math.abs(v)>0.001);
    },null,{timeout:15000});
    console.log('Imported WAV produces nonzero output through Grain Sample → Outs2.');
    await page.evaluate(async patch=>{
        const s=window.system;await s.csoundEngine.stop();
        await s.loadPatchFromJson(patch);await s.csoundEngine.init();
    },patch);
    await page.screenshot({ path: resolve(root, 'test-results/app.png'), fullPage: true });
    const fx = await page.evaluate(async () => {
        const system = window.system;
        // Move the complete connected graph; cross-layer cables remain unsupported.
        for (const module of system.csoundGen.modules.values()) module.layer = 'fx';
        const orc = await system.csoundGen.generateOrc();
        return { orc, ok: await system.csoundEngine.recompile() };
    });
    assert(fx.ok, 'The same UDOs compile and run in instr 2');
    assert.match(fx.orc.match(/instr 2\n([\s\S]*?)endin/)[1], /GrainFreeze /);
    const executable = fx.orc.replace(/"[^"\n]*"|;[^\n]*/g, '');
    assert(!/\b(partikkel|partikkelsync|grain|grain2|grain3|syncgrain|granule|diskgrain|fof|fof2|fog|sndwarp|sndwarpst|mincer|temposcal)\b/i.test(executable), 'No granular built-ins in the final generated DSP');
    assert.equal(errors.length, 0, errors.join('\n'));
    await page.evaluate(() => window.system.csoundEngine.stop());
    const index = JSON.parse(await readFile(resolve(host, 'dist/libraries/granular/_index.json'), 'utf8'));
    assert.equal(index.modules.length, 3, 'Production build ships every module');
    for (const file of ['GrainFreeze', 'GrainSample', 'GrainOsc']) {
        for (const ext of ['js','txt']) assert.equal(await readFile(resolve(host, `dist/libraries/granular/modules/${file}.${ext}`), 'utf8'), await readFile(resolve(root, `modules/${file}.${ext}`), 'utf8'));
    }
    assert.equal(await readFile(resolve(host, 'dist/csound/modules/GrainCore.txt'), 'utf8'), await readFile(resolve(root, 'csound/GrainCore.txt'), 'utf8'));
    console.log('Application integration and production packaging checks passed.');
} finally {
    await browser.close();
    await server.close();
}
