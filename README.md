# CsModular Granular Library

**English** · [简体中文](README.zh-CN.md) · [Русский](README.ru.md)

<p align="center">
  <a href="https://github.com/gleb812/csmodular"><img src="https://img.shields.io/badge/Host-CsModular-2563EB?style=flat-square&logo=github&logoColor=white" alt="Host system: CsModular"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-059669?style=flat-square" alt="MIT License — Zhang Shengwei"></a>
  <a href="csound/GrainCore.txt"><img src="https://img.shields.io/badge/DSP-Csound_Granular-7C3AED?style=flat-square" alt="Csound granular DSP"></a>
</p>

> [!NOTE]
> **CsModular Granular · v1.1.1**
> A Csound-based granular instrument set for CsModular. Grain Osc offers phase warp and per-grain phase jitter; version 1.1.1 improves performance and refreshes the interface.

| Module | Source | Best for |
|---|---|---|
| **Grain Osc** | Built-in wavetable | Grain clouds with phase warp and per-grain phase jitter |
| **Grain Sample** | Imported WAV, slots 1–8 | Granular playback of recorded material |
| **Grain Freeze** | Live input ring buffer | Freezing and reshaping recent audio |

New Grain Osc modules start with phase warp and phase jitter at 0.

Original, patchable granular synthesis for CsModular. Grain scheduling, playback, interpolation, windows, random state and overlap mixing run entirely in Csound. The modules route through the host's Zak cable buses and connect to Voice or FX layers.

## Language

The interface follows browser/system language preferences (Chinese, Russian, English fallback). Reload after changing language.

## Layout and installation

Host system: [CsModular](https://github.com/gleb812/csmodular).

The granular plugin is maintained in this standalone repository; the CsModular host application is maintained separately.

- `csound/GrainCore.txt`: the single shared DSP implementation.
- `modules/GrainFreeze`, `GrainSample`, `GrainOsc`: matching `.js` UI / `.txt` UDO pairs.
- `integration/csmodular.patch`: required host integration, against the supplied 0.1.5 sources.
- `scripts/install.mjs`: checks/applies that patch and copies the library and example.
- `examples/granular-demo.json`: ready-to-load patch.
- `LICENSE`: MIT License, copyright © 2026 Zhang Shengwei.

To add the library to a local CsModular 0.1.5 checkout, run:

```powershell
node scripts/install.mjs <path-to-csmodular-main>
```

The plugin includes the host integration patch and can be installed from its prebuilt module files.

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

Right-click any granular module and choose **About CsModular Granular** to view
the version, copyright and license.

Grain Osc and Grain Sample have stereo outputs and no audio input. Grain Freeze
accepts mono audio, records it into a private 192,000-frame ring (4 s at 48 kHz),
and provides the library's only dry/wet mix control.

## Controls and modulation

Small jacks beside controls accept additive, control-rate CV. Seed, Sample slot,
Scan and Waveform have no CV input. Audio cables are converted by the host before
entering these static control jacks.

| Control | Knob range / meaning | Added by CV = 1 |
|---|---|---|
| Density | 0–200 grains/s; 0 lets existing voices finish | 100 grains/s |
| Size | 2–500 ms; live grains may shorten for read/write safety | 250 ms |
| Position / Phase warp | 0–127 maps to 0–1; live: recent → older safe history (about 4 s at 48 kHz); Sample: read position; Osc: phase-warp depth within each oscillator cycle. 0 leaves the selected wave unchanged; higher values reshape harmonic balance | 1 source span (live/sample); 1 normalized warp depth (Osc) |
| Position jitter / Phase jitter | 0–127, maximum random displacement in source span; on Osc, varies the starting phase of each grain using Seed | 1 source span (live/sample); 1 cycle of phase jitter (Osc) |
| Pitch | −48…+48 semitones | 12 semitones |
| Pitch jitter | 0–24 semitones, symmetric per grain | 12 semitones |
| Window | 0 = Hann, 1 = triangle; threshold 0.5 | 1 |
| Pan | 0 = left, 127 = right; equal-power gains | 1 normalized pan |
| Spread | 0–127; random pan range up to ±0.5 | 1 normalized spread |
| Freeze | threshold 0.5; Freeze stops live writes. Sample (labelled *Hold position*) pauses Scan and ignores Position changes. Osc has no Freeze/Hold control | 1 |
| Wet mix (Freeze only) | 0–127, dry → wet | 1 normalized mix |
| Level | 0–127, 0 → unity | 1 normalized level |
| Seed | integer 0–65534, no CV; independent per instance | — |
| Sample slot | 1–8, rounded to the nearest integer like the knob tooltip; Grain Sample only, no CV | — |
| Scan | −100…+100 % of the file per second, 0 = stay at Position; Grain Sample only, no CV. Position moves by itself and wraps at the file ends; Hold pauses it | — |
| Waveform | 0–3 (rounded like the tooltip) = sine, triangle, saw, square (one period, 220 Hz root); Grain Osc only, no CV. Saw/square use 24/23 harmonics, so they alias at high pitches | — |

Ranges are clamped in Csound. Source position or phase-warp depth, start-position
jitter, pitch, window, pan and size are captured when each grain starts. Position
CV scans new live/sample grains; Phase warp CV sets the depth of new Osc grains.
Sample's Hold position pauses scanning, while Freeze controls live recording.
Changing Seed resets only that instance's random sequence; restart the patch for
identical scheduling too.

## Engine and routing

The scheduler accumulates `density / sr` each sample and attempts one grain per
crossing. Each instance owns 64 reusable slots. A full pool drops new triggers,
without stealing or truncating active grains. Three Park–Miller random draws
choose source position (or Osc start phase), pitch and pan for each accepted trigger.

The core renders one control block (the host's `ksmps=4`) at a time. The
scheduler still advances sample by sample, so a grain started at offset *j* of a block
has age −*j* and its window is clamped to silence outside its lifetime: starts and
ends remain sample-accurate. Per voice it keeps age, length, source table, read
position, rate and pan, and renders them with audio-rate vector operations, so the
cost scales with the number of *sounding* grains instead of with every sample.
Reads use two explicit wrapped indices and linear interpolation (`tablexkt`, size 2, wrap).
The optimized renderer keeps grain starts and ends sample-accurate while using
audio-rate vectors for active voices. Hann and triangle windows fade to zero;
overlapping voices use smoothed gain compensation and peak control. Grain Freeze
mixes dry and granular audio, and every module applies Level to its output.

Wrappers run at the host's `ksmps=4`: Grain Freeze reads audio with `zar`, `zkr`
reads CV, the shared core returns audio, and `zaw` writes L/R to allocated cable buses.
There is **no extra grain instrument, audio bus or direct sound-card output**
in the plugin. Outs2 remains the patch's sound-card endpoint.

The host executes modules in insertion order within `instr 1` (Voice) or
`instr 2` (FX), with no global Zak clear. A receiver preceding its source sees
the previous 4-sample block (about 83 μs at 48 kHz). This existing feedback
behavior is preserved; the plugin does not introduce another block of latency.

The shared grain core loads before its module wrappers. Grain Sample tables are
created when a patch uses the sample module, and audio stays within the host's Zak
cable routing.

## Samples and limitations

- WAV: mono/stereo PCM 8/16/24/32-bit or float32/64, including standard WAVE_FORMAT_EXTENSIBLE; 8–192 kHz, 2 frames–300 s. Maximum 256 MiB per file; session limits: 512 MiB source files and 48 million decoded mono frames. Stereo uses the **left channel** as the mono source.
- Eight sample slots are shared across module instances **within this app session**.
  Files survive Stop/Start and Recompile, but are not embedded in patch JSON,
  saved to IndexedDB, or restored after closing/reloading the app. Reimport them.
- Replacing a sample reloads the audio engine and clears the live recording buffer.
  Exported CSD patches also need the WAV files used by the patch.
- Grain Osc provides sine, triangle, saw and square waves with a 220 Hz root.
  Saw and square waves may alias at high pitches.
- Looping an arbitrary sample can cross a discontinuous boundary. Linear
  interpolation and the grain window cannot remove every click at a loop boundary;
  strong transposition can also alias.
- Live grains may shorten to stay within recorded history. An empty Freeze buffer
  is silent until it has received audio.
- Each instance has a 64-grain voice pool. For smoother playback at high overlap,
  reduce Density, Size or the number of module instances.

## License

Copyright © 2026 Zhang Shengwei. Released under the MIT License; see [LICENSE](LICENSE).
