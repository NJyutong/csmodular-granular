# CsModular Granular: Host Integration

This guide describes how this repository integrates the Grain Freeze, Grain Sample, and Grain Osc modules with the CsModular host. It follows the host architecture and module-contribution conventions while documenting the implementation in this plugin checkout.

For user-facing instructions, see the [English manual](../README.md). Localized user manuals remain at the repository root; technical documents in docs are English only.

## 1. Integration model

CsModular modules have a JavaScript definition for the editor and a Csound UDO wrapper for audio generation. The host loads module definitions from its library index, builds the patch from modules and cables, and asks CsoundGenerator to emit orchestra code.

The granular library follows that model:

- modules/GrainFreeze.js and modules/GrainFreeze.txt — live-recording module; installed under public/libraries/granular/modules/.
- modules/GrainSample.js and modules/GrainSample.txt — WAV-backed module; installed under public/libraries/granular/modules/.
- modules/GrainOsc.js and modules/GrainOsc.txt — oscillator-backed module; installed under public/libraries/granular/modules/.
- _index.json and _meta.json — module and library metadata; installed under public/libraries/granular/.
- csound/GrainCore.txt — shared grain engine; installed as public/csound/modules/GrainCore.txt.
- examples/granular-demo.json — example host patch; installed as public/patches/granular-demo.json.
- integration/csmodular.patch — host-side loader, sample, UI, localization, and build integration; applied to the host checkout.

The JavaScript files describe controls, ports, and editor presentation. Grain scheduling and audio processing do not run in JavaScript or Rust.

## 2. Signal flow and host routing

The host's Voice layer runs in instr 1; its FX layer runs in instr 2. Patches connect module ports through the host's Zak cable buses. The plugin does not add another instrument or a private inter-module audio bus.

Each granular wrapper:

1. Reads its audio input with Zak at the host's configured block size.
2. Reads control-rate inputs with zkr.
3. Calls the shared CMGrainCore UDO.
4. Writes its left and right outputs to the Zak buses allocated by the host.

Grain Sample and Grain Osc use their audio input as an optional dry input for the mix control. Grain Freeze also records its input into its private live ring buffer. The output remains patchable through ordinary host cables; connect it to an output module such as Outs2 to reach the sound device.

The wrappers must keep Zak reads and writes at the host block size. Do not move Zak I/O into a local-block-size core: Zak buses are allocated by the host's orchestra.

## 3. Shared DSP and dependency loading

csound/GrainCore.txt is the single source of the plugin's shared grain algorithm. The three module .txt files are thin wrappers and declare the dependency:

    ;@ requires GrainCore.txt

The host integration resolves required UDO files from public/csound/modules/, orders dependencies before their callers, and includes a shared dependency once. Missing files and dependency cycles must be reported as generation errors. Sample-table declarations are emitted before the UDOs when a patch contains Grain Sample.

The core owns a 64-slot voice pool per module instance. It advances grain scheduling sample by sample, then renders each control block using audio-rate vector operations. A grain that starts partway through a block retains its sample offset, so its start and end remain sample-accurate. When all slots are active, new triggers are dropped; active grains are not stolen.

The plugin must implement scheduling, voice lifetime, table reads, interpolation, playback phase, windows, random state, overlap mixing, and live-ring-buffer behavior in its own Csound source. Do not call or wrap Csound's built-in granular opcodes, including partikkel, partikkelsync, grain, grain2, grain3, syncgrain, granule, diskgrain, fof, fof2, fog, sndwarp, sndwarpst, mincer, or temposcal.

### Block-size version note

The host's existing granular integration note describes a shared core using local setksmps 1. That detail does not match the current csound/GrainCore.txt in this plugin checkout. The current CMGrainCore sets its render block from the host's ksmps and uses block audio vectors; the module wrappers perform Zak I/O at the host block size. Follow the checked-in core and integration patch when maintaining this version.

## 4. WAV import path

Grain Sample uses the host's sample-import integration:

1. The user selects one of eight sample slots and chooses a WAV file from the module context menu.
2. JavaScript checks supported WAV metadata, retains the file bytes for the current app session, and transfers them to Csound's virtual file system.
3. The generator declares sample tables only when Grain Sample is present in the patch.
4. Csound's GEN01 loads the source and the granular core reads it during synthesis. JavaScript does not decode, resample, or process grain audio.

Current import limits are:

- One file: at most 256 MiB and 5 minutes.
- Per app session: at most 512 MiB of source files and 48,000,000 decoded mono frames.
- Sample rates: 8–192 kHz.
- Mono or stereo; stereo input uses the left channel.
- PCM 8/16/24/32-bit, IEEE float32/64, and standard WAVE_FORMAT_EXTENSIBLE.
- RF64, RIFX, and more than two channels are unsupported.

Sample bytes persist through Stop/Start and recompilation within the current app session. They are not embedded in patch JSON and are not restored after the app is closed or reloaded. Replacing a sample safely restarts the audio engine so an active voice cannot keep reading a replaced table. See the [user manual](../README.md) for the complete sample workflow and limitations.

## 5. Build and install

Run these commands from the plugin repository root:

    node scripts/build-modules.mjs
    node scripts/install.mjs E:/paper/csmodular-main

The first command regenerates the module artifacts. The installer checks whether integration/csmodular.patch is already applied; otherwise it verifies the patch against the host checkout before applying it. It then copies the modules, metadata, manuals, license, shared core, and demo patch into the host. It refuses an incompatible host instead of copying files over it.

From the plugin repository root, the launcher builds the sibling host checkout by default. Pass an explicit host path when needed:

    node scripts/host.mjs build E:/paper/csmodular-main

The installer does not copy this repository's docs directory into the host. These technical guides accompany the plugin source repository; the root user manuals are the library documentation installed with the modules.

## 6. Verification commands

Run checks relevant to the change from the plugin repository root:

    npm run test:unit
    npm run test:dsp
    npm run test:dsp-node
    npm run test:install
    npm run test:integration
    npm run test:system

The system smoke check uses a browser environment and may require a discoverable Chrome or Chromium installation. The plugin checks cover browser-based integration and Csound WASM behavior; they do not establish native Tauri packaging or playback on every physical audio device.

For changes to module metadata or generated files, also run:

    node scripts/build-modules.mjs

Do not commit node_modules, dist/, ignored test output, or personal WAV files.

## 7. Common integration issues

- **A required UDO is missing:** confirm that csound/GrainCore.txt was installed to public/csound/modules/GrainCore.txt, then regenerate the host orchestra.
- **A module does not appear in the library:** check that its entry in _index.json is stable or passable; release builds filter out development and broken modules.
- **A sample slot is silent:** empty slots produce silence. Re-import files after closing or reloading the app because samples are session data.
- **The installer rejects the host:** the supplied integration patch does not match that checkout. Review the patch against the host changes before installing; do not force-copy the library files.
- **The module has no sound-device output:** route its Zak outputs through the patch to a host output module such as Outs2.

The optional OSC bridge can log a websocket connection failure when it is not running. That message is separate from the granular engine and does not by itself indicate a plugin or audio failure.

## 8. License and provenance

The original plugin code is licensed under the repository's MIT license. The plugin license does not replace or supply a missing license notice for the separately maintained host project. See [SOURCES.md](../SOURCES.md) for provenance and license decisions.
