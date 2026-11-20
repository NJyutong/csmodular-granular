import assert from 'node:assert/strict';
import { lstat, realpath, rm } from 'node:fs/promises';
import { basename, isAbsolute, relative, resolve, sep } from 'node:path';

const [taskRootArgument, runnerTempArgument, kind, runId, attempt, label] = process.argv.slice(2);
assert(taskRootArgument && runnerTempArgument && kind && runId && attempt && label,
    'Usage: node scripts/cleanup-build-task.mjs <task-root> <runner-temp> <kind> <run-id> <attempt> <label>');

const taskRoot = resolve(taskRootArgument);
const runnerTemp = resolve(runnerTempArgument);
const expectedName = `pulvis-${kind}-${runId}-${attempt}-${label}`;
assert.equal(basename(taskRoot), expectedName, 'CI cleanup target must match the current run identifiers.');

let taskStat;
try {
    taskStat = await lstat(taskRoot);
} catch (error) {
    if (error.code === 'ENOENT') process.exit(0);
    throw error;
}
assert(taskStat.isDirectory() && !taskStat.isSymbolicLink(), 'Refusing to clean a non-directory or linked task path.');

const canonicalRunnerTemp = await realpath(runnerTemp);
const canonicalTaskRoot = await realpath(taskRoot);
const relativePath = relative(canonicalRunnerTemp, canonicalTaskRoot);
assert(relativePath && !isAbsolute(relativePath) && !relativePath.startsWith(`..${sep}`)
    && relativePath !== '..' && !relativePath.includes(sep),
'CI cleanup may remove only this run directory directly under RUNNER_TEMP.');

await rm(canonicalTaskRoot, { recursive: true, force: false, maxRetries: 3, retryDelay: 100 });
console.log(`Removed this run's temporary files: ${canonicalTaskRoot}`);
