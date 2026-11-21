# Pulvis 0.0.5 · P7 验收与 P8 交接

2026-11-20。宿主版本 CsModular 0.1.5。P6 源码基线为 `5bd462e`，交付源码为 `4ede7b0`。本轮同时复验 P6 与修复后的 Windows、Linux 实包。包版本沿用 0.0.5，请按 SHA-256 区分两轮构建。P8 使用下列文件和[机器可读记录](P7-CROSS-PLATFORM-ACCEPTANCE.json)。

| 交付文件 | 构建提交 | 字节 | SHA-256 |
| --- | --- | ---: | --- |
| [Windows x64 EXE](release-assets/0.0.5/Pulvis-0.0.5-windows-x64.exe) | `4ede7b0` | 2,958,462 | `2b536ce679d769e21bfa953c4f2a75e7be20d17d3d26dbe8edc1a22e3bcaf4dc` |
| [Linux amd64 Debian 包](release-assets/0.0.5/Pulvis-0.0.5-linux-x64.deb) | `afcc8f9` | 4,015,404 | `d7916099cc0fc887d9e88146d603166b5cf6f7003f9270653523b9d224b240db` |
| [源码 ZIP](release-assets/0.0.5/Pulvis-0.0.5-source.zip) | `4ede7b0` | 2,951,762 | `ed42bd5889615f9bc45f26af227431bdc9b074a3b3ed8d779512b7d695798fa6` |

Windows 与 Linux 安装器各自存在影响注册或卸载的缺陷，因此两平台都重建。Linux 通过验收后，最后一个提交仅改 Windows 安装事务和静态包检查，沿用已测 DEB。三份独立 sidecar 与[总清单](release-assets/0.0.5/SHA256SUMS.txt)均已从最终落盘文件核验。P6 原包与验收记录已归档到仓外：`E:\paper\csmodular-pulvis-archive\2026-11-20\p7-evidence\p7-p6-originals` 和 `E:\paper\csmodular-pulvis-archive\2026-11-20\legacy-stage-records`。

## 问题、修复与回归

| 复现及观察 | 根因与修复提交 | 回归证据 |
| --- | --- | --- |
| 解压 P6 ZIP，对干净宿主运行源码安装脚本，退出 1，缺少 SOURCES.md，宿主已打入补丁。缺索引也可能在复制后才报错。 | Git 导出排除了必需文件，脚本直接写目标，最后才解析总索引。`36acd14` 将来源文件纳入 ZIP，预读输入，在同盘暂存文件，锁定安装、保留旧文件、最后发布注册，出错时恢复已修改内容和本次补丁。 | 最终 ZIP 对 `10136ca` 首装、重装、补丁反向识别通过。缺索引时保持原状。以同名目录阻塞共享核心的后期写入，复核原索引、库和宿主补丁状态。 |
| P6 Windows 在两个其他库中间移除 Pulvis 后留下 `["my-lib",,"p7-sentinel"]`。在 Windows 中间候选中阻塞最后的索引替换，Inno 文件回调报错但 EXE 退出 0，留下半套插件。 | 字符串替换未正确处理数组分隔符，文件回调抛错也不能可靠取消安装。`36acd14` 按 JSON 修改注册并保留初始标记。`4ede7b0` 将写入、备份与回滚放入 Inno 的 PrepareToInstall 阶段，以返回值阻止失败安装继续。 | 最终 EXE 中用目录阻塞最后的核心写入，退出 **7**，旧模块逐字节还原、后写对象撤销。成功路径中间注册项、其他 JSON 字段、重复安装和卸载均通过。按安装哈希保留修改过的 README，清除未改载荷和共享核心。 |
| P6 Debian 首装、再点更新、卸载后，库目录消失，注册仍含 pulvis。另用损坏的模块索引触发载荷写入后的失败。 | 更新覆盖了首次注册标记。原后端在注册、写 DSP 和写索引间缺少回滚，还会清理选定目录外的用户库。`36acd14` 加入互斥、目标文件快照与失败恢复，保留首次标记和独立用户库，UI 将选择目录和安装操作串行化。`afcc8f9` 修正原生测试编译。 | P6 DEB 原生复现标记从 none 变为 pulvis。新包 Rust 回归覆盖中途失败、占锁、重装、卸载和修改文件。最终 DEB 在 Xvfb 原生窗口重复安装后仍保留 none，卸载保留修改文件和其他元数据；apt 移除通过。 |
| WAV 尚在异步读取时点击停止，旧逻辑可在读完后按先前的 running 状态再次启动。RIFF 声明范围之外的数据也可能被当作音频检查。 | 传输操作和文件读取没有共同的执行顺序，解析以物理文件末端为界。`36acd14` 串行执行传输与换槽，校验 RIFF 范围及 extensible 扩展长度，恢复失败时报告引擎状态。源码安装同时支持 P6 集成增量升级。 | 延迟文件读取，同时发出停止和第二次导入。最终为 idle、有效槽仅一份。空文件输入、截短 RIFF、无效 WAV 维持旧槽。双平台在运行中注入 VFS 写入失败，均恢复旧槽与音频。 |
| 包检查先按 UTF-8 解码图片再计算摘要，Debian 暂存脚本仅按版本选择包，快速生成检查也会把纯换行转换识别为生成差异。 | `36acd14` 按原始字节取摘要，限定 amd64 文件名。`afcc8f9` 在生成文本一致性检查中归一化 CRLF。 | 两种构建都使用源码 ZIP；DEB 元数据为 pulvis-installer / 0.0.5 / amd64。逐文件比对安装载荷，独立哈希及总清单复算通过。 |
| 文档把 macOS DMG 当成交付项，引用已移除的测试脚本与文档，三语卸载说明未区分安装器应用和宿主插件。 | `36acd14` 对齐 README、集成说明和目录地图，明确源码安装、宿主补丁、DEB 的两步卸载、Windows 卸载入口与测试范围。 | 三语 README 相对链接、锚点、图标、仓内下载目标检查通过。源码 ZIP 的集成脚本在解压副本运行；自动测试使用 Git checkout。 |

## 模块、设置与声音

| 模块 | 已核对的输入、输出与初始状态 | 运行检查 |
| --- | --- | --- |
| GrainFreeze | 单声道录入、控制 CV、左右 Zak 输出。12 粒/秒、80 ms、实时录入、正向、干湿 127、反馈 0、−3 dB。 | 48 kHz 下 384,000 帧环形回绕、空环冻结、即时干湿、私有快照、反向、满反馈边界及 Voice/FX 均通过。 |
| GrainSample | 8 个会话 WAV 槽、控制 CV、左右 Zak 输出。槽 1、扫描 0 %/秒、12 粒/秒、80 ms、−12 dB。 | 空槽峰值为 0。有效导入、换槽、错误回滚、反向、短表边界、重编译和停止/启动通过。工程重开后重新导入 WAV。 |
| GrainOsc | 四种周期波形、控制 CV、左右 Zak 输出。正弦、220 Hz 基频、24 粒/秒、80 ms、扭曲 0、相位抖动 0、−12 dB。 | 四波形、调制、随机种子、声部复用、频谱和播放状态回归通过。 |

参数/插孔编号、生成器、六个 UI/UDO 文件、示例默认值与共享 Csound DSP 相对 P6 无 Git 内容差异。测试核对生成的 orchestra 依赖顺序、缺失或循环依赖错误、64 声部和禁止 opcode。Node WASM 的默认 Osc 模块用例 RMS 为 0.080002、峰值 0.186021；8 秒环回绕用例峰值为 0.353353。空冻结环与空采样槽的 RMS 和峰值均为 0。6 kHz 目标的 18 kHz 插值镜像为 −101.07 dBc。双平台新建工程保存重开均恢复 5 个模块与 5 根连线。

## 实包、命令与环境

- **Windows x64** 使用 Windows 10.0.29708、Inno Setup 7.1.1、Chrome 155。P6 EXE 与最终 EXE 均指向各自隔离宿主的 `public/libraries/pulvis`。最终安装后比对六个模块文件、核心、元数据、三语手册、图标、许可证和示例。修改手册及追加其他库后卸载，复查其余注册和文件。
- **Linux x64** 使用 D 盘独立的 Debian 12 WSL2 环境、Xvfb、Chromium 156、Rust 1.100。P6 和最终 DEB 均通过 apt 安装，再由包内原生 Tauri/WebKit 窗口将插件装入空白宿主。新包的核心、模块、元数据、三语手册、图标、许可证和示例与源码归档逐字节相等。GTK/WebKit 由系统包提供。卸载宿主插件后执行 `apt-get remove pulvis-installer`。
- **全套检查** 在插件 checkout 运行 `npm run check:quick`、`npm run check:full`、`npm run package:smoke`。快速检查 21/21；全量含安装、双 WASM DSP、Vite 构建、浏览器/三语、画布/配色、P1、频谱及性能。另运行解压源码的 archive smoke、源码首装和 `cargo test --release --locked --lib`。原始日志和 P1 JSON 存放在忽略目录 `test-results/`；关键结果在同名验收 JSON 中留档。
- **隔离宿主** 功能测试用 `10136ca` 加插件集成，设置 `CSMODULAR_HOST_ROOT`。画布测试的 `CSMODULAR_UI_HOST_ROOT` 使用 `9dbe666` 加当前集成。保留该快照的 Panel 自由拖动和 PatchLoader 的 `coordinateSpace === 'world'` 语义。P6 基线画布没有这些宿主行为；在正确快照上以 `pulvis` 库 ID 执行后，平移、拖动及负坐标保存重开通过。
- **覆盖边界** 声音证据来自 Csound WASM、Zak 和软件采样。物理声卡回环、掉电恢复、全部旧工程、macOS Intel/Apple Silicon 及实际 CsModular 原生桌面宿主仍未覆盖。可选 OSC bridge 的端口 8765 拒连与 Vite 既有混合导入告警已登记。公开下载地址与 GitHub 发布属于 P8。

P8 清理时可按任务名定位 D 盘的专用 WSL 发行版 `Pulvis-P7`、`D:/csmodular-tools/pulvis-p7-linux` 和插件忽略目录里的 P7 夹具。一次 WSL 探测误启 npm，已将其生成目录移出插件并恢复原有 D 盘依赖 junction。保留 P6 原始二进制与验收记录供对照。
