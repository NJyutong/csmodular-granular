import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getChromePath } from './browser.mjs';
import { loopbackViteOptions, viteLoopbackUrl } from './loopback.mjs';

export function createHostWorkflowBrowserTools({ browser, root, server, pageErrors, consoleErrors }) {
    async function openApp(locale = 'en-US') {
        const page = await browser.newPage({ locale, viewport: { width: 1440, height: 1000 } });
        page.on('pageerror', error => pageErrors.push(`${locale}: ${error.message}`));
        page.on('console', message => {
            if (message.type() !== 'error') return;
            consoleErrors.push(`${locale}: ${message.text()}`);
        });
        await page.route('https://www.unpkg.com/@csound/browser@7.0.0-beta33/dist/csound.js', async route => {
            await route.fulfill({
                contentType: 'text/javascript',
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: await readFile(resolve(root, 'node_modules/@csound/browser/dist/csound.js')),
            });
        });
        await page.goto(viteLoopbackUrl(server));
        await page.waitForFunction(() => window.system?.csoundGen);
        if (await page.locator('#splash-root').count()) {
            await page.locator('#splash-root input[type=checkbox]').uncheck();
            await page.keyboard.press('Escape');
            await page.waitForFunction(() => !document.querySelector('#splash-root'));
        }
        return page;
    }

    async function startEmpty(page) {
        const state = await page.evaluate(async () => {
            const system = window.system;
            system.locked = false;
            await system.csoundEngine.stop();
            await system.loadPatchFromJson({ modules: [], cables: [] });
            return { modules: system.csoundGen.modules.size, cables: system.patchManager.cables.length };
        });
        assert.deepEqual(state, { modules: 0, cables: 0 }, 'Each workflow begins from an empty project');
    }

    async function addModules(page, specs) {
        await page.evaluate(async specs => {
            const system = window.system;
            for (let i = 0; i < specs.length; i++) {
                const spec = specs[i];
                await system.addNewModuleAtPosition(spec.type, 'voice', i * 9, 0, { library: spec.library });
            }
        }, specs);
        await page.waitForFunction(count => window.system.csoundGen.modules.size === count, specs.length);
    }

    async function connect(page, links) {
        await page.evaluate(links => {
            const system = window.system;
            const panels = Object.values(system.patchLoader.moduleMap.byId);
            const findPanel = (name, occurrence = 0) => panels.filter(panel => panel.jsonName === name)[occurrence];
            const findJack = (panel, kind, id) => panel?.components.find(component =>
                component.constructor.name === kind && String(component.id) === String(id));
            for (const link of links) {
                const from = findJack(findPanel(link.from, link.fromOccurrence), 'Output', link.fromJack);
                const to = findJack(findPanel(link.to, link.toOccurrence), 'Input', link.toJack);
                if (!from || !to || !system.patchManager.addCable(from, to)) {
                    throw new Error(`Could not connect ${link.from}.${link.fromJack} to ${link.to}.${link.toJack}`);
                }
            }
        }, links);
    }

    async function setParameter(page, moduleName, id, value, occurrence = 0) {
        return page.evaluate(({ moduleName, id, value, occurrence }) => {
            const system = window.system;
            const panels = Object.values(system.patchLoader.moduleMap.byId).filter(panel => panel.jsonName === moduleName);
            const control = panels[occurrence]?.components.find(component => String(component.id) === String(id));
            if (!control) throw new Error(`No settable ${moduleName} control ${id}`);
            if (typeof control.setValue === 'function') control.setValue(value);
            else if (typeof control.setIndex === 'function') control.setIndex(Number(value));
            else throw new Error(`No settable ${moduleName} control ${id}`);
            return control.getValue?.() ?? control.value ?? control.selectedIndex ?? control.currentIndex;
        }, { moduleName, id, value, occurrence });
    }

    async function pressMomentary(page, moduleName, id, occurrence = 0) {
        return page.evaluate(async ({ moduleName, id, occurrence }) => {
            const panels = Object.values(window.system.patchLoader.moduleMap.byId).filter(panel => panel.jsonName === moduleName);
            const button = panels[occurrence]?.components.find(component => String(component.id) === String(id));
            if (!button || button.mode !== 'momentary' || typeof button.setActive !== 'function') {
                throw new Error(`No momentary ${moduleName} control ${id}`);
            }
            button.setActive(true);
            await new Promise(resolve => setTimeout(resolve, 60));
            button.setActive(false);
            return { mode: button.mode, released: !button.isActive, channel: button.csoundChannel };
        }, { moduleName, id, occurrence });
    }

    async function addScope(page, cableIndex = 0) {
        return page.evaluate(cableIndex => {
            const system = window.system;
            const cable = system.patchManager.cables[cableIndex];
            if (!cable) throw new Error(`Missing cable ${cableIndex}`);
            return system.csoundGen.addScopeTable(cable);
        }, cableIndex);
    }

    async function scopeStats(page, scopeIndex = -1) {
        return page.evaluate(async scopeIndex => {
            const system = window.system;
            const entries = [...system.csoundGen._scopeTables.values()];
            const entry = entries.at(scopeIndex);
            if (!entry || !system.csoundEngine.instance) return { peak: 0, rms: 0, maxAdjacentStep: 0, count: 0 };
            const samples = await system.csoundEngine.instance.tableCopyOut(entry.tableNum);
            let peak = 0, sum = 0, maxAdjacentStep = 0;
            for (let i = 0; i < samples.length; i++) {
                const value = samples[i];
                peak = Math.max(peak, Math.abs(value));
                sum += value * value;
                if (i > 0) maxAdjacentStep = Math.max(maxAdjacentStep, Math.abs(value - samples[i - 1]));
            }
            return { peak, rms: Math.sqrt(sum / Math.max(1, samples.length)), maxAdjacentStep, count: samples.length };
        }, scopeIndex);
    }

    async function waitForSignal(page, scopeIndex = -1) {
        const deadline = Date.now() + 15000;
        let stats = { peak: 0, rms: 0, maxAdjacentStep: 0, count: 0 };
        while (Date.now() < deadline) {
            stats = await scopeStats(page, scopeIndex);
            if (stats.peak > 0.001) return { observed: true, ...stats };
            await page.waitForTimeout(100);
        }
        return { observed: false, ...stats };
    }

    async function loadSample(page, moduleName, slot, path) {
        const menu = await page.evaluate(({ moduleName, slot }) => {
            const system = window.system;
            const panel = Object.values(system.patchLoader.moduleMap.byId).find(item => item.jsonName === moduleName);
            const slotControl = panel?.components.find(component => String(component.id) === '14');
            if (!panel || !slotControl) throw new Error(`Sample panel or slot control ${slot} is missing`);
            slotControl.setValue(slot);
            system.moduleContextMenu.show(panel, 100, 100);
            return document.querySelector('#module-context-menu')?.textContent || '';
        }, { moduleName, slot });
        assert(menu.includes(`slot ${slot}`), `Sample menu offers slot ${slot}`);
        const chooserPromise = page.waitForEvent('filechooser');
        await page.getByText(`Load WAV → slot ${slot}…`, { exact: true }).click();
        await (await chooserPromise).setFiles(path);
        await page.waitForFunction(slot => !window.system.csoundEngine._loadingGrainSample
            && (window.system.csoundEngine.grainSamples.slots.has(slot) || window.system.csoundEngine.state === 'running'), slot);
        await page.waitForFunction(() => !window.system.csoundEngine._loadingGrainSample, null, { timeout: 15000 });
    }

    return { openApp, startEmpty, addModules, connect, setParameter, pressMomentary, addScope, scopeStats, waitForSignal, loadSample };
}

export { getChromePath, loopbackViteOptions };
