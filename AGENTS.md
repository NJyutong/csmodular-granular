# 颗粒插件 AI 工作规范

权威源码位于此仓库。维护集成时，还需遵守 CsModular 宿主仓库的 AGENTS.md 和项目目录地图。

## 产品和语言

实现并维护 Grain Freeze、Grain Sample、Grain Osc：共用 Csound 引擎、CsModular UI 模块、WAV 文件传递、安装、文档和检查。

- DSP、颗粒调度/播放/窗函数/重叠混音/环形缓冲全部使用 Csound。
- JavaScript ES modules 负责模块定义、生成/安装脚本、WAV 选择/头部校验/传入 Csound VFS、UI 和自动化检查。Rust 仅属于桌面壳；任何其他语言都不实现颗粒音频算法。
- 用户指南为英语、简体中文和俄语；UI 根据浏览器/系统语言自动选择 `en`、`zh` 或 `ru`，英语兜底。俄语独立于另外两种语言。

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
- `integration/csmodular.patch`：可在宿主基线重放的集成 patch。
- `examples/`：demo patch。
- `tests/`：模块契约、真实 Csound WASM 渲染、安装重放、浏览器集成和语言冒烟测试。
- `README.md` / `README.zh-CN.md` / `README.ru.md`：用户说明。
- `SOURCES.md` / `reference-files.json`：来源及许可证据。
- `CHECKS.md` / `VALIDATION.md`：检查历史及基准指标。

## 当前采样约束

单个 WAV 256 MiB、5 分钟；一个会话最多 512 MiB 输入和 48,000,000 解码单声道帧。支持 8–192 kHz、mono/stereo PCM 8/16/24/32-bit、IEEE float32/64、标准 WAVE_FORMAT_EXTENSIBLE；stereo 使用左声道；不支持 RF64/RIFX。改值需同步更新校验、三语错误提示、所有手册和测试。

## 改动和提交流程

```powershell
node scripts/build-modules.mjs
node scripts/install.mjs <path-to-csmodular-main>
node --test tests/contracts.mjs
node tests/dsp.mjs
node tests/install.mjs
node scripts/host.mjs build
node tests/integration.mjs
node tests/system-smoke.mjs
```

按改动选择检查，报告范围和限制。检查生成的 orchestra 没有禁止 opcode，确认 GrainCore 在调用者前加载、Voice/FX 总线工作。宿主和插件分别查看 diff/status，分别提交相关改动；除非用户明确要求，否则不要 push。新增工具和缓存放在仓库外部；不编辑/提交 `node_modules`、`dist` 或临时 `test-results`。

