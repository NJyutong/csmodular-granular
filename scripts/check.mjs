import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2];
if (!['quick', 'full'].includes(mode)) throw new Error('Usage: node scripts/check.mjs <quick|full>');
const runId = `${mode}-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`;
const output = resolve(process.env.CSMODULAR_TEST_RESULTS_DIR || resolve(root, 'test-results/checks', runId));
process.env.CSMODULAR_TEST_RESULTS_DIR = output;
await mkdir(output, { recursive: true });

const timings = [];
const generated = [
    '_index.json', '_meta.json', 'examples/pulvis-demo.json',
    ...['GrainFreeze', 'GrainSample', 'GrainOsc'].flatMap(name => [`modules/${name}.js`, `modules/${name}.txt`]),
];
const fingerprint = async () => Object.fromEntries(await Promise.all(generated.map(async path => {
    const contents = (await readFile(resolve(root, path), 'utf8')).replace(/\r\n/g, '\n');
    return [path, createHash('sha256').update(contents).digest('hex')];
})));

function run(title, args) {
    const started = performance.now();
    console.log(`\n=== ${title} ===\nnode ${args.join(' ')}`);
    const result = spawnSync(process.execPath, args, { cwd: root, env: process.env, stdio: 'inherit', windowsHide: true });
    const elapsedMs = Math.round(performance.now() - started);
    timings.push({ title, command: `node ${args.join(' ')}`, elapsedMs, status: result.status ?? null });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${title} failed with exit code ${result.status}`);
}

const started = new Date().toISOString();
let failure;
try {
    if (mode === 'quick') {
        const before = await fingerprint();
        run('Generate module pairs, indexes and demo', ['scripts/build-modules.mjs']);
        const after = await fingerprint();
        for (const path of generated) {
            if (before[path] !== after[path]) throw new Error(`Generated candidate output was stale before the check: ${path}`);
        }
        run('Desktop package source smoke', ['scripts/package-smoke.mjs']);
        run('Build cleanup lifecycle regression', ['tests/build-cleanup.mjs']);
        run('Contracts and granular workflow', ['--test', 'tests/contracts.mjs', 'tests/granular-workflow.mjs']);
        run('Grain Osc carrier regressions', ['--no-warnings', 'tests/osc-carrier.mjs']);
        if (process.env.CSMODULAR_HOST_ROOT) run('Clean install, idempotence and mismatch checks', ['tests/install.mjs']);
        else console.log('\n=== Host install checks skipped: set CSMODULAR_HOST_ROOT to an isolated host baseline. ===');
        run('Artifact inventory', ['scripts/inventory-artifacts.mjs', output, resolve(output, 'artifact-inventory.json')]);
    } else {
        if (!process.env.CSMODULAR_HOST_ROOT || !process.env.CSMODULAR_UI_HOST_ROOT) {
            throw new Error('Full checks require CSMODULAR_HOST_ROOT and CSMODULAR_UI_HOST_ROOT to point at isolated host snapshots.');
        }
        run('Isolated host compatibility suite', ['scripts/check-suite.mjs']);
        run('Browser workflow regression', ['tests/host-workflow.mjs']);
        run('Spectral alias and image regression', ['--no-warnings', 'tests/spectral-regression.mjs']);
        run('Csound performance regression', ['--no-warnings', 'tests/performance-regression.mjs']);
        run('Build cleanup lifecycle regression', ['tests/build-cleanup.mjs']);
        run('Grain Osc carrier regressions', ['--no-warnings', 'tests/osc-carrier.mjs']);
        run('Desktop package source smoke', ['scripts/package-smoke.mjs']);
        run('Artifact inventory', ['scripts/inventory-artifacts.mjs', output, resolve(output, 'artifact-inventory.json')]);
    }
} catch (error) {
    failure = String(error?.stack || error);
    console.error(failure);
    process.exitCode = 1;
} finally {
    const report = { mode, started, finished: new Date().toISOString(), output, totalMs: timings.reduce((sum, item) => sum + item.elapsedMs, 0), timings, failure: failure ?? null };
    await writeFile(resolve(output, 'check-summary.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`\n${mode} check ${failure ? 'failed' : 'passed'} in ${(report.totalMs / 1000).toFixed(1)} s; timing summary: ${resolve(output, 'check-summary.json')}`);
}
