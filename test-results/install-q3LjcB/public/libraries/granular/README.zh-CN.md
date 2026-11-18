# CsModular 颗粒合成库

[English](README.md) · **简体中文** · [Русский](README.ru.md)

<p align="center">
  <a href="https://github.com/gleb812/csmodular"><img src="https://img.shields.io/badge/Host-CsModular-2563EB?style=flat-square&logo=github&logoColor=white" alt="宿主系统：CsModular"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-059669?style=flat-square" alt="MIT 许可证 — Zhang Shengwei"></a>
  <a href="csound/GrainCore.txt"><img src="https://img.shields.io/badge/DSP-Csound_Granular-7C3AED?style=flat-square" alt="Csound 颗粒 DSP"></a>
</p>

为 CsModular 提供原创、可连接的颗粒合成。颗粒调度、播放、插值、窗函数、随机状态和重叠混音全部由 Csound 实现。模块通过宿主 Zak 电缆总线连接到 Voice 或 FX 层。

## 面板工作流

面板按操作顺序排列：**1 声源/音色 → 2 颗粒塑形与随机 → 3 立体声输出 → 进阶**。振荡器以 Waveform、Phase warp 和 Pitch 为主（新建的振荡器是纯波形：扭曲 0、相位抖动 0）；采样器以文件槽、位置和 Scan speed 为主；冻结器以 Record/Freeze 和回看控制为主。较少调整的参数放在 Advanced 区。振荡器的“相位扭曲”会重塑每个波形周期；“锁定扭曲”会保持当前扭曲深度。它沿用旧的“位置”参数槽位，所以旧版 Grain Osc 存下的值现在就是扭曲深度，旧工程听起来可能略有不同。 相位抖动按颗粒随机选择波表起始相位。

## 第一次使用

将颗粒振荡器的左右输出分别连接到 Outs2 的左右输入。调低音量后按 ▶ 播放。

## 语言

界面按浏览器/系统语言偏好显示简体中文、俄语或英语；未知语言回退到英语。更改系统语言后刷新页面。

## 目录与安装

[CsModular 宿主系统](https://github.com/gleb812/csmodular)与颗粒插件分别维护。

- csound/GrainCore.txt：唯一共享的 DSP 实现。
- modules/GrainFreeze、GrainSample、GrainOsc：配对的 .js UI 与 .txt UDO。
- scripts/build-modules.mjs：生成模块对象和精简 UDO 包装。
- integration/csmodular.patch：针对随附 0.1.5 源码的宿主集成补丁。
- scripts/install.mjs：检查/应用补丁，并复制库与示例。
- examples/granular-demo.json：可直接载入的补丁。
- tests/：WASM 渲染、应用界面和集成检查。
- SOURCES.md：来源、许可证判断和已检查文件的哈希。

随附宿主已安装集成。修改插件后，在插件目录运行：

    node scripts/build-modules.mjs
    node scripts/install.mjs <path-to-csmodular-main>

安装器可重复运行；集成不兼容时会拒绝覆盖。生成的 .js/.txt 模块需要已安装此集成和 GrainCore.txt 的宿主；它们不能作为未修改导出器的独立 opcode 使用。

## 使用

运行 node scripts/host.mjs dev，然后打开终端显示的本地网址。

1. 用补丁加载控件打开 examples/granular-demo.json；也可按空格键，从 **Granular** 库添加模块。
2. 示例连线为 **Grain Osc L → Grain Freeze Audio in → Outs2 L/R**。通过传输控件启动音频，所有连线模块必须处于同一层。
3. Grain Freeze 录入一段音频后，将模式从 **Record** 切换为 **Freeze**。新输入会停止写入环形缓冲，已有颗粒继续播放；切回 0 可恢复录音。
4. 使用文件声源时，选择 Grain Sample 的 **Sample slot**（1–8），右键其面板，选择 **Load WAV → slot…**，再将左右输出连接到 Outs2 或其他处理器。空槽会静音。

每个模块有一个单声道输入和两个音频输出。对 Grain Sample / Grain Osc，输入是 Mix 的可选干声信号，不会替代颗粒声源。Mix 0 只通过干声，Mix 127 只输出颗粒声。Grain Freeze 的输入还写入其私有 192,000 帧环形缓冲（48 kHz 下 4 秒）。

## 控制与调制

前 12 个旋钮旁的小插孔接收叠加型控制率 CV。宿主会在信号进入这些静态控制插孔前转换音频连线。

| 控制 | 旋钮范围 / 含义 | CV = 1 时的增量 |
|---|---|---|
| Density（密度） | 0–200 颗粒/秒；0 会让已有声部自然结束 | 100 颗粒/秒 |
| Size（时长） | 2–500 毫秒；为保证读写安全，实时颗粒可能缩短 | 250 毫秒 |
| Position / Phase warp（位置 / 相位扭曲） | 0–127 映射到 0–1；实时模式为最近至较旧的安全历史（48 kHz 下约 4 秒）；Sample 为读取位置；Osc 为每个周期内的相位扭曲深度。0 保持原波形，较高值会重塑谐波平衡 | 实时/采样：1 个声源跨度；Osc：1 个完整扭曲深度范围 |
| Position jitter / Phase jitter（位置 / 相位抖动） | 0–127，声源跨度中的最大随机偏移；Osc 中按 Seed 为每颗粒随机选择波表起始相位 | 实时/采样：1 个声源跨度；Osc：1 个波形周期的相位抖动 |
| Pitch（音高） | −48…+48 半音 | 12 半音 |
| Pitch jitter（音高抖动） | 0–24 半音，每颗粒对称随机 | 12 半音 |
| Window（窗函数） | 0 = Hann，1 = Triangle；阈值 0.5 | 1 |
| Pan（声像） | 0 = 左，127 = 右；等功率增益 | 1 个归一化声像单位 |
| Spread（扩展） | 0–127；随机声像范围最高 ±0.5 | 1 个归一化扩展单位 |
| Freeze（冻结） | 阈值 0.5；Freeze 模块停止实时写入。Sample（标签为 Hold position）会暂停扫描并忽略 Position 变化。Osc（标签为 Hold warp）会保持相位扭曲量 | 1 |
| Wet mix（湿声混合） | 0–127，干声到湿声（Freeze 标签为 Dry/wet，Osc/Sample 为 Grain/dry mix） | 1 个归一化混合单位 |
| Level（电平） | 0–127，0 到单位增益 | 1 个归一化电平单位 |
| Seed（随机种子） | 整数 0–65534，无 CV；每个实例独立 | — |
| Sample slot（采样槽） | 1–8，按提示中的方式取最近整数；仅 Grain Sample，无 CV | — |
| Scan（扫描） | 每秒文件的 −100…+100%；0 表示停在 Position；仅 Grain Sample，无 CV。位置会自行移动并在文件边界循环；Hold 会暂停 | — |
| Waveform（波形） | 0–3（按提示取整）= 正弦、三角、锯齿、方波（单周期，根音 220 Hz）；仅 Grain Osc，无 CV。锯齿/方波使用 24/23 个谐波，高音时会混叠 | — |

范围由 Csound 限幅。Position 或相位扭曲深度、抖动、音高、窗口、声像和粒长在颗粒创建时采样。Position CV 会扫描新的实时/采样颗粒；Phase warp CV 会设置新 Osc 颗粒的扭曲深度。Sample/Osc 的 Freeze 会锁定当前位置或扭曲量；密度、音高等控制仍实时有效。干声通过 Mix 持续传递。修改 Seed 只重置该实例的随机序列；要得到相同调度，还需重启补丁。

## 引擎与路由

调度器每个采样点累加 density / sr，每次跨过整数边界尝试创建一个颗粒。每个实例有 64 个可复用槽位；槽位占满时丢弃新触发，不抢占或截断活动颗粒。每个被接受的触发使用三个 Park–Miller 随机数，分别选择位置、音高和声像。

核心每次渲染一个控制块（宿主 ksmps=4）。调度仍按采样点推进，因此在块内偏移 j 启动的颗粒年龄为 −j，窗函数在生命周期外钳制为静音：起止时间仍精确到采样点。每个声部维护年龄、时长、声源表、读取位置、速率和声像，并用音频率向量运算渲染，因此成本随**发声中的**颗粒数增长，而不是随每个采样点的总数增长。读取使用两个显式回绕索引和线性插值（tablexkt，尺寸 2，wrap）。

与保留在 tests/reference/GrainCoreReference.txt 的旧逐采样引擎相比，ksmps=1 输出逐位相同；宿主 ksmps=4 下相对 RMS 差异低于 0.1%（仅声部数增益平滑器改为每块更新一次）。在 Csound 7.0.0-beta33（Node/V8）上渲染约快 4–15 倍：默认 Osc 设置约占实时的 6%（旧版约 33%），空闲模块约 3%（旧版约 23%）。Hann/Triangle 窗端点为零。混合声部采用平滑的 1/sqrt(active voices) 补偿和 tanh 峰值控制。包装层插值 Mix/Level，并将最终输出限制在 ±1。

包装层以宿主 ksmps=4 运行：zar 读取音频输入，zkr 读取 CV，共享核心返回音频，zaw 把左右声道写入分配的电缆总线。插件**没有额外颗粒乐器、音频总线或直达声卡输出**；补丁的声卡端点仍是 Outs2。

宿主在 instr 1（Voice）或 instr 2（FX）内按模块插入顺序执行，且不会全局清空 Zak。若接收器排在声源之前，它会读到前一个 4 采样点的块（48 kHz 下约 83 μs）。插件保留了宿主已有的反馈行为，不额外增加一块延迟。

生成器会在调用方之前解析 ;@ requires GrainCore.txt，只包含一次，检测依赖环并报告缺失文件。采样表先于 UDO 创建。Vite 会复制共享文件、发布三个 passable 模块、接受带引号的状态键并保留库元数据/许可证文档。

## 采样与限制

- WAV：单声道/立体声 PCM 8/16/24/32 位或 float32/64，包括标准 WAVE_FORMAT_EXTENSIBLE；8–192 kHz，2 帧至 300 秒。单文件最大 256 MiB；会话限制为源文件 512 MiB、解码后单声道总计 4,800 万帧。立体声只使用**左声道**作为单声道声源。Csound GEN01 解码，并由 ftsr 按原采样率校正播放。
- JS 只选择文件、校验文件头、保留字节并上传到 Csound VFS；不会解码、重采样或合成颗粒音频。
- 八个采样槽在**本应用会话内**由所有模块实例共享。文件会保留到 Stop/Start 和 Recompile，但不会嵌入补丁 JSON、写入 IndexedDB 或在关闭/刷新后恢复；届时需重新导入。
- 替换采样会短暂重启整个音频引擎并清空实时录音环形缓冲，避免活动声部读取时替换表格。CSD 导出还需要在导出的乐谱旁放置对应的 VFS 命名 WAV；不会打包成自包含采样集。
- Grain Osc 目前使用现有正弦表，根音为 220 Hz。尚未实现更多波形、反向播放、带限插值、异步密度抖动和立体声颗粒声源。
- 循环播放任意采样可能跨越不连续边界。线性插值和颗粒窗不能消除所有循环咔嗒声或高移调混叠；没有自动声源接缝交叉淡化。
- 实时时长会保守缩短，以确保整个颗粒读取轨迹和后续写入轨迹都落在已录制历史内，包括颗粒运行时解除冻结的情况。空环形缓冲或冻结空缓冲会静音。
- 槽位数量限制重叠声部；请求的 density × size 超过 64 不会创建无限声部。在无界面冒烟测试中，饱和实例渲染 1 秒音频约耗时 1.33 秒，因此**高重叠可能超出实时 CPU 能力**。测试机默认设置约每渲染 1 秒耗时 0.3 秒；这些非隔离计时不是声卡性能基准。若播放卡顿，请降低 Density、Size 或实例数。
- 验证覆盖浏览器构建。尚未测试原生 Tauri 打包，也未在所有音频设备上监听。可选 OSC bridge 未运行时出现的连接提示，与本插件功能无关。

## 工具与验证

依赖写在 package.json 中。不要提交 node_modules 或生成的测试输出。从仓库根目录使用受支持的 Node.js 运行时执行命令。

浏览器检查使用 Playwright Core，需要兼容的 Chrome/Chromium；若无法自动发现浏览器，可设置 CHROME_PATH。

项目启动器直接调用 Vite；通过构建模式构建宿主。

    node tests/contracts.mjs
    node tests/install.mjs
    node tests/dsp.mjs
    node tests/dsp-node.mjs   # 不需要浏览器：在 Node 中运行相同的 Csound WASM
    node scripts/host.mjs build
    node tests/integration.mjs

测试使用准确的生产依赖 @csound/browser@7.0.0-beta33，报告 Csound 7 双精度样本，提交 ded5d15dece77539c04fbaaa160144df090771e2（2026-08-12）。playwright-core@1.65.0 驱动已安装的 Chrome；可用 CHROME_PATH 覆盖。

DSP 测试使用原始 float 输出，避开 beta33 的 WASI WAV 头部 seek/write 问题；随后添加 WAV 容器，不改变任何渲染样本。输出和截图位于忽略的 test-results/。

实际 WASM 编译/渲染测试覆盖通用 opcodes：xin、xout、setksmps、init 数组、ftgen、ftgentmp、ftlen、ftsr、fillarray、tablekt、tablewkt、downsamp、upsamp、limit、interp、zar、zkr、zaw 以及算术/窗函数。Csound setksmps 参考见 https://csound.com/docs/manual/setksmps.html；函数表文档见 https://csound.com/docs/manual/TableTop.html。兼容性以实际 beta33 测试为准，而不是通用手册是否列出 opcode。

这个插件的原创代码采用 MIT 许可证。随附宿主 README 声称使用 MIT，但未提供 LICENSE 文件；本插件许可证不替代上游缺失的许可证声明。未从参考项目复制源码或音频素材。
