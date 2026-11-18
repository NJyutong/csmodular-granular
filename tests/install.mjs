import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const host = resolve(root, '../csmodular-main');
await mkdir(resolve(root, 'test-results'), { recursive: true });
const fixture = await mkdtemp(resolve(root, 'test-results/install-'));
execFileSync('git', ['init', '-q', fixture]);
const paths = ['src/csound/CsoundGenerator.js', 'src/csound/CsoundEngine.js', 'src/ui/ModuleContextMenu.js', 'src/ModuleFactory.js', 'vite.config.js', 'public/libraries/_index.json', 'src/components/Panel.js', 'src/ui/ColorPicker.js'];
for (const path of paths) {
    const original = execFileSync('git', ['-c', `safe.directory=${host.replaceAll('\\', '/')}`, 'show', `10136ca:${path}`], { cwd: host });
    await mkdir(dirname(resolve(fixture, path)), { recursive: true });
    await writeFile(resolve(fixture, path), original);
}
for (let attempt = 0; attempt < 2; attempt++) {
    execFileSync(process.execPath, [resolve(root, 'scripts/install.mjs'), fixture], { stdio: 'inherit' });
}
for (const path of [...paths.slice(0, 5), 'src/csound/GrainSamples.js', 'src/utils/locale.js', 'src/ui/module-menu.css', 'src/ui/positionContextMenu.js', 'src/ui/ColorPicker.js']) {
    const actual = (await readFile(resolve(fixture, path), 'utf8')).replaceAll('\r\n', '\n');
    const expected = (await readFile(resolve(host, path), 'utf8')).replaceAll('\r\n', '\n');
    assert(actual === expected, `Installed content matches host: ${path}`);
}
assert.deepEqual(JSON.parse(await readFile(resolve(fixture, 'public/libraries/_index.json'), 'utf8')).libraries, ['my-lib', 'granular']);
const panel = await readFile(resolve(fixture, 'src/components/Panel.js'), 'utf8');
assert(panel.indexOf('if (this.customColor) {') < panel.indexOf('ctx.fillStyle = theme.getSurfaceColor()'), 'Installed panels respect custom color in LCD');
console.log('Fresh-install and repeated-install checks passed.');
