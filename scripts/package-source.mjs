import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
    createBuildRun,
    formatBuildLog,
    persistBuildFailure,
    removeBuildRun,
    stageVerifiedArtifact,
} from './build-artifacts.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [commit, outputArgument] = process.argv.slice(2);
assert(commit && outputArgument, 'Usage: node scripts/package-source.mjs <commit> <output-directory>');
const version = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')).version;
const outputDirectory = resolve(outputArgument);
const run = await createBuildRun({ platform: 'source', version });
const keepRun = process.env.PULVIS_KEEP_BUILD_TEMP === '1';
const logParts = [];

function runGit(args, encoding = 'utf8') {
    const result = spawnSync('git', args, {
        cwd: root,
        encoding,
        maxBuffer: 64 * 1024 * 1024,
        windowsHide: true,
    });
    const stdout = encoding === 'buffer' ? '' : (result.stdout || '');
    const stderr = encoding === 'buffer' ? '' : (result.stderr || '');
    logParts.push(formatBuildLog({
        command: ['git', ...args].join(' '), stdout, stderr, error: result.error, status: result.status,
    }));
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `git ${args[0]} failed with exit code ${result.status}.`);
    return result.stdout;
}

try {
    runGit(['cat-file', '-e', `${commit}^{commit}`]);
    const committedPackage = JSON.parse(runGit(['show', `${commit}:package.json`]));
    assert.equal(committedPackage.version, version, 'The selected commit must contain the current package version.');

    const name = `Pulvis-${version}-source.zip`;
    const archive = resolve(run.workDirectory, name);
    runGit(['archive', '--format=zip', `--prefix=Pulvis-${version}/`, `--output=${archive}`, commit]);
    const artifact = await stageVerifiedArtifact({ sourcePath: archive, outputDirectory, outputName: name });
    console.log(`${commit}\t${artifact.output}\t${artifact.sha256}`);
    console.log(`Build intermediates: ${keepRun ? run.runDirectory : 'removed after package verification'}`);
} catch (error) {
    const log = [...logParts, formatBuildLog({ command: `package source commit ${commit}`, error })].join('\n\n');
    const failureLog = await persistBuildFailure(run, log, {
        keepRun,
        failureDirectory: resolve(root, 'test-results/build-logs'),
    });
    console.error(`Source archive build failed; diagnostic log: ${failureLog}`);
    throw error;
} finally {
    if (!keepRun) await removeBuildRun(run);
}
