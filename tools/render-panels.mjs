// Renders the three granular panels with the host's own component code (ModuleFactory, Panel, Knob ...)
// onto a node canvas, so layout can be checked without a browser.
//   mkdir scratch && cd scratch && npm i @napi-rs/canvas && cp ../tools/render-panels.mjs .
//   node render-panels.mjs <csmodular-main checkout> out.png ../modules [en|zh|ru]
// Uses the host's current theme; ModuleFactory localisation of labels is emulated from textI18n.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
// --- minimal browser stubs so the host's own component code can run in Node
const store = new Map();
globalThis.window = globalThis;
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
globalThis.sessionStorage = globalThis.localStorage;
globalThis.document = { createElement: t => t === 'canvas' ? createCanvas(10, 10) : { style: {}, addEventListener() {}, appendChild() {}, setAttribute() {} }, documentElement: { style: {}, classList: { add() {}, remove() {}, contains: () => false } }, body: { classList: { add() {}, remove() {}, contains: () => false }, appendChild() {}, style: {} }, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, fonts: { ready: Promise.resolve() } };
Object.defineProperty(globalThis, 'navigator', { value: { language: 'en-US', languages: ['en-US'], userAgent: 'node' }, configurable: true });
globalThis.CanvasRenderingContext2D = Object.getPrototypeOf(createCanvas(1, 1).getContext('2d')).constructor;
globalThis.Image = class { set src(v) { setTimeout(() => this.onload?.(), 0); } };
globalThis.requestAnimationFrame = f => setTimeout(f, 0);
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
globalThis.addEventListener = () => {};
globalThis.location = { href: 'http://localhost/', search: '', hash: '', pathname: '/' };
globalThis.indexedDB = undefined;
globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => '' });
const host = process.argv[2], out = process.argv[3], modulesDir = process.argv[4], lang = process.argv[5] || 'en';
const imp = p => import(pathToFileURL(`${host}/${p}`).href);
const { ModuleFactory } = await imp('src/ModuleFactory.js');
const factory = new ModuleFactory();
const names = ['GrainOsc', 'GrainSample', 'GrainFreeze'];
const sheet = createCanvas(260 * 3 + 40, 15 * 36 + 10), g = sheet.getContext('2d');
g.fillStyle = '#10151c'; g.fillRect(0, 0, sheet.width, sheet.height);
let i = 0;
for (const n of names) {
    const s = fs.readFileSync(`${modulesDir}/${n}.js`, 'utf8');
    const def = JSON.parse(s.slice(s.indexOf('=') + 1).trim().replace(/;$/, ''));
    def.library = 'granular';
    if (lang !== 'en') for (const c of def.components) if (c.textI18n?.[lang]) c.text = c.textI18n[lang];
    factory.registerModule(n, def);
    const panel = factory.createModule(n, 0, 0);
    panel.setPixelPosition(5 + i * 270, 5);
    panel.components.forEach(c => { if (c.parent === undefined) c.parent = panel; });
    panel.draw(g);
    i++;
}
fs.writeFileSync(out, sheet.toBuffer('image/png'));
console.log('rendered', out);
