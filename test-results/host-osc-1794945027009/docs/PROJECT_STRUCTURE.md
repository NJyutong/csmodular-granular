# CsModular 项目目录地图

本文覆盖两个独立 Git 仓库。`node_modules` 是 Git 忽略的 D 盘 junction；Vite 的 `dist/` 是生成输出，勿手工编辑。`...` 表示代表性内容。

## 仓库

- `E:\paper\csmodular-main`：CsModular 主应用和模块系统。
- `E:\paper\csmodular-granular`：独立颗粒插件源码、DSP 核心、测试和手册；安装器把它同步到宿主。
- `E:\paper\QB_Nebulae_V2-master`、`eurorack-master`、`csound-floss-develop`、`BHarvestr-master`：外部参考项目（只有用户提供后才查看）。

## 宿主 `csmodular-main`

```text
csmodular-main/
├── AGENTS.md                  AI 项目规则、语言与 DSP 不变量
├── main.js                    主应用状态协调、patch 操作
├── index.html / styles.css    主界面 HTML 和样式
├── package.json               Vite/Tauri 前端依赖及命令
├── vite.config.js             主应用和编辑器双入口、静态资源复制
├── docs/                      架构、贡献、排错、API、颗粒说明
│   ├── PROJECT_STRUCTURE.md   本地图
│   ├── AI Context.md          给维护者/AI 的系统实现背景
│   ├── ARCHITECTURE.md        模块、连线与 Csound orchestra 流程
│   ├── CONTRIBUTING.md        新增和发布模块
│   ├── EDITOR.md              模块编辑器实现
│   ├── GRANULAR.md            颗粒 DSP、连接、WAV 和限制
│   ├── TROUBLESHOOTING.md     常见问题
│   ├── CSP_API.md             外部 bridge 控制 API
│   └── TODO.md                规划
├── src/                       Web 应用 JavaScript
│   ├── ModuleFactory.js       解析模块 UI 定义并创建面板
│   ├── PatchLoader.js         恢复 patch JSON
│   ├── PatchManager.js        管理模块和连线
│   ├── Cable.js                连线表示
│   ├── api/                    Web/Tauri libraryStore 和元数据
│   ├── components/             Knob、Jack、Panel、Label、LED 等
│   ├── csound/                 CsoundEngine、CsoundGenerator、映射表
│   ├── grid/                   画布网格
│   ├── managers/               UI、事件、图层管理器
│   ├── midi/                   MIDI 和 OSC 管理
│   ├── stickers/               贴纸渲染和缓存
│   ├── theme/                  界面主题
│   ├── ui/                     菜单、底栏、scope 等
│   └── utils/                  通用工具；locale.js 语言选择
├── editor/                     独立 HTML 入口的模块编辑器
│   ├── editor.html / editor.js 编辑器入口
│   ├── EditorApp.js            编辑器状态和交互
│   ├── ComponentRegistry.js    组件序列化/反序列化
│   └── ui/                     工具栏、属性、终端、表格与菜单
├── public/                     Vite 原样拷贝的资源
│   ├── libraries/              内置库，每模块一对 .js/.txt
│   │   ├── _index.json         库注册表
│   │   ├── my-lib/             宿主内置模块
│   │   └── granular/           颗粒插件安装后的模块副本
│   ├── csound/modules/         共享 Csound UDO（颗粒核心安装副本）
│   ├── patches/                示例 patch
│   ├── tables/                 参数查找表
│   ├── splash/、svg/           启动图和 SVG 资源
│   └── favicon.ico             浏览器图标
├── bridge/                     可选 HTTP/OSC WebSocket 服务
├── src-tauri/                  Rust 桌面外壳、权限、图标
├── scripts/                    release、库索引工具
├── .github/                    GitHub 工作流和模板
└── dist/                       Vite 生成文件，不要编辑/提交
```

其他根文件：`release-notes.md`、`requirements.txt`、`check.py`、`tutorial1.csd`、`wrangler.json` 等发布、历史或部署辅助材料。用户创建的模块可能在浏览器 IndexedDB 或桌面用户目录，不一定存在于 Git 中。

## 颗粒插件 `csmodular-granular`

```text
csmodular-granular/
├── AGENTS.md                    颗粒插件专用 AI/维护规范
├── README.md                    英文使用和维护手册
├── README.zh-CN.md              简体中文快速指南
├── README.ru.md                 俄语快速指南
├── CHECKS.md                    最近检查结果、warning 和边界
├── VALIDATION.md                DSP 参考验证说明
├── validation-dsp.json          DSP 数值基线
├── SOURCES.md                   算法参考和许可判断
├── LICENSE                      插件 MIT 许可
├── _index.json / _meta.json     CsModular 库元数据
├── csound/GrainCore.txt         唯一共享的自研颗粒引擎
├── modules/                     UI 定义和薄 Csound 包装
│   ├── GrainFreeze.js/.txt      实时环形缓冲与 Freeze
│   ├── GrainSample.js/.txt      采样表源
│   └── GrainOsc.js/.txt         周期波表源
├── scripts/
│   ├── build-modules.mjs        生成模块文件、索引和 demo
│   ├── install.mjs              应用 host patch 并复制插件
│   ├── host.mjs                 直接启动宿主 Vite dev/build/preview
│   └── record-sources.mjs       记录来源文件哈希
├── integration/csmodular.patch  可重放的宿主集成改动
├── examples/granular-demo.json  加载即用的 demo patch
├── tests/                       契约、DSP、安装、集成和系统冒烟检查
├── reference-files.json         参考文件清单/哈希，不代表可复制许可
└── test-results/                Git 忽略的临时测试输出和截图
```

## 运行关系

主应用通过 `libraryStore` 读取公开模块 `.js` UI 定义；`ModuleFactory` 创建旋钮、插孔和面板。线缆和参数交给 `CsoundGenerator` 生成 Csound orchestra，再由 `CsoundEngine` 编译、运行。模块 UDO 使用 Zak 读写共享音频/控制总线，`instr 1` 是 Voice、`instr 2` 是 FX。

插件仓库是颗粒核心的唯一源。运行 build-modules 生成三组 `.js/.txt` 文件；install 将它们、`csound/GrainCore.txt`、文档和 demo 复制到宿主 `public/libraries/granular`、`public/csound/modules`、`public/patches` 并注册库。Vite 构建 `public/` 到 `dist/`，只发布 `stable`/`passable` 模块。

## 常用命令

在 `E:\paper\csmodular-granular`：

```powershell
node scripts/build-modules.mjs
node scripts/install.mjs E:/paper/csmodular-main
node scripts/host.mjs dev
node scripts/host.mjs build
node --test tests/contracts.mjs
node tests/dsp.mjs
node tests/install.mjs
node tests/integration.mjs
node tests/system-smoke.mjs
```

宿主也可用 `npm run dev` / `npm run build`。D 盘 Node 依赖 junction 不可用时先报告环境依赖，不要把它误判为源码错误。未运行 bridge 时，OSC WebSocket 提示只表示可选服务没有启动。

