// Hash supplied local references without modifying or downloading them.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const paths = [
    'QB_Nebulae_V2-master/Instruments/Granular Looper/a_granular_looper.instr',
    ...['granular_processor.cc','granular_sample_player.h','grain.h','audio_buffer.h'].map(n => `eurorack-master/clouds/dsp/${n}`),
    ...['04-f-granular-synthesis.md','05-g-granular-synthesis.md','14-g-credits.md'].map(n => `csound-floss-develop/book/${n}`),
    ...['Grain.hpp','Voice.hpp'].map(n => `BHarvestr-master/src/${n}`),
];
const entries = [];
for (const path of paths) {
    const bytes = await readFile(resolve(root, '..', path));
    entries.push({ path: `E:/paper/${path}`, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length });
}
await writeFile(resolve(root, 'reference-files.json'), JSON.stringify({ reviewed: '2026-11-12', files: entries }, null, 2) + '\n');
