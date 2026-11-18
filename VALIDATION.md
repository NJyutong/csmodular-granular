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

Measured behaviour that motivated the first panel revision (before Phase warp existed): Grain Osc
"Wave phase" changed the spectrum by about 0.1 % (inaudible), "Phase jitter" by about 80 %; *Hold position*
on Osc/Sample gave bit-identical audio unless Position was being modulated.

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
  over a periodic carrier only shifts it. **Superseded**: the slot was later given a real job as *Phase warp*
  (see the last section), so it is no longer unused or labelled that way.
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

# Review of the Phase warp change (2026-11-16)

Grain Osc's former Position slot now drives a phase warp, phi' = phi + beta*sin(2*pi*phi)/(2*pi) with beta = knob/127
(core, mode 2). Checked on Csound 7.0.0-beta33 in Node: the mapping is monotonic and continuous across the table wrap,
and it measurably reshapes saw and square (harmonic spectrum -38 to -40 %, waveform -38 to -41 %, DC below 0.0005).
Cost: about +9 % on the default Osc (7.5 % -> 8.2 % of real time).

Problems found and fixed in the review:

- **A new Grain Osc was no longer a plain sine.** The knob default stayed 32 (depth 0.25), which puts the second
  harmonic of "sine" at 12 % of the fundamental (-18 dB); the default jitter of 8 adds up to 6 % more depth per grain.
  Both defaults are now 0 for Grain Osc only (Sample/Freeze keep 32 / 8). A test builds an Osc from the module's own
  defaults and requires h2/h1 < 1 % (measured 0.18 %).
- **The in-app guide still said Phase and Hold "have no audible effect"**, and the validation notes still described the
  knob as unused. The guide (patch) and the notes were corrected.
- **"Hold phase" was a wrong name**: Hold freezes the warp amount, not a phase. Renamed *Hold warp*.
- **The control sat in "Advanced · rarely needed"**, two sections away from Waveform although it is a tone control.
  Phase warp now sits next to Waveform and Pitch in section 1; its jitter is in section 2 with the other jitters.
- The Windows Chrome default of the browser tests had been removed; it is restored (CHROME_PATH still overrides it).
- Updated 2026-11-17: Phase jitter varies each grain's wavetable start independently of the held warp depth. Saved Position values still set warp depth. The per-sample comparisons use zero warp and nonzero start-phase jitter, including a Seed change during playback.

## 2026-11-17 host measurements

Chrome on Windows, 48 kHz, with the demo patch and two stereo IEEE float WAVs at
192 kHz. The files totalled 493 MiB (255 MiB float64 and 238 MiB float32).
Each of two consecutive replacements of slot 2 kept exactly two WAV names in
the live Csound VFS. GEN01 table lengths were 16,711,677 and 31,195,130 mono
frames before and after both replacements. Checking table lengths matters:
beta33 can list a file written with appendFile while reporting only the last
chunk length to the decoder.

The sum of Windows private bytes for the dedicated Chrome processes sampled
before import was 359 MiB and peaked at 2,545 MiB (441 samples, 100 ms polling
interval). This measures browser process memory, including Csound, across
import and playback restart. The 512 MiB quota applies to retained WAV input.
Native Tauri and physical low-memory devices were not measured.

In a separate 1000 × 700 browser canvas run with 4× CPU throttling, 25 pans
of the same scene (48 Grain Osc modules) made 103 panel draw calls instead of
1,225. Median voice-layer draw time over the last 20 pans was 5.3 ms versus
33.6 ms. These are drawing measurements, not audio rendering or total frame times.

In an alternating WASM render of a 2 s Osc patch (48 kHz, ksmps 4, 200 grains/s,
500 ms grains, full warp and start-phase jitter), moving the two invariant warp
coefficients to grain creation reduced median render time from 1,543 to 1,447.5 ms
(four runs per version). Maximum absolute float-output difference was zero.
