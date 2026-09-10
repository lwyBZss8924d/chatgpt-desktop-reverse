# Codex(ChatGPT) Desktop App DeepWiki — 工作台架构

> 从已提交的研究模型生成。使用 `npm run docs:build` 更新，使用 `npm run docs:check` 校验。

## 构建契约

`scripts/build-atlas.mjs` 校验已提交模型与原始输入摘要，构建 React 客户端和服务端渲染器，预渲染九页 HTML，生成 Shiki 片段，复制本地字体／Logo／截图，并写入构建清单。已安装应用与 OSS checkout 仅作为独立研究命令的输入。

| 接口 | 含义 |
| --- | --- |
| `SourceRef` | 文件、提交／摘要、定位、片段与来源类型 |
| `AtlasNode` / `AtlasRelation` | 稳定实体与带推断标记的显式关系 |
| `Finding` | 双语洞察、支撑来源与解读边界 |
| `Scenario` | 有序解读步骤及来源记录 |
| `PageData` | 静态初始数据与本地按需加载的证据／文件索引 |

## 交互契约

- 桌面图谱使用 React Flow 12，静态图支持预渲染与无 JavaScript 阅读，窄屏默认采用可导航列表。
- 图谱提供缩放、适配、100% 阅读、小地图和全屏，切换全屏及面板尺寸后重新适配视口。
- 明暗主题中的节点与连线均采用 Core、Cloud、Shell 语义色，虚线分析关系与声明方向／导入保持区分。
- 代码块具有语法高亮与复制按钮，点击代码复制当前展示的片段，文字选择与来源链接点击除外；剪贴板失败会明确提示。
- URL 保存搜索、筛选、图谱范围及选中记录，并继续支持旧 `#cap-*` 锚点。
- 源码片段与完整文件索引从本地静态文件加载，普通浏览不调用外部服务。

## 字体与品牌资源

IBM Plex 分别承担拉丁标题、UI 与代码角色；自托管 Noto Sans SC 统一中文标题与控件。官方 ChatGPT 顶栏标识及 Codex CLI 界面图标提取自官方应用页面，几何保持不变。favicon 使用 ChatGPT 标识并适配主题颜色。资源溯源见 `web/assets/logos/provenance.json`。

## 验证

模型测试校验来源摘要、完整目录、引用完整性、语法提取、导入解析及确定性布局。浏览器测试覆盖完整语言／主题／视口矩阵与交互路径，特别要求连线 SVG 具有非零视口，防止全局 SVG 限宽规则压缩 XYFlow 的溢出连线图层。

[部署](deployment_Zh.md) · [主 README](../README_Zh.md)
