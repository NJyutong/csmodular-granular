import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const resultsRoot = resolve(process.env.CSMODULAR_TEST_RESULTS_DIR || resolve(pluginRoot, 'test-results'));
export const resultPath = (...segments) => resolve(resultsRoot, ...segments);

export async function ensureResultsRoot() {
    await mkdir(resultsRoot, { recursive: true });
}
