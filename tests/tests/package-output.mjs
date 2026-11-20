import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertTextEqual } from './lib/assert-text-equal.mjs';
import { getHostRoot } from './lib/host-root.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const host = getHostRoot(root);
const dist = resolve(host, 'dist');
const outputPairs = [
    ['csound/modules/GrainCore.txt', 'csound/GrainCore.txt'],
    ...['GrainFreeze', 'GrainSample', 'GrainOsc'].flatMap(name => [
        [`libraries/pulvis/modules/${name}.js`, `modules/${name}.js`],
        [`libraries/pulvis/modules/${name}.txt`, `modules/${name}.txt`],
    ]),
    ['libraries/_index.json', '../host/public/libraries/_index.json'],
    ['libraries/pulvis/_meta.json', '_meta.json'],
    ['libraries/pulvis/README.md', 'README.md'],
    ['libraries/pulvis/README.zh-CN.md', 'README.zh-CN.md'],
    ['libraries/pulvis/README.ru.md', 'README.ru.md'],
    ['libraries/pulvis/SOURCES.md', 'SOURCES.md'],
    ['libraries/pulvis/LICENSE', 'LICENSE'],
    ['patches/pulvis-demo.json', 'examples/pulvis-demo.json'],
];

for (const [outputPath, sourcePath] of outputPairs) {
    const actualPath = resolve(dist, outputPath);
    assert(existsSync(actualPath), `Production output is missing ${outputPath}`);
    const expectedPath = sourcePath.startsWith('../host/')
        ? resolve(host, sourcePath.slice('../host/'.length))
        : resolve(root, sourcePath);
    assertTextEqual(outputPath, await readFile(actualPath, 'utf8'), await readFile(expectedPath, 'utf8'));
}
assert.deepEqual(
    await readFile(resolve(dist, 'libraries/pulvis/assets/pulvis-icon.png')),
    await readFile(resolve(root, 'assets/pulvis-icon.png')),
    'Production package contains the byte-identical Pulvis README icon',
);

const sourceLibrary = JSON.parse(await readFile(resolve(root, '_index.json'), 'utf8'));
const library = JSON.parse(await readFile(resolve(dist, 'libraries/pulvis/_index.json'), 'utf8'));
const sourceModules = sourceLibrary.modules.map(module => module.name).sort();
assert.deepEqual(library.modules.slice().sort(), sourceModules, 'Production Pulvis index must contain every source module');
assert(sourceLibrary.modules.every(module => ['stable', 'passable'].includes(module.status)));
console.log('Production package contains the module pairs, shared core, indexes, demo, three manuals, provenance and license.');
