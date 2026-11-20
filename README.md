# Pulvis — CsModular Granular Synthesis Library


[English](README.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md)

<p align="center"><img src="assets/pulvis-icon.png" width="144" alt="Pulvis application icon"></p>

**Pulvis is a granular synthesis plugin library for CsModular.**

- **Pulvis Grain Freeze** records and freezes live audio, stretching vocals or chords.
- **Pulvis Grain Sample** scans a WAV, then slices it or shifts its pitch.
- **Pulvis Grain Osc** turns built-in waveforms into playable granular tones.

Version 0.0.5 · Downloads: [Windows x64 Setup](https://github.com/NJyutong/csmodular-pulvis/releases/download/v0.0.5/Pulvis-0.0.5-windows-x64.exe) · [Linux x64 Debian package](https://github.com/NJyutong/csmodular-pulvis/releases/download/v0.0.5/Pulvis-0.0.5-linux-x64.deb) · [Source](https://github.com/NJyutong/csmodular-pulvis/releases/download/v0.0.5/Pulvis-0.0.5-source.zip) · [SHA-256](https://github.com/NJyutong/csmodular-pulvis/releases/download/v0.0.5/SHA256SUMS.txt)

Right-click the title bar of any Pulvis module. **About** opens a centered dialog with the project website, version, copyright and MIT license. **Language** (a rounded dropdown selector) switches all Pulvis panels and module context menus between English, Simplified Chinese and Russian; your choice is remembered on this device, and **System default** follows the browser/OS locale again (English fallback). The main host module browser (`Space` or empty-canvas right-click) intentionally stays in English (`Pulvis`, `Pulvis Grain Freeze`, `Pulvis Grain Osc`, `Pulvis Grain Sample`) to match the English host menu. **Panel color** tints the matte panel chassis and accent color from the 32 color swatches, and **↺ Follow theme** immediately restores the default matte graphite palette.

All three modules use a matte anodized graphite widescreen (`500 × 300`) dual-deck hardware layout (`PulvisPanel.js`) with a top live OLED display (showing the real-time Csound oscilloscope waveform and 2048-point Hann FFT spectrum of the first connected audio output, plus the selected grain window shape) and HiDPI host canvas rendering. The widescreen panels and these menus require a host built with the current source integration.

- **Grain Freeze** (3 × 3 left + 3 × 3 right): left deck holds **Live Ring Buffer & Grain Core** (`Freeze`, `Lookback`, `Lookback jit.`, `Grains/s`, `Size ms`, `Window`, `Source`, `Feedback`, and momentary `Capture`); right deck holds **Pitch Scatter, Wet Mix & Timing** (`Pitch st`, `Pitch jitter`, `Seed`, `Wet mix`, `Pan spread`, `Output dB`, `Pan`, `Time jitter %`, `Direction`).
- **Grain Osc** (3 × 3 left + 2 × 3 centered right): left deck holds **Carrier Tone Warp & Grain Core** (`Wave`, `Phase warp`, `Pitch (0=A3)`, `Grains/s`, `Size ms`, `Window`, `Hold warp`, `Direction`, `Time jitter %`); right deck holds **Phase/Pitch Jitter & Stereo Out** (`Phase jitter`, `Pitch jitter`, `Seed`, `Pan`, `Pan spread`, `Output dB`). `Phase warp` and `Phase jitter` default to 0; `Phase warp` reshapes each waveform cycle, `Hold warp` keeps its depth fixed, and `Phase jitter` varies the wavetable start of each grain.
- **Grain Sample** (symmetric 3 / 3 / 2 left & right): the display header selects slots `#1`–`#8`, showing a centered **Open WAV…** button on empty slots (no demo WAV is bundled) and live waveform/spectrum once loaded; left deck holds **WAV Slot Scan & Grain Core** (`Slot`, `Position`, `Scan %/s`, `Grains/s`, `Size ms`, `Window`, `Hold pos.`, `Direction`); right deck holds **Pitch Scatter & Stereo Output** (`Pitch st`, `Pos. jitter`, `Pitch jitter`, `Pan`, `Pan spread`, `Output dB`, `Time jitter %`, `Seed`).

## First use

Connect Grain Osc L/R to Outs2 L/R for a standalone source. Lower the volume and press ▶ to play.

Pulvis module panels and module right-click menus follow browser/system language preferences (Chinese, Russian, English fallback) unless overridden via right-click → **Language**. Reload or switch from the module menu to update all open Pulvis panels.

An original Csound granular engine with three CsModular modules. Scheduling,
voice playback, interpolation, windows, random state and overlap mixing all
run in Csound. There is no built-in granular synthesizer in the DSP path.

## Layout and installation

The Pulvis plugin is maintained in this standalone repository; the CsModular host application is maintained separately.

- `csound/GrainCore.txt`: the single shared DSP implementation.
- `modules/GrainFreeze`, `GrainSample`, `GrainOsc`: matching `.js` UI / `.txt` UDO pairs.
- `scripts/build-modules.mjs`: regenerates the plain module objects and thin UDO wrappers.
- `integration/csmodular.patch`: required host integration, against the supplied 0.1.5 sources.
- `scripts/install.mjs`: checks/applies that patch and copies the library and example.
- `examples/pulvis-demo.json`: ready-to-load patch.
- `tests/`: real WASM rendering, application and interface checks.
- `SOURCES.md`: provenance, license decisions and exact inspected file hashes.

From the source ZIP or a Git checkout, run these commands against the target CsModular source checkout. The installer recognizes the compatible host integration and updates its WAV transport handling.

```powershell
node scripts/build-modules.mjs
node scripts/install.mjs <path-to-csmodular-main>
```

The source ZIP contains the installer and build inputs. The automated test suite and its baselines are in the Git checkout.

The installer is idempotent and refuses incompatible integration changes.
The generated `.js`/`.txt` pairs alone require a host with this integration
and `GrainCore.txt`; they are not standalone opcodes for an unmodified editor export.

### Desktop packages

Version 0.0.5 provides a custom native Windows x64 setup wizard and a Linux x64 Debian package. Clean-install acceptance passed on both platforms with CsModular 0.1.5 (`10136ca`), covering the modules, WAV import, Voice/FX routing, project save/reopen and uninstall. The Debian package declares its runtime dependencies for the system package manager; it does not bundle GTK or WebKit libraries. macOS Apple Silicon and Intel packages have not been built or tested and remain pending. The installer targets the compatible CsModular 0.1.5 integration and installs under the stable `libraries/pulvis` folder. On upgrade it renames an existing `granular` folder to `pulvis` and updates the host library index; old patches that refer to the `granular` ID are mapped to Pulvis by the included host integration. The Windows setup needs no WebView2 runtime. Its language follows the Windows UI language (Simplified Chinese, Russian, or English fallback).

Downloads: [Windows x64 installer](https://github.com/NJyutong/csmodular-pulvis/releases/download/v0.0.5/Pulvis-0.0.5-windows-x64.exe) · [Linux x64 Debian package](https://github.com/NJyutong/csmodular-pulvis/releases/download/v0.0.5/Pulvis-0.0.5-linux-x64.deb) · [Source archive](https://github.com/NJyutong/csmodular-pulvis/releases/download/v0.0.5/Pulvis-0.0.5-source.zip) · [SHA-256 checksums](https://github.com/NJyutong/csmodular-pulvis/releases/download/v0.0.5/SHA256SUMS.txt).

For a fresh installation, use the compatible CsModular 0.1.5 host with granular integration and no plugin installed. Close CsModular. On Linux, install the downloaded package with `sudo apt install ./Pulvis-0.0.5-linux-x64.deb`, then launch Pulvis Installer from the applications menu; it asks for the host's `libraries` folder and installs to `pulvis`. Debian/Ubuntu resolves the package's system dependencies; GTK and WebKit are not copied into the package. On Windows, run Setup once and select `libraries/pulvis`. Reopen CsModular, confirm Pulvis Grain Freeze, Pulvis Grain Sample, and Pulvis Grain Osc appear in Pulvis, import a WAV into Pulvis Grain Sample, then save and reopen a project. On Windows use Installed apps or run `unins000.exe` in the plugin folder. On Debian, remove the plugin in Pulvis Installer before removing the installer application with `sudo apt remove pulvis-installer`.

The 0.0.5 platform acceptance record lists the exact host baseline, installed payload hashes, save/reopen results, coverage, and known host issues. Physical audio loopback is outside this acceptance scope.

## Play

1. Install the CsModular host first, then install Pulvis.
2. Open CsModular. Pulvis is automatically registered in the host's module list — press `Space` (or right-click empty canvas) and choose **Pulvis** (`Pulvis Grain Freeze`, `Pulvis Grain Osc`, `Pulvis Grain Sample`), or load the example patch `pulvis-demo.json` (installed in the host as `public/patches/pulvis-demo.json`).
3. The example connects **Grain Osc L → Grain Freeze Audio in → Outs2 L/R**.
   Enable audio with the transport control. All cables must be in the same layer.
4. Select **Freeze** instead of **Record** on Grain Freeze after recording some audio. New input stops
   updating the ring; grains continue playing. Press **Capture**, then choose **Snapshot** in **Source** to keep a
   private copy while the live ring can record again. Sample WAV slots remain independent.
5. For a file source, choose Grain Sample's **Slot** (`#1`–`#8` in the display or the `Slot` knob), click the centered **Open WAV…** button on an empty slot or right-click its
   panel and choose **Load WAV → slot…**, then connect its L/R outputs to Outs2 or
   another processor. Empty slots are silent, and no demo WAV is bundled.

Grain Freeze has a mono audio input and two outputs; its input feeds a private
8-second ring (384,000 frames at 48 kHz). Capture copies the current ring into one of two
Freeze-only snapshot tables. Each Freeze instance allocates the ring and both snapshot tables;
at 48 kHz that is 1,152,000 table frames. Recompile or restart clears the snapshots.
Wet mix blends dry input with grains.
Grain Sample and Grain Osc are independent stereo sources with no audio input or
dry/wet control. Connect their L/R outputs directly to Outs2 or another processor.

## Controls and modulation

Each small jack beside a modulated control is additive, control-rate CV. Audio
cables are converted by the host before entering these static control jacks.

| Control | Knob range / meaning | Added by CV = 1 |
|---|---|---|
| Grains/s (`Density`) | Freeze/Sample: 0–24 grains/s; Osc: 0–48. Zero lets existing voices finish | Adds the module's full range (24 or 48 grains/s) |
| Size ms (`Size`) | 2–400 ms; live grains may shorten for read/write safety | 200 ms |
| Lookback / Position / Phase warp | 0–127 maps to 0–1; Freeze (`Lookback`): recent → older safe history (up to 8 s at 48 kHz); Sample (`Position`): read position; Osc (`Phase warp`): phase-warp depth within each oscillator cycle. 0 leaves the selected wave unchanged; higher values reshape harmonic balance | 1 source span (live/sample); 1 normalized warp depth (Osc) |
| Lookback jit. / Pos. jitter / Phase jitter | 0–127, maximum random displacement in source span; on Osc, varies the starting phase of each grain using Seed | 1 source span (live/sample); 1 cycle of phase jitter (Osc) |
| Pitch st / Pitch (0=A3) | −48…+48 semitones (`0 = 220 Hz` on Osc) | 12 semitones |
| Pitch jitter | 0–24 semitones, symmetric per grain | 12 semitones |
| Window | 0 = Hann, 1 = Triangle, 2 = Blackman | 2 |
| Direction | Forward or Reverse grain playback; Freeze, Sample and Osc | 1 = reverse |
| Pan | 0 = left, 127 = right; equal-power gains | 1 normalized pan |
| Pan spread | 0–127; random pan range up to ±0.5 | 1 normalized spread |
| Freeze / Hold pos. / Hold warp | threshold 0.5; Freeze: `Record`/`Freeze` stops live writes. Sample (`Hold pos.`): `Follow`/`Hold` pauses Scan and ignores Position changes. Osc (`Hold warp`): `Follow`/`Hold` holds the phase-warp amount | 1 |
| Wet mix | 0–127, dry → wet; Grain Freeze only | 1 normalized mix |
| Output dB (`Level`) | −24…+12 dB; Freeze defaults −3 dB, Sample/Osc −12 dB | CV 1 adds +12 dB (clamped to +12 dB) |
| Time jitter % | 0–100% of the nominal trigger interval; 0 keeps a regular clock, 100 scatters event times by up to ±45% while preserving their mean rate | CV 1 adds 100%; Seed makes the sequence repeatable |
| Seed | integer 0–65534, no CV; independent per instance | — |
| Slot | 1–8, rounded to the nearest integer like the knob tooltip (also selectable via `#1`–`#8` buttons in the display); Grain Sample only, no CV | — |
| Scan %/s | −100…+100 % of the file per second, 0 = stay at Position; Grain Sample only, no CV. Position moves by itself and wraps at the file ends; Hold pos. pauses it | — |
| Source | `Live` or the last captured Freeze `Snapshot`; Grain Freeze only | — |
| Capture (`Capture snapshot`) | Momentary button (displayed concisely as `Capture` on the panel). Copies the current Freeze ring into an inactive private table; an empty ring or a table still held by old grains is not replaced | — |
| Feedback | Freeze only, 0–0.95. Feeds wet grains into the live ring while recording; stored feedback signal is limited to ±1. Default 0 | 0.25 control step |
| Wave | 0–3 (rounded like the tooltip) = sine, triangle, saw, square (one period, 220 Hz root); Grain Osc only, no CV. Harmonic banks adapt to the highest requested pitch | — |

Control ranges are clamped in the module wrappers after CV is added. Position or phase-warp depth, start position jitter, pitch,
window, pan and size are captured at grain creation. Position CV scans new
live/sample grains; Phase warp CV sets the depth for new Osc grains. In
sample/osc mode Freeze holds the current position or warp amount; density, pitch
and other controls remain live. Only Grain Freeze passes dry signal through Mix. Changing
Seed resets only that instance's random sequence; restart the patch for identical
scheduling too.

## Engine and routing

The scheduler advances sample by sample and preserves the requested mean density.
Timing scatter is an independent seeded stream; it varies event intervals without
changing the mean rate. Each instance owns 64 reusable slots. A full pool drops
new triggers, without stealing or truncating active grains. Three Park–Miller
random draws choose position, pitch and pan for each accepted trigger.

The core renders one control block (the host's `ksmps=4`) at a time. The
scheduler still advances sample by sample, so a grain started at offset *j* of a block
has age −*j* and its window is clamped to silence outside its lifetime: starts and
ends remain sample-accurate. Per voice it keeps age, length, source table, read
position, rate and pan, and renders them with audio-rate vector operations, so the
cost scales with the number of *sounding* grains instead of with every sample.
Sample and Freeze reads use cubic interpolation at or below unity playback rate, then
`tablexkt` sinc interpolation with a cutoff warped to the playback step. The sinc
window grows with transposition; tables shorter than 16 frames use wrapped linear
interpolation because they cannot support the required window. Osc uses its own
pitch-selected harmonic banks and cubic table interpolation.
Against the previous per-sample engine, kept as `tests/reference/GrainCoreReference.txt`,
output is bit-identical at `ksmps=1`; at the host's `ksmps=4` the relative RMS difference
is below 0.1 % (only the voice-count gain smoother is updated once per block).
On Csound 7.0.0-beta33 (Node/V8) rendering is 1.6–3.0× faster than the
per-sample reference on the Windows test machine. All three windows have zero endpoints. Summed voices
receive smoothed `1/sqrt(active voices)` compensation. The shared core is linear;
wrappers interpolate the visible dB Level and apply a final ±1 safety ceiling.
The ceiling is hard clipping only when the selected gain or input exceeds full
scale. Grain Freeze also interpolates Mix.

Wrappers run at the host's `ksmps=4`: Grain Freeze reads its audio input with
`zar`; each module reads its CV inputs with `zkr`, the shared core returns audio,
and `zaw` writes L/R to allocated cable buses.
There is **no extra grain instrument, audio bus or direct sound-card output**
in the plugin. Outs2 remains the patch's sound-card endpoint.

The host executes modules in insertion order within `instr 1` (Voice) or
`instr 2` (FX), with no global Zak clear. A receiver preceding its source sees
the previous 4-sample block (about 83 μs at 48 kHz). This existing feedback
behavior is preserved; the plugin does not introduce another block of latency.

The generator resolves `;@ requires GrainCore.txt` before callers, includes it
once, detects dependency cycles and reports missing files. Sample tables precede
the UDOs. For Pulvis modules with a connected audio output, the host generator
also attaches read-only Csound scope (`giScope_*`) and 2048-point Hann FFT
spectrum (`giSpectrum_*`) tables polled by `CsoundEngine` for the OLED display,
without altering the granular DSP path. The host renders the main canvas at HiDPI
backing resolution (`_getCanvasDpr()` with CSS-pixel overlay alignment) so modules,
labels and cables remain crisp under display scaling and zoom. Vite copies the
shared public file, ships all three `passable` modules, accepts quoted status keys
and retains library metadata/license documentation.

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
- Grain Osc provides sine, triangle, saw and square at a 220 Hz root. Harmonic
  banks adapt to the highest pitch including pitch jitter; the waveform loses
  upper harmonics as pitch rises. Phase warp can add new harmonics.
- Sample and Freeze pitch-up use sinc bandlimiting. At +48 semitones, a 4 kHz
  interpolation-image probe fell from −35.2 to −101.1 dBc; a distinct 8 kHz
  source component folded to 16 kHz fell from −0.3…−1.2 dBc to −98…−123 dBc
  for 44.1/48/96 kHz files. Freeze measured −113.5 dBc.
- Performance profiling found the main high-density Osc cost in voice lifecycle:
  the old renderer copied all active-grain state every control block. It now reads
  persistent pool slots and snapshots only tails whose slots can be reused inside
  the block. On an earlier paired run, the 120 × 400 ms Osc stress case fell from
  80.3% to 62.2%; the latest five-run median was 65.3% (959–1,033 ms to render
  1.5 seconds). Current medians on the same i5-12490F, Node 26.12, Csound 7
  beta33 WASM, 48 kHz/ksmps 4: default Osc 24 × 80 ms, 13.2%; one/two Osc at
  48 × 400 ms, 35.3%/70.6%; one/two Sample at +48 st, 24 × 400 ms,
  36.4%/71.5%. A full-ring Freeze run at +48 st, 24 × 400 ms had a 27.9%
  incremental active-render ratio after subtracting recording-only cost. These
  are Node/WASM wall-time ratios, not system CPU percentages or callback tests.
- Density limits remain 24 grains/s for Freeze/Sample and 48 for Osc on every
  computer. The plugin does not read the host's audio deadline or adapt those
  limits to the device. Actual dropout margin depends on CPU, audio buffer,
  browser/host load and other modules; treat the numbers above as results for
  the named machine and recheck on the target system.
- A short seam blend reduces clicks when Sample grains wrap. It cannot make an
  arbitrary discontinuous file loop seamless. Tables under 16 frames fall back
  to linear interpolation. Reverse reading is wrap-safe, but it does not remove
  discontinuities already present at a file boundary.
- Freeze snapshots are private to their Freeze instance, do not appear in Sample's
  WAV slots, and are not saved with the project. Capture is ignored when the ring
  is empty or the inactive table is still used by an older grain (up to 400 ms).
  Two private snapshot tables add 6,160,384 bytes of measured WASM linear memory
  per Freeze instance at 48 kHz, including page rounding. Twenty table copies
  added 7.85 ms total in the zero-density probe (0.392 ms per copy).
- Live duration is conservatively reduced so the complete grain read trajectory
  and subsequent writer trajectory fit recorded history, including unfreezing
  during a grain. Initially empty or frozen rings output silence.
- Pool saturation caps overlap; requested density × size above 64 does not create
  unbounded voices. Reduce Density, Size or instance count if playback breaks up.
- Default Osc output measured RMS 0.0859/peak 0.1791. Two instances at the
  maximum published density measured RMS 0.4402/peak 0.8785. A separate +48 st,
  120 grains/s core stress render (above the module cap) measured RMS
  0.00310/peak 0.01350 and 128.7% offline render time. A complete Node DSP
  suite peaked at 222,257,152 bytes RSS, including WASM, fixtures and buffers;
  this is not standalone plugin memory.
- Density ranges are the same on every computer because the host exposes no
  per-module realtime deadline to the plugin. Actual headroom depends on CPU,
  buffer size, host/browser load and other modules. Recheck on target hardware;
  lower Density, Size or instance count if playback breaks up.
- Native acceptance exercised the Debian installer under Xvfb and the Windows Inno installer. Audio measurements used Csound WASM. Physical loopback is untested.
  Existing OSC bridge connection notices are unrelated when the optional bridge
  on port 8765 is not running.

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

The production core runs at the host block size (`ksmps=4`) and contains no
`setksmps 1` block. `setksmps 1` is confined to the test-only per-sample reference
engine and a standalone opcode probe. Generic opcodes exercised by actual WASM
compilation/rendering include `xin`, `xout`, `init` arrays, `ftgen`, `ftgentmp`,
`ftlen`, `ftsr`, `fillarray`,
`tablekt`, `tablewkt`, `downsamp`, `upsamp`, `limit`, `interp`, `zar`, `zkr`, `zaw`,
and the arithmetic/window functions. See the [Csound setksmps reference](https://csound.com/docs/manual/setksmps.html)
for local block-size restrictions and [function-table documentation](https://csound.com/docs/manual/TableTop.html)
for GEN01 metadata; actual beta33 tests, rather than generic manual availability,
are the compatibility evidence.

This new plugin's original code is MIT licensed. The supplied host README says
MIT but its LICENSE file was absent; this plugin license does not replace that
missing upstream notice. No source or audio assets were copied from references.

## Build outputs and temporary files

Run `npm run build:windows-installer` on Windows or `npm run build:linux-deb` on Linux. Verified packages and their `.sha256` sidecars go to `release-assets/<version>/`; run `npm run release:checksums` after all three packages exist to create `SHA256SUMS.txt`. The builder stages each package, reads it back and checks its SHA-256 before publishing.

Every build uses a unique temporary directory (Windows: `D:\csmodular-tools\pulvis-builds`; WSL: `/mnt/d/csmodular-tools/pulvis-builds`; native Linux: the system temporary directory). On success, it deletes only that build's temporary directory after the package and checksum have been verified. On failure, it saves command output and diagnostics in `test-results/build-logs/`, then removes that run's recoverable intermediates.

CI retains each uniquely named task directory until its package and checksum artifact has uploaded. Failed jobs upload diagnostic logs first; an always-run cleanup then removes only that task directory. See [Build and cleanup details](docs/BUILDING.md).
