# 微粒——CsModular 颗粒合成插件库


[English](README.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md)

<p align="center"><img src="assets/pulvis-icon.png" width="144" alt="微粒应用图标"></p>

**微粒是为 CsModular 提供颗粒合成的插件模块库。**

- **微粒 · 颗粒冻结** 录入并冻结实时音频，可延展人声或和弦。
- **微粒 · 颗粒采样** 从 WAV 扫描素材，并切碎或移调。
- **微粒 · 颗粒振荡器** 用内置波形生成可演奏的颗粒音色。

版本 0.0.5 · 下载：[Windows x64 安装器](https://github.com/NJyutong/csmodular-pulvis/releases/download/v0.0.5/Pulvis-0.0.5-windows-x64.exe) · [Linux x64 Debian 包](https://github.com/NJyutong/csmodular-pulvis/releases/download/v0.0.5/Pulvis-0.0.5-linux-x64.deb) · [源码包](https://github.com/NJyutong/csmodular-pulvis/releases/download/v0.0.5/Pulvis-0.0.5-source.zip) · [SHA-256](https://github.com/NJyutong/csmodular-pulvis/releases/download/v0.0.5/SHA256SUMS.txt)

三个模块均采用宽屏（`500 × 300`）哑光阳极石墨色双区硬件面板（`PulvisPanel.js`），顶部带有实时显示区（播放时同步显示第一个已连接音频输出的 Csound 实时波形与 2048 点汉宁窗 FFT 频谱，以及当前颗粒包络形状），配合宿主高 DPI 画布渲染保持界面与连线清晰对齐：

- **微粒 · 颗粒冻结**（左 3 × 3 + 右 3 × 3）：左区为 **实时环形缓冲与颗粒核**（`冻结`、`回看位置`、`回看抖动`、`颗粒/秒`、`粒长 ms`、`颗粒包络`、`播放来源`、`反馈`、`捕捉快照`），右区为 **音高散布、干湿混音与时序**（`音高（半音）`、`音高抖动 st`、`随机种子`、`干湿比`、`声像扩展`、`输出电平 dB`、`声像`、`时间散布 %`、`播放方向`）。
- **微粒 · 颗粒振荡器**（左 3 × 3 + 右 2 × 3 居中）：左区为 **载波音色扭曲与颗粒核**（`波形`、`相位扭曲`、`音高（0=A3）`、`颗粒/秒`、`粒长 ms`、`颗粒包络`、`锁定扭曲`、`播放方向`、`时间散布 %`），右区为 **相位音高抖动与立体声输出**（`相位抖动`、`音高抖动 st`、`随机种子`、`声像`、`声像扩展`、`输出电平 dB`）。新建振荡器默认扭曲 0、相位抖动 0，保持纯波形；“相位扭曲”重塑每个波形周期，“锁定扭曲”保持当前扭曲深度，“相位抖动”按颗粒随机选择波表起始相位（沿用旧的“位置”参数槽位，旧版 Grain Osc 工程的该值会映射为扭曲深度）。
- **微粒 · 颗粒采样**（左右对称 3 / 3 / 2）：顶部提供 `#1`–`#8` 采样槽切换（空槽居中显示 **导入 WAV…** 按钮，无内置演示 WAV；载入后显示实时波形与频谱）；左区为 **WAV 采样扫描与颗粒核**（`采样槽`、`采样位置`、`扫描 %/秒`、`颗粒/秒`、`粒长 ms`、`颗粒包络`、`锁定位置`、`播放方向`），右区为 **音高散布与立体声场输出**（`音高（半音）`、`位置抖动`、`音高抖动 st`、`声像`、`声像扩展`、`输出电平 dB`、`时间散布 %`、`随机种子`）。

## 第一次使用

将颗粒振荡器的左右输出分别连接到 Outs2 的左右输入。调低音量后按 ▶ 播放。

右键点击任一微粒模块的标题栏：

- **关于**：在居中弹窗查看项目网址、版本、版权和 MIT 许可证。
- **语言**：通过圆角下拉框同时切换所有微粒面板及模块右键菜单的 **简体中文**、**俄语** 和 **英语**；选择保存在本机，选 **跟随系统** 即可恢复跟随浏览器/系统语言（默认回退英语）。宿主主模块浏览器（按空格键或右键空白处）刻意保持英文名称（`Pulvis`、`Pulvis Grain Freeze`、`Pulvis Grain Osc`、`Pulvis Grain Sample`），与英文宿主菜单保持一致。
- **面板颜色**：点击 32 色色板为当前哑光面板与强调色着色，点击 **↺ 跟随主题** 立即恢复默认深灰配色。

宽屏面板和这些菜单需要使用当前源码集成重新构建的宿主。“颗粒包络”可选汉宁窗、三角窗或布莱克曼窗；冻结模块可选“录入/冻结”，另外两个模块可选“跟随/锁定”（分别锁定采样位置或扭曲深度）。点击选择器切换状态，可调制旋钮旁的小插孔仍可叠加控制率 CV 调制。

颗粒插件源码与 CsModular 宿主应用分别维护在独立仓库中。

## 启动和连接

先安装 CsModular 宿主，再安装微粒插件；安装完成后直接打开 CsModular 宿主，插件会自动出现在宿主的模块列表中。按空格键（或右键空白画布）即可在 `Pulvis` 库中添加 `Pulvis Grain Freeze`、`Pulvis Grain Sample`、`Pulvis Grain Osc`，或通过补丁加载按钮打开示例工程 `pulvis-demo.json`（已同步到宿主 `public/patches/pulvis-demo.json`）。

- 将“颗粒振荡器”的左声道输出连接到“颗粒冻结”的音频输入，再将“颗粒冻结”的左右输出分别连接到 Outs2 的左右输入。开启音频播放。
- 先让模块录入音频，将“冻结”选择器切到“冻结”，再按“捕捉快照”并把“播放来源”切到“快照”。快照属于当前 Freeze 实例；切回“录入”后环形缓冲可继续写入，已捕捉的快照不变。
- 使用采样文件时，选择采样槽（顶部 `#1`–`#8` 或 `采样槽` 旋钮），直接点击空槽居中的 **导入 WAV…** 按钮或右键点击“颗粒采样”模块选择“导入 WAV”，再将左右输出连接到 Outs2。空槽默认静音，不包含内置演示 WAV。
- 颗粒振荡器和颗粒采样是独立立体声声源，没有音频输入或干湿控件，可直接连接到 Outs2 或其他处理器。只有颗粒冻结器有音频输入与“干湿比”旋钮。
- 连线的两个模块必须位于同一层。“输出电平 dB”范围为 −24 至 +12 dB；Osc/Sample 默认 −12 dB，Freeze 默认 −3 dB；CV 满量程增加 12 dB。Freeze 的干湿比为 0 时通过干声，为 127 时只输出颗粒声。
- Freeze/Sample 的颗粒密度为 0–24 粒/秒，Osc 为 0–48；默认分别为 12 和 24。粒长为 2–400 ms；实时颗粒可能因环形缓冲读写安全而缩短。CV 满量程分别增加 24 或 48 粒/秒。
- “触发时间散布”0–100%；0 保持规则节拍，100 将触发时刻最多偏移标称间隔的 ±45%，平均粒速不变。Seed 使散布序列可复现，旁边的 CV 插孔可独立调制散布量。
- 窗函数：0 为汉宁窗，1 为三角窗，2 为布莱克曼窗；该设置作用于新生成的颗粒。播放方向可设为正向或反向，三个模块均可使用。
- Freeze 的来源可选实时环形缓冲或该实例最近一次快照。反馈范围 0–0.95，默认 0；只在录入时把湿声颗粒回送到环形缓冲，写入信号限制在 ±1。空缓冲或仍被旧颗粒读取的备用表不会被快照覆盖。

共享颗粒核心保持线性，模块包装层按所选增益在输出端限制到 ±1；超过满量程时会硬削波。独立声源默认 −12 dB，为颗粒叠加留出约 3 dB 的额外余量。

Sample 与 Freeze 在升调时使用带限 sinc 读表；Osc 使用按最高音高选择的谐波波表。频谱分别测量插值镜像和 Nyquist 折返：6 kHz 目标音旁的 18 kHz 插值镜像从 −35.2 降到 −101.1 dBc；48 kHz 下 +48 半音时，Sample 的 8 kHz 源音折叠到 16 kHz 的分量从约 −1.2 降到 −114.2 dBc，Freeze 降到 −113.5 dBc。

每个 Freeze 实例为实时环形缓冲和两张私有快照表分配 3 × 8 秒存储；48 kHz 时共 1,152,000 个表帧。快照不会进入 Sample 的 WAV 槽，也不会保存到工程；重编译或重启后需要重新捕捉。

性能只在一台机器上测得：Intel Core i5-12490F、Node 26.12、Csound 7 beta33 WASM、48 kHz、ksmps=4。定位到高密度 Osc 的主要开销来自每个控制块重复复制所有活跃颗粒状态；现在只保存本块可能复用的尾音槽。120 粒/秒 × 400 ms 压力场景早期配对测量从 80.3% 降到 62.2%；最新五次中位数为 65.3%（渲染 1.5 秒音频需 959–1,033 ms）。当前中位数：默认单个 Osc（24 粒/秒、80 ms）13.2%；单个/两个 Osc（48 粒/秒、400 ms）35.3%/70.6%；单个/两个 Sample（+48 半音、24 粒/秒、400 ms）36.4%/71.5%；Freeze 录满 8 秒后扣除录入开销的活动部分为 27.9%。默认 Osc 输出 RMS/峰值为 0.0859/0.1791，双个最大密度 Osc 为 0.4402/0.8785。每个 Freeze 的两张快照表使 WASM 线性内存增加约 6.16 MB；20 次复制额外耗时 7.85 ms。以上为离线渲染耗时与音频时长之比，不是整机 CPU 百分比或声卡回调测试。

不同电脑仍使用相同的密度范围：Freeze/Sample 为 0–24 粒/秒，Osc 为 0–48 粒/秒。插件无法读取宿主音频截止时间，也不会按设备自动调整上限。实际余量取决于 CPU、音频缓冲大小、宿主和浏览器负载及其他模块。以上数据只适用于标明的测试机；本轮 Windows 声卡枚举被系统拒绝，未能主观试听或测量实时掉帧。如实时播放中断，请减少 Density、Size 或实例数量。

## WAV 支持范围

单个 WAV 文件最大 256 MiB，时长不超过 5 分钟。每次应用运行最多载入 512 MiB 的 WAV；解码后的单声道采样数据合计不得超过 4,800 万帧。

支持采样率 8–192 kHz、单声道或立体声的 PCM 8/16/24/32 位、IEEE float32/64 和标准扩展 WAV 格式。立体声文件只读取左声道；暂不支持 RF64 和大端序 WAV。

采样槽在本次应用运行期间共享。关闭或刷新应用后，需要重新载入文件。替换采样文件会重启音频引擎，并清空实时录音缓冲。

Csound 负责 WAV 解码和全部音频处理。JavaScript 只负责选择文件、检查文件头、将文件传入 Csound 虚拟文件系统，以及传递界面参数；不会在 JavaScript 中处理颗粒音频。

## 插件开发

 宿主集成升级到包含 WAV 并发修复的版本。完整参数说明和 DSP 架构见英文指南 `README.md`。原创引擎采用 MIT 许可证；参考来源和许可证判断见 `SOURCES.md`。

## 桌面安装包

0.0.5 版提供自绘原生 Windows x64 向导和 Linux x64 Debian 包。Windows x64 与 Linux x64 已在 CsModular 0.1.5（`10136ca`）上通过全新安装验收，覆盖三个模块、WAV 导入、Voice／FX 路由、新建工程保存重开和卸载。Debian 包声明运行依赖，由系统包管理器安装，不会把 GTK 或 WebKit 库打包进去。macOS Apple Silicon 与 Intel 尚未构建或实机验收，仍待验证。安装器面向带有颗粒集成的 CsModular 0.1.5；插件固定安装到 `libraries/pulvis`，升级时会把旧 `granular` 文件夹改名为 `pulvis` 并更新宿主库索引。集成补丁会把旧工程中的 `granular` 库标识映射到 Pulvis。Windows 安装器不需要 WebView2，界面跟随 Windows 系统界面语言（简体中文、俄语或英语兜底）。

下载： [Windows x64 安装器](https://github.com/NJyutong/csmodular-pulvis/releases/download/v0.0.5/Pulvis-0.0.5-windows-x64.exe) · [Linux x64 Debian 包](https://github.com/NJyutong/csmodular-pulvis/releases/download/v0.0.5/Pulvis-0.0.5-linux-x64.deb) · [源码包](https://github.com/NJyutong/csmodular-pulvis/releases/download/v0.0.5/Pulvis-0.0.5-source.zip) · [SHA-256 校验和](https://github.com/NJyutong/csmodular-pulvis/releases/download/v0.0.5/SHA256SUMS.txt)。

全新安装步骤：准备好已集成颗粒功能且尚未安装插件的 CsModular 0.1.5，先关闭宿主。Linux 使用 `sudo apt install ./Pulvis-0.0.5-linux-x64.deb` 安装 Debian 包，再从应用菜单启动 Pulvis Installer；选择宿主的 `libraries` 文件夹，安装器会写入 `pulvis`。系统包管理器会安装 Debian 包声明的运行依赖，包内不捆绑 GTK 或 WebKit 库。Windows 则运行安装向导并选择 `libraries/pulvis`。重新启动 CsModular，在模块浏览器的 `Pulvis` 库中确认三个模块均已出现，放置到画布后可见“微粒 · 颗粒冻结”“微粒 · 颗粒采样”“微粒 · 颗粒振荡器”；为“微粒 · 颗粒采样”导入 WAV，再新建工程、保存并重开。Windows 可在“已安装的应用”中卸载，或运行插件目录中的 `unins000.exe`。Debian 先在 Pulvis Installer 中卸载插件，再按需运行 `sudo apt remove pulvis-installer` 移除安装器。

0.0.5 平台验收记录列出宿主基线、落盘载荷哈希、保存重开结果、覆盖范围和已知宿主问题。本次验收不包含物理声卡回环测试。


## 构建产物与临时文件

在 Windows 运行 `npm run build:windows-installer`，在 Linux 运行 `npm run build:linux-deb`。通过校验的安装包及其 `.sha256` 文件输出到 `release-assets/<version>/`；三种包齐全后运行 `npm run release:checksums` 生成 `SHA256SUMS.txt`。构建器会先暂存安装包、重新读取并核对 SHA-256，再发布到输出目录。

每次构建使用独立临时目录（Windows：`D:\csmodular-tools\pulvis-builds`；WSL：`/mnt/d/csmodular-tools/pulvis-builds`；原生 Linux：系统临时目录）。成功时，仅在安装包和校验文件核验完成后删除本次目录；失败时，将命令输出和诊断信息保存在 `test-results/build-logs/`，再清理本次可回收的中间文件。

CI 会保留本次独立任务目录，直到安装包和 SHA 校验文件上传完成。失败作业先上传诊断日志；最后的清理步骤只删除本次任务目录。详见[构建与清理说明](docs/BUILDING.md)。
