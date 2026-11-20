import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { access, mkdir, readFile, readdir, rm, rmdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
    createBuildRun,
    persistBuildFailure,
    removeBuildRun,
    stageVerifiedArtifact,
} from '../scripts/build-artifacts.mjs';

const testRoot = resolve(tmpdir(), `pulvis-build-cleanup-${randomUUID()}`);
const outputDirectory = resolve(testRoot, 'final');
const failureLogDirectory = resolve(testRoot, 'logs');
const priorFailureDirectory = process.env.PULVIS_FAILURE_LOG_DIR;
process.env.PULVIS_FAILURE_LOG_DIR = failureLogDirectory;

try {
    await mkdir(testRoot, { recursive: false });
    const first = await createBuildRun({ platform: 'test', version: '0.0.5', tempRoot: testRoot });
    const second = await createBuildRun({ platform: 'test', version: '0.0.5', tempRoot: testRoot });
    assert.notEqual(first.runDirectory, second.runDirectory, 'Concurrent builds receive isolated directories.');

    const artifactName = 'Pulvis-test-package.bin';
    const existingBytes = Buffer.from('previous-accepted-package');
    const firstBytes = Buffer.from('first-successful-build');
    const secondBytes = Buffer.from('repeat-successful-build');
    const artifactPath = join(first.workDirectory, artifactName);
    await writeFile(artifactPath, firstBytes);

    const original = await stageVerifiedArtifact({
        sourcePath: artifactPath,
        outputDirectory,
        outputName: artifactName,
    });
    assert.equal(original.sha256, createHash('sha256').update(firstBytes).digest('hex'));

    const publishLock = join(outputDirectory, `.pulvis-publish-${artifactName}.lock`);
    await mkdir(publishLock);
    await writeFile(artifactPath, Buffer.from('another-concurrent-build'));
    await assert.rejects(stageVerifiedArtifact({
        sourcePath: artifactPath,
        outputDirectory,
        outputName: artifactName,
    }), /EEXIST/);
    await rmdir(publishLock);
    assert.deepEqual(await readFile(original.output), firstBytes,
        'A concurrent publish cannot replace another task’s final package.');

    await writeFile(artifactPath, existingBytes);
    await assert.rejects(stageVerifiedArtifact({
        sourcePath: artifactPath,
        outputDirectory,
        outputName: artifactName,
        validate: async () => { throw new Error('simulated failed validation'); },
    }), /simulated failed validation/);
    assert.deepEqual(await readFile(original.output), firstBytes,
        'A failed build check leaves the accepted output intact.');

    await writeFile(artifactPath, secondBytes);
    const repeated = await stageVerifiedArtifact({
        sourcePath: artifactPath,
        outputDirectory,
        outputName: artifactName,
    });
    assert.deepEqual(await readFile(repeated.output), secondBytes, 'A repeated successful build replaces only its named output.');
    const sidecar = await readFile(repeated.checksum, 'utf8');
    assert.equal(sidecar, `${createHash('sha256').update(secondBytes).digest('hex')}  ${artifactName}\n`);

    await writeFile(join(first.workDirectory, 'sentinel.txt'), 'first run');
    await writeFile(join(second.workDirectory, 'sentinel.txt'), 'second run');
    await removeBuildRun(first);
    await assert.rejects(access(first.runDirectory));
    await access(join(second.workDirectory, 'sentinel.txt'));
    assert.deepEqual(await readFile(repeated.output), secondBytes,
        'Cleaning one run does not remove another run or the final package.');

    const failureLog = await persistBuildFailure(second, 'simulated compiler failure', { keepRun: false });
    assert.match(await readFile(failureLog, 'utf8'), /simulated compiler failure/);
    await removeBuildRun(second);
    await assert.rejects(access(second.runDirectory));
    await access(failureLog);
    assert.deepEqual((await readdir(outputDirectory)).sort(), [artifactName, `${artifactName}.sha256`].sort(),
        'Successful cleanup leaves only the verified artifact and its checksum.');

    const runnerTemp = join(testRoot, 'runner-temp');
    const thisTask = join(runnerTemp, 'pulvis-desktop-123-2-linux-x64');
    const otherTask = join(runnerTemp, 'pulvis-desktop-124-2-linux-x64');
    await mkdir(thisTask, { recursive: true });
    await mkdir(otherTask, { recursive: true });
    await writeFile(join(thisTask, 'artifact.txt'), 'uploaded by this task');
    await writeFile(join(otherTask, 'artifact.txt'), 'belongs to another task');
    const cleanupScript = fileURLToPath(new URL('../scripts/cleanup-build-task.mjs', import.meta.url));
    const cleanup = spawnSync(process.execPath,
        [cleanupScript, thisTask, runnerTemp, 'desktop', '123', '2', 'linux-x64'],
        { encoding: 'utf8', windowsHide: true });
    assert.equal(cleanup.status, 0, cleanup.stderr || cleanup.stdout);
    await assert.rejects(access(thisTask));
    await access(join(otherTask, 'artifact.txt'));
    const unsafeCleanup = spawnSync(process.execPath,
        [cleanupScript, otherTask, runnerTemp, 'desktop', '123', '2', 'linux-x64'],
        { encoding: 'utf8', windowsHide: true });
    assert.notEqual(unsafeCleanup.status, 0, 'Cleanup rejects a directory from another workflow run.');
    await access(join(otherTask, 'artifact.txt'));
    console.log('Build cleanup passed: success, failed validation, failure log retention, isolated runs and repeat build.');
} finally {
    if (priorFailureDirectory === undefined) delete process.env.PULVIS_FAILURE_LOG_DIR;
    else process.env.PULVIS_FAILURE_LOG_DIR = priorFailureDirectory;
    await rm(testRoot, { recursive: true, force: true });
}
