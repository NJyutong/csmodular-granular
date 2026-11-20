import assert from 'node:assert/strict';
import { copyFile, mkdir, readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    createBuildRun,
    defaultBuildTempRoot,
    formatBuildLog,
    persistBuildFailure,
    removeBuildRun,
    stageVerifiedArtifact,
} from './build-artifacts.mjs';

assert.equal(process.platform, 'linux', 'The Debian installer must be built on Linux.');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const version = packageJson.version;
const outputDirectory = resolve(process.argv[2] || resolve(root, 'release-assets', version));
const run = await createBuildRun({ platform: 'linux', version });
const keepRun = process.env.PULVIS_KEEP_BUILD_TEMP === '1';
const logParts = [];

function runCommand(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: options.cwd || root,
        env: options.env || process.env,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
    });
    const formatted = formatBuildLog({
        command: [command, ...args].join(' '),
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        error: result.error,
        status: result.status,
    });
    logParts.push(formatted);
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.error) throw result.error;
    return result;
}

try {
    const installer = resolve(root, 'installer');
    const tooling = resolve(run.workDirectory, 'npm-tooling');
    const cargoTarget = resolve(run.workDirectory, 'cargo-target');
    const bundleDirectory = resolve(cargoTarget, 'release/bundle/deb');
    await mkdir(tooling, { recursive: false });
    await copyFile(resolve(installer, 'package.json'), resolve(tooling, 'package.json'));
    await copyFile(resolve(installer, 'package-lock.json'), resolve(tooling, 'package-lock.json'));

    const defaultCache = process.env.WSL_DISTRO_NAME
        ? '/mnt/d/csmodular-tools/npm-cache'
        : resolve(defaultBuildTempRoot('linux'), 'npm-cache');
    const npmCache = resolve(process.env.PULVIS_NPM_CACHE || defaultCache);
    await mkdir(npmCache, { recursive: true });
    const npmEnvironment = { ...process.env, npm_config_cache: npmCache };
    const npmInstall = runCommand('npm', ['ci', '--no-audit', '--no-fund', '--prefix', tooling], { env: npmEnvironment });
    assert.equal(npmInstall.status, 0, `Installing the pinned Tauri CLI failed with exit code ${npmInstall.status}.`);

    const tauri = resolve(tooling, 'node_modules/.bin/tauri');
    const tauriBuild = runCommand(tauri, ['build', '--bundles', 'deb'], {
        cwd: installer,
        env: { ...npmEnvironment, CARGO_TARGET_DIR: cargoTarget },
    });
    assert.equal(tauriBuild.status, 0, `Tauri Debian build failed with exit code ${tauriBuild.status}.`);

    const candidates = (await readdir(bundleDirectory)).filter(name => name.endsWith(`_${version}_amd64.deb`));
    assert.equal(candidates.length, 1, `Expected exactly one amd64 Debian package in ${bundleDirectory}.`);
    const source = resolve(bundleDirectory, candidates[0]);
    const metadata = runCommand('dpkg-deb', ['--field', source, 'Version', 'Architecture', 'Package']);
    assert.equal(metadata.status, 0, 'Debian package metadata must be readable.');
    const fields = metadata.stdout.trim().split(/\r?\n/).map(value => value.trim());
    assert(fields.includes(version), 'Debian package version matches the plugin version.');
    assert(fields.includes('amd64'), 'Debian package architecture is amd64.');
    assert(fields.includes('pulvis-installer'), 'Debian package name is pulvis-installer.');

    const outputName = `Pulvis-${version}-linux-x64.deb`;
    const artifact = await stageVerifiedArtifact({
        sourcePath: source,
        outputDirectory,
        outputName,
        validate: async bytes => assert.equal(bytes.toString('ascii', 0, 8), '!<arch>\n',
            'The Linux installer output is a Debian ar archive.'),
    });
    console.log(`${artifact.output}\t${artifact.bytes}\t${artifact.sha256}`);
    console.log(`Build intermediates: ${keepRun ? run.runDirectory : 'removed after package verification'}`);
} catch (error) {
    const log = [...logParts, formatBuildLog({ command: 'Tauri Debian build', error })].join('\n\n');
    const failureLog = await persistBuildFailure(run, log, {
        keepRun,
        failureDirectory: resolve(root, 'test-results/build-logs'),
    });
    console.error(`Linux Debian build failed; diagnostic log: ${failureLog}`);
    throw error;
} finally {
    if (!keepRun) await removeBuildRun(run);
}
