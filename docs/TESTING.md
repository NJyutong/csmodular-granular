# Testing and acceptance

Run checks from the repository root. Results are written to a unique directory under `test-results/checks/` unless `CSMODULAR_TEST_RESULTS_DIR` is set.

## Quick checks

```sh
npm run check:quick
```

This regenerates and fingerprints the public module files, runs package/source smoke checks, validates build cleanup behavior, then runs module contracts and the oscillator carrier regression. The clean-install checks run when `CSMODULAR_HOST_ROOT` points to an isolated host checkout.

## Full acceptance

```sh
npm run check:full
```

Set both `CSMODULAR_HOST_ROOT` and `CSMODULAR_UI_HOST_ROOT` to isolated CsModular host checkouts before running the full suite. The first is used for the source integration and production build; the second is the installed-host snapshot used by browser canvas and color checks. Do not point these variables at a working host checkout.

The full run covers host compatibility, module contracts, browser workflows, WAV import and persistence, spectral and performance regressions, Csound WASM output, production builds and desktop package source checks. Interactive runtime checks launch from the CsModular host itself (`npm run dev` or `node dev-server.mjs` in `csmodular-main`).

## Live display and output routing

With a host running, execute `node tests/pulvis-display-routing.mjs http://127.0.0.1:4177/` from the plugin checkout. It measures both final output channels during playback, after unplugging Outs2, after reconnecting one channel, and with the output module removed. It also checks oscillator pitch against the FFT, known WAV peak values, freeze capture and the module’s right-click display commands.

## Package smoke

```sh
npm run package:smoke
```

This checks package versions, module metadata, installer resources and icons, README links, integration assets, and the source package file list. It does not compile the native Windows or Linux installer. Native package builds use `docs/BUILDING.md`.

The P7 cross-platform acceptance report remains the record for the already verified Windows EXE and Linux `.deb`. Re-running source checks does not claim new native hardware or physical audio-device coverage.
