# Codex(ChatGPT) Desktop App DeepWiki

面向 macOS ChatGPT（Codex）桌面应用的独立工程分析工作台。从 GUI 界面出发，经过领域、Electron 桥、Rust 协议或 Cloud 接口，追踪到源码证据。

[GitHub](https://github.com/lwyBZss8924d/chatgpt-desktop-reverse) · [官方应用文档](https://learn.chatgpt.com/docs/app) · [English](README.md)

App 归档：**26.903.61454**。OSS 参考：[`ddea03ad049142943bdbf13e937b1d67e8c1ba0c`](https://github.com/openai/codex/tree/ddea03ad049142943bdbf13e937b1d67e8c1ba0c)。应用二进制与该 OSS 提交的精确等价关系仍为**未验证**。

> 公开版本：图片为带隐私马赛克的真实截图，原图与历史研究保留在本地归档。

## 构建与打开

使用 Node.js 24 和 npm。干净 checkout 从已提交产物构建，不需要已安装应用、临时解包目录、Rust checkout 或 API 凭证。

```bash
npm ci
npm run typecheck
npm test
npm run docs:check
npm run build
python3 -m http.server 8000 --directory site
# http://localhost:8000/
```

使用 `npm run dev` 进行支持热更新的 React 开发（默认端口 8000，可用 `npm run dev -- --port 8001` 修改）。交互浏览使用 HTTP；预渲染正文和图示在禁用 JavaScript 时仍可阅读。

## 九页工作台

| 页面 | 探索内容 |
| --- | --- |
| [研究总览](site/index.html) | 从界面出发，追踪功能的实现，再亲自查看证据。 |
| [执行归属](site/three-way.html) | 区分领域分组与实际调用方向。 |
| [Rust 内核 API](site/core-api.html) | 探索四条通道、数据结构与固定版本的源码定义。 |
| [云端 API](site/cloud-api.html) | 追踪发行包中的客户端调用、路由改写与服务边界。 |
| [Electron 壳层](site/shell.html) | 观察渲染界面、原生窗口与子进程之间的桥梁。 |
| [功能图谱](site/features.html) | 探索限界上下文、能力、命令及承载它们的界面。 |
| [界面地图](site/gui-map.html) | 浏览归档截图、进入路径与会话作用域中的界面。 |
| [发行包探索](site/bundle.html) | 从文件统计深入导入关系、接口引用与有证据的洞察。 |
| [方法与证据](site/method.html) | 理解来源如何成为结论、哪些已被观测、哪些仍然未知。 |

工作台采用 React、TypeScript 和 Vite，使用 React Flow 12（`@xyflow/react`）、确定性 ELK 布局及构建期 Shiki 高亮。图谱支持平移／缩放、适配、100% 阅读、小地图、全屏与关系高亮。代码块支持点击复制和显式复制按钮，搜索、筛选和选中记录支持深链接。

中英文共享同一数据。英文文档不带后缀，中文使用 `_Zh`。拉丁字体采用 IBM Plex，中文 UI 使用自托管 Noto Sans SC。`web/assets/logos/` 保留官方 SVG 几何，并记录官方应用页面出处。

## 快照与覆盖

| 指标 | 数值 |
| --- | --- |
| 发行包文件／解包字节 | 8,967 / 312.30 MB |
| 已解析 JavaScript 文件 | 7,262 / 7,262 |
| 导入引用／动态导入 | 26,219 / 4,343 |
| 内核方法／归档字面量命中 | 191 / 184 |
| 云路径／原始基线 | 350 / 343 |
| 桌面 IPC 通道 | 22 |
| 命令键／语言包 | 192 / 64 |
| 归档截图／匹配的 recapture 回执 | 42 / 23 |

协议声明、包内字面量、静态调用点、界面截图和分析映射是独立的证据类型。字面量或调用表达式不证明执行；截图证明界面出现，不证明完整工作流；领域关联不自动构成依赖。

原始的 7,981 个渲染层资产与 8,967 个发行包文件采用不同统计范围。后者包括主进程文件、依赖、语言包与包元数据。导入解析区分精确文件、CommonJS 解析、文件名候选和外部包。计数不代表流量、热度或运行时内存。

## 仓库结构

| 路径 | 用途 |
| --- | --- |
| `web/` | React 页面、共享控件、图谱渲染、设计令牌与官方 Logo 资源 |
| `site/` | 生成的静态部署产物：九页 HTML 与本地资源 |
| `scripts/build-atlas.mjs` | 经校验的静态构建与截图镜像 |
| `scripts/build-research-model.mjs` | 对固定解包快照与固定 OSS 源码进行只读深化分析 |
| `evidence/static/atlas-model.json` | 统一节点、关系、源码片段、接口结构与洞察 |
| `evidence/static/*-model.json` | 保留作为基线输入的原始扫描 |
| `evidence/runtime/shots/` | 归档图片与现存 recapture 回执 |
| `tests/` | 模型、来源、布局与浏览器验证 |
| `vercel.json`, `.github/workflows/ci.yml` | Vercel 静态构建配置与 CI 验证 |

## 分析文档

- [功能图谱](docs/codex-desktop-feature-map_Zh.md)
- [结构性 GUI 地图](docs/codex-desktop-gui-map_Zh.md)
- [GUI 截图证据](docs/codex-desktop-gui-map-evidence_Zh.md)
- [截图方法与修正](docs/codex-desktop-runtime-evidence_Zh.md)
- [工作台架构](docs/workbench_Zh.md)
- [部署与 CI/CD](docs/deployment_Zh.md)

## 显式刷新研究

深化分析命令先校验归档应用版本与主包摘要，再进行扫描。它通过 Git 对象读取 OSS 提交，不切换源码 checkout；不执行发行包中的 JavaScript，也不修改已安装应用。

```bash
npm run research -- --snapshot /path/to/extracted-app --repo /path/to/codex --ref ddea03ad049142943bdbf13e937b1d67e8c1ba0c
npm run docs:build
npm run docs:check
npm run build
```

保留旧版结构扫描器用于复现原始扫描。普通构建不运行扫描器，也不抓取当前已升级的应用。换肤项目 `heige-codex-skin-studio` 不是构建依赖。

## 验证与限制

```bash
npm run typecheck
npm test
npm run docs:check
npm run build
npm run test:e2e
```

浏览器验证覆盖九页、EN/ZH、明暗主题与 1440／1024／768／390px 宽度，并验证代码复制、来源查看、图谱控件、全屏、右侧面板几何、URL 恢复、截图导航、子路径托管与无 JavaScript 阅读。测试使用构建站点的隔离副本，并在 `test-results/` 记录被测构建身份。

保留全部 42 张图片，但现有 recapture 回执只有 23 条设置结果。定时任务、拉取请求、安全与探索未被端到端走查，侧聊发送未被驱动。解包快照不含 sourcemap。动态运行时值、线上响应和二进制／源码等价性仍是独立研究缺口。
