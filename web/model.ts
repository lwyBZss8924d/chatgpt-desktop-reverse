import type { AtlasModel, AtlasNode, BundleModule, Locale, PageId, Text } from './types';
export const t = (value: Text | undefined, locale: Locale) => value?.[locale] ?? '';
export const bi = (en: string, zh: string): Text => ({ en, zh });
export const kindLabel = (kind: string): Text => bi(kind, ({context:'领域上下文',capability:'能力',method:'方法',endpoint:'端点',ipc:'IPC 通道',surface:'界面',module:'模块',layer:'执行层',command:'命令',window:'窗口'} as Record<string,string>)[kind]??kind);
export const short = (s: string, max = 38) => (s.length > max ? s.slice(0, max - 1) + '…' : s);
export function graphTitleLines(value: string) {
  const lines: string[] = [];
  let line = '',
    units = 0;
  for (const char of value) {
    const cost = /[\u2e80-\u9fff\uff00-\uffef]/.test(char) ? 1 : /\s/.test(char) ? 0.3 : 0.52;
    if (units + cost > 9.8 && line) {
      lines.push(line.trim());
      line = '';
      units = 0;
    }
    line += char;
    units += cost;
  }
  if (line) lines.push(line.trim());
  return lines.length > 2 ? [lines[0], lines[1].slice(0, -1) + '…'] : lines;
}
export const humanBytes = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : n >= 1e3 ? `${(n / 1e3).toFixed(1)} KB` : `${n} B`;
/** Binary slice layout: each rectangle has exactly its data share of the area. */
export function treemapRects(
  items: { name: string; value: number }[],
  x = 0,
  y = 0,
  width = 100,
  height = 100
): { name: string; value: number; x: number; y: number; width: number; height: number }[] {
  if (!items.length) return [];
  if (items.length === 1) return [{ ...items[0], x, y, width, height }];
  const sum = items.reduce((n, i) => n + i.value, 0);
  let split = 1,
    part = items[0].value;
  while (
    split < items.length - 1 &&
    Math.abs(part + items[split].value - sum / 2) < Math.abs(part - sum / 2)
  ) {
    part += items[split].value;
    split++;
  }
  const ratio = sum ? part / sum : split / items.length;
  return width >= height
    ? [
        ...treemapRects(items.slice(0, split), x, y, width * ratio, height),
        ...treemapRects(items.slice(split), x + width * ratio, y, width * (1 - ratio), height),
      ]
    : [
        ...treemapRects(items.slice(0, split), x, y, width, height * ratio),
        ...treemapRects(items.slice(split), x, y + height * ratio, width, height * (1 - ratio)),
      ];
}
export function moduleNode(m: BundleModule): AtlasNode {
  return {
    id: m.id,
    kind: 'module',
    label: bi(m.path.split('/').at(-1)!, m.path.split('/').at(-1)!),
    summary: bi(m.path, m.path),
    layers: m.zone === 'main' ? ['shell'] : [],
    page: 'bundle',
    sourceIds: m.sourceIds,
    evidence: ['manifest'],
    group: m.family,
  };
}
export function nodeById(model: AtlasModel, id: string | null): AtlasNode | undefined {
  if (!id) return;
  const node = model.nodes.find((n) => n.id === id);
  if (node) return node;
  const mod = model.bundle.modules.find((m) => m.id === id);
  return mod ? moduleNode(mod) : undefined;
}
export const nodeHref = (node: AtlasNode) =>
  `${node.page}.html#${encodeURIComponent(node.id.startsWith('cap:') ? 'cap-' + node.id.slice(4) : node.id)}`;
export const hashId = (hash: string) => {
  try {
    const id = decodeURIComponent(hash.replace(/^#/, ''));
    return id.startsWith('cap-') ? 'cap:' + id.slice(4) : id;
  } catch {
    return '';
  }
};
export function searchable(node: AtlasNode, model: AtlasModel): string {
  let relatedIndex=relationSearchCache.get(model);
  if(!relatedIndex){relatedIndex=new Map<string,string>();for(const e of model.relations)relatedIndex.set(e.from,`${relatedIndex.get(e.from)??''} ${e.to}`);relationSearchCache.set(model,relatedIndex);}
  const related=relatedIndex.get(node.id)??'';
  const method=node.kind==='method'?model.methods.find(m=>m.id===node.id):null;
  const typeText=method?`${method.type} ${method.params} ${method.response} ${method.fields.map(f=>f.name).join(' ')}`:'';
  return `${node.id} ${node.label.en} ${node.label.zh} ${node.summary.en} ${node.summary.zh} ${node.group ?? ''} ${node.layers.join(' ')} ${related} ${typeText}`.toLocaleLowerCase();
}
const relationSearchCache=new WeakMap<AtlasModel,Map<string,string>>();
export interface GraphNode {
  id: string;
  label: Text;
  detail: Text;
  layer?: string;
  target?: string;
  count?: number;
}
export function graphBrand(node: GraphNode): 'chatgpt' | 'codex' | undefined {
  if (['renderer', 'client', 'app', 'atlas'].includes(node.id)) return 'chatgpt';
  if (['core', 'server', 'layer:core'].includes(node.id)) return 'codex';
}
export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  label: Text;
  inferred?: boolean;
}
export function edgeTone(spec: GraphSpec, edge: GraphEdge) {
  return (
    spec.nodes.find((n) => n.id === edge.to)?.layer ??
    spec.nodes.find((n) => n.id === edge.from)?.layer ??
    'neutral'
  );
}
export interface GraphSpec {
  nodes: GraphNode[];
  edges: GraphEdge[];
  title: Text;
  description: Text;
}
const fromNode = (n: AtlasNode, model: AtlasModel): GraphNode => ({
  id: n.id,
  label: n.label,
  detail: bi(n.kind, n.kind),
  layer: n.layers.length === 1 ? n.layers[0] : undefined,
  target: n.id,
  count: model.relations.filter((e) => e.from === n.id).length,
});
const edge = (from: string, to: string, en: string, zh: string, inferred = false): GraphEdge => ({
  id: `${from}-${to}`,
  from,
  to,
  label: bi(en, zh),
  inferred,
});
const gn = (
  id: string,
  en: string,
  zh: string,
  dEn: string,
  dZh: string,
  layer?: string,
  target?: string
): GraphNode => ({ id, label: bi(en, zh), detail: bi(dEn, dZh), layer, target });

export function graphFor(page: PageId, model: AtlasModel, focus = ''): GraphSpec {
  const title = bi('Architecture explorer', '架构探索');
  const description = bi(
    'Select a node to inspect its sources. Dashed relationships are analytical mappings.',
    '选择节点查看来源，虚线表示分析映射。'
  );
  if (focus) {
    const root = nodeById(model, focus);
    if (root) {
      const outgoing = model.relations.filter((e) => e.from === focus);
      const incoming = model.relations.filter((e) => e.to === focus);
      const rels = [...outgoing, ...incoming].filter(
        (e) => !e.from.startsWith('mod:') || model.bundle.modules.some((m) => m.id === e.from)
      );
      const ids = [...new Set(rels.map((e) => (e.from === focus ? e.to : e.from)))].filter((id) =>
        nodeById(model, id)
      );
      const picked = ids.slice(0, 5);
      const nodes = [
        fromNode(root, model),
        ...picked.map((id) => fromNode(nodeById(model, id)!, model)),
      ];
      const edges: GraphEdge[] = rels
        .filter((e) => [focus, ...picked].includes(e.from) && [focus, ...picked].includes(e.to))
        .slice(0, 12)
        .map((e) => ({
          id: e.id,
          from: e.from,
          to: e.to,
          label: e.label ?? bi(e.kind, relationZh(e.kind)),
          inferred: e.inference,
        }));
      if (ids.length > 5) {
        nodes.push(
          gn(
            'more',
            `${ids.length - 5} more relations`,
            `另有 ${ids.length - 5} 条关系`,
            'Inspect all related records',
            '查看全部关联记录'
          )
        );
        edges.push(edge(focus, 'more', 'more', '更多', true));
      }
      if (root.kind === 'module') {
        const mod = model.bundle.modules.find((m) => m.id === root.id)!;
        for (const im of mod.imports.slice(0, Math.max(0, 8 - nodes.length))) {
          const dest = model.bundle.modules.find((m) => m.path === im.target);
          const id = dest?.id ?? im.target;
          if (!nodes.some((n) => n.id === id))
            nodes.push(
              dest
                ? fromNode(moduleNode(dest), model)
                : gn(
                    id,
                    short(im.target),
                    short(im.target),
                    'External or unresolved',
                    '外部或未解析'
                  )
            );
          edges.push(
            edge(
              root.id,
              id,
              im.dynamic ? 'dynamic import' : 'import',
              im.dynamic ? '动态导入' : '导入',
              im.resolution === 'filename-candidate'
            )
          );
        }
      }
      return { title: root.label, description, nodes, edges };
    }
  }
  if (page === 'features') {
    const nodes = [
      gn('atlas', 'Desktop capabilities', '桌面能力', 'Analytical domain model', '分析领域模型'),
      ...model.contexts.map((c) => fromNode(nodeById(model, `context:${c.id}`)!, model)),
    ];
    return {
      title: bi('Five contexts, connected', '五个上下文，相互关联'),
      description,
      nodes,
      edges: model.contexts.map((c) => edge('atlas', `context:${c.id}`, 'contains', '包含', true)),
    };
  }
  if (page === 'core-api')
    return {
      title: bi('Four protocol channels', '四条协议通道'),
      description: bi(
        'Two directions. Requests expect responses; notifications carry events.',
        '两个方向：请求需要响应，通知传递事件。'
      ),
      nodes: [
        gn(
          'client',
          'Desktop client',
          '桌面客户端',
          'Electron / app-server client',
          'Electron／app-server 客户端',
          'shell',
          'layer:shell'
        ),
        gn(
          'requests',
          'Client requests',
          '客户端请求',
          'thread/start · turn/start',
          'thread/start · turn/start',
          'core',
          'core:thread/start'
        ),
        gn(
          'notifications',
          'Client notification',
          '客户端通知',
          'initialized',
          'initialized',
          'core',
          'core:initialized'
        ),
        gn(
          'server',
          'Rust app-server',
          'Rust app-server',
          'OSS protocol reference',
          '开源协议参考',
          'core',
          'layer:core'
        ),
        gn(
          'decisions',
          'Server requests',
          '服务端请求',
          'Approval · user input',
          '审批 · 用户输入',
          'core',
          'cap:approval'
        ),
        gn(
          'events',
          'Server notifications',
          '服务端通知',
          'Deltas · state changes',
          '增量 · 状态变化',
          'core',
          'core:item/agentMessage/delta'
        ),
      ],
      edges: [
        edge('client', 'requests', 'request', '请求'),
        edge('client', 'notifications', 'notify', '通知'),
        edge('requests', 'server', 'app → core', '应用 → 内核'),
        edge('notifications', 'server', 'app → core', '应用 → 内核'),
        edge('server', 'decisions', 'core → app', '内核 → 应用'),
        edge('server', 'events', 'core → app', '内核 → 应用'),
      ],
    };
  if (page === 'cloud-api')
    return {
      title: bi('The request boundary', '请求边界'),
      description: bi(
        'A conceptual route, grounded in the excerpts attached to each step.',
        '由各步骤片段支撑的概念路由。'
      ),
      nodes: [
        gn(
          'ui',
          'Renderer call',
          '渲染层调用',
          'Relative path + arguments',
          '相对路径 + 参数',
          'cloud',
          model.endpoints.find((e) => e.service === 'wham' && e.verbs.length)?.id
        ),
        gn(
          'rewrite',
          'Route rewriting',
          '路由改写',
          '/__codex-api/*',
          '/__codex-api/*',
          'shell',
          'finding:proxy'
        ),
        gn(
          'proxy',
          'Electron main',
          'Electron 主进程',
          'Proxy / host resolution',
          '代理／主机解析',
          'shell',
          'layer:shell'
        ),
        gn(
          'cloud',
          'Cloud service',
          '云端服务',
          '/backend-api/*',
          '/backend-api/*',
          'cloud',
          'layer:cloud'
        ),
      ],
      edges: [
        edge('ui', 'rewrite', 'relative URL', '相对 URL', true),
        edge('rewrite', 'proxy', 'same origin', '同源', true),
        edge('proxy', 'cloud', 'HTTPS', 'HTTPS', true),
      ],
    };
  if (page === 'shell' || page === 'index' || page === 'three-way')
    return {
      title: bi('Three execution boundaries', '三个执行边界'),
      description,
      nodes: [
        gn(
          'renderer',
          'Desktop interface',
          '桌面界面',
          'Routes · panels · commands',
          '路由 · 面板 · 命令',
          undefined,
          'gui:19-thread-open'
        ),
        gn(
          'preload',
          'Preload bridge',
          'Preload 桥',
          'IPC exposure',
          'IPC 暴露',
          'shell',
          model.ipc.find((i) => i.suffix === 'message')?.id ?? model.ipc[0]?.id
        ),
        gn(
          'main',
          'Electron main',
          'Electron 主进程',
          'Windows · workers · routing',
          '窗口 · worker · 路由',
          'shell',
          'layer:shell'
        ),
        gn(
          'core',
          'Rust core',
          'Rust 内核',
          'app-server protocol',
          'app-server 协议',
          'core',
          'layer:core'
        ),
        gn(
          'cloud',
          'Cloud services',
          '云端服务',
          'Hosted APIs',
          '托管 API',
          'cloud',
          'layer:cloud'
        ),
        gn(
          'native',
          'macOS integration',
          'macOS 集成',
          'Native modules',
          '原生模块',
          'shell',
          'finding:native'
        ),
      ],
      edges: [
        edge('renderer', 'preload', 'messages', '消息', true),
        edge('preload', 'main', 'IPC', 'IPC', true),
        edge('main', 'core', 'stdio', 'stdio', true),
        edge('main', 'cloud', 'HTTPS', 'HTTPS', true),
        edge('main', 'native', 'native bridge', '原生桥', true),
      ],
    };
  if (page === 'gui-map')
    return {
      title: bi('Surface hierarchy', '界面层级'),
      description,
      nodes: [
        gn('app', 'Desktop window', '桌面窗口', 'Archived GUI observations', '归档界面观测'),
        ...[
          ['gui:01-sidebar-home', 'Navigation', '导航', 'Top-level destinations', '顶层目的地'],
          ['gui:19-thread-open', 'Conversation', '会话', 'Thread-scoped panels', '会话作用域面板'],
          [
            'gui:07-command-palette',
            'Command palette',
            '命令面板',
            'Overlay / modes',
            '浮层／模式',
          ],
          ['gui:11-quick-chat', 'Quick chat', '快速聊天', 'Separate window', '独立窗口'],
          ['gui:25-settings-open', 'Settings', '设置', '23 captured sections', '23 个已截取分区'],
        ].map(([id, en, zh, de, dz]) => gn(id, en, zh, de, dz, undefined, id)),
      ],
      edges: [
        'gui:01-sidebar-home',
        'gui:19-thread-open',
        'gui:07-command-palette',
        'gui:11-quick-chat',
        'gui:25-settings-open',
      ].map((id) => edge('app', id, 'surface', '界面', true)),
    };
  if (page === 'bundle') {
    const main = model.bundle.modules.filter(
      (m) =>
        m.zone === 'main' &&
        ['early-bootstrap.js', 'preload.js', 'worker.js'].includes(m.path.split('/').at(-1)!)
    );
    const nodes = main.map((m) => fromNode(moduleNode(m), model));
    for (const m of main)
      for (const im of m.imports.slice(0, 2)) {
        const dest = model.bundle.modules.find((d) => d.path === im.target);
        if (dest && !nodes.some((n) => n.id === dest.id) && nodes.length < 8)
          nodes.push(fromNode(moduleNode(dest), model));
      }
    return {
      title: bi('Entry points & imports', '入口与导入'),
      description,
      nodes,
      edges: main.flatMap((m) =>
        m.imports
          .filter((i) => nodes.some((n) => n.id === `mod:${i.target}`))
          .map((i) =>
            edge(
              m.id,
              `mod:${i.target}`,
              i.dynamic ? 'dynamic' : 'require',
              i.dynamic ? '动态导入' : 'require'
            )
          )
      ),
    };
  }
  const stages = [
    ['source', 'Sources', '来源'],
    ['extract', 'Extract', '提取'],
    ['map', 'Relate', '关联'],
    ['verify', 'Verify', '验证'],
    ['publish', 'Publish', '发布'],
  ];
  return {
    title: bi('From evidence to a claim', '从证据到结论'),
    description: bi(
      'Each stage retains the source and the limits of what it can establish.',
      '每个阶段保留来源，以及它能证明的边界。'
    ),
    nodes: stages.map(([id, en, zh]) => gn(id, en, zh, 'Research pipeline', '研究流程')),
    edges: stages.slice(0, -1).map((s, i) => edge(s[0], stages[i + 1][0], 'evidence', '证据')),
  };
}
export function relationZh(kind: string) {
  return (
    (
      {
        contains: '包含',
        'maps-to': '分析映射',
        'contains-literal': '包含字面量',
        'call-candidate': '调用候选',
        imports: '导入',
        handles: '处理',
      } as Record<string, string>
    )[kind] ?? kind
  );
}
