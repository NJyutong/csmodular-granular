# CsModular 颗粒合成库

[English](README.md) · **简体中文** · [Русский](README.ru.md)

<p align="center">
  <a href="https://github.com/gleb812/csmodular"><img src="https://img.shields.io/badge/Host-CsModular-2563EB?style=flat-square&logo=github&logoColor=white" alt="宿主系统：CsModular"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-059669?style=flat-square" alt="MIT 许可证 — Zhang Shengwei"></a>
  <a href="csound/GrainCore.txt"><img src="https://img.shields.io/badge/DSP-Csound_Granular-7C3AED?style=flat-square" alt="Csound 颗粒 DSP"></a>
</p>

> [!NOTE]
> **CsModular 颗粒合成库 · v1.1.1**
> 基于 Csound 的 CsModular 颗粒合成插件，包含 Grain Freeze、Grain Sample 和 Grain Osc。Grain Osc 支持相位扭曲与逐颗粒起始相位抖动；1.1.1 优化运行效率并更新界面。

| 模块 | 声源 | 适用场景 |
|---|---|---|
| **Grain Osc** | 内置波表 | 相位扭曲、逐颗粒相位抖动和颗粒音色设计 |
| **Grain Sample** | 导入的 WAV，1–8 号槽 | 对录音素材进行颗粒播放 |
| **Grain Freeze** | 实时输入环形缓冲 | 冻结并重塑近期声音 |

新建 Grain Osc 的相位扭曲与相位抖动默认值均为 0。

为 CsModular 提供原创、可连接的颗粒合成。颗粒调度、播放、插值、窗函数、随机状态和重叠混音全部由 Csound 实现。模块通过宿主 Zak 电缆总线连接到 Voice 或 FX 层。


## 语言

界面按浏览器/系统语言偏好显示简体中文、俄语或英语；未知语言回退到英语。更改系统语言后刷新页面。

## 目录与安装

[CsModular 宿主系统](https://github.com/gleb812/csmodular)与颗粒插件分别维护。

- csound/GrainCore.txt：唯一共享的 DSP 实现。
- modules/GrainFreeze、GrainSample、GrainOsc：配对的 .js UI 与 .txt UDO。
- integration/csmodular.patch：针对随附 0.1.5 源码的宿主集成补丁。
- scripts/install.mjs：检查/应用补丁，并复制库与示例。
- examples/granular-demo.json：可直接载入的补丁。
- LICENSE：MIT 许可证，版权 © 2026 Zhang Shengwei。

要将插件添加到本地 CsModular 0.1.5 源码，运行：

    node scripts/install.mjs <path-to-csmodular-main>

插件包含宿主集成补丁，可直接使用随附的模块文件安装。

## 使用

运行 node scripts/host.mjs dev，然后打开终端显示的本地网址。

1. 用补丁加载控件打开 examples/granular-demo.json；也可按空格键，从 **Granular** 库添加模块。
2. 示例连线为 **Grain Osc L → Grain Freeze Audio in → Outs2 L/R**。通过传输控件启动音频，所有连线模块必须处于同一层。
3. Grain Freeze 录入一段音频后，将模式从 **Record** 切换为 **Freeze**。新输入会停止写入环形缓冲，已有颗粒继续播放；切回 0 可恢复录音。
4. 使用文件声源时，选择 Grain Sample 的 **Sample slot**（1–8），右键其面板，选择 **Load WAV → slot…**，再将左右输出连接到 Outs2 或其他处理器。空槽会静音。

右键任意颗粒模块并选择 **关于 CsModular 颗粒插件**，可查看版本、版权和许可证信息。

Grain Osc 和 Grain Sample 只有立体声输出，不接受音频输入。Grain Freeze 接受单声道输入，将其写入私有的 192,000 帧环形缓冲（48 kHz 下 4 秒），也是库中唯一带干湿混合控制的模块。

## 控制与调制

旋钮旁的小插孔接收叠加型控制率 CV；Seed、Sample slot、Scan 和 Waveform 不接收 CV。宿主会在信号进入静态控制插孔前转换音频连线。

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
| Freeze / Hold position（冻结 / 锁定位置） | 阈值 0.5；Freeze 停止实时写入，Sample 的 Hold position 暂停扫描并忽略 Position 变化；Osc 没有此控件 | 1 |
| Wet mix（干湿混合） | 0–127，从干声到颗粒声；仅 Grain Freeze 使用 | 1 个归一化混合单位 |
| Level（电平） | 0–127，0 到单位增益 | 1 个归一化电平单位 |
| Seed（随机种子） | 整数 0–65534，无 CV；每个实例独立 | — |
| Sample slot（采样槽） | 1–8，按提示中的方式取最近整数；仅 Grain Sample，无 CV | — |
| Scan（扫描） | 每秒文件的 −100…+100%；0 表示停在 Position；仅 Grain Sample，无 CV。位置会自行移动并在文件边界循环；Hold 会暂停 | — |
| Waveform（波形） | 0–3（按提示取整）= 正弦、三角、锯齿、方波（单周期，根音 220 Hz）；仅 Grain Osc，无 CV。锯齿/方波使用 24/23 个谐波，高音时会混叠 | — |

范围由 Csound 限幅。声源位置或相位扭曲深度、相位/位置抖动、音高、窗口、声像和粒长在每颗粒启动时采样。Position CV 会扫描新的实时/采样颗粒；Phase warp CV 设置新 Osc 颗粒的扭曲深度；Osc 的 Phase jitter 为每颗粒选择随机起始相位。Sample 的 Hold position 会暂停扫描；Freeze 控制实时录音。修改 Seed 只重置该实例的随机序列；要得到相同调度，还需重启补丁。

## 引擎与路由

调度器每个采样点累加 density / sr，每次跨过整数边界尝试创建一个颗粒。每个实例有 64 个可复用槽位；槽位占满时丢弃新触发，不抢占或截断活动颗粒。每个被接受的触发使用三个 Park–Miller 随机数，分别选择声源位置（Osc 中为起始相位）、音高和声像。

核心每次渲染一个控制块（宿主 ksmps=4）。调度仍按采样点推进，因此在块内偏移 j 启动的颗粒年龄为 −j，窗函数在生命周期外钳制为静音：起止时间仍精确到采样点。每个声部维护年龄、时长、声源表、读取位置、速率和声像，并用音频率向量运算渲染，因此成本随**发声中的**颗粒数增长，而不是随每个采样点的总数增长。读取使用两个显式回绕索引和线性插值（tablexkt，尺寸 2，wrap）。

优化后的引擎逐采样调度，并按控制块向量化渲染活动颗粒，保持颗粒起止的采样精度。Hann 与 Triangle 窗口两端淡出至零；活动声部采用平滑增益补偿和峰值控制。Grain Freeze 混合干声与颗粒声；所有模块均应用 Level。

包装层以宿主 ksmps=4 运行：仅 Freeze 用 zar 读取音频输入；zkr 读取 CV；共享核心返回音频；zaw 把左右声道写入分配的电缆总线。插件**没有额外颗粒乐器、音频总线或直达声卡输出**；补丁的声卡端点仍是 Outs2。

宿主在 instr 1（Voice）或 instr 2（FX）内按模块插入顺序执行，且不会全局清空 Zak。若接收器排在声源之前，它会读到前一个 4 采样点的块（48 kHz 下约 83 μs）。插件保留了宿主已有的反馈行为，不额外增加一块延迟。

共享颗粒核心会先于模块包装层加载。补丁使用 Grain Sample 时才会创建对应采样表；音频始终通过宿主 Zak 电缆路由。

## 采样与限制

- WAV：单声道/立体声 PCM 8/16/24/32 位或 float32/64，包括标准 WAVE_FORMAT_EXTENSIBLE；8–192 kHz，2 帧至 300 秒。单文件最大 256 MiB；会话限制为源文件 512 MiB、解码后单声道总计 4,800 万帧。立体声只使用**左声道**作为单声道声源。Csound GEN01 解码，并由 ftsr 按原采样率校正播放。
- 八个采样槽在**本应用会话内**由所有模块实例共享。文件会保留到 Stop/Start 和 Recompile，但不会嵌入补丁 JSON、写入 IndexedDB 或在关闭/刷新后恢复；届时需重新导入。
- 替换采样时，音频引擎会重新加载，实时录音缓冲会清空。导出的 CSD 补丁也需要使用到的 WAV 文件。
- Grain Osc 提供正弦、三角、锯齿和方波，根音为 220 Hz。高音区使用锯齿或方波可能产生混叠。
- 循环播放采样时，文件边界可能出现咔嗒声；大幅移调也可能产生混叠。
- 实时颗粒可能缩短，以确保读取位置位于已录制历史内。空的 Freeze 缓冲在收到音频前保持静音。
- 每个实例最多有 64 个活动颗粒。高重叠时可降低 Density、Size 或模块实例数，以保持流畅播放。

## 许可证

版权 © 2026 Zhang Shengwei。插件以 MIT 许可证发布，详见 [LICENSE](LICENSE)。
