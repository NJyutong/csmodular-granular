import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import {
    copyFile,
    lstat,
    mkdir,
    mkdtemp,
    readFile,
    realpath,
    rename,
    rmdir,
    rm,
    writeFile,
} from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function assertDirectChild(parent, child, prefix) {
    const relativePath = relative(parent, child);
    assert(relativePath && !isAbsolute(relativePath) && !relativePath.startsWith(`..${sep}`)
        && relativePath !== '..' && !relativePath.includes(sep),
    `Build run directory must be a direct child of ${parent}.`);
    assert(basename(child).startsWith(prefix), `Build run directory must start with ${prefix}.`);
}

export function defaultBuildTempRoot(platform) {
    if (process.env.PULVIS_BUILD_TEMP_ROOT) return process.env.PULVIS_BUILD_TEMP_ROOT;
    if (process.platform === 'win32') return 'D:/csmodular-tools/pulvis-builds';
    if (process.platform === 'linux' && process.env.WSL_DISTRO_NAME) {
        return '/mnt/d/csmodular-tools/pulvis-builds';
    }
    return resolve(tmpdir(), 'pulvis-builds');
}

export async function createBuildRun({ platform, version, tempRoot = defaultBuildTempRoot(platform) }) {
    const taskRoot = process.env.PULVIS_TASK_ROOT ? resolve(process.env.PULVIS_TASK_ROOT) : null;
    let parentDirectory;
    let runDirectory;
    let prefix;

    if (taskRoot) {
        const runnerTemp = process.env.RUNNER_TEMP;
        const runId = process.env.GITHUB_RUN_ID;
        const attempt = process.env.GITHUB_RUN_ATTEMPT;
        const kind = process.env.PULVIS_TASK_KIND;
        const label = process.env.PULVIS_TASK_LABEL;
        assert(runnerTemp && runId && attempt && kind && label,
            'CI build directories require RUNNER_TEMP, GitHub run identifiers, task kind and task label.');
        const resolvedRunnerTemp = resolve(runnerTemp);
        const expectedName = `pulvis-${kind}-${runId}-${attempt}-${label}`;
        assert.equal(basename(taskRoot), expectedName, 'The CI task directory name must match this workflow run.');
        await mkdir(resolvedRunnerTemp, { recursive: true });
        await mkdir(taskRoot, { recursive: false });
        const canonicalTaskRoot = await realpath(taskRoot);
        assertDirectChild(await realpath(resolvedRunnerTemp), canonicalTaskRoot, expectedName);
        parentDirectory = canonicalTaskRoot;
        prefix = `build-${platform}-`;
        runDirectory = resolve(parentDirectory, `${prefix}${randomUUID()}`);
        await mkdir(runDirectory, { recursive: false });
    } else {
        parentDirectory = resolve(tempRoot);
        await mkdir(parentDirectory, { recursive: true });
        parentDirectory = await realpath(parentDirectory);
        prefix = `pulvis-${platform}-${version}-`;
        runDirectory = await mkdtemp(resolve(parentDirectory, `${prefix}`));
        runDirectory = await realpath(runDirectory);
    }

    const runStat = await lstat(runDirectory);
    assert(runStat.isDirectory() && !runStat.isSymbolicLink(), 'Build run must be a real directory.');
    assertDirectChild(parentDirectory, runDirectory, prefix);
    const workDirectory = resolve(runDirectory, 'work');
    await mkdir(workDirectory, { recursive: false });
    const logPath = resolve(process.env.PULVIS_BUILD_LOG_FILE || resolve(runDirectory, 'build.log'));
    return { platform, version, parentDirectory, runDirectory, workDirectory, prefix, logPath };
}

export async function removeBuildRun(run) {
    const stat = await lstat(run.runDirectory);
    assert(stat.isDirectory() && !stat.isSymbolicLink(), 'Refusing to remove a non-directory build path.');
    const parent = await realpath(run.parentDirectory);
    const target = await realpath(run.runDirectory);
    assertDirectChild(parent, target, run.prefix);
    await rm(target, { recursive: true, force: false, maxRetries: 3, retryDelay: 100 });
}

export async function persistBuildFailure(run, details, {
    keepRun = process.env.PULVIS_KEEP_BUILD_TEMP === '1',
    failureDirectory = process.env.PULVIS_FAILURE_LOG_DIR || resolve(process.cwd(), 'test-results/build-logs'),
} = {}) {
    const log = `${details.trimEnd()}\n`;
    await mkdir(dirname(run.logPath), { recursive: true });
    await writeFile(run.logPath, log, 'utf8');
    if (keepRun) return run.logPath;

    const resolvedFailureDirectory = resolve(failureDirectory);
    await mkdir(resolvedFailureDirectory, { recursive: true });
    const failureLog = resolve(resolvedFailureDirectory, `${run.platform}-${run.version}-${randomUUID()}.log`);
    await copyFile(run.logPath, failureLog);
    return failureLog;
}

export async function stageVerifiedArtifact({ sourcePath, outputDirectory, outputName, validate }) {
    const bytes = await readFile(sourcePath);
    await validate?.(bytes);
    const hash = sha256(bytes);
    const outputRoot = resolve(outputDirectory);
    await mkdir(outputRoot, { recursive: true });
    const outputReal = await realpath(outputRoot);
    const staging = await mkdtemp(resolve(outputReal, `.pulvis-stage-${randomUUID()}-`));
    const stagedArtifact = resolve(staging, outputName);
    const stagedChecksum = resolve(staging, `${outputName}.sha256`);
    const output = resolve(outputReal, outputName);
    const checksum = resolve(outputReal, `${outputName}.sha256`);
    const lock = resolve(outputReal, `.pulvis-publish-${outputName}.lock`);
    const artifactBackup = resolve(staging, 'previous-artifact');
    const checksumBackup = resolve(staging, 'previous-checksum');
    let backedUpArtifact = false;
    let backedUpChecksum = false;
    let installedArtifact = false;
    let installedChecksum = false;
    let preserveStaging = false;
    let locked = false;

    try {
        await mkdir(lock, { recursive: false });
        locked = true;
        await writeFile(stagedArtifact, bytes, { flag: 'wx' });
        await writeFile(stagedChecksum, `${hash}  ${outputName}\n`, { flag: 'wx' });
        const stagedBytes = await readFile(stagedArtifact);
        const stagedSidecar = await readFile(stagedChecksum, 'utf8');
        assert.equal(stagedBytes.length, bytes.length, 'Staged package size is unchanged.');
        assert.equal(sha256(stagedBytes), hash, 'Staged package hash is unchanged.');
        assert.equal(stagedSidecar, `${hash}  ${outputName}\n`, 'Staged SHA-256 sidecar matches the package.');

        for (const [path, backup, flagName] of [
            [output, artifactBackup, 'artifact'],
            [checksum, checksumBackup, 'checksum'],
        ]) {
            try {
                const existing = await lstat(path);
                assert(existing.isFile() && !existing.isSymbolicLink(), `Refusing to replace non-file output ${path}.`);
                await rename(path, backup);
                if (flagName === 'artifact') backedUpArtifact = true;
                else backedUpChecksum = true;
            } catch (error) {
                if (error.code !== 'ENOENT') throw error;
            }
        }

        await rename(stagedArtifact, output);
        installedArtifact = true;
        await rename(stagedChecksum, checksum);
        installedChecksum = true;
        const finalBytes = await readFile(output);
        const finalSidecar = await readFile(checksum, 'utf8');
        assert.equal(finalBytes.length, bytes.length, 'Published package size is verified.');
        assert.equal(sha256(finalBytes), hash, 'Published package hash is verified.');
        assert.equal(finalSidecar, `${hash}  ${outputName}\n`, 'Published SHA-256 sidecar is verified.');
        return { output, checksum, bytes: bytes.length, sha256: hash };
    } catch (error) {
        const rollbackErrors = [];
        for (const [installed, path] of [[installedChecksum, checksum], [installedArtifact, output]]) {
            if (!installed) continue;
            try { await rm(path, { force: true }); }
            catch (rollbackError) { rollbackErrors.push(rollbackError); }
        }
        for (const [backedUp, backup, path] of [
            [backedUpArtifact, artifactBackup, output],
            [backedUpChecksum, checksumBackup, checksum],
        ]) {
            if (!backedUp) continue;
            try { await rename(backup, path); }
            catch (rollbackError) { rollbackErrors.push(rollbackError); }
        }
        if (rollbackErrors.length) {
            preserveStaging = true;
            throw new AggregateError([error, ...rollbackErrors],
                `Artifact publication rollback failed; previous files are preserved in ${staging}`);
        }
        throw error;
    } finally {
        if (locked) await rmdir(lock);
        if (!preserveStaging) await rm(staging, { recursive: true, force: true });
    }
}

export function formatBuildLog({ command, stdout = '', stderr = '', error = null, status = null }) {
    return [
        `Command: ${command}`,
        `Exit code: ${status ?? 'not started'}`,
        error ? `Error: ${error.stack || error}` : '',
        '--- stdout ---', stdout,
        '--- stderr ---', stderr,
    ].filter(Boolean).join('\n');
}
