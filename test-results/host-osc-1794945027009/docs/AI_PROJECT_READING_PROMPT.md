# 交给 AI 的项目通读提示词

你现在负责通读并理解 CsModular 项目。当前阶段的任务是**读取、核对和汇报项目，不要直接修改代码**。请按以下要求工作，不要只依据 README 或用户描述推测实现。

## 必须遵守的项目规则

1. 先读取 `E:\paper\csmodular-main\AGENTS.md` 与 `E:\paper\csmodular-granular\AGENTS.md`。然后阅读 `docs/PROJECT_STRUCTURE.md`、`docs/AI Context.md`、`docs/ARCHITECTURE.md`、`docs/CONTRIBUTING.md`、`docs/GRANULAR.md` 以及与你理解的子系统相关的文档。
2. **完整检查两个 Git 仓库**：宿主 `E:\paper\csmodular-main` 和插件 `E:\paper\csmodular-granular`。分别查看目录树、`git status`、近期提交和当前 diff。不要把两个目录当成一个仓库。
3. 依据真实源码沿着入口和数据流阅读：主应用启动 → 模块库加载 → UI 模块实例 → 电缆/参数 → `CsoundGenerator` 生成 orchestra → `CsoundEngine` 编译运行；也要检查独立模块编辑器和 Tauri 外壳。阅读所有相关的 JS、Csound `.txt`、配置、索引、脚本与测试。
4. 扫描全部项目文件清单。逐目录阅读所有受版本控制的源文件、文档、配置和测试；文件很多时分批读取并列出已完成和未完成的目录。不要只挑入口文件后称“已读完整项目”。可略过 `node_modules`、`.git`、`dist`、测试生成物、编译输出和大型二进制素材；说明这些是依赖或生成文件，不把它们当源代码。
5. 检查参考项目目录 `E:\paper\csmodular-main\references\granular\` 是否存在。不存在时明确报告未提供，不要联网下载、猜测内容或声称已经阅读。不得改动任何参考仓库。
6. 用户指定源码在 E 盘；新增依赖、工具和缓存只放 D 盘（`D:\csmodular-tools`），不要写系统 PATH。不要删除或覆盖用户未提交的改动。此阶段不安装依赖、不运行危险/破坏性命令、不修改文件。

## 语言与音频硬性要求

- 前端、构建和模块说明使用 JavaScript ES modules；颗粒 DSP 和 Csound UDO 使用 Csound；桌面壳为 Rust/Tauri。JavaScript 负责 UI、文件选择/校验和传输，不实现音频颗粒算法。
- 面向用户的新增 UI 文案用 `src/utils/locale.js` 按浏览器/系统语言自动选择简体中文 `zh`、俄语 `ru`、英语 `en`；未知语言回退英语。俄语是独立语言。模块名的稳定 Csound 标识符和 API 字段不翻译。
- 最终 Csound DSP 不得调用或包装 `partikkel`、`partikkelsync`、`grain`、`grain2`、`grain3`、`syncgrain`、`granule`、`diskgrain`、`fof`、`fof2`、`fog`、`sndwarp`、`sndwarpst`、`mincer`、`temposcal` 等内置颗粒器。共用自研引擎只有插件 `csound/GrainCore.txt`；颗粒输出必须继续走 Zak 电缆总线，并能连接宿主 Voice/FX 路由。
- 参考 GPL 或许可不明代码只学习架构，不能复制或翻译代码/素材。算法概念借鉴也要说明来源与许可证判断。
- 采样当前规格：每个 WAV 最多 256 MiB、5 分钟；会话最多 512 MiB 源文件及 48,000,000 个解码单声道帧。格式为 8–192 kHz、mono/stereo、PCM 8/16/24/32 位、IEEE float32/64 和标准扩展 WAV；stereo 读左声道。不支持 RF64/RIFX。JS 不解码或处理音频，Csound 完成解码和全部 DSP。

## 通读后请提交的报告

用中文先简洁报告：

1. 两个仓库的用途、语言、入口、构建/运行命令和主要目录。
2. 模块从 `.js/.txt` 加载到 Csound、再经 Zak cable 输出的真实调用链；Voice/FX 的执行关系。
3. 颗粒引擎的位置、数据流、插件如何安装到宿主、示例 patch 如何加载。
4. WAV 载入/限制、三语本地化的实际实现位置。
5. 参考仓库是否存在；尚未读取的目录/文件、原因和后续影响。
6. 当前 Git 未提交改动、现有测试入口、已知警告/问题及测试覆盖边界。
7. 给出“已阅读路径”与“尚未阅读路径”清单，使用户能确认你实际看过什么。

引用文件时使用仓库内相对路径。区分源码证据、文档描述与自己的推断。遇到文档和代码不一致时，以当前源码为准并指出差异。汇报完成后等待后续任务；不要在本次通读过程中顺便重构、修 bug、提交 Git 或下载依赖。
