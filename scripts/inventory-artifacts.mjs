import { readdir, stat, writeFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';

const input = resolve(process.argv[2] || 'test-results');
const output = resolve(process.argv[3] || resolve(input, 'artifact-inventory.json'));
const rows = [];

async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) await walk(path);
        else if (entry.isFile() && path !== output) {
            const info = await stat(path);
            rows.push({ path: relative(input, path).replaceAll('\\', '/'), bytes: info.size, extension: extname(path).toLowerCase() || '[none]' });
        }
    }
}

await walk(input);
const byExtension = {};
for (const row of rows) {
    const group = byExtension[row.extension] ??= { files: 0, bytes: 0 };
    group.files++;
    group.bytes += row.bytes;
}
const media = Object.fromEntries(['.wav', '.png', '.webm', '.mp4', '.log'].map(extension => [extension,
    byExtension[extension] ?? { files: 0, bytes: 0 }]));
const report = {
    directory: input,
    files: rows.length,
    bytes: rows.reduce((sum, row) => sum + row.bytes, 0),
    byExtension,
    retainedMediaAndLogs: media,
};
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(`Artifacts: ${report.files} files, ${(report.bytes / 1024 / 1024).toFixed(2)} MiB; WAV ${(media['.wav'].bytes / 1024 / 1024).toFixed(2)} MiB, screenshots ${(media['.png'].bytes / 1024 / 1024).toFixed(2)} MiB; inventory ${output}`);
