import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { assertTextEqual } from './lib/assert-text-equal.mjs';
import { getHostRoot } from './lib/host-root.mjs';
import { ensureResultsRoot, resultPath } from './lib/artifacts.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const host = getHostRoot(root);
const baseline = process.env.CSMODULAR_HOST_BASELINE_REF || '10136ca';
const patchPath = resolve(root, 'integration/csmodular.patch');
const patchText = await readFile(patchPath, 'utf8');
const installScript = resolve(root, 'scripts/install.mjs');
const results = resultPath();
const safeHost = host.replaceAll('\\', '/');
const gitHost = args => execFileSync('git', ['-c', `safe.directory=${safeHost}`, ...args], { cwd: host, stdio: 'pipe' });
const installInto = fixture => execFileSync(process.execPath, [installScript, fixture], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
});

await ensureResultsRoot();
gitHost(['rev-parse', '--verify', `${baseline}^{commit}`]);

const baseLibraryIndex = gitHost(['show', `${baseline}:public/libraries/_index.json`]);
async function createFixture(name, libraries) {
    const fixtureRoot = await mkdtemp(resolve(results, `${name}-`));
    execFileSync('git', ['init', '-q', fixtureRoot]);
    const headers = [...patchText.matchAll(/^diff --git a\/(.+?) b\/.+$/gm)];
    for (let index = 0; index < headers.length; index++) {
        const path = headers[index][1];
        const end = headers[index + 1]?.index ?? patchText.length;
        const section = patchText.slice(headers[index].index, end);
        if (/^new file mode /m.test(section)) continue;
        const original = gitHost(['show', `${baseline}:${path}`]);
        await mkdir(dirname(resolve(fixtureRoot, path)), { recursive: true });
        await writeFile(resolve(fixtureRoot, path), original);
    }
    await mkdir(resolve(fixtureRoot, 'public/libraries'), { recursive: true });
    const index = JSON.parse(baseLibraryIndex.toString('utf8'));
    index.libraries = libraries;
    await writeFile(resolve(fixtureRoot, 'public/libraries/_index.json'), JSON.stringify(index, null, 2) + '\n');
    return fixtureRoot;
}

const fixture = await createFixture('install-baseline', ['my-lib']);

const firstInstall = installInto(fixture);
assert.match(firstInstall, /Applied host integration\./, 'The clean baseline receives the integration patch');
// Recreate the two previously shipped source integrations from the installed host.
const upgrade = resolve(root, 'integration/studio-upgrade.patch');
for (const legacyWav of [false, true]) {
    const revert = (...args) => execFileSync('git', ['apply', '--reverse', ...args], { cwd: fixture, stdio: 'pipe' });
    revert('--include=src/ui/PulvisPanel.js', patchPath);
    revert(upgrade);
    if (legacyWav) revert(resolve(root, 'integration/wav-session-compat.patch'));
    assert.match(installInto(fixture), /Applied host integration/);
}
execFileSync('git', ['apply', '--reverse', resolve(root, 'integration/studio-display-update.patch')], { cwd: fixture });
assert.match(installInto(fixture), /Applied host integration/, 'Upgrade a host with the previous studio display');
const repeatedInstall = installInto(fixture);
assert.match(repeatedInstall, /Host integration is already installed\./, 'An already installed host is recognized on repeat');
assert.doesNotThrow(() => execFileSync('git', ['apply', '--reverse', '--check', patchPath], { cwd: fixture, stdio: 'pipe' }), 'Installed patch can be identified by reverse check');
if (process.env.CSMODULAR_INSTALLED_HOST_ROOT) {
    const installedHost = resolve(process.env.CSMODULAR_INSTALLED_HOST_ROOT);
    const recognized = execFileSync(process.execPath, [installScript, installedHost], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    assert.match(recognized, /Host integration is already installed\./, 'The audited installed host snapshot is recognized');
}

const artifactPairs = [
    ['public/csound/modules/GrainCore.txt', 'csound/GrainCore.txt'],
    ...['GrainFreeze', 'GrainSample', 'GrainOsc'].flatMap(name => [
        [`public/libraries/pulvis/modules/${name}.js`, `modules/${name}.js`],
        [`public/libraries/pulvis/modules/${name}.txt`, `modules/${name}.txt`],
    ]),
    ['public/libraries/pulvis/_index.json', '_index.json'],
    ['public/libraries/pulvis/_meta.json', '_meta.json'],
    ['public/libraries/pulvis/README.md', 'README.md'],
    ['public/libraries/pulvis/README.zh-CN.md', 'README.zh-CN.md'],
    ['public/libraries/pulvis/README.ru.md', 'README.ru.md'],
    ['public/libraries/pulvis/SOURCES.md', 'SOURCES.md'],
    ['public/libraries/pulvis/LICENSE', 'LICENSE'],
    ['public/patches/pulvis-demo.json', 'examples/pulvis-demo.json'],
];
for (const [installedPath, sourcePath] of artifactPairs) {
    assertTextEqual(installedPath, await readFile(resolve(fixture, installedPath), 'utf8'), await readFile(resolve(root, sourcePath), 'utf8'));
}
assert.deepEqual(
    await readFile(resolve(fixture, 'public/libraries/pulvis/assets/pulvis-icon.png')),
    await readFile(resolve(root, 'assets/pulvis-icon.png')),
    'Installed README icon matches the source image asset',
);
const libraryIndex = JSON.parse(await readFile(resolve(fixture, 'public/libraries/_index.json'), 'utf8'));
assert.deepEqual(libraryIndex.libraries, ['my-lib', 'pulvis']);
const moduleIndex = JSON.parse(await readFile(resolve(fixture, 'public/libraries/pulvis/_index.json'), 'utf8'));
assert(moduleIndex.modules.every(module => ['stable', 'passable'].includes(module.status)), 'Published modules must be stable or passable');
assert(moduleIndex.modules.every(module => module.displayName.startsWith('Pulvis ')), 'All module labels carry the Pulvis brand');
const panel = await readFile(resolve(fixture, 'src/components/Panel.js'), 'utf8');
assert(panel.indexOf('if (this.customColor) {') < panel.indexOf('ctx.fillStyle = theme.getSurfaceColor()'), 'Installed panels respect custom color in LCD');
const moduleFactory = await readFile(resolve(fixture, 'src/ModuleFactory.js'), 'utf8');
assert.match(moduleFactory, /if \(compDef\.indexValue\)[\s\S]*?component\.setValue = value => component\.setIndex\(Math\.round\(Number\(value\)\)\)/,
    'Installed multi-value ButtonIncDec controls save and restore their selected index');
const contextMenu = await readFile(resolve(fixture, 'src/ui/ContextMenu.js'), 'utf8');
assert.match(contextMenu, /entry\.meta\?\.displayNameI18n[\s\S]*localize\(/, 'The host menu uses the localized library display name');
assert.match(contextMenu, /moduleEntry\.displayNameI18n[\s\S]*localize\(/, 'The host menu localizes branded module names');
const patchLoader = await readFile(resolve(fixture, 'src/PatchLoader.js'), 'utf8');
assert.match(patchLoader, /lib === 'granular'[\s\S]*l\.name === 'pulvis'/, 'Existing patches load through the granular-to-Pulvis alias');
const viteConfig = await readFile(resolve(fixture, 'vite.config.js'), 'utf8');
assert.match(viteConfig, /fs\.cpSync\(assetsSrc, path\.join\(DST, libName, 'assets'\)/,
    'The host production build includes the localized library icon assets');

const legacyFixture = await createFixture('install-legacy-migration', ['my-lib', 'granular']);
await mkdir(resolve(legacyFixture, 'public/libraries/granular'), { recursive: true });
await writeFile(resolve(legacyFixture, 'public/libraries/granular/user-module-notes.txt'), 'keep this user data\n');
installInto(legacyFixture);
assert(!existsSync(resolve(legacyFixture, 'public/libraries/granular')), 'The legacy library folder is renamed');
assert.equal(await readFile(resolve(legacyFixture, 'public/libraries/pulvis/user-module-notes.txt'), 'utf8'), 'keep this user data\n',
    'The legacy folder rename preserves unrelated user data');
const migratedIndex = JSON.parse(await readFile(resolve(legacyFixture, 'public/libraries/_index.json'), 'utf8'));
assert.deepEqual(migratedIndex.libraries, ['my-lib', 'pulvis'], 'Host registration migrates from granular to pulvis');

// A failure late in publication must restore the patch, overwritten files and registration.
const broken = await createFixture('install-rollback', ['my-lib']);
const brokenCore = resolve(broken, 'public/csound/modules/GrainCore.txt');
await mkdir(brokenCore, { recursive: true });
const originalIndex = await readFile(resolve(broken, 'public/libraries/_index.json'));
assert.throws(() => installInto(broken), /Expected a regular file/);
assert.deepEqual(await readFile(resolve(broken, 'public/libraries/_index.json')), originalIndex);
assert(!existsSync(resolve(broken, 'public/libraries/pulvis')));
assert(!existsSync(resolve(broken, 'src/csound/GrainSamples.js')));
assert(!existsSync(resolve(broken, '.pulvis-install-lock')));

const missing = await createFixture('install-missing-index', ['my-lib']);
await rename(resolve(missing, 'public/libraries/_index.json'), resolve(missing, 'index-before.json'));
assert.throws(() => installInto(missing), /ENOENT/);
assert(!existsSync(resolve(missing, 'src/csound/GrainSamples.js')));
assert(!existsSync(resolve(missing, 'public/libraries/pulvis')));

const mismatch = await mkdtemp(resolve(results, 'install-mismatch-'));
execFileSync('git', ['init', '-q', mismatch]);
await mkdir(resolve(mismatch, 'src/csound'), { recursive: true });
await writeFile(resolve(mismatch, 'src/csound/CsoundGenerator.js'), '// deliberately incompatible host baseline\n');
let mismatchError;
try { installInto(mismatch); } catch (error) { mismatchError = error; }
assert(mismatchError, 'An incompatible host baseline is rejected');
assert.match(String(mismatchError.stderr), /Host integration does not match this checkout/);
assert(!existsSync(resolve(mismatch, 'public/libraries/pulvis')), 'Mismatch rejection happens before copying plugin files');

console.log(`Clean install, repeat recognition, artifact equality and mismatch rejection passed (baseline ${baseline}).`);
