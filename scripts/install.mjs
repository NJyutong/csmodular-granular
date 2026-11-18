// Copy this standalone library into a CsModular checkout without installing tools.
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const host = resolve(process.argv[2] || resolve(root, '../csmodular-main'));
const patch = resolve(root, 'integration/csmodular.patch');
const git = args => execFileSync('git', ['-c', `safe.directory=${host.replaceAll('\\', '/')}`, 'apply', ...args, patch], { cwd: host, stdio: 'pipe' });
try {
    git(['--reverse', '--check']);
    console.log('Host integration is already installed.');
} catch {
    // Refuse mismatched hosts before copying any library files.
    try { git(['--check']); }
    catch (error) { throw new Error(`Host integration does not match this checkout. Review integration/csmodular.patch.\n${error.stderr}`); }
    git([]);
    console.log('Applied host integration.');
}
const target = resolve(host, 'public/libraries/granular');
await mkdir(target, { recursive: true });
for (const name of ['modules', '_index.json', '_meta.json', 'README.md', 'README.zh-CN.md', 'README.ru.md', 'LICENSE']) {
    await cp(resolve(root, name), resolve(target, name), { recursive: true });
}
await mkdir(resolve(host, 'public/csound/modules'), { recursive: true });
await cp(resolve(root, 'csound/GrainCore.txt'), resolve(host, 'public/csound/modules/GrainCore.txt'));
await mkdir(resolve(host, 'public/patches'), { recursive: true });
await cp(resolve(root, 'examples/granular-demo.json'), resolve(host, 'public/patches/granular-demo.json'));
const indexPath = resolve(host, 'public/libraries/_index.json');
const index = JSON.parse(await readFile(indexPath, 'utf8'));
if (!index.libraries.includes('granular')) index.libraries.push('granular');
await writeFile(indexPath, JSON.stringify(index, null, 2) + '\n');
console.log(`Installed granular library in ${host}`);
