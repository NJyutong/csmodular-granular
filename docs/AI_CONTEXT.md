# AI Context — CsModular Granular

A short orientation for AI assistants and maintainers working in this plugin repository. Read this with AGENTS.md and PROJECT_STRUCTURE.md before editing.

## What this project is

CsModular Granular is a standalone plugin library for the CsModular modular audio application. It provides three modules:

- Grain Freeze records incoming audio into a private ring buffer and grains from its recent history.
- Grain Sample grains from one of the app session's imported WAV files.
- Grain Osc grains from the plugin's oscillator tables.

The host owns the patch editor, module loading, cable routing, orchestra generation, and audio engine. This plugin owns the module definitions, shared grain DSP, plugin integration patch, installer, and plugin-specific manuals and checks.

## Source of truth

Use these sources in this order:

1. Current plugin code and metadata for plugin behavior.
2. integration/csmodular.patch for host changes introduced by this plugin.
3. The actual checked-out host source for current host APIs and execution behavior.
4. Host architecture and granular docs as design and integration references; they may describe another revision.
5. CHECKS.md and VALIDATION.md as dated evidence with explicit test scope, not proof that a new change has been tested.
6. Root README files for end-user workflow and supported visible behavior.

The repository's docs directory is English only. User manuals at the root are maintained in English, Simplified Chinese, and Russian.

## Architecture at a glance

The host loads each module's JavaScript definition and paired Csound UDO. GrainCore.txt is included once before its callers through the requires dependency. The wrapper reads audio and control inputs, invokes CMGrainCore, then writes stereo output to host Zak buses. The patch connects those outputs to downstream modules or an output module such as Outs2. The plugin adds no instrument or sound-card output path.

The current core processes a host-sized control block using audio-rate vector operations. Grain scheduling advances sample by sample, preserving the offset of a grain that begins inside a block. Zak reads and writes stay in the thin wrappers at the host block size. Some host notes describe an older local setksmps 1 core; verify the current plugin source before applying that detail.

## Non-negotiable constraints

- All grain DSP stays in Csound, in the plugin's own implementation.
- Never call or wrap partikkel, partikkelsync, grain, grain2, grain3, syncgrain, granule, diskgrain, fof, fof2, fog, sndwarp, sndwarpst, mincer, or temposcal.
- Keep csound/GrainCore.txt as the single shared algorithm source and module .txt files as thin wrappers.
- Keep audio on host Zak cable buses; do not add a private instrument, internal audio bus, or direct sound-device output.
- JavaScript may validate WAV headers and transfer bytes to Csound VFS. It must not decode, resample, or synthesize grain audio.
- Do not copy or translate code or assets from GPL or unclear-license references. Record provenance and license decisions.
- Preserve existing patch contracts, including parameter order, jack IDs, ranges, defaults, and UDO input order.

## WAV limits

The current importer accepts mono/stereo WAV at 8–192 kHz, PCM 8/16/24/32-bit, IEEE float32/64, and standard WAVE_FORMAT_EXTENSIBLE. Stereo uses the left channel. RF64, RIFX, and more than two channels are unsupported. Limits are 256 MiB and 5 minutes per file, plus 512 MiB of source files and 48,000,000 decoded mono frames per app session.

If limits or behavior change, update header validation, localized UI messages, all three manuals, relevant tests, and the installed host integration together.

## Practical workflow

- Inspect Git status before editing; preserve unrelated user changes.
- For module or generated-file changes, inspect the JS definition, paired wrapper, shared core, generator contracts, and relevant tests.
- When host files change, read the host's AGENTS.md and project map and keep host/plugin changes in their separate repositories.
- Regenerate with node scripts/build-modules.mjs when generated plugin artifacts change.
- Use node scripts/install.mjs with the intended host path only when host synchronization is part of the task.
- Choose checks relevant to the change and report exactly what ran and what remains unverified.
- Do not commit or push unless authorized. Do not commit node_modules, build output, test-results, personal WAV files, credentials, or secrets.

The host's optional OSC bridge may log a WebSocket error while stopped. That message alone does not indicate a granular plugin failure.
