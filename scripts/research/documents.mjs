import { pageMeta } from './content.mjs';

const SITE_NAME = 'Codex(ChatGPT) Desktop App DeepWiki';
const REPO_URL = 'https://github.com/lwyBZss8924d/chatgpt-desktop-reverse';
const cell = (value) => String(value ?? '—').replaceAll('|', '\\|').replaceAll('\n', ' ');
const table = (headers, rows) => [headers, headers.map(() => '---'), ...rows].map(row => `| ${row.map(cell).join(' | ')} |`).join('\n');
const bytes = n => `${(n / 1e6).toFixed(2)} MB`;

export function createDocuments(model, deployment = {}) {
  const files = new Map();
  for (const lang of ['en', 'zh']) {
    const zh = lang === 'zh';
    const L = (en, cn) => zh ? cn : en;
    const T = value => value[lang];
    const suffix = zh ? '_Zh' : '';
    const doc = name => `${name}${suffix}.md`;
    const f = n => n.toLocaleString('en-US');
    const counts = [
      [L('Package files / unpacked bytes', '发行包文件／解包字节'), `${f(model.bundle.stats.files)} / ${bytes(model.bundle.stats.bytes)}`],
      [L('JavaScript files parsed', '已解析 JavaScript 文件'), `${f(model.bundle.stats.parsed)} / ${f(model.bundle.stats.js)}`],
      [L('Import references / dynamic imports', '导入引用／动态导入'), `${f(model.bundle.stats.imports)} / ${f(model.bundle.stats.dynamicImports)}`],
      [L('Core methods / archived literal matches', '内核方法／归档字面量命中'), `${model.methods.length} / ${model.baseline.present}`],
      [L('Cloud paths / original baseline', '云路径／原始基线'), `${model.endpoints.length} / ${model.baseline.paths}`],
      [L('Desktop IPC channels', '桌面 IPC 通道'), model.ipc.length],
      [L('Command keys / locales', '命令键／语言包'), `${model.commands.length} / ${model.baseline.locales}`],
      [L('Archived captures / matching recapture receipts', '归档截图／匹配的 recapture 回执'), `${model.captures.length} / ${model.captures.filter(c => c.receipt).length}`],
    ];
    const identity = L(
      `App archive: **${model.provenance.appVersion}**. OSS reference: [\`${model.provenance.coreRevision}\`](https://github.com/openai/codex/tree/${model.provenance.coreRevision}). The app binary's exact equivalence to that OSS revision is **unverified**.`,
      `App 归档：**${model.provenance.appVersion}**。OSS 参考：[\`${model.provenance.coreRevision}\`](https://github.com/openai/codex/tree/${model.provenance.coreRevision})。应用二进制与该 OSS 提交的精确等价关系仍为**未验证**。`
    );
    const evidenceRule = L(
      'Protocol declarations, bundle literals, static call sites, captured UI and analytical mappings are independent evidence types. A literal or call expression does not prove execution. A screenshot proves appearance, not a complete workflow. Domain associations do not automatically establish dependencies.',
      '协议声明、包内字面量、静态调用点、界面截图和分析映射是独立的证据类型。字面量或调用表达式不证明执行；截图证明界面出现，不证明完整工作流；领域关联不自动构成依赖。'
    );
    const privacy = model.publication ? L('> Public edition: these are real captures with privacy mosaics. Original images and historical research remain in the local archive.', '> 公开版本：图片为带隐私马赛克的真实截图，原图与历史研究保留在本地归档。') : '';
    const generated = L(
      '> Generated from the committed research model. Update with `npm run docs:build`; verify with `npm run docs:check`.',
      '> 从已提交的研究模型生成。使用 `npm run docs:build` 更新，使用 `npm run docs:check` 校验。'
    );
    const pageTable = table([L('Page', '页面'), L('What to explore', '探索内容')], pageMeta.map(p => [`[${T(p.label)}](site/${p.id}.html)`, T(p.description)]));

    files.set(`README${suffix}.md`, `# ${SITE_NAME}

${L('An independent engineering analysis workbench for the macOS ChatGPT (Codex) desktop application. Follow a GUI surface through its domain, Electron bridge, Rust protocol or Cloud interface to the source evidence.', '面向 macOS ChatGPT（Codex）桌面应用的独立工程分析工作台。从 GUI 界面出发，经过领域、Electron 桥、Rust 协议或 Cloud 接口，追踪到源码证据。')}

[GitHub](${REPO_URL}) · [${L('Official app documentation', '官方应用文档')}](https://learn.chatgpt.com/docs/app) · [${L('中文', 'English')}](README${zh ? '' : '_Zh'}.md)${deployment.productionUrl ? ` · [DeepWiki](${deployment.productionUrl})` : ''}

${identity}

${privacy}

## ${L('Build and open', '构建与打开')}

${L('Use Node.js 24 and npm. A clean checkout builds from committed artifacts; it does not need the installed app, a temporary extraction, a Rust checkout, or API credentials.', '使用 Node.js 24 和 npm。干净 checkout 从已提交产物构建，不需要已安装应用、临时解包目录、Rust checkout 或 API 凭证。')}

\`\`\`bash
npm ci
npm run typecheck
npm test
npm run docs:check
npm run build
python3 -m http.server 8000 --directory site
# http://localhost:8000/
\`\`\`

${L('For React development with hot updates, run `npm run dev` (port 8000; override with `npm run dev -- --port 8001`). Interactive browsing uses HTTP. Pre-rendered text and diagrams remain readable without JavaScript.', '使用 `npm run dev` 进行支持热更新的 React 开发（默认端口 8000，可用 `npm run dev -- --port 8001` 修改）。交互浏览使用 HTTP；预渲染正文和图示在禁用 JavaScript 时仍可阅读。')}

## ${L('The nine-page workbench', '九页工作台')}

${pageTable}

${L('The workbench uses React, TypeScript and Vite, with React Flow 12 (`@xyflow/react`), deterministic ELK layouts and build-time Shiki highlighting. Graphs have pan/zoom, fit, 100% reading, minimaps, fullscreen and relationship highlighting. Code blocks copy on click and provide an explicit copy button. Search, filters and selected records have deep links.', '工作台采用 React、TypeScript 和 Vite，使用 React Flow 12（`@xyflow/react`）、确定性 ELK 布局及构建期 Shiki 高亮。图谱支持平移／缩放、适配、100% 阅读、小地图、全屏与关系高亮。代码块支持点击复制和显式复制按钮，搜索、筛选和选中记录支持深链接。')}

${L('English and Chinese share the same data. English documents have no suffix; Chinese documents use `_Zh`. Latin typography uses IBM Plex and Chinese UI uses self-hosted Noto Sans SC. Official SVG geometry is preserved in `web/assets/logos/`, with provenance from the official app page.', '中英文共享同一数据。英文文档不带后缀，中文使用 `_Zh`。拉丁字体采用 IBM Plex，中文 UI 使用自托管 Noto Sans SC。`web/assets/logos/` 保留官方 SVG 几何，并记录官方应用页面出处。')}

## ${L('Snapshot and coverage', '快照与覆盖')}

${table([L('Measure', '指标'), L('Value', '数值')], counts)}

${evidenceRule}

${L('The original 7,981 renderer assets and the 8,967-file package census use different scopes. The larger census includes main-process files, dependencies, locales and package metadata. Import resolution distinguishes exact files, CommonJS resolution, filename candidates and external packages. Counts are not traffic, popularity or runtime memory metrics.', '原始的 7,981 个渲染层资产与 8,967 个发行包文件采用不同统计范围。后者包括主进程文件、依赖、语言包与包元数据。导入解析区分精确文件、CommonJS 解析、文件名候选和外部包。计数不代表流量、热度或运行时内存。')}

## ${L('Repository map', '仓库结构')}

${table([L('Path', '路径'), L('Purpose', '用途')], [
 ['`web/`', L('React pages, shared controls, graph rendering, design tokens and official logo assets', 'React 页面、共享控件、图谱渲染、设计令牌与官方 Logo 资源')],
 ['`site/`', L('Generated static deployment artifact: nine HTML pages and local assets', '生成的静态部署产物：九页 HTML 与本地资源')],
 ['`scripts/build-atlas.mjs`', L('Validated static build and screenshot mirroring', '经校验的静态构建与截图镜像')],
 ['`scripts/build-research-model.mjs`', L('Read-only enrichment of a fixed extracted snapshot and pinned OSS source', '对固定解包快照与固定 OSS 源码进行只读深化分析')],
 ['`evidence/static/atlas-model.json`', L('Normalized nodes, relations, source excerpts, interface structures and findings', '统一节点、关系、源码片段、接口结构与洞察')],
 ['`evidence/static/*-model.json`', L('Original scans retained as baseline inputs', '保留作为基线输入的原始扫描')],
 ['`evidence/runtime/shots/`', L('Archived images and the available recapture receipt', '归档图片与现存 recapture 回执')],
 ['`tests/`', L('Model, source, layout and browser validation', '模型、来源、布局与浏览器验证')],
 ['`vercel.json`, `.github/workflows/ci.yml`', L('Vercel static-build configuration and CI validation', 'Vercel 静态构建配置与 CI 验证')],
 ])}

## ${L('Analysis documents', '分析文档')}

- [${L('Feature graph', '功能图谱')}](docs/${doc('codex-desktop-feature-map')})
- [${L('Structural GUI map', '结构性 GUI 地图')}](docs/${doc('codex-desktop-gui-map')})
- [${L('GUI capture evidence', 'GUI 截图证据')}](docs/${doc('codex-desktop-gui-map-evidence')})
- [${L('Capture method and corrections', '截图方法与修正')}](docs/${doc('codex-desktop-runtime-evidence')})
- [${L('Workbench architecture', '工作台架构')}](docs/${doc('workbench')})
- [${L('Deployment and CI/CD', '部署与 CI/CD')}](docs/${doc('deployment')})

## ${L('Refresh the research deliberately', '显式刷新研究')}

${L('The enrichment command validates the archived app version and main-bundle digest before scanning. It reads the OSS revision through Git objects, without switching the source checkout. It never runs shipped JavaScript or modifies the installed application.', '深化分析命令先校验归档应用版本与主包摘要，再进行扫描。它通过 Git 对象读取 OSS 提交，不切换源码 checkout；不执行发行包中的 JavaScript，也不修改已安装应用。')}

\`\`\`bash
npm run research -- --snapshot /path/to/extracted-app --repo /path/to/codex --ref ${model.provenance.coreRevision}
npm run docs:build
npm run docs:check
npm run build
\`\`\`

${L('The legacy structural scanners remain available for reproducing the original scans. Ordinary builds do not run them or recapture a newer installed app. The skin project `heige-codex-skin-studio` is not a build dependency.', '保留旧版结构扫描器用于复现原始扫描。普通构建不运行扫描器，也不抓取当前已升级的应用。换肤项目 `heige-codex-skin-studio` 不是构建依赖。')}

## ${L('Validation and limits', '验证与限制')}

\`\`\`bash
npm run typecheck
npm test
npm run docs:check
npm run build
npm run test:e2e
\`\`\`

${L('Browser validation covers nine pages, EN/ZH, light/dark and 1440/1024/768/390px widths, plus code copying, source inspection, graph controls, fullscreen, right-panel geometry, URL restoration, capture navigation, subpath hosting and no-JavaScript reading. It uses an isolated copy of the built site and records the tested build identity in `test-results/`.', '浏览器验证覆盖九页、EN/ZH、明暗主题与 1440／1024／768／390px 宽度，并验证代码复制、来源查看、图谱控件、全屏、右侧面板几何、URL 恢复、截图导航、子路径托管与无 JavaScript 阅读。测试使用构建站点的隔离副本，并在 `test-results/` 记录被测构建身份。')}

${L('The 42 images are retained, but the current recapture receipt has 23 settings results. Scheduled, Pull requests, Security and Explore were not walked end to end; side-chat sending was not exercised. There are no source maps in the extracted snapshot. Dynamic runtime values, live responses and binary-to-source equivalence remain separate research gaps.', '保留全部 42 张图片，但现有 recapture 回执只有 23 条设置结果。定时任务、拉取请求、安全与探索未被端到端走查，侧聊发送未被驱动。解包快照不含 sourcemap。动态运行时值、线上响应和二进制／源码等价性仍是独立研究缺口。')}
`);

    const features = [`# ${L('Codex Desktop — feature graph', 'Codex Desktop — 功能图谱')}`, generated, identity, evidenceRule, `## ${L('Coverage', '覆盖')}`, table([L('Measure','指标'),L('Value','数值')],counts), `## ${L('Bounded contexts', '限界上下文')}`, L('Contexts group related product ideas; each interface retains its own evidence and execution boundary.', '上下文将相关产品概念归组，每个接口仍保留独立证据与执行边界。')];
    features.push('```mermaid\nflowchart LR\n  app["Desktop App"]\n' + model.contexts.map((c,i)=>`  app -.-> c${i}["${T(c.label)}"]`).join('\n') + '\n```');
    for(const ctx of model.contexts){
      const caps=model.capabilities.filter(c=>ctx.capabilities.includes(c.id));const commands=model.commands.filter(c=>ctx.namespaces.includes(c.namespace));
      features.push(`### ${T(ctx.label)}`,T(ctx.summary),table([L('Capability','能力'),'Core', 'Cloud','IPC'],caps.map(c=>[`[${zh?c.zh:c.title}](../site/three-way.html#cap-${c.id})`,`${c.core.present}/${c.core.total}`,c.cloud.total,c.shell.total])),L(`Core cells show archived literal matches / protocol declarations. ${commands.length} command keys belong to this context.`, `Core 单元格表示归档字面量命中／协议声明。本上下文包含 ${commands.length} 个命令键。`),table([L('Command key','命令键'),L('Readable label','可读标签')],commands.map(c=>[`\`${c.key}\``,T(c.label)])));
    }
    features.push(`## ${L('Unassigned command keys','未归类命令键')}`,model.coverage.unmappedCommands.map(k=>`- \`${k}\``).join('\n'),L('Chinese labels come from native-menu locale JSON. In this snapshot English labels are readable expansions of the keys because an English native-menu locale file was not present. They are not claimed as captured English UI text.', '中文标签来自原生菜单语言 JSON。本快照没有英文原生菜单语言文件，因此英文标签是命令键的可读展开，不作为已截取的英文 UI 文案。'),`## ${L('Core interface index','内核接口索引')}`,table([L('Method','方法'),L('Direction','方向'),L('Bundle literal','包内字面量'),L('Input type','输入类型')],model.methods.map(m=>{const src=model.sources.find(s=>s.id===m.sourceIds[0]);return [`[\`${m.method}\`](${src.href})`,m.direction,m.presentInApp?L('Found','已发现'):L('Not found','未发现'),`\`${m.params??'—'}\``];})),`[${L('GUI evidence','GUI 证据')}](${doc('codex-desktop-gui-map-evidence')}) · [DeepWiki](../site/features.html)`);
    files.set(`docs/${doc('codex-desktop-feature-map')}`, features.join('\n\n')+'\n');

    const zones=[...Map.groupBy(model.bundle.modules,m=>m.zone)].map(([zone,list])=>[zone,list.length,bytes(list.reduce((n,m)=>n+m.bytes,0)),list.filter(m=>m.parsed===true).length]);
    const groups=[['Windows / shell','窗口／壳层',['window','preload','bootstrap']],['Conversation hosts','会话承载',['local-conversation','remote-conversation','chatgpt-conversation']],['Composer','输入区',['composer']],['Panels / review','面板／审阅',['side-panel','review','terminal']],['Settings','设置',['settings']],['Plugins / integrations','插件／集成',['plugin','mcp','connection']],['Hosted work','托管工作',['automation','cloud','workspace-agent']]];
    const gui=[`# ${L('Codex Desktop — structural GUI map','Codex Desktop — 结构性 GUI 地图')}`,generated,identity,evidenceRule,`## ${L('Physical package boundaries','发行包物理边界')}`,table([L('Zone','区域'),L('Files','文件'),L('Bytes','字节'),L('Parsed JS','已解析 JS')],zones),`## ${L('Structural module candidates','结构性模块候选')}`,L('These groups are filename-based discovery routes. A module name is not proof of a route, DOM selector, live window or enabled feature. Open the file explorer to inspect imports and excerpts.', '这些分组是基于文件名的发现入口。模块名不证明路由、DOM 选择器、实时窗口或功能启用。请在文件探索器中查看导入与片段。')];
    for(const [en,cn,needles] of groups){const matches=model.bundle.modules.filter(m=>m.zone==='renderer'&&needles.some(n=>m.path.includes(n)));gui.push(`### ${L(en,cn)}`,L(`${matches.length} matching files. Representative paths:`,`${matches.length} 个匹配文件。代表性路径：`),matches.slice(0,12).map(m=>`- [\`${m.path}\`](../site/bundle.html#${encodeURIComponent(m.id)})`).join('\n'));}
    gui.push(`## ${L('Window tokens','窗口令牌')}`,table([L('Token','令牌'),L('Occurrences','出现次数'),L('Runtime correspondence','运行时对应')],model.windows.map(w=>[`\`${w.token}\``,w.hits,L('Unverified by token','未按令牌验证')])),`## ${L('Network declarations','网络声明')}`,L('The following values are declared in renderer CSP. Permission is distinct from actual traffic.', '下列值声明于渲染层 CSP。许可与实际流量是不同事实。'),table([L('Directive','指令'),L('Values','值')],[...new Set(model.bundle.csp.map(c=>c.directive))].map(d=>[d,[...new Set(model.bundle.csp.filter(c=>c.directive===d).flatMap(c=>c.values))].map(v=>`\`${v}\``).join(' · ')])),`## ${L('Interpretation boundaries','解读边界')}`,L('Selectors copied from a separate skin project are not part of this model. The workbench does not inject into the app. Static findings are connected to archived captures only through explicit analytical mappings.', '来自独立换肤项目的选择器不属于此模型。工作台不会向应用注入代码。静态发现仅通过显式分析映射关联到归档截图。'),`[${L('Captured GUI','截图 GUI')}](${doc('codex-desktop-gui-map-evidence')}) · [DeepWiki](../site/gui-map.html)`);
    files.set(`docs/${doc('codex-desktop-gui-map')}`,gui.join('\n\n')+'\n');

    const captures=[`# ${L('Codex Desktop — GUI capture evidence','Codex Desktop — GUI 截图证据')}`,generated,privacy,identity,L('This inventory uses the 42 JPG files served by the current workbench. Earlier PNG sets remain historical evidence and are not substituted for the current frames.', '本目录使用当前工作台提供的 42 个 JPG 文件。早期 PNG 集保留为历史证据，不替代当前画面。'),L('The available `recapture-results.json` contains 23 settings results. The other 19 images remain archived frames with no matching entry in that receipt. We do not reconstruct missing receipts from filenames.', '现有 `recapture-results.json` 包含 23 条设置结果。其余 19 张图片保留为归档画面，在该回执中没有匹配条目；不会从文件名补造缺失回执。')];
    for(const [group,list] of Map.groupBy(model.captures,c=>c.group)){captures.push(`## ${group}`,table([L('Capture','截图'),L('Entry path','进入路径'),L('Scope','作用域'),L('Receipt','回执')],list.map(c=>[`[${T(c.label)}](../evidence/runtime/shots/${c.name}.jpg)`,T(c.how),T(c.scope),c.receipt?L('Matching result','匹配结果'):L('Archived frame','归档画面')])),L('Capability associations for this group:', '该组的能力关联：'),list.map(c=>`- **${T(c.label)}** → ${c.capabilities.map(id=>`[\`${id}\`](../site/three-way.html#cap-${id})`).join(', ')||'—'}`).join('\n'));}
    captures.push(`## ${L('Annotations','标注')}`,L('The conversation-workspace image has normalized, manually inspected region annotations for navigation, conversation area and Review. They identify visible regions and link analytical records; they do not replay a live application or assert a one-to-one implementation mapping.', '会话工作区图片具有经过人工查看的归一化区域标注，覆盖导航、会话区域和 Review。标注定位可见区域并链接分析记录，不回放实时应用，也不声明一对一实现映射。'),`## ${L('Known limits','已知限制')}`,L('Scheduled, Pull requests, Security and Explore were captured without an end-to-end internal walkthrough. The terminal and browser surfaces were not used to execute a command or load a URL. Side-chat sending was not exercised. A captured frame and a window token remain independent records.', '定时任务、拉取请求、安全与探索已有截图，但未进行内部端到端走查。终端与浏览器界面未用于执行命令或加载 URL。侧聊发送未被驱动。截图与窗口令牌仍是独立记录。'),`[${L('Capture method','截图方法')}](${doc('codex-desktop-runtime-evidence')}) · [DeepWiki](../site/gui-map.html)`);
    files.set(`docs/${doc('codex-desktop-gui-map-evidence')}`,captures.join('\n\n')+'\n');

    files.set(`docs/${doc('codex-desktop-runtime-evidence')}`,`# ${L('Runtime evidence — collection method and corrections','运行时证据 — 采集方法与修正')}

${generated}

${privacy}

${identity}

## ${L('What the stored evidence contains','已保存证据的内容')}

${L('There are 42 archived JPG images: 19 application surfaces and 23 settings sections. The current receipt contains only the 23 settings results, with `ok` and coverage fields. It does not contain per-frame before/after hashes. The workbench computes and validates image digests for integrity, which is separate from proving the original interaction.', '共有 42 张归档 JPG 图片：19 张应用界面与 23 张设置分区。当前回执只有 23 条设置结果，包含 `ok` 与覆盖字段，不包含逐帧前后哈希。工作台计算并校验图片摘要以验证完整性，这与证明原始交互是不同事项。')}

${L('The recorded application was `/Applications/ChatGPT.app`, bundle ID `com.openai.codex`, process name `ChatGPT`. Old window IDs, accessibility refs and coordinates are observations from those captures, not reusable control addresses.', '记录中的应用为 `/Applications/ChatGPT.app`，bundle ID 为 `com.openai.codex`，进程名为 `ChatGPT`。旧窗口 ID、无障碍 ref 与坐标是当时的观测，不是可复用的控制地址。')}

## ${L('Driver behavior','驱动行为')}

${L('The archived driver `evidence/runtime/recapture.mjs` observes the window, addresses a control, captures before/after frames and rejects a byte-identical result. It writes a receipt for the selected steps of that invocation. A driver supporting all surfaces does not mean its latest receipt contains all surfaces.', '归档驱动 `evidence/runtime/recapture.mjs` 先观测窗口、寻址控件，截取前后画面，并拒绝逐字节相同的结果。它为本次调用选定的步骤写入回执。驱动支持全部界面，不代表最新回执包含全部界面。')}

${L('The earlier `sweep*.mjs` files and legacy capture sets are retained as history. They are not run by `npm run build`, CI or Vercel. Recollection needs a deliberately versioned archive and fresh observation of the actual installed build.', '更早的 `sweep*.mjs` 与旧截图集保留为历史。`npm run build`、CI 和 Vercel 不运行这些驱动。重新采集需要显式的版本化归档，并重新观测实际安装构建。')}

## ${L('Corrections worth preserving','应保留的修正')}

${table([L('Failure','失败'),L('Correction','修正')],[
 [L('An unchanged screenshot was counted as success','把未变化截图计为成功'),L('Capture return alone is insufficient; compare the before/after frames.','仅截图调用返回不足以证明成功，应比较操作前后画面。')],
 [L('Shortcuts were guessed','猜测快捷键'),L('Read the bindings advertised by the UI.','读取 UI 自己公布的绑定。')],
 [L('Panels were opened outside a thread','在会话外打开面板'),L('Respect the conversation scope and observe the mounted surface.','遵守会话作用域并观测实际挂载界面。')],
 [L('Keystrokes had no target','按键没有目标'),L('Address input against a fresh observation.','依据新观测寻址输入。')],
 [L('Image coordinates were treated as screen points','将图像坐标视为屏幕点'),L('AX rectangles belong to the associated capture coordinate system.','AX 矩形属于关联截图的坐标系。')],
 ])}

${table([L('Panel','面板'),L('Recorded binding','记录的绑定')],[['Review','`⌃⇧G`'],['Terminal','`` ⌃\u0060 ``'],['Browser','`⌘T`'],['Files','`⌘P`']])}

${L('Quick chat was recorded with `⌥⌘N` and the palette with `⌘K`. These describe the archived observation, not a current-build guarantee.', '快速聊天记录为 `⌥⌘N`，命令面板记录为 `⌘K`。这些描述归档观测，不保证当前构建仍采用相同绑定。')}

## ${L('Evidence boundaries','证据边界')}

${evidenceRule}

[${L('Complete capture inventory','完整截图目录')}](${doc('codex-desktop-gui-map-evidence')}) · [${L('Method in the workbench','工作台中的方法') }](../site/method.html)
`);

    files.set(`docs/${doc('workbench')}`,`# ${SITE_NAME} — ${L('workbench architecture','工作台架构')}

${generated}

## ${L('Build contract','构建契约')}

${L('`scripts/build-atlas.mjs` validates the committed model and original input digests, builds the React client and server renderer, pre-renders nine HTML pages, prepares Shiki snippets, copies local fonts/logos/captures and writes a build manifest. The installed app and OSS checkout are only inputs to the separate research command.', '`scripts/build-atlas.mjs` 校验已提交模型与原始输入摘要，构建 React 客户端和服务端渲染器，预渲染九页 HTML，生成 Shiki 片段，复制本地字体／Logo／截图，并写入构建清单。已安装应用与 OSS checkout 仅作为独立研究命令的输入。')}

${table([L('Interface','接口'),L('Meaning','含义')],[['`SourceRef`',L('File, revision/digest, locator, excerpt and source kind','文件、提交／摘要、定位、片段与来源类型')],['`AtlasNode` / `AtlasRelation`',L('Stable entities and explicit relationships with inference markers','稳定实体与带推断标记的显式关系')],['`Finding`',L('Bilingual finding, supporting sources and interpretation limits','双语洞察、支撑来源与解读边界')],['`Scenario`',L('Ordered explanatory steps and their source records','有序解读步骤及来源记录')],['`PageData`',L('Static initial data plus locally loaded evidence/file indexes','静态初始数据与本地按需加载的证据／文件索引')]])}

## ${L('Interaction contract','交互契约')}

- ${L('Desktop graphs use React Flow 12. Static diagrams provide pre-rendered and no-JavaScript reading; narrow screens begin with a navigable list.','桌面图谱使用 React Flow 12，静态图支持预渲染与无 JavaScript 阅读，窄屏默认采用可导航列表。')}
- ${L('Graph controls expose zoom, fit, 100% reading, minimap and fullscreen. Fullscreen and panel resizing trigger viewport fitting.','图谱提供缩放、适配、100% 阅读、小地图和全屏，切换全屏及面板尺寸后重新适配视口。')}
- ${L('Core, Cloud and Shell have semantic colors for nodes and edges in both themes. Dashed analytical relations remain distinct from declared direction/imports.','明暗主题中的节点与连线均采用 Core、Cloud、Shell 语义色，虚线分析关系与声明方向／导入保持区分。')}
- ${L('Every code block has syntax highlighting and a copy button; clicking code copies its displayed excerpt. Selection and source-link clicks are excluded. Clipboard failure is visible.','代码块具有语法高亮与复制按钮，点击代码复制当前展示的片段，文字选择与来源链接点击除外；剪贴板失败会明确提示。')}
- ${L('The URL stores search, filters, graph scope and selected records. Existing `#cap-*` anchors remain supported.','URL 保存搜索、筛选、图谱范围及选中记录，并继续支持旧 `#cap-*` 锚点。')}
- ${L('Source excerpts and the full file index load from local static files. Ordinary browsing makes no external service calls.','源码片段与完整文件索引从本地静态文件加载，普通浏览不调用外部服务。')}

## ${L('Typography and branding','字体与品牌资源')}

${L('IBM Plex serves Latin editorial, UI and code roles; self-hosted Noto Sans SC provides consistent Chinese headings and controls. The official ChatGPT header mark and Codex CLI surface icon were extracted from the official app page, with their geometry unchanged. The favicon uses the ChatGPT mark with a theme-aware color treatment. Resource provenance is in `web/assets/logos/provenance.json`.', 'IBM Plex 分别承担拉丁标题、UI 与代码角色；自托管 Noto Sans SC 统一中文标题与控件。官方 ChatGPT 顶栏标识及 Codex CLI 界面图标提取自官方应用页面，几何保持不变。favicon 使用 ChatGPT 标识并适配主题颜色。资源溯源见 `web/assets/logos/provenance.json`。')}

## ${L('Validation','验证')}

${L('Model tests verify source digests, complete inventories, reference integrity, syntax extraction, import resolution and deterministic layouts. Browser tests cover the full locale/theme/viewport matrix and interactive paths. In particular, edge SVGs must have nonzero viewports: a global SVG max-width rule must never collapse XYFlow\'s overflowing edge layer.', '模型测试校验来源摘要、完整目录、引用完整性、语法提取、导入解析及确定性布局。浏览器测试覆盖完整语言／主题／视口矩阵与交互路径，特别要求连线 SVG 具有非零视口，防止全局 SVG 限宽规则压缩 XYFlow 的溢出连线图层。')}

[${L('Deployment','部署')}](${doc('deployment')}) · [${L('Main README','主 README')}](../README${suffix}.md)
`);

    files.set(`docs/${doc('deployment')}`,`# ${L('Deployment and CI/CD','部署与 CI/CD')}

${generated}

${table([L('Setting','设置'),L('Value','值')],[['GitHub',REPO_URL],['Vercel scope','`<VERCEL_SCOPE>`'],[L('Project','项目'),deployment.project??L('To be linked during initialization','初始化时关联')],[L('Production URL','生产 URL'),deployment.productionUrl??L('Not deployed yet','尚未部署')],[L('Production branch','生产分支'),'main'],[L('Install','安装'),'`npm ci --ignore-scripts`'],[L('Build','构建'),'`'+(deployment.buildCommand??'npm run ci')+'`'],[L('Output','输出'),'`site/`'],['Node.js','24']])}

## ${L('Delivery flow','交付流程')}

${L('Push changes to a feature branch and open a pull request against main. GitHub CI validates types, research inputs, the static build, document links and browser behavior. Vercel Git integration builds a branch preview. Merge after both checks pass; the main commit automatically triggers production delivery to the URL above. The deployment build generates pages before validating their document links, so it works without a prebuilt site directory.', '将变更推送到功能分支并创建面向 main 的 PR。GitHub CI 校验类型、研究输入、静态构建、文档链接和浏览器行为，Vercel Git 集成生成分支预览。两项检查通过后合并，main 提交会自动触发上述地址的生产部署。部署构建先生成页面再验证文档链接，因此不依赖预先生成的 site 目录。')}

${L('The local research archive preserves original screenshots and prior research commits. The public repository contains the current source, normalized evidence and real screenshots with privacy mosaics. Keep these Git histories separate: update public code through its own clone and pull requests. For a new research snapshot, run the export command below from the local research checkout, review the publication diff, then build and test it before pushing. Do not push the archive history into the public remote.', '本地研究归档保留原始截图和历史研究提交，公开仓库存放当前源码、规范化证据和带隐私马赛克的真实截图。两份 Git 历史分别维护：公开代码通过自身克隆与 PR 更新。更新研究快照时，在本地研究工作区运行下方导出命令，走查发布副本的差异，构建与测试后再推送。不要将归档历史推送到公开远端。')}

\`\`\`bash
# Run only when exporting a new snapshot from the local research archive.
node scripts/export-public.mjs --out /path/to/publication-checkout
\`\`\`

${L('The output preserves `.html` routes, relative local assets, subpath hosting and direct refresh. There is no application backend or required runtime secret. A Vercel project link and Git connection are deployment configuration; they do not alter the archived research snapshot.', '产物保留 `.html` 路由、相对本地资源、子路径托管与直接刷新能力，没有应用后端或必需的运行时密钥。Vercel 项目关联与 Git 连接属于部署配置，不改变归档研究快照。')}

## ${L('Verify the target before deployment','部署前核对目标')}

\`\`\`bash
vercel project inspect --non-interactive
vercel --help
\`\`\`

${L('Run from the repository root and verify the owner/project. A missing link requires deliberate initialization of the intended project. Do not substitute another existing project. The local `.vercel/` directory is not committed.', '从仓库根目录运行并核对 owner／project。缺少关联时，应显式初始化预期项目，不替换为其他已有项目。本地 `.vercel/` 目录不提交。')}

## ${L('Checks and release evidence','检查与发布证据')}

${L('The workflow stores browser verification and the built static site as CI artifacts. Release closeout records the exact Git commit, CI result, Vercel deployment and final URL in PoUW. Never describe a queued build or a failed deployment as a successful release.', '工作流将浏览器验证结果与静态站点保存为 CI 产物。发布收尾在 PoUW 中记录精确 Git 提交、CI 结果、Vercel 部署与最终 URL；不把排队中构建或失败部署描述为成功发布。')}

${L('Reference implementation:', '参考实现：')} [codex-plugins-market-audit](https://github.com/lwyBZss8924d/codex-plugins-market-data) · [${L('Published report','已发布报告')}](https://codex-chatgpt-plugins-index.vercel.app/report.html)
`);

    files.set(`evidence/static/README${suffix}.md`,`# ${L('Static research evidence','静态研究证据')}

${generated}

${privacy}

${identity}

${table([L('Artifact','产物'),L('Role','作用')],[['`scan-model.json`',L('Original command/asset/window census','原始命令／资产／窗口统计')],['`rust-core-model.json`',L('Original OSS protocol scan','原始 OSS 协议扫描')],['`three-way-model.json`',L('Original interface-to-capability grouping','原始接口与能力分组')],['`atlas-model.json`',L('Current normalized evidence, interfaces, imports, findings and GUI associations','当前统一证据、接口、导入、洞察与 GUI 关联')],['`licenses/`',L('License of the referenced OSS source','所引用 OSS 源码的许可')],['`legacy-shots/`, `legacy-screenshots/`',L('Historical captures, not current receipt-backed replacements','历史截图，不作为当前有回执的替代品')],['`ax-outlines/`',L('Historical accessibility observations; refs are not live addresses','历史无障碍观测，ref 不是实时地址')]])}

${evidenceRule}

${L('Refresh the normalized model with `npm run research`, only against the matching archived extraction and pinned Git revision. Ordinary site builds read committed artifacts. Original scans retain their historical field names, including `presentInApp` / `unused`; current UI interprets these as literal-presence evidence, not runtime use.', '仅针对匹配的归档解包与固定 Git 提交，使用 `npm run research` 刷新统一模型。普通站点构建读取已提交产物。原始扫描保留 `presentInApp`／`unused` 等历史字段名，当前 UI 将其解读为字面量存在证据，不作为运行时使用证明。')}

[${L('Main README','主 README')}](../../README${suffix}.md) · [${L('Runtime evidence','运行时证据')}](../runtime/README${suffix}.md)
`);

    files.set(`evidence/runtime/README${suffix}.md`,`# ${L('Archived runtime evidence','归档运行时证据')}

${generated}

${L('The current site mirrors 42 JPG images from `shots/`: 19 application frames and 23 settings frames. `shots/recapture-results.json` contains 23 settings results. Image integrity and interaction success remain separate checks.', '当前站点从 `shots/` 镜像 42 张 JPG：19 张应用画面与 23 张设置画面。`shots/recapture-results.json` 包含 23 条设置结果。图片完整性与交互成功属于不同检查。')}

${table([L('Path','路径'),L('Purpose','用途')],[['`shots/`, `shots/settings/`',L('Archived frames used by the workbench','工作台使用的归档画面')],['`recapture.mjs`',L('Historical change-detecting capture driver','历史变化检测截图驱动')],['`sweep*.mjs`',L('Earlier capture drivers retained for methodology','保留用于方法溯源的早期截图驱动')],['`lib/bridge.mjs`',L('Client for the macOS accessibility capture bridge','macOS 无障碍截图桥客户端')],['`.tmp/`, `.derived/`',L('Ignored scratch output','忽略的临时输出')]])}

${L('A new capture run requires fresh window observation, valid macOS permissions and an explicitly versioned archive. Stored refs/coordinates must not be replayed as live addresses. The current site build, CI and deployment do not invoke these drivers or modify the installed app.', '新的截图运行需要新窗口观测、有效的 macOS 权限与显式版本化归档。已保存的 ref／坐标不能作为实时地址回放。当前站点构建、CI 与部署不调用这些驱动，也不修改已安装应用。')}

[${L('Capture method and corrections','截图方法与修正')}](../../docs/${doc('codex-desktop-runtime-evidence')}) · [${L('Complete GUI evidence','完整 GUI 证据')}](../../docs/${doc('codex-desktop-gui-map-evidence')})
`);
  }
  return files;
}
