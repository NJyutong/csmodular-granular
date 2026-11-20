// Use the current Node executable directly; no npm/cmd PATH lookup is needed.
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as viteBuild } from 'vite';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] || 'dev';
if (!['dev', 'build', 'preview'].includes(mode)) throw new Error('Use dev, build or preview.');
const host = resolve(process.argv[3] || process.env.CSMODULAR_HOST_ROOT || resolve(root, '../csmodular-main'));
if (mode === 'build') {
    // Native config loading avoids Vite writing a temporary bundle through a read-only node_modules junction.
    globalThis.__dirname = host;
    await viteBuild({ root: host, configFile: resolve(host, 'vite.config.js'), configLoader: 'native' });
    process.exitCode = 0;
} else {
const vite = resolve(root, 'node_modules/vite/bin/vite.js');
const child = spawn(process.execPath, [vite, ...(mode === 'dev' ? [] : [mode])], { cwd: host, stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
}
