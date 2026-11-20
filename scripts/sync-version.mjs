import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFile(resolve(root, path), 'utf8');
const write = (path, value) => writeFile(resolve(root, path), value);
const packageJson = JSON.parse(await read('package.json'));
const version = packageJson.version;
assert.match(version, /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/);

const installerPackage = JSON.parse(await read('installer/package.json'));
installerPackage.version = version;
await write('installer/package.json', JSON.stringify(installerPackage, null, 2) + '\n');

const npmLock = JSON.parse(await read('installer/package-lock.json'));
npmLock.version = version;
npmLock.packages[''].version = version;
await write('installer/package-lock.json', JSON.stringify(npmLock, null, 2) + '\n');

const tauri = JSON.parse(await read('installer/src-tauri/tauri.conf.json'));
tauri.version = version;
await write('installer/src-tauri/tauri.conf.json', JSON.stringify(tauri, null, 2) + '\n');

const cargoTomlPath = 'installer/src-tauri/Cargo.toml';
let cargoToml = await read(cargoTomlPath);
const cargoTomlVersion = /^(version = ")([^"]+)("\s*)$/m;
const cargoTomlMatch = cargoToml.match(cargoTomlVersion);
assert(cargoTomlMatch, 'Cargo.toml must contain a package version');
if (cargoTomlMatch[2] !== version) {
    cargoToml = cargoToml.replace(cargoTomlVersion, `$1${version}$3`);
    await write(cargoTomlPath, cargoToml);
}

const cargoLockPath = 'installer/src-tauri/Cargo.lock';
let cargoLock = await read(cargoLockPath);
const packagePattern = /(\[\[package\]\]\r?\nname = "pulvis-installer"\r?\nversion = ")[^"]+("\r?\n)/g;
const packageMatches = [...cargoLock.matchAll(packagePattern)];
assert.equal(packageMatches.length, 1, 'Cargo.lock must contain the installer package exactly once');
cargoLock = cargoLock.replace(packagePattern, `$1${version}$2`);
await write(cargoLockPath, cargoLock);

await write('installer/ui/version.js', `export const INSTALLER_VERSION = ${JSON.stringify(version)};\n`);
console.log(`Synchronized installer metadata to ${version} from the root package.json.`);
