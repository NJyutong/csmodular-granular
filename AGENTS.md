# 颗粒插件 AI 工作规范

权威源码位于 `E:\paper\csmodular-pulvis`（仓库原名 `csmodular-granular`）。CsModular 宿主由上游维护。在宿主接口与兼容检查中参考其 `AGENTS.md`、`docs/PROJECT_STRUCTURE.md` 和实际源码。安装、构建和端到端检查在独立测试宿主上执行。将插件变更及 `integration/csmodular.patch` 提交到插件仓。改动前阅读 `README.md`、`SOURCES.md`、`docs/TESTING.md` 和 [构建说明](docs/BUILDING.md)。

根目录 README 面向安装和使用产品的最终用户。说明怎么安装、开始播放、连接模块和处理常见问题；开发环境、仓库路径、构建测试命令及协作规则放在技术文档中。面板的音源与左声道频谱通过模块右键菜单切换，标题栏右上角留空。

## 产品和语言

实现并维护 Grain Freeze、Grain Sample、Grain Osc：共用 Csound 引擎、CsModular UI 模块、WAV 文件传递、安装、文档和检查。

- DSP、颗粒调度/播放/窗函数/重叠混音/环形缓冲全部使用 Csound。
- JavaScript ES modules 负责模块定义、生成/安装脚本、WAV 选择/头部校验/传入 Csound VFS、UI 和自动化检查。Rust 仅属于桌面壳；任何其他语言都不实现颗粒音频算法。
- 用户指南为英语、简体中文和俄语；Pulvis 面板与模块右键菜单按浏览器/系统语言或用户在模块右键菜单中的手动选择切换 `en`、`zh` 或 `ru`（英语兜底），俄语独立于另外两种语言；宿主主模块浏览器（`ContextMenu`）刻意保持英语（`Pulvis`、`Pulvis Grain Freeze`、`Pulvis Grain Osc`、`Pulvis Grain Sample`）。
- 三个模块使用宽屏（`500 × 300`）哑光阳极石墨色双区硬件面板（宿主侧 `src/ui/PulvisPanel.js`），通过 Csound `giScope_*` / `giSpectrum_*` 显示实时波形与 2048 点汉宁窗 FFT 频谱，支持 32 色面板着色（含 hex/RGB/HSL）及 `↺ Follow theme` 一键复位，不内置任何演示 WAV 文件。

## 不可违反的 DSP 和许可规则

最终音频路径严禁调用或包装 Csound 内置颗粒器：`partikkel`、`partikkelsync`、`grain`、`grain2`、`grain3`、`syncgrain`、`granule`、`diskgrain`、`fof`、`fof2`、`fog`、`sndwarp`、`sndwarpst`、`mincer`、`temposcal`。

唯一共享算法位于 `csound/GrainCore.txt`。三个 `modules/*.txt` 只能包装公共核心并使用 Zak 总线。所有颗粒输出都必须留在模块路由中，可接到 Outs2；不要加独立声卡输出 instrument。

GPL 或许可不明代码只用于理解架构，禁止复制、翻译代码和素材。维护 `SOURCES.md`，写清算法灵感与许可判断。不要改用户提供的参考仓库。

## 目录

- `csound/GrainCore.txt`：单份共享 DSP。
- `modules/GrainFreeze.js/.txt`：实时输入环形缓冲、Freeze 模块 UI/包装。
- `modules/GrainSample.js/.txt`：Csound 文件表源模块 UI/包装。
- `modules/GrainOsc.js/.txt`：周期波表源模块 UI/包装。
- `scripts/build-modules.mjs`：生成上面配对文件、索引、demo。
- `scripts/install.mjs`：检查/应用宿主补丁、同步文件、注册模块库。
- `integration/csmodular.patch`：可在宿主基线重放的集成 patch（含 `PulvisPanel.js`、HiDPI 画布与叠层对齐、圆角语言菜单、色板复位、实时示波器/频谱表及 WAV 导入）。
- `integration/wav-session-compat.patch`：面向已含早期 WAV 会话集成宿主的兼容补丁。
- `installer/`：Windows Inno Setup 与 Linux Tauri 桌面安装器源码。
- `assets/`：Pulvis 图标源图与生成产物（`pulvis-icon.png`、`pulvis-social-preview.png` 等）。
- `examples/`：demo patch。
- `tests/`：模块契约、真实 Csound WASM 渲染、安装重放、浏览器集成和语言冒烟测试。
- `README.md` / `README.zh-CN.md` / `README.ru.md`：用户说明。
- `SOURCES.md` / `reference-files.json`：来源及许可证据。
- `docs/`：集成、构建、测试、目录结构与 GitHub 发布文档（含 `docs/TESTING.md`）。
- `release-notes/`：版本发行说明。

## 当前采样约束

单个 WAV 256 MiB、5 分钟；一个会话最多 512 MiB 输入和 48,000,000 解码单声道帧。支持 8–192 kHz、mono/stereo PCM 8/16/24/32-bit、IEEE float32/64、标准 WAVE_FORMAT_EXTENSIBLE；stereo 使用左声道；不支持 RF64/RIFX。改值需同步更新校验、三语错误提示、所有手册和测试。

## 改动和提交流程

将 `CSMODULAR_HOST_ROOT` 指向独立的干净测试宿主。全量检查使用 `npm run check:full`，并按 [检查记录](docs/TESTING.md) 配置已安装的测试宿主引用。

```powershell
node scripts/build-modules.mjs
node scripts/install.mjs $env:CSMODULAR_HOST_ROOT
node --test tests/contracts.mjs
node tests/dsp.mjs
node tests/install.mjs
node scripts/host.mjs build
node tests/integration.mjs
node tests/system-smoke.mjs
```

按改动选择检查，报告范围和限制。检查生成的 orchestra 没有禁止 opcode，确认 GrainCore 在调用者前加载、Voice/FX 总线工作。查看插件 diff/status，仅提交本次相关的插件文件。宿主兼容问题在插件仓记录复现步骤和需要的上游支持。推送和发布需用户授权。新增工具和缓存只装在 `D:\csmodular-tools`；不编辑/提交 `node_modules`、`dist` 或临时 `test-results`。

