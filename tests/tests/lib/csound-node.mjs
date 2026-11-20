// Runs the real Csound WASM that ships inside @csound/browser directly in Node (node:wasi),
// so DSP tests need neither a browser nor Chrome. The binary is the same one the app loads.
import { readFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { WASI } from 'node:wasi';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const decoder = new TextDecoder(), encoder = new TextEncoder();
let compiled;

function extractWasm() {
    const source = readFileSync(resolve(root, 'node_modules/@csound/browser/dist/csound.js'), 'utf8');
    for (const run of source.matchAll(/[A-Za-z0-9+/=]{1000000,}/g)) {
        try {
            const bytes = inflateSync(Buffer.from(run[0], 'base64'));
            if (bytes.readUInt32LE(0) === 0x6d736100) return bytes; // "\0asm"
        } catch { /* not the wasm payload */ }
    }
    throw new Error('Could not find the Csound WASM inside @csound/browser/dist/csound.js');
}

export const csdText = (orc, score = 'e', options = '-d -m0 -h -f -o result.raw') =>
    `<CsoundSynthesizer>\n<CsOptions>\n${options}\n</CsOptions>\n<CsInstruments>\n${orc}\n</CsInstruments>\n<CsScore>\n${score}\n</CsScore>\n</CsoundSynthesizer>\n`;

/** Renders one CSD. `files` maps file names to bytes made visible to Csound's working directory. */
export async function renderCsd(csd, { files = {} } = {}) {
    compiled ??= await WebAssembly.compile(extractWasm());
    const dir = mkdtempSync(join(tmpdir(), 'csmodular-dsp-'));
    try {
        for (const [name, bytes] of Object.entries(files)) writeFileSync(join(dir, name), bytes);
        const wasi = new WASI({ version: 'preview1', args: ['csound'], env: {}, preopens: { '/': dir }, returnOnExit: true });
        const memory = new WebAssembly.Memory({ initial: 23 });
        const messages = [];
        const env = {
            memory,
            csoundWasiJsMessageCallback: (_, __, length, offset) => messages.push(decoder.decode(new Uint8Array(memory.buffer, offset, length))),
            csoundWasiJsDebugCallback: () => {},
            printDebugCallback: (offset, length) => messages.push(decoder.decode(new Uint8Array(memory.buffer, offset, length))),
            csoundLoadModules: () => 0,
            csoundLoadExternals: () => -1,
        };
        const { exports: x } = await WebAssembly.instantiate(compiled, { env, wasi_snapshot_preview1: wasi.wasiImport });
        wasi.initialize({ exports: { memory, _initialize: x._initialize } });
        x.__wasi_js_csoundSetMessageStringCallback();
        const text = encoder.encode(csd), pointer = x.allocStringMem(text.length);
        new Uint8Array(memory.buffer, pointer, text.length + 1).set(text);
        const csound = x.csoundCreateWasi();
        let compileResult;
        try {
            compileResult = x.csoundCompileCSD(csound, pointer, 1, 0);
        } catch (error) {
            throw new Error(`Csound compile threw\n${messages.join('')}`, { cause: error });
        }
        x.freeStringMem(pointer);
        if (compileResult !== 0) throw new Error(`Csound compile failed (${compileResult})\n${messages.join('')}`);
        if (x.csoundStartWasi(csound) !== 0) throw new Error(`Csound start failed\n${messages.join('')}`);
        const started = performance.now();
        while (x.csoundPerformKsmps(csound) === 0);
        const renderMs = performance.now() - started;
        x.csoundResetWasi(csound);
        x.csoundDestroy(csound);
        const out = join(dir, 'result.raw');
        const raw = existsSync(out) ? readFileSync(out) : Buffer.alloc(0);
        const samples = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength - raw.byteLength % 4));
        return { samples, messages, renderMs, memoryBytes: memory.buffer.byteLength };
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}
