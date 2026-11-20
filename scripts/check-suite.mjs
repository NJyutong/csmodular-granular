import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const host = process.env.CSMODULAR_HOST_ROOT;
if (!host) throw new Error('Set CSMODULAR_HOST_ROOT to an isolated CsModular host checkout before running the host compatibility suite.');
const uiHost = process.env.CSMODULAR_UI_HOST_ROOT;
if (!uiHost) throw new Error('Set CSMODULAR_UI_HOST_ROOT to an isolated checkout of the installed host snapshot for canvas/color regressions.');

const generated = [
    '_index.json', '_meta.json', 'examples/pulvis-demo.json',
    ...['GrainFreeze', 'GrainSample', 'GrainOsc'].flatMap(name => [`modules/${name}.js`, `modules/${name}.txt`]),
];
const fingerprint = async () => Object.fromEntries(await Promise.all(generated.map(async path => {
    const text = (await readFile(resolve(root, path), 'utf8')).replace(/\r\n/g, '\n');
    return [path, createHash('sha256').update(text).digest('hex')];
})));

function run(title, args) {
    console.log(`\n=== ${title} ===\nnode ${args.join(' ')}`);
    const result = spawnSync(process.execPath, args, {
        cwd: root,
        env: {
            ...process.env,
            CSMODULAR_HOST_ROOT: resolve(host),
            CSMODULAR_UI_HOST_ROOT: resolve(uiHost),
            CSMODULAR_INSTALLED_HOST_ROOT: resolve(uiHost),
        },
        stdio: 'inherit',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
}

const before = await fingerprint();
run('Generate module pairs, indexes and demo', ['scripts/build-modules.mjs']);
const after = await fingerprint();
for (const path of generated) {
    if (before[path] !== after[path]) throw new Error(`Generated output was stale before the build: ${path}`);
}

run('Clean install, idempotence and mismatch tests', ['tests/install.mjs']);
run('Install into isolated host baseline', ['scripts/install.mjs', resolve(host)]);
run('Contract tests', ['--test', 'tests/contracts.mjs']);
run('Node Csound WASM DSP', ['--no-warnings', 'tests/dsp-node.mjs']);
run('Browser Csound WASM DSP', ['tests/dsp.mjs']);
run('Vite production build for the clean host', ['scripts/host.mjs', 'build', resolve(host)]);
run('Browser integration', ['tests/integration.mjs']);
run('System smoke', ['tests/system-smoke.mjs']);
run('Production artifact audit', ['tests/package-output.mjs']);
run('Vite build for the audited installed host', ['scripts/host.mjs', 'build', resolve(uiHost)]);
run('Canvas regression', ['tests/canvas.mjs']);
run('Color regression', ['tests/colors.mjs']);

console.log('\nAll host compatibility checks passed.');
