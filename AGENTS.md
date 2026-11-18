# Granular Plugin AI Work Guide

Read this file first, then docs/PROJECT_STRUCTURE.md and docs/AI_CONTEXT.md. Read docs/INTEGRATION.md before changing host integration, Csound routing, sample loading, or installation behavior. The technical documents in docs/ are English only. The user manuals at the repository root remain available in English, Simplified Chinese, and Russian.

## Repository scope and authority

This repository is the source of truth for the granular plugin: its Csound core, module definitions, integration patch, installer, tests, and plugin documentation.

The CsModular host is maintained in a separate repository. When a task changes host files, first read the host repository's AGENTS.md and docs/PROJECT_STRUCTURE.md, then consult its relevant architecture, contribution, granular, and troubleshooting documents. Use the checked-out host source to confirm current behavior; host documentation can describe a different revision.

Only inspect a user reference repository after it has actually been provided. Do not download missing references, claim to have inspected unavailable code, or modify a reference repository.

## Product, implementation, and language

The plugin provides Grain Freeze, Grain Sample, and Grain Osc. Their editor definitions are JavaScript ES modules; their audio processing is implemented in Csound.

- Grain scheduling, voice lifetime, table reads, interpolation, playback phase, windows, random state, overlap mixing, and live-ring-buffer processing belong in Csound.
- JavaScript may implement UI, module definitions, installation tools, WAV selection and header validation, session-byte retention, and transfer to Csound's virtual file system. It must not decode, resample, or synthesize grain audio.
- Rust belongs to the host desktop shell; do not move plugin DSP into Rust or another language.
- User-facing UI and manuals support English, Simplified Chinese, and Russian. Preserve separate Russian text and the host's automatic language selection. The technical documents in docs/ are English only.

## DSP invariants

The final audio path must not call or wrap Csound's built-in granular opcodes:

partikkel, partikkelsync, grain, grain2, grain3, syncgrain, granule, diskgrain, fof, fof2, fog, sndwarp, sndwarpst, mincer, temposcal.

The only shared plugin algorithm is csound/GrainCore.txt. The three modules/*.txt files are thin wrappers that declare the shared dependency and use the host's Zak cable buses. Keep Zak reads and writes at the host block size. Do not add a private voice instrument, an internal audio bus, or direct sound-device output; route module outputs through the patch to a host output such as Outs2.

The current core renders host-sized control blocks with audio-rate vector operations and retains sample-accurate grain start offsets. Do not replace this implementation with the local setksmps 1 design described in some older host notes without verifying the current plugin and host integration.

## Samples and compatibility

Current WAV limits are 256 MiB and 5 minutes per file, plus 512 MiB of source files and 48,000,000 decoded mono frames per app session. Supported input is 8–192 kHz, mono or stereo, PCM 8/16/24/32-bit, IEEE float32/64, and standard WAVE_FORMAT_EXTENSIBLE. Stereo uses the left channel. RF64, RIFX, and more than two channels are unsupported.

If these limits or sample behavior change, update the validator, localized UI messages, all three user manuals, relevant checks, and host integration/install artifacts together. Preserve patch compatibility when changing parameter order, jack identifiers, ranges, defaults, or UDO input order.

## Source and licensing rules

Do not copy or translate code or assets from GPL or unclear-license references. Record inspected sources and license judgments in SOURCES.md and reference-files.json. The plugin MIT license covers original plugin work only; it does not replace the host's license notice.

## Workflow and Git

Before editing, inspect Git status and the relevant diff so existing user changes are preserved. Keep plugin changes in this repository and host changes in the host repository.

Edit each module definition, its paired Csound wrapper, and related release files directly. Keep the controls, ports, DSP arguments, metadata, example patch, and three user manuals aligned.

Install the plugin into the supported host checkout only when the task requires it:

    node scripts/install.mjs E:/paper/csmodular-main

The host launcher can run from the plugin root and accepts an optional host path:

    node scripts/host.mjs build E:/paper/csmodular-main

Choose checks that match the change and report what they cover and what remains unverified. Do not claim historical entries in CHECKS.md or VALIDATION.md as checks run for the current change.

Review both repositories' status and diffs separately. Commit only when requested or otherwise explicitly authorized, and do not push unless the user asks. Do not edit or commit node_modules, dist output, temporary test-results, personal WAV files, credentials, or local secrets. Keep new dependencies and caches outside the source repository, under D:\csmodular-tools when needed; do not change the system PATH.
