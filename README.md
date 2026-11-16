# CsModular Granular Library

[English](README.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md)

Panels follow the order you work in: **1 source/tone → 2 shape & randomness → 3 stereo output → Advanced**. Osc starts with Waveform (0 sine, 1 triangle, 2 saw, 3 square), Pitch and Grains/s (pitch 0 = 220 Hz, A3); Sample starts with the file slot, position and Scan speed; Freeze starts with Record/Freeze, lookback and lookback jitter, and keeps Dry/wet next to Level. Controls that rarely change the result sit last: Phase and Hold position on Osc (neither is audible on a periodic wave; they exist so older patches load), Hold position and the dry-signal mix on Sample, centre Pan on Freeze. Leave them at their defaults when starting.

## First use

Click **Start here** at the top right, then **Load starter patch**. It loads Grain Osc → Outs2, with confirmation before replacing your patch. Save your work first. Lower speaker volume and press ▶ in the bottom bar. The guide covers cables, controls, saving and silence troubleshooting. Each panel now identifies its source. Grain window is a named Hann/Triangle selector; live Freeze offers Record/Freeze, while sample/osc offer Follow/Hold position. Parameter IDs and DSP routing remain compatible.


The interface follows browser/system language preferences (Chinese, Russian, English fallback). Reload after changing language.

An original Csound granular engine with three CsModular modules. Scheduling,
voice playback, interpolation, windows, random state and overlap mixing all
run in Csound. There is no built-in granular synthesizer in the DSP path.

## Layout and installation

The granular plugin is maintained in this standalone repository; the CsModular host application is maintained separately.

- `csound/GrainCore.txt`: the single shared DSP implementation.
- `modules/GrainFreeze`, `GrainSample`, `GrainOsc`: matching `.js` UI / `.txt` UDO pairs.
- `scripts/build-modules.mjs`: regenerates the plain module objects and thin UDO wrappers.
- `integration/csmodular.patch`: required host integration, against the supplied 0.1.5 sources.
- `scripts/install.mjs`: checks/applies that patch and copies the library and example.
- `examples/granular-demo.json`: ready-to-load patch.
- `tests/`: real WASM rendering, application and interface checks.
- `SOURCES.md`: provenance, license decisions and exact inspected file hashes.

The integration is already installed in the supplied host. After editing this
plugin, synchronize it with:

```powershell
node scripts/build-modules.mjs
node scripts/install.mjs <path-to-csmodular-main>
```

The installer is idempotent and refuses incompatible integration changes.
The generated `.js`/`.txt` pairs alone require a host with this integration
and `GrainCore.txt`; they are not standalone opcodes for an unmodified editor export.

## Play

1. Run `node scripts/host.mjs dev`, then open the displayed local URL.
2. Load `examples/granular-demo.json` with the patch Load control. Alternatively,
   press Space and choose the **Granular** library's modules.
3. The example connects **Grain Osc L → Grain Freeze Audio in → Outs2 L/R**.
   Enable audio with the transport control. All cables must be in the same layer.
4. Select **Freeze** instead of **Record** on Grain Freeze after recording some audio. New input stops
   updating the ring; grains continue playing. Turn it back to 0 to resume recording.
5. For a file source, choose Grain Sample's **Sample slot** (1–8), right-click its
   panel, choose **Load WAV → slot…**, then connect its L/R outputs to Outs2 or
   another processor. Empty slots are silent.

Each module has a mono input and two audio outputs. On Grain Sample / Grain Osc,
the input is the optional **dry** signal for Mix; it does not replace the grain
source. Mix 0 passes this dry input, Mix 127 selects only granular output.
On Grain Freeze the input also feeds its private 192,000-frame ring (4 s at 48 kHz).

## Controls and modulation

The small jack beside each of the first twelve knobs is additive, control-rate CV.
Audio cables are converted by the host before entering these static control jacks.

| Control | Knob range / meaning | Added by CV = 1 |
|---|---|---|
| Density | 0–200 grains/s; 0 lets existing voices finish | 100 grains/s |
| Size | 2–500 ms; live grains may shorten for read/write safety | 250 ms |
| Position | 0–127 maps to 0–1; live: recent → older safe history (about 4 s at 48 kHz); Osc: start phase of each grain, **no audible effect** on any periodic wave (kept for patch compatibility) | 1 source span |
| Pos jitter | 0–127, maximum random displacement in source span (panel label: Phase jitter on Osc, Position jitter on Sample, Lookback jitter on Freeze) | 1 source span |
| Pitch | −48…+48 semitones | 12 semitones |
| Pitch jitter | 0–24 semitones, symmetric per grain | 12 semitones |
| Window | 0 = Hann, 1 = triangle; threshold 0.5 | 1 |
| Pan | 0 = left, 127 = right; equal-power gains | 1 normalized pan |
| Spread | 0–127; random pan range up to ±0.5 | 1 normalized spread |
| Freeze | threshold 0.5; Freeze module: stops live writes. Sample (labelled *Hold position*): pauses Scan and ignores Position changes. Osc: no audible effect | 1 |
| Wet mix | 0–127, dry → wet (panel label: Dry/wet on Freeze, Grain/dry mix on Osc and Sample) | 1 normalized mix |
| Level | 0–127, 0 → unity | 1 normalized level |
| Seed | integer 0–65534, no CV; independent per instance | — |
| Sample slot | 1–8, rounded to the nearest integer like the knob tooltip; Grain Sample only, no CV | — |
| Scan | −100…+100 % of the file per second, 0 = stay at Position; Grain Sample only, no CV. Position moves by itself and wraps at the file ends; Hold pauses it | — |
| Waveform | 0–3 (rounded like the tooltip) = sine, triangle, saw, square (one period, 220 Hz root); Grain Osc only, no CV. Saw/square use 24/23 harmonics, so they alias at high pitches | — |

Ranges are clamped in Csound. Position/Pitch/Window/Pan and size are captured
at grain creation. Position CV scans subsequent grains without retuning active
ones. In sample/osc mode Freeze holds Position; density, pitch and other controls
remain live. The dry signal continues through Mix. Changing Seed resets only
that instance's random sequence; restart the patch for identical scheduling too.

## Engine and routing

The scheduler accumulates `density / sr` each sample and attempts one grain per
crossing. Each instance owns 64 reusable slots. A full pool drops new triggers,
without stealing or truncating active grains. Three Park–Miller random draws
choose position, pitch and pan for each accepted trigger.

The core renders one control block (the host's `ksmps=4`) at a time. The
scheduler still advances sample by sample, so a grain started at offset *j* of a block
has age −*j* and its window is clamped to silence outside its lifetime: starts and
ends remain sample-accurate. Per voice it keeps age, length, source table, read
position, rate and pan, and renders them with audio-rate vector operations, so the
cost scales with the number of *sounding* grains instead of with every sample.
Reads use two explicit wrapped indices and linear interpolation (`tablexkt`, size 2, wrap).
Against the previous per-sample engine, kept as `tests/reference/GrainCoreReference.txt`,
output is bit-identical at `ksmps=1`; at the host's `ksmps=4` the relative RMS difference
is below 0.1 % (only the voice-count gain smoother is updated once per block).
On Csound 7.0.0-beta33 (Node/V8) rendering is about 4–15× faster: default Osc settings use about
6 % of real time instead of about 33 %, an idle module about 3 % instead of 23 %. Hann/triangle windows have zero endpoints. Summed
voices receive smoothed `1/sqrt(active voices)` compensation and `tanh` peak
control. Wrappers interpolate Mix/Level and bound their final outputs to ±1.

Wrappers run at the host's `ksmps=4`: `zar` reads the audio input, `zkr` reads CV,
the shared core returns audio, and `zaw` writes L/R to allocated cable buses.
There is **no extra grain instrument, audio bus or direct sound-card output**
in the plugin. Outs2 remains the patch's sound-card endpoint.

The host executes modules in insertion order within `instr 1` (Voice) or
`instr 2` (FX), with no global Zak clear. A receiver preceding its source sees
the previous 4-sample block (about 83 μs at 48 kHz). This existing feedback
behavior is preserved; the plugin does not introduce another block of latency.

The generator resolves `;@ requires GrainCore.txt` before callers, includes it
once, detects dependency cycles and reports missing files. Sample tables precede
the UDOs. Vite copies the shared public file, ships all three `passable` modules,
accepts quoted status keys and retains library metadata/license documentation.

## Samples and limitations

- WAV: mono/stereo PCM 8/16/24/32-bit or float32/64, including standard WAVE_FORMAT_EXTENSIBLE; 8–192 kHz, 2 frames–300 s. Maximum 256 MiB per file; session limits: 512 MiB source files and 48 million decoded mono frames. Stereo uses the **left channel** as the mono source.
  Csound GEN01 decodes it; `ftsr` corrects playback for its original sample rate.
- JS only selects, validates headers, retains bytes and uploads to Csound's VFS.
  It does not decode, resample or synthesize grain audio.
- Eight sample slots are shared across module instances **within this app session**.
  Files survive Stop/Start and Recompile, but are not embedded in patch JSON,
  saved to IndexedDB, or restored after closing/reloading the app. Reimport them.
- Replacing a sample briefly restarts the whole audio engine and clears live rings.
  This avoids replacing a table underneath active voices. CSD exports still need
  the corresponding VFS-named WAV files beside the exported score; they are not
  self-contained sample bundles.
- Grain Osc currently uses the existing sine table, with a 220 Hz root pitch.
  Additional waveform selection, reverse playback, bandlimited interpolation,
  asynchronous density jitter and stereo grain sources are not implemented.
- Looping an arbitrary sample can cross a discontinuous boundary. Linear
  interpolation and the grain window do not remove all loop clicks or aliasing
  at high transposition. There is no automatic source seam crossfade.
- Live duration is conservatively reduced so the complete grain read trajectory
  and subsequent writer trajectory fit recorded history, including unfreezing
  during a grain. Initially empty or frozen rings output silence.
- Pool saturation caps overlap; requested density × size above 64 does not create
  unbounded voices. In the headless smoke run, a saturated instance rendered 1 s
  in about 1.33 s, so **high overlap can exceed real-time CPU capacity** on the
  test machine. Default settings were about 0.3 s per rendered second. These
  non-isolated test timings are not an audio-device benchmark; reduce Density,
  Size or the number of instances if playback breaks up.
- Validation covers the browser build. Native Tauri packaging and listening on
  every audio device have not been tested. Existing OSC bridge connection errors
  are unrelated when the optional bridge on port 8765 is not running.

## Tools and verification

Dependencies are declared in package.json. Do not commit node_modules or generated test output. Run commands from the repository root using a supported Node.js runtime.

Browser-based checks use Playwright Core and require a compatible Chrome or Chromium installation. Set CHROME_PATH when the browser is not discoverable.

The project launcher invokes Vite directly; use its build mode to build the host.

```powershell
node tests/contracts.mjs
node tests/install.mjs
node tests/dsp.mjs
node tests/dsp-node.mjs   # no browser: runs the same Csound WASM in Node
node scripts/host.mjs build
node tests/integration.mjs
```

Tests use the exact production `@csound/browser@7.0.0-beta33`, reporting Csound 7
double samples, commit `ded5d15dece77539c04fbaaa160144df090771e2` (2026-08-12).
`playwright-core@1.65.0` drives existing Chrome; `CHROME_PATH` can override it.
For DSP tests, raw float output avoids beta33's WASI WAV-header seek/write issue;
the test adds a WAV container afterward without changing any rendered sample.
Outputs and screenshots are in ignored `test-results/`.

Generic opcodes exercised by actual WASM compilation/rendering include `xin`,
`xout`, `setksmps`, `init` arrays, `ftgen`, `ftgentmp`, `ftlen`, `ftsr`, `fillarray`,
`tablekt`, `tablewkt`, `downsamp`, `upsamp`, `limit`, `interp`, `zar`, `zkr`, `zaw`,
and the arithmetic/window functions. See the [Csound setksmps reference](https://csound.com/docs/manual/setksmps.html)
for local block-size restrictions and [function-table documentation](https://csound.com/docs/manual/TableTop.html)
for GEN01 metadata; actual beta33 tests, rather than generic manual availability,
are the compatibility evidence.

This new plugin's original code is MIT licensed. The supplied host README says
MIT but its LICENSE file was absent; this plugin license does not replace that
missing upstream notice. No source or audio assets were copied from references.
