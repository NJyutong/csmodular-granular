# Validation addendum — 2026-11-15 (block renderer, panel revision, 64 grains, waveforms, scan)

Runtime: the exact `@csound/browser@7.0.0-beta33` binary (Csound 7.0, commit `ded5d15d`), extracted
from `node_modules/@csound/browser/dist/csound.js` and run **in Node via `node:wasi`**
(`tests/lib/csound-node.mjs`, `npm run test:dsp-node`). No browser and no host application were
involved in this round.

## What changed

- `csound/GrainCore.txt` now renders one control block at a time with audio-rate vector
  operations (`tablexkt` linear/wrap, clamped envelope) instead of one sample per UDO cycle.
  The previous engine is kept as `tests/reference/GrainCoreReference.txt`.
- Panel layout, labels, tooltips and the in-app guide were revised (see README). Parameter and
  jack IDs, ranges, defaults and the Csound wrapper files are byte-for-byte unchanged, so existing
  patches and the example patch keep working.

## Passed (Node, Csound 7.0.0-beta33)

- Every behavioural assertion of `tests/dsp.mjs`, re-implemented without a browser and run against
  the new core: seed repeat/different seed, density zero, saturation, hard-left pan, two
  independent instances (identical hash), density-off tail and expiry, freeze after a ring wrap,
  frozen ring ignoring new input, empty frozen ring, analytic Hann/triangle windows (< 1e-5,
  sample-accurate start, silent after the last sample), Zak output through gain, live wrapper,
  44.1 kHz WAV wrapper, empty sample slot.
- Equivalence with the per-sample reference engine: **bit-identical at ksmps=1** (osc, noise sample,
  extreme 2-frame transposition, live ring with modulated lookback and Freeze, extreme lookback,
  mid-grain table switch); at the host's **ksmps=4** relative RMS difference between 4e-5 and
  7.3e-4 over twelve scenarios (the only systematic difference is that the 10 ms voice-count gain
  smoother is updated once per block).
- Speed relative to the reference engine with the same renderer settings, ksmps=4: 3.9×–14.9× faster over twelve
  scenarios (varies between runs). Default Osc about 33 % → 6 % of real time, idle module 23 % → 3 %.
  The 200 grains/s × 500 ms stress case now fills the 64-grain pool and takes about 75 % of real time
  (it had been capped at 32 grains). Absolute figures depend on the machine; the ratios are what the
  test asserts (> 1.5×).
- All generated module definitions keep identical parameter/jack contracts; every knob label fits
  an 80 px column in en/zh/ru with a font about 10 % wider than Arial.
- `GranularGuide.js` as edited in the patch applies to an empty tree with `git apply --check`
  and parses as an ES module; `git apply --stat` parses the whole patch.

## Not run in this round

Browser-based DSP, installation, integration and system-smoke checks were not run in this validation round; they require a compatible browser and a host checkout. Real-time audio on a sound card was not evaluated. Three host-specific patch hunks were not checked against customized host files.

Measured behaviour that motivated the panel changes: Grain Osc "Wave phase" changes the spectrum by
about 0.1 % (inaudible), "Phase jitter" by about 80 %; *Hold position* on Osc/Sample gives
bit-identical audio unless Position is being modulated.

Second part of the same day:

- Voice pool raised from 32 to 64 in both the production core and the reference engine, so the
  equivalence tests (bit-identical at ksmps=1) still compare like with like. Test: with a quiet constant source the output level follows sqrt(grain count) up to the cap
  (levels 0.010 / 0.045 / 0.049 / 0.059 for 2 / 40 / 48 / 100 requested overlapping grains; the last step
  is the expected sqrt(64/48)).
- Grain Osc gained a **Waveform** knob (parameter 14, appended; 0 sine, 1 triangle, 2 saw, 3 square).
  Test: with grains synchronised to the 220 Hz root the second-harmonic ratio is 0.001 (sine), 0.000 (triangle),
  0.48 (saw), 0.000 (square) and the third-harmonic ratio is 0.03 / 0.08 / 0.31 / 0.33; an out-of-range value
  clamps to square.
- Grain Sample gained **Scan** (parameter 15, appended; % of the file per second, wraps at the ends, Hold pauses it).
  Test with a linear-ramp WAV: the mean level drifts by +0.081 at +10 %/s, −0.083 at −10 %/s, 0 at scan 0 and
  with Hold on.
- Correction of an earlier suggestion: a non-sine wavetable does **not** make Osc's *Phase* control audible.
  Spectrum change for a 0.37 phase shift is about 1 % for saw and square (0.1 % for sine), because a window
  over a periodic carrier only shifts it. The knob stays (patch compatibility), is labelled *Phase (unused)* and
  sits in Advanced.
- Older patches: read from the host source (`PatchLoader.applyParameters`), which applies saved values by index and
  skips indices beyond the saved list, so a patch saved before this round keeps the knob defaults for the new
  parameters (Waveform 0 = sine, Scan 0 = off) and sounds as before. Read, not run in a browser.
- Rounding: the host's knob tooltip shows `Math.round(value)`, while the wrappers and the sample menu truncated.
  A slot knob showing 2 therefore played and loaded slot 1. The Slot and Waveform knobs now round in the wrapper
  and the menu (`kSlot = int(... + 0.5)`, `Math.round`), tested with 1.6 → 2 and 1.4 → 1.

Run against the real host (https://github.com/gleb812/csmodular, baseline commit 6941869):

- `integration/csmodular.patch` applies cleanly to every file except `src/ModuleFactory.js`, `vite.config.js` and
  `src/components/Panel.js`, whose pre-image hashes do not exist upstream (your local host changes); those three were
  excluded for the check.
- `node --test tests/contracts.mjs` against that patched host: 7 of 7 passed.
- The panels were rendered with the host's own `ModuleFactory`, `Panel`, `Knob`, `ButtonIncDec`, `TextLabel`, `Input`
  and `Output` code on a node canvas (`tools/render-panels.mjs`) in English, Chinese and Russian: no overlapping or
  clipped controls or labels. The host's current theme was used; localisation of labels was emulated from `textI18n`
  because the ModuleFactory hunk of the patch was among the excluded files.

Machine-readable results of this round: `validation-dsp-node.json`.

---

# Validation record — 2026-11-12

Runtime: `@csound/browser@7.0.0-beta33`, Csound 7 double samples,
commit `ded5d15dece77539c04fbaaa160144df090771e2` (2026-08-12).
Host baseline: CsModular 0.1.5. Toolchain:
Node 26.12.0, Playwright Core 1.65.0 and Vite 7.3.0.

## Passed

- Five Node test cases: dependency ordering/deduplication/failure, exact module
  parameter/port contracts, malformed WAV rejection, VFS upload lifecycle and
  failed running sample-load rollback.
- Seventeen actual Csound WASM renders: default oscillator, identical-seed
  repeat, changed seed, density zero, voice saturation/extreme transposition,
  hard-left pan, independent concurrent instances, density-off tail expiry,
  live Freeze after a complete ring wrap, ignoring changed input during Freeze,
  initially empty frozen ring, analytic Hann and triangle windows on a two-frame
  source, Zak output through downstream gain, live wrapper, 44.1 kHz WAV wrapper,
  and empty sample slot.
- Exact seed-repeat and instance-isolation sample hashes match. Frozen renders
  remain identical despite changed input. Analytic window samples agree within
  1e-5, including zero endpoints. No non-finite audio or peaks above unity.
- Actual application: all four example panels and three cables loaded; generated
  orchestra contains one shared core before wrappers; audio engine starts;
  a Zak scope table contains nonzero output; recompile succeeds; real right-click
  file chooser imports WAV; file bytes remain identical after recompile.
- The connected graph also compiles/runs in FX `instr 2`.
- Final generated orchestra, with comments and strings excluded, contains none
  of the prohibited built-in granular opcode names (including additional related
  opcodes scanned by the test).
- Fresh installer applied to original baseline files; a second install is
  idempotent. Installed source matches the current host modulo Windows line endings.
- Production build ships `my-lib` (16 modules) and `granular` (3 modules), with
  matching `.js`/`.txt` files and shared core. Library metadata, README, provenance
  and MIT notice are copied as well.

## Practical limits of validation

This is an executable browser/DSP verification, not a claim of subjective
listening quality or a Tauri release certification. Headless render timings
include test overhead and were not isolated from other processes. Default
single-module renders were roughly 0.3 s per second; the saturation case was
about 1.33 s per second and the concurrent stress case about 2.08 s per second.
Thus extreme overlap can overrun a real-time deadline; the 32-slot pool limits
memory/voice count, not guaranteed CPU time on every device.

Existing Vite mixed static/dynamic import warnings remain. When the optional OSC bridge is not running, its WebSocket connection warning is expected; the bridge is not required for granular modules. Tauri packaging was not tested.

The test bypasses beta33's offline WAV-header seek/write issue by rendering raw
float samples and adding a container header after rendering. This does not alter
samples or move DSP into JavaScript. Production audio uses the normal DAC path.

Machine-readable render hashes/levels/times are in `validation-dsp.json`. Test
WAV files, a screenshot and the generated orchestra remain in ignored
`test-results/`; they are reproducible by the supplied scripts.
