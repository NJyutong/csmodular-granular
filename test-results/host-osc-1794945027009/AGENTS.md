# CsModular 项目与 AI 工作规范

先读本文件和 [项目目录地图](docs/PROJECT_STRUCTURE.md)。日常维护另参阅 [AI Context](docs/AI%20Context.md)、[架构](docs/ARCHITECTURE.md)、[贡献指南](docs/CONTRIBUTING.md)；颗粒改动还要读 [GRANULAR](docs/GRANULAR.md) 与 `E:\paper\csmodular-granular\AGENTS.md`。

## 仓库和位置

- 宿主：`E:\paper\csmodular-main`；主应用、模块加载、Csound orchestra 生成和桌面外壳。
- 颗粒插件：`E:\paper\csmodular-granular`；颗粒引擎、模块定义、测试和插件文档的权威源码。
- 用户参考仓库预期位于 `E:\paper\csmodular-main\references\granular\`。仅在用户实际提供后检查；不得自行下载、不得声称读过不存在的代码，也不要修改参考仓库。
- 源码放在 E 盘；新增依赖、构建工具和缓存仅放 D 盘（`D:\csmodular-tools`）。仓库的 `node_modules` 是指向 D 盘的 junction。不要改系统 PATH。

## 技术栈和语言

- 浏览器 UI、Vite、模块描述、安装器和自动化工具：JavaScript ES modules；UI 基于现有 DOM/Canvas。
- 音频合成：Csound。桌面外壳：Tauri / Rust。
- 新面向用户的 UI 文案提供简体中文、俄语、英语。用 `src/utils/locale.js` 的 `getUiLanguage()` / `localize()` 按浏览器系统语言选择 `zh` / `ru` / `en`；未知语言回退英语。`zh-CN` 选中文，`ru-RU` 选俄语。俄语是单独语言，不能并入英语或中文。不要固定切换为某种语言。
- 文案范围包括按钮、模块标题、旋钮标签、插孔、提示、错误、确认框和空状态。模块 DSP 标识符、Csound opcode、接口字段不翻译。尽量控制俄语标签宽度。

## 颗粒 DSP 硬性约束

颗粒调度、声部生命周期、表格读取、插值、播放相位、窗函数、随机状态、重叠混音和实时环形缓冲必须由项目自己的 Csound 源码实现。

最终 Csound DSP 不得调用或包装这些 Csound 内置颗粒器：`partikkel`、`partikkelsync`、`grain`、`grain2`、`grain3`、`syncgrain`、`granule`、`diskgrain`、`fof`、`fof2`、`fog`、`sndwarp`、`sndwarpst`、`mincer`、`temposcal`。不得改名后调用。

颗粒共用算法唯一来源是插件 `csound/GrainCore.txt`，安装后镜像到宿主 `public/csound/modules/GrainCore.txt`。各模块 `.txt` 只能是薄包装层。音频必须经 CsModular Zak 电缆总线，可连接 `instr 1`（Voice）和 `instr 2`（FX），不可直接输出到声卡。JS/Rust 不得处理颗粒音频；JS 可以选择文件、校验 WAV 头、传输至 Csound 虚拟文件系统并传递 UI 参数。

许可证不明或 GPL 项目只供架构参考，不复制或翻译其源码/素材。记录来源和许可证判断；不要改用户提供的参考仓库。

## 模块、构建和采样约定

公开模块使用配对的 `public/libraries/<库>/modules/<名称>.js`（UI）和 `.txt`（Csound UDO），维护 `_index.json` / `_meta.json`。先检查 `src/ModuleFactory.js`、`src/csound/CsoundGenerator.js`、`src/csound/CsoundEngine.js`、`src/api/libraryStore.js` 的实现，再改接口、加载和路由。以实际代码为准。

插件改动以 `E:\paper\csmodular-granular` 为源：

1. `node scripts/build-modules.mjs`
2. `node scripts/install.mjs E:/paper/csmodular-main`
3. 检查 `integration/csmodular.patch` 可对宿主基线重放；同步后的产物位于宿主 `public/`。
4. 检查 `vite.config.js` 是否将资源带进 `dist/`。模块发布状态必须是 `stable` 或 `passable`。

WAV 当前限制：每文件 256 MiB、最长 5 分钟；每会话 512 MiB 源文件和 48,000,000 解码单声道帧。支持 8–192 kHz、PCM 8/16/24/32-bit、IEEE float32/64 与标准 WAVE_FORMAT_EXTENSIBLE；只支持 mono/stereo，立体声取左声道；不支持 RF64/RIFX。变更限制时同步修改三语提示、三语手册、测试和插件安装副本。

## 检查、Git 和提交

插件测试入口：`node --test tests/contracts.mjs`、`node tests/dsp.mjs`、`node tests/install.mjs`、`node scripts/host.mjs build`、`node tests/integration.mjs`、`node tests/system-smoke.mjs`。按改动运行相关检查，并报告未覆盖的原生 Tauri、硬件或旧模块范围。

宿主与插件是两个独立 Git 仓库。分别查看状态和 diff，只提交相关文件。用户已要求新工作提交 Git，沿用每个仓库现有提交身份；不擅自 push。不要提交 `node_modules`、`dist/`、测试临时输出或个人 WAV。

将可选 OSC bridge 未运行时的 websocket 提示与功能故障区分。若构建提示静态/动态导入冲突，确认是否真有功能错误后再决定处理，不要把 warning 报成错误。
