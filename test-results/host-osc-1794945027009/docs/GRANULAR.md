# Granular instrument library

The independent source package is `E:/paper/csmodular-granular`. Its README,
license and provenance notes are also installed in `public/libraries/granular/`.

See [the library manual](../public/libraries/granular/README.md) for controls,
signal flow, installation, tests, sample import and known limitations, and
[SOURCES.md](../public/libraries/granular/SOURCES.md) for source/license decisions.

Load `public/patches/granular-demo.json` to try Grain Osc → Grain Freeze → Outs2.
The same patch contains Grain Sample, ready for right-click WAV import.

Host changes:

- `CsoundGenerator.js`: resolve `;@ requires Name.txt` dependencies from
  `public/csound/modules/`, once and before their callers; inject sample tables
  only when Grain Sample is present. Missing dependencies and cycles are errors.
- `CsoundEngine.js` / `GrainSamples.js`: retain session sample bytes, validate
  WAV metadata, upload to the Csound VFS and restart safely on replacement.
  Decode, sample-rate correction and all grain audio processing remain Csound.
- `ModuleContextMenu.js`: select WAV for the current Grain Sample slot.
- `vite.config.js`: recognize quoted status keys and retain `_meta.json` and
  library documentation/license files in release builds.

The plugin adds no voice instrument or internal bus and does not change module
execution order. Its wrappers perform Zak I/O at the host block size, while the
shared audio-returning core uses local `setksmps 1`. Thus audio stays patchable
in both Voice and FX layers. Do not move Zak reads/writes into the local-block
core: those buses are allocated at the host block size.

The supplied host declared MIT in README but had no LICENSE file. The new
plugin's MIT notice covers its original additions, not missing upstream notices.
