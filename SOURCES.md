# Provenance and license decisions

Reviewed on 2026-11-12. Provenance decisions below are based on inspected reference snapshots and their documented licenses. File paths and SHA-256 hashes in reference-files.json are relative to each reference project. No source code or audio assets were copied or translated.

## Host

The supplied host baseline is CsModular 0.1.5. Its README declares MIT but refers to a LICENSE file absent from the supplied source tree. The granular plugin's LICENSE covers original additions; it does not replace the host's missing notice or the license context of lines in the integration patch.

The runtime uses @csound/browser 7.0.0-beta33; this supersedes an outdated 6.18.7 comment in the host. The test-only pinned npm package carries its own Apache-2.0 LICENSE and THIRD_PARTY notices. Csound and bundled dependencies retain their own terms. No dependency binaries are committed or copied into the plugin distribution.
## QB Nebulae V2

- Inspected reference file: `QB_Nebulae_V2-master/Instruments/Granular Looper/a_granular_looper.instr`.
- Upstream: [Qu-Bit Electronix QB_Nebulae_V2](https://github.com/Qu-Bit-Electronix/QB_Nebulae_V2).
- Header: Stephen Hensley / Qu-bit Electronix, 2017. No explicit license grant
  was found in the relevant file or a root LICENSE/COPYING file.
- The file explicitly attributes its buffer UDOs to the Csound FLOSS Manual,
  without establishing a precise manual version or per-example grant.
- Inspected control organization, separate live/file sources, buffer recording
  and Freeze workflow. The primary DSP calls `partikkel` and `partikkelsync`
  around lines 762–817; those are not usable under this task's requirements.
- **No code copied or translated**, including `CopyPartialBuffer`, `CplxBufRec1`
  and `CplxBufRec2`. The modern FLOSS license cannot retroactively establish
  the license of their historical source. Only the source-selection/control
  workflow informed this implementation.

## Mutable Instruments Clouds

- Inspected reference file: `eurorack-master/clouds/dsp/`.
- Upstream: [pichenettes/eurorack](https://github.com/pichenettes/eurorack).
- Inspected `granular_processor.cc`, `granular_sample_player.h`, `grain.h`,
  and `audio_buffer.h`. Their file headers carry Emilie Gillet, 2014, and an
  MIT permission notice; this statement is scoped to these DSP files, not the
  entire eurorack tree or hardware design.
- Ideas used: separate recorder and reader state; Freeze stops recording while
  playback continues; bounded voice pool; per-grain captured parameters;
  history reserved for both reader and writer trajectories; smoothed overlap gain.
- **No C++ code copied or translated.** The Csound implementation uses its own
  scheduler, sample-count lifetime arrays, analytic Hann/triangle functions,
  explicit linear interpolation and mathematical equal-power pan. It does not
  reuse Clouds' fixed-point phase format, lookup tables, envelope approximations,
  resamplers or gain-normalization implementation.
- Should actual MIT source be ported later, retain the corresponding complete
  copyright and permission notices. Architectural acknowledgment here does
  not stand in for that requirement.

## Csound FLOSS manual

- Inspected reference file: `csound-floss-develop/book/`.
- Upstream: [csound-flossmanual/csound-floss](https://github.com/csound-flossmanual/csound-floss).
- Read `04-f-granular-synthesis.md`, specifically `04F02_GranSynth_basic.csd`
  (`schedkwhen` → separate grain instrument), and the self-made granulator
  section of `05-g-granular-synthesis.md` (`schedulek`, sound table, grain player).
- In this supplied snapshot, `14-g-credits.md` says copyright 2011–2023 Joachim
  Heintz and contributors, with book content under **CC-BY 4.0**. No separate
  permissive code grant was found in the inspected examples. This is not a
  claim about earlier manual releases or unrelated files.
- Ideas used: separating grain scheduling from grain lifecycle, and capturing
  position/rate/duration when a grain starts. **No example code copied or
  translated.** This project uses a fixed pool to avoid instrument scheduling
  and Zak ordering issues, not the manual's event-instrument implementation.

## B.Harvestr

- Inspected reference file: `BHarvestr-master/src/Grain.hpp` and `Voice.hpp`.
- Upstream: [sjaehn/BHarvestr](https://github.com/sjaehn/BHarvestr).
- Both headers declare Sven Jähnichen, 2018, **GPL-3.0-or-later**. Licenses of
  bundled UI libraries are not evidence for relicensing its DSP files.
- Only the functional separation of grain lifetime, playback speed, level and
  pan was considered. **No source, source translation, layouts or audio assets
  were copied.** In particular the supplied `sine440.wav` was not used.

## Original implementation and sample material

The implementation was written for the existing CsModular UDO interfaces.
Park–Miller state arithmetic, Hann/triangle equations, linear interpolation and
equal-power panning are mathematical constructions implemented directly here,
not extracted from any reference source. The tests create small synthetic
signals; no third-party sample material ships with the library.

Generic opcode behavior was checked against the official manual and, more
importantly, actually compiled/rendered using the exact production WASM build:
[setksmps](https://csound.com/docs/manual/setksmps.html),
[xout](https://csound.com/docs/manual/xout.html),
[ftgentmp](https://csound.com/docs/manual/ftgentmp.html), and
[function tables](https://csound.com/docs/manual/TableTop.html).

The plugin's MIT notice is shipped beside its public library files. Reference
source trees remain outside both project Git repositories.
