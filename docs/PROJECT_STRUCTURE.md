# Plugin Project Structure

This map covers the standalone CsModular Granular plugin. The host application is a separate repository. The plugin source is authoritative for plugin behavior; integration/csmodular.patch records the corresponding host-side changes.

## Repository map

    csmodular-granular/
    ├── AGENTS.md                         AI instructions for this plugin
    ├── docs/
    │   ├── README.md                     English technical-doc index
    │   ├── AI_CONTEXT.md                 Fast technical context for AI and maintainers
    │   ├── AI_PROJECT_READING_PROMPT.md  Suggested first-pass reading order
    │   ├── PROJECT_STRUCTURE.md           This directory map
    │   └── INTEGRATION.md                Host integration and maintenance guide
    ├── README.md                         English user manual
    ├── README.zh-CN.md                   Simplified Chinese user manual
    ├── README.ru.md                      Russian user manual
    ├── CHECKS.md                         Dated engineering/check history
    ├── VALIDATION.md                     DSP validation scope and evidence
    ├── validation-dsp.json               Machine-readable DSP measurements
    ├── validation-dsp-node.json          Node/WASM DSP comparison results
    ├── SOURCES.md                         Provenance and license decisions
    ├── reference-files.json               Reference file/hash manifest
    ├── LICENSE                            Plugin MIT license
    ├── _index.json / _meta.json           CsModular library metadata
    ├── csound/
    │   └── GrainCore.txt                  Single shared Csound grain engine
    ├── modules/
    │   ├── GrainFreeze.js / .txt          Live input ring buffer and Freeze
    │   ├── GrainSample.js / .txt          WAV-backed granular source
    │   └── GrainOsc.js / .txt              Wavetable-backed granular source
    ├── scripts/
    │   ├── build-modules.mjs               Generate module artifacts and demo
    │   ├── install.mjs                     Apply host patch and install plugin
    │   ├── host.mjs                        Launch/build the sibling host checkout
    │   └── record-sources.mjs              Record reference file hashes
    ├── integration/
    │   └── csmodular.patch                 Replayable host integration patch
    ├── examples/
    │   └── granular-demo.json              Example patch
    ├── tests/                               Contract, DSP, install, and app checks
    ├── tools/
    │   └── render-panels.mjs                Panel rendering helper
    └── test-results/                        Ignored temporary outputs, when present

The exact contents of generated directories can change. Confirm the current tree before relying on a path. node_modules is an external junction/cache and is not source.

## Authoritative files and generated copies

- csound/GrainCore.txt is the only plugin source for the shared grain algorithm.
- modules/GrainFreeze.js, GrainSample.js, and GrainOsc.js define the editor surfaces; their paired .txt files are thin Csound wrappers.
- scripts/build-modules.mjs regenerates checked-in module artifacts and the example from the plugin sources.
- scripts/install.mjs verifies or applies integration/csmodular.patch, copies module files and metadata into the host library, copies GrainCore.txt into the host's shared Csound modules, and copies the demo patch into the host.
- The installer also copies the root user manuals, SOURCES.md, and LICENSE. It does not copy this docs/ directory.
- The host's installed files are deployment copies. Make plugin changes here, then run the installer when host synchronization is part of the task.

## Runtime relationship

The host loads JavaScript module definitions through its library system. CsoundGenerator emits the module calls and dependencies; CsoundEngine compiles and runs the orchestra. Host instr 1 is the Voice layer and instr 2 is the FX layer. Module audio travels over the host's Zak cable buses.

Each plugin wrapper performs Zak I/O at the host block size and calls CMGrainCore. The core owns the grain pool and synthesis state. Grain Sample's UI path selects and validates a WAV header and transfers bytes to Csound's virtual file system; Csound performs decoding and all audio-rate grain processing.

## Useful commands

Run from the plugin repository root:

    node scripts/build-modules.mjs
    node scripts/install.mjs E:/paper/csmodular-main
    node scripts/host.mjs dev E:/paper/csmodular-main
    node scripts/host.mjs build E:/paper/csmodular-main
    npm run test:unit
    npm run test:dsp
    npm run test:dsp-node
    npm run test:install
    npm run test:integration
    npm run test:system

These checks have different environment needs. See package.json, VALIDATION.md, and the relevant test file before selecting a command. Historical test results do not prove that a current untested change passes.
