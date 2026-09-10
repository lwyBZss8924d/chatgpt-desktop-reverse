export const text = (en, zh) => ({ en, zh });

export const contexts = [
  {
    id: 'conversation',
    label: text('Conversations', '对话与会话'),
    summary: text(
      'A thread is the durable unit; turns and items describe work within it. Local and hosted conversations have different execution paths.',
      '会话是持久单元，轮次和条目描述其中的工作。本地与托管对话具有不同执行路径。'
    ),
    namespaces: ['codex', 'thread', 'threadHeader'],
    capabilities: ['thread-lifecycle', 'memory'],
    shots: ['19-thread-open', '01-sidebar-home'],
  },
  {
    id: 'workspace',
    label: text('Workspace', '工作区'),
    summary: text(
      'Review, terminal, files, browser and side chat live alongside an active conversation. A panel is a UI surface, not an executor.',
      '审阅、终端、文件、浏览器和侧聊位于活动会话旁侧。面板是界面，并不等同于执行方。'
    ),
    namespaces: ['review', 'browserSidebar'],
    capabilities: ['approval', 'exec', 'fs', 'browser'],
    shots: [
      '20-panel-review',
      '21-panel-terminal',
      '22-panel-browser',
      '23-panel-files',
      '24-panel-sidechat',
    ],
  },
  {
    id: 'desktop',
    label: text('Desktop integration', '桌面集成'),
    summary: text(
      'Window orchestration and native bridges connect the web-rendered interface to the operating system and subprocesses.',
      '窗口编排与原生桥将 Web 界面连接到操作系统和子进程。'
    ),
    namespaces: ['electron', 'windowsMenuBar', 'appHeader'],
    capabilities: ['shell-ui', 'transport', 'sandbox-windows'],
    shots: ['07-command-palette', '09-palette-panels', '11-quick-chat'],
  },
  {
    id: 'hosted',
    label: text('Hosted work', '托管工作'),
    summary: text(
      'Tasks, agents and schedules have cloud-facing interfaces in the bundle. A captured destination does not prove its full workflow was exercised.',
      '发行包包含面向云端的任务、Agent 和计划接口。已截取目的地并不表示完整工作流已被验证。'
    ),
    namespaces: ['desktop', 'sidebarElectron', 'sidebarHelp'],
    capabilities: ['cloud-tasks', 'agents', 'automation'],
    shots: ['02-scheduled', '03-pull-requests', '05-security', '06-explore'],
  },
  {
    id: 'configuration',
    label: text('Configuration & identity', '配置与身份'),
    summary: text(
      'Settings combines protocol configuration, account services and OS permissions. Trace each setting to its own boundary.',
      '设置将协议配置、账号服务与系统权限汇聚在一起，每一项仍有自己的实现边界。'
    ),
    namespaces: ['settings', 'plugins'],
    capabilities: ['config', 'account', 'extensions', 'trust', 'growth', 'telemetry'],
    shots: ['25-settings-open', '26-settings-search', '04-plugins'],
  },
];

export const capabilityNotes = {
  'thread-lifecycle': text(
    'The protocol defines thread, turn and item operations. Conversation service paths are grouped alongside them as an analytical comparison, not proof that local threads depend on those paths.',
    '协议定义会话、轮次和条目操作。conversation 服务路径在分析中与其并列，不构成本地会话依赖这些路径的证据。'
  ),
  approval: text(
    'Core-to-client requests include approvals, user input and attestation. The direction identifies the party expected to answer; it does not establish which UI was displayed.',
    '内核到客户端的请求包括审批、用户输入和证明。方向标识应答方，不证明展示过哪种 UI。'
  ),
  exec: text(
    'Command and process operations are declared by the core. Platform-specific or absent bundle literals remain visible in the inventory.',
    '内核声明命令与进程操作。平台专属方法及未命中包内字面量的方法仍保留在目录中。'
  ),
  fs: text(
    'Core filesystem operations, cloud file services and the desktop file picker address different parts of file handling.',
    '内核文件操作、云端文件服务与桌面文件选择器分别覆盖文件处理的不同部分。'
  ),
  extensions: text(
    'Skills, plugins, MCP and connectors span multiple interfaces. Their shared purpose is a domain grouping, not a single execution chain.',
    'Skills、插件、MCP 和连接器跨越多个接口。共同用途构成领域分组，不代表单一执行链。'
  ),
  account: text(
    'The core has account and authentication methods; the bundle also contains hosted identity, workspace and billing services.',
    '内核具有账号与认证方法，发行包还包含托管身份、工作区和计费服务。'
  ),
  'cloud-tasks': text(
    'The wham service contains hosted task and environment interfaces. A protocol counterpart and cloud path may express different stages or alternatives.',
    'wham 服务包含托管任务与环境接口。协议方法与云路径可能表达不同阶段或替代实现。'
  ),
  browser: text(
    'Browser-related IPC and service paths coexist. Browser automation is also represented by core configuration; no claim of universal core absence is made.',
    '浏览器相关 IPC 与服务路径并存。内核配置也涉及浏览器自动化，不能据此断言内核完全不提供浏览器能力。'
  ),
  'shell-ui': text(
    'Window and application integration channels expose Electron responsibilities. Web-rendered controls and native menus remain distinct surfaces.',
    '窗口与应用集成通道体现 Electron 的职责。Web 控件与原生菜单仍是不同界面。'
  ),
  config: text(
    'Local protocol configuration, hosted settings and desktop build identity are separate sources of configuration.',
    '本地协议配置、托管设置和桌面构建身份是不同的配置来源。'
  ),
  telemetry: text(
    'Protocol feedback, cloud experiment configuration and desktop reporting are grouped by purpose; their traffic is not a single pipeline.',
    '协议反馈、云端实验配置和桌面报告按用途归组，其流量并非单一管道。'
  ),
  transport: text(
    'Chunked messages, acknowledgements and worker-prefixed channels are transport mechanisms underlying product capabilities.',
    '消息分块、确认和 worker 前缀通道是支撑产品能力的传输机制。'
  ),
  'sandbox-windows': text(
    'The reference protocol includes Windows sandbox and remote-control methods. Their declaration is not evidence of a corresponding macOS control.',
    '参考协议包含 Windows 沙箱与远程控制方法。协议声明不证明 macOS 存在对应控件。'
  ),
  memory: text(
    'Hosted memory and personalization paths are indexed here. This grouping does not imply the Rust core has no internal memory-related implementation.',
    '此处索引托管记忆与个性化路径。该分组不表示 Rust 内核内部没有记忆相关实现。'
  ),
  agents: text(
    'Hosted agent and widget service paths are distinct from local subagent execution; the index records the observed interfaces.',
    '托管 Agent 与小组件服务路径有别于本地子 Agent 执行，此目录记录已发现的接口。'
  ),
  automation: text(
    'Scheduling service paths and the Scheduled capture are associated by the analysis. No end-to-end scheduling execution was captured in this snapshot.',
    '分析将定时服务路径与 Scheduled 截图关联。本快照没有定时任务端到端执行证据。'
  ),
  trust: text(
    'Cloud attestation paths are related to the core attestation request. Signing, relay and device ownership require their own call-site evidence.',
    '云端证明路径与内核证明请求有关联。签名、转发和设备所有权分别需要调用点证据。'
  ),
  growth: text(
    'Pet, promotion and referral paths share hosted service backing. A path in a shared bundle is not proof that a feature is enabled.',
    '宠物、推广与推荐路径具有托管服务归属。共享包中的路径不证明功能已启用。'
  ),
};

export const surfaceGroups = [
  {
    id: 'navigation',
    label: text('Sidebar destinations', '侧栏目的地'),
    names: [
      '01-sidebar-home',
      '02-scheduled',
      '03-pull-requests',
      '04-plugins',
      '05-security',
      '06-explore',
    ],
  },
  {
    id: 'palette',
    label: text('Command palette', '命令面板'),
    names: ['07-command-palette', '08-palette-chats', '09-palette-panels', '10-palette-settings'],
  },
  {
    id: 'workspace',
    label: text('Conversation & panels', '会话与面板'),
    names: [
      '19-thread-open',
      '20-panel-review',
      '21-panel-terminal',
      '22-panel-browser',
      '23-panel-files',
      '24-panel-sidechat',
    ],
  },
  { id: 'overlay', label: text('Separate windows', '独立窗口'), names: ['11-quick-chat'] },
  {
    id: 'settings',
    label: text('Settings', '设置'),
    names: ['25-settings-open', '26-settings-search'],
  },
];

export const surfaces = {
  '01-sidebar-home': [
    'New chat',
    '新聊天',
    'Sidebar → New chat',
    '侧栏 → 新聊天',
    ['thread-lifecycle'],
  ],
  '02-scheduled': [
    'Scheduled',
    '定时任务',
    'Sidebar → Scheduled',
    '侧栏 → 定时任务',
    ['automation'],
  ],
  '03-pull-requests': [
    'Pull requests',
    '拉取请求',
    'Sidebar → Pull requests',
    '侧栏 → 拉取请求',
    ['cloud-tasks'],
  ],
  '04-plugins': ['Plugins', '插件', 'Sidebar → Plugins', '侧栏 → 插件', ['extensions']],
  '05-security': ['Security', '安全', 'Sidebar → Security', '侧栏 → 安全', ['cloud-tasks']],
  '06-explore': ['Explore', '探索', 'Sidebar → Explore', '侧栏 → 探索', ['agents']],
  '07-command-palette': ['Command palette', '命令面板', '⌘K', '⌘K', ['shell-ui']],
  '08-palette-chats': [
    'Find conversations',
    '查找会话',
    '⌘K → chats',
    '⌘K → 会话',
    ['thread-lifecycle'],
  ],
  '09-palette-panels': ['Find panels', '查找面板', '⌘K → panels', '⌘K → 面板', ['shell-ui']],
  '10-palette-settings': ['Find settings', '查找设置', '⌘K → settings', '⌘K → 设置', ['config']],
  '11-quick-chat': ['Quick chat', '快速聊天', '⌥⌘N', '⌥⌘N', ['shell-ui', 'thread-lifecycle']],
  '19-thread-open': [
    'Active conversation',
    '活动会话',
    'Open an existing thread',
    '打开已有会话',
    ['thread-lifecycle'],
  ],
  '20-panel-review': [
    'Review panel',
    '审阅面板',
    'Active thread → ⌃⇧G',
    '活动会话 → ⌃⇧G',
    ['approval'],
  ],
  '21-panel-terminal': [
    'Terminal panel',
    '终端面板',
    'Active thread → ⌃`',
    '活动会话 → ⌃`',
    ['exec'],
  ],
  '22-panel-browser': [
    'Browser panel',
    '浏览器面板',
    'Active thread → ⌘T',
    '活动会话 → ⌘T',
    ['browser'],
  ],
  '23-panel-files': ['Files panel', '文件面板', 'Active thread → ⌘P', '活动会话 → ⌘P', ['fs']],
  '24-panel-sidechat': [
    'Side chat',
    '侧边聊天',
    'Active thread → side chat',
    '活动会话 → 侧边聊天',
    ['thread-lifecycle'],
  ],
  '25-settings-open': [
    'Settings overview',
    '设置总览',
    'Open Settings',
    '打开设置',
    ['config', 'account'],
  ],
  '26-settings-search': [
    'Settings search',
    '设置搜索',
    'Settings → Search',
    '设置 → 搜索',
    ['config'],
  ],
};

export const settingsLabels = [
  ['General', '通用', 'config'],
  ['Import', '导入', 'config'],
  ['Profile', '个人资料', 'account'],
  ['Appearance', '外观', 'shell-ui'],
  ['Voice', '语音', 'thread-lifecycle'],
  ['Configuration', '配置', 'config'],
  ['Personalization', '个性化', 'memory'],
  ['Pets', '宠物', 'growth'],
  ['Keyboard shortcuts', '键盘快捷键', 'shell-ui'],
  ['Usage & billing', '用量与计费', 'account'],
  ['Analytics', '分析', 'telemetry'],
  ['Account', '账号', 'account'],
  ['Computer use', '电脑使用', 'config'],
  ['Computer history', '电脑历史', 'config'],
  ['Appshots', '应用快照', 'config'],
  ['Plugins', '插件', 'extensions'],
  ['Browser', '浏览器', 'browser'],
  ['Hooks', '钩子', 'extensions'],
  ['Connections', '连接', 'extensions'],
  ['Git', 'Git', 'config'],
  ['Environments', '环境', 'cloud-tasks'],
  ['Worktrees', '工作树', 'config'],
  ['Archived chats', '已归档聊天', 'thread-lifecycle'],
];

export const pageMeta = [
  [
    'index',
    'Research atlas',
    '研究总览',
    'Explore the desktop app',
    '探索桌面应用的内部世界',
    'Follow a feature from the interface to its implementation, then inspect the evidence.',
    '从界面出发，追踪功能的实现，再亲自查看证据。',
  ],
  [
    'three-way',
    'Execution map',
    '执行归属',
    'One capability. Several boundaries.',
    '一项能力，多个实现边界。',
    'Separate domain grouping from the actual direction of calls.',
    '区分领域分组与实际调用方向。',
  ],
  [
    'core-api',
    'Rust core API',
    'Rust 内核 API',
    'A protocol you can trace.',
    '可追溯的协议。',
    'Explore all four channels, their data structures and pinned source definitions.',
    '探索四条通道、数据结构与固定版本的源码定义。',
  ],
  [
    'cloud-api',
    'Cloud API',
    '云端 API',
    'Beyond the local process.',
    '走出本地进程。',
    'Trace client calls, route rewriting and service boundaries inside the shipped bundle.',
    '追踪发行包中的客户端调用、路由改写与服务边界。',
  ],
  [
    'shell',
    'Electron shell',
    'Electron 壳层',
    'Where the desktop takes over.',
    '桌面层接管的地方。',
    'Inspect the bridges between rendered UI, native windows and subprocesses.',
    '观察渲染界面、原生窗口与子进程之间的桥梁。',
  ],
  [
    'features',
    'Feature graph',
    '功能图谱',
    'From intent to implementation.',
    '从用户意图，到功能实现。',
    'Explore bounded contexts, capabilities, commands and the surfaces that expose them.',
    '探索限界上下文、能力、命令及承载它们的界面。',
  ],
  [
    'gui-map',
    'GUI map',
    '界面地图',
    'A map of the visible app.',
    '可见应用的地图。',
    'Navigate archived captures, entry paths and thread-scoped surfaces.',
    '浏览归档截图、进入路径与会话作用域中的界面。',
  ],
  [
    'bundle',
    'Bundle explorer',
    '发行包探索',
    'What the package reveals.',
    '发行包透露了什么。',
    'Move from the file census into imports, interface references and evidence-backed findings.',
    '从文件统计深入导入关系、接口引用与有证据的洞察。',
  ],
  [
    'method',
    'Method & evidence',
    '方法与证据',
    'Every claim has a boundary.',
    '每个结论，都有边界。',
    'See how sources become claims, what was observed, and what remains unknown.',
    '理解来源如何成为结论、哪些已被观测、哪些仍然未知。',
  ],
].map(([id, en, zh, titleEn, titleZh, descEn, descZh]) => ({
  id,
  label: text(en, zh),
  title: text(titleEn, titleZh),
  description: text(descEn, descZh),
}));

export const evidenceLabels = {
  protocol: text('Protocol declaration', '协议声明'),
  'bundle-literal': text('Bundle literal', '包内字面量'),
  callsite: text('Static call site', '静态调用点'),
  capture: text('Captured UI', '界面截图'),
  manifest: text('Manifest / census', '清单／统计'),
  analysis: text('Analytical mapping', '分析映射'),
};
