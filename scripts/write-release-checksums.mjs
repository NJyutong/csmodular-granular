import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { copyFile, lstat, mkdir, mkdtemp, readFile, rename, rmdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBuildRun, persistBuildFailure, removeBuildRun } from './build-artifacts.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')).version;
const outputDirectory = resolve(process.argv[2] || resolve(root, 'release-assets', version));
const packageNames = [
    `Pulvis-${version}-windows-x64.exe`,
    `Pulvis-${version}-windows-arm64.exe`,
    `Pulvis-${version}-macos-arm64.pkg`,
    `Pulvis-${version}-macos-x64.pkg`,
    `Pulvis-${version}-linux-x64.deb`,
    `Pulvis-${version}-source.zip`,
];
const run = await createBuildRun({ platform: 'checksums', version });
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const output = resolve(outputDirectory, 'SHA256SUMS.txt');
const lock = resolve(outputDirectory, '.pulvis-publish-SHA256SUMS.txt.lock');
const runManifest = resolve(run.workDirectory, 'SHA256SUMS.txt');
let stagingDirectory;
let locked = false;
let preserveStaging = false;

try {
    await mkdir(outputDirectory, { recursive: true });
    const rows = [];
    for (const name of packageNames) {
        const packagePath = resolve(outputDirectory, name);
        const bytes = await readFile(packagePath);
        const hash = digest(bytes);
        const sidecar = await readFile(`${packagePath}.sha256`, 'utf8');
        assert.equal(sidecar, `${hash}  ${name}\n`, `Sidecar matches ${name}`);
        rows.push(`${hash}  ${name}`);
    }
    const contents = `${rows.join('\n')}\n`;
    await writeFile(runManifest, contents, { flag: 'wx' });
    const stagedBytes = await readFile(runManifest);
    assert.equal(stagedBytes.toString('utf8'), contents, 'The staged checksum manifest is complete.');
    for (const [row, name] of rows.map((value, index) => [value, packageNames[index]])) {
        const [expected, listedName] = row.split(/\s{2}/);
        assert.equal(listedName, name);
        assert.equal(expected, digest(await readFile(resolve(outputDirectory, name))), `Manifest hash matches ${name}`);
    }

    // Keep the publishable copy beside the final manifest so the final rename stays on one volume.
    stagingDirectory = await mkdtemp(resolve(outputDirectory, '.pulvis-manifest-'));
    const stagedManifest = resolve(stagingDirectory, 'SHA256SUMS.txt');
    const backupManifest = resolve(stagingDirectory, 'previous-SHA256SUMS.txt');
    await copyFile(runManifest, stagedManifest);
    assert.equal(await readFile(stagedManifest, 'utf8'), contents,
        'The same-volume staging copy matches the verified checksum manifest.');

    await mkdir(lock, { recursive: false });
    locked = true;
    let backedUp = false;
    let installed = false;
    try {
        const existing = await lstat(output);
        assert(existing.isFile() && !existing.isSymbolicLink(), `Refusing to replace non-file checksum list ${output}`);
        await rename(output, backupManifest);
        backedUp = true;
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
    try {
        await rename(stagedManifest, output);
        installed = true;
        const published = await readFile(output, 'utf8');
        assert.equal(published, contents, 'The published checksum manifest matches the verified staging file.');
        console.log(`${output}\t${digest(Buffer.from(published))}`);
    } catch (error) {
        const rollbackErrors = [];
        if (installed) {
            try { await rm(output, { force: true }); }
            catch (rollbackError) { rollbackErrors.push(rollbackError); }
        }
        if (backedUp) {
            try { await rename(backupManifest, output); }
            catch (rollbackError) { rollbackErrors.push(rollbackError); }
        }
        if (rollbackErrors.length) {
            preserveStaging = true;
            throw new AggregateError([error, ...rollbackErrors],
                `Checksum publication rollback failed; previous file is preserved in ${stagingDirectory}`);
        }
        throw error;
    }
} catch (error) {
    const log = await persistBuildFailure(run, `Release checksum generation failed.\n${error.stack || error}`);
    console.error(`Checksum diagnostics saved to ${log}`);
    throw error;
} finally {
    if (locked) await rmdir(lock);
    if (stagingDirectory && !preserveStaging) await rm(stagingDirectory, { recursive: true, force: true });
    await removeBuildRun(run);
}
