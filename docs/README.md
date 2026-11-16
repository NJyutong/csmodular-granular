# Documentation

This folder contains English-language technical documentation for the CsModular Granular plugin. The docs folder intentionally contains English documents only.

For end-user setup, controls, patching, sample import, and known limitations, use the language-specific manuals at the repository root:

- [English user manual](../README.md)
- [Simplified Chinese user manual](../README.zh-CN.md)
- [Russian user manual](../README.ru.md)

## AI and maintainer guides

- [AI context](AI_CONTEXT.md) — project scope, source-of-truth order, architecture, and non-negotiable constraints.
- [Project structure](PROJECT_STRUCTURE.md) — repository map, authoritative files, generated copies, and useful commands.
- [AI project reading prompt](AI_PROJECT_READING_PROMPT.md) — a short first-pass workflow for assistants.

## Technical guide

- [Host integration and maintenance](INTEGRATION.md) — module loading, Csound and Zak routing, sample handling, installation, and troubleshooting.

## Host platform references

These host documents define the conventions used by the plugin integration:

- [CsModular architecture](https://github.com/gleb812/csmodular/blob/main/docs/ARCHITECTURE.md)
- [Contributing a module](https://github.com/gleb812/csmodular/blob/main/docs/CONTRIBUTING.md)
- [Host granular integration notes](https://github.com/gleb812/csmodular/blob/main/docs/GRANULAR.md)
- [Host troubleshooting](https://github.com/gleb812/csmodular/blob/main/docs/TROUBLESHOOTING.md)

When a host document and this checkout describe different implementation details, verify the current plugin source and its integration patch before changing behavior.
