import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Camera,
  ChevronRight,
  ExternalLink,
  FileCode2,
  GitBranch,
  Layers,
  List,
  Network,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useAtlas, useUrlState } from './state';
import { bi, humanBytes, moduleNode, nodeById, short, t, treemapRects } from './model';
import {
  Catalog,
  CodeBlock,
  EvidenceTag,
  FilterBar,
  FindingCard,
  L,
  LayerTag,
  NodeButton,
  Notice,
  Section,
  SourceCard,
  Stat,
  Txt,
} from './components';
import { GraphExplorer, ScenarioPlayer } from './graphs';
import { surfaceGroups } from '../scripts/research/content.mjs';
import type { AtlasNode, Capture, Text } from './types';

export function TraceRibbon() {
  const { select } = useAtlas();
  const items = [
    ['gui:19-thread-open', 'GUI surface', '界面入口'],
    ['cap:thread-lifecycle', 'Capability', '功能能力'],
    ['core:thread/start', 'Interface', '接口结构'],
    ['core:thread/start', 'Source evidence', '源码证据'],
  ];
  return (
    <div className="trace-ribbon">
      <span className="eyebrow">
        <L en="Follow the evidence" zh="沿证据追踪" />
      </span>
      <div>
        {items.map(([id, en, zh], i) => (
          <React.Fragment key={i}>
            <button onClick={() => select(id)}>
              <span>{['◫', '◇', '↗', '⌘'][i]}</span>
              <L en={en} zh={zh} />
            </button>
            {i < 3 && <ChevronRight size={13} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
function CoreStats() {
  const { model } = useAtlas();
  return (
    <div className="stat-strip">
      <Stat value={model.methods.length} label={bi('Protocol methods', '协议方法')} />
      <Stat
        value={model.methods.filter((m) => m.presentInApp).length}
        label={bi('Bundle literal matches', '包内字面量命中')}
      />
      <Stat
        value={new Set(model.methods.map((m) => m.domain)).size}
        label={bi('Protocol domains', '协议领域')}
      />
      <Stat value={model.crates.length} label={bi('Reference crates', '参考 crate')} />
    </div>
  );
}
function Overview() {
  const { model, select, locale } = useAtlas();
  return (
    <>
      <TraceRibbon />
      <Section
        id="architecture"
        title={bi('Start with the architecture', '从架构开始')}
        note={bi(
          'A web interface, a native shell, and two different service boundaries.',
          'Web 界面、原生壳层，以及两个不同的服务边界。'
        )}
      >
        <GraphExplorer />
      </Section>
      <div className="stat-strip overview-stats">
        <Stat
          value={model.methods.length}
          label={bi('Core declarations', '内核声明')}
          note={bi('In the reference protocol', '参考协议中')}
        />
        <Stat
          value={model.endpoints.length}
          label={bi('Indexed cloud paths', '已索引云路径')}
          note={bi(
            `${model.baseline.paths} in the original scan`,
            `原始扫描 ${model.baseline.paths} 条`
          )}
        />
        <Stat value={model.ipc.length} label={bi('Desktop IPC channels', '桌面 IPC 通道')} />
        <Stat value={model.captures.length} label={bi('Archived captures', '归档截图')} />
      </div>
      <Section
        id="findings"
        title={bi('What the evidence reveals', '证据揭示了什么')}
        note={bi(
          'Findings carry their limits alongside their sources.',
          '洞察的来源与限制同时呈现。'
        )}
      >
        <div className="findings-grid">
          {model.findings.slice(0, 4).map((f) => (
            <FindingCard key={f.id} finding={f} compact />
          ))}
        </div>
      </Section>
      <Section id="routes" title={bi('Choose a way in', '选择探索入口')}>
        <div className="reading-routes">
          {[
            [
              'features.html',
              Network,
              'Follow a feature',
              '追踪一项功能',
              'Domains → capabilities → interfaces',
              '领域 → 能力 → 接口',
            ],
            [
              'gui-map.html',
              Camera,
              'Read the interface',
              '阅读界面',
              'Captures → entry paths → implementation',
              '截图 → 进入路径 → 实现',
            ],
            [
              'bundle.html',
              FileCode2,
              'Inspect the package',
              '检查发行包',
              'Files → imports → source findings',
              '文件 → 导入 → 源码发现',
            ],
          ].map(([href, Icon, en, zh, de, dz]) => {
            const I = Icon as typeof Network;
            return (
              <a className="reading-route" href={href as string} key={href as string}>
                <I size={23} />
                <h3>{locale === 'zh' ? (zh as string) : (en as string)}</h3>
                <p>{locale === 'zh' ? (dz as string) : (de as string)}</p>
                <ArrowRight size={18} />
              </a>
            );
          })}
        </div>
      </Section>
      <Section id="walkthrough" title={bi('Read one complete path', '阅读一条完整路径')}>
        <ScenarioPlayer scenario={model.scenarios.find((s) => s.id === 'thread')!} />
      </Section>
    </>
  );
}

function ExecutionMap() {
  const { model, locale, select } = useAtlas();
  const caps = model.nodes.filter((n) => n.kind === 'capability');
  return (
    <>
      <TraceRibbon />
      <Section id="architecture" title={bi('Execution boundaries', '执行边界')}>
        <GraphExplorer />
      </Section>
      <Section
        id="matrix"
        title={bi('Capability × execution layer', '能力 × 执行层')}
        note={bi(
          'A mark means the analysis groups an interface in this layer. It is not a runtime call count.',
          '标记表示分析将该层接口归入此能力，不是运行时调用数量。'
        )}
      >
        <div className="matrix-wrap">
          <table className="execution-matrix">
            <thead>
              <tr>
                <th>
                  <L en="Capability" zh="能力" />
                </th>
                <th>
                  <LayerTag layer="core" />
                </th>
                <th>
                  <LayerTag layer="cloud" />
                </th>
                <th>
                  <LayerTag layer="shell" />
                </th>
              </tr>
            </thead>
            <tbody>
              {model.capabilities.map((c) => (
                <tr key={c.id}>
                  <th>
                    <button onClick={() => select(`cap:${c.id}`)}>
                      {locale === 'zh' ? c.zh : c.title}
                      <ArrowRight size={13} />
                    </button>
                  </th>
                  {[c.core.total, c.cloud.total, c.shell.total].map((n, i) => (
                    <td key={i}>
                      <button
                        className={`matrix-cell ${n ? 'present' : ''}`}
                        onClick={() => select(`cap:${c.id}`)}
                        aria-label={`${locale === 'zh' ? c.zh : c.title}: ${['Core', 'Cloud', 'Shell'][i]} ${n}`}
                      >
                        <span>{n ? '●' : '—'}</span>
                        {n > 0 && <small>{n}</small>}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Notice>
          <L
            en="Local and cloud implementations can be alternatives. A multi-layer grouping does not establish a dependency between every member."
            zh="本地与云端实现可能互为替代。跨层分组不代表组内每一项之间都存在依赖。"
          />
        </Notice>
      </Section>
      <Section id="catalog" title={bi('Explore every capability', '探索全部能力')}>
        <FilterBar />
        <Catalog items={caps} />
      </Section>
    </>
  );
}

function CorePage() {
  const { model, locale } = useAtlas();
  const [channel, setChannel] = useUrlState('channel', 'all');
  const [presence, setPresence] = useUrlState('presence', 'all');
  const methods = model.methods.filter(
    (m) =>
      (channel === 'all' || m.channel === channel) &&
      (presence === 'all' || (presence === 'found') === m.presentInApp)
  );
  const items = methods.map((m) => nodeById(model, m.id)!);
  return (
    <>
      <CoreStats />
      <Section id="protocol" title={bi('Requests, responses & events', '请求、响应与事件')}>
        <GraphExplorer />
      </Section>
      <Section
        id="catalog"
        title={bi('Protocol explorer', '协议探索')}
        note={bi(
          'Open a method for parameter fields, response structure, bundle references and pinned Rust source.',
          '打开方法查看参数字段、响应结构、包内引用及固定版本的 Rust 源码。'
        )}
      >
        <FilterBar
          extra={
            <>
              <select
                aria-label={locale === 'zh' ? '协议通道' : 'Protocol channel'}
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                <option value="all">{locale === 'zh' ? '全部通道' : 'All channels'}</option>
                {Object.entries({
                  clientRequests: ['Client requests', '客户端请求'],
                  serverRequests: ['Server requests', '服务端请求'],
                  clientNotifications: ['Client notifications', '客户端通知'],
                  serverNotifications: ['Server notifications', '服务端通知'],
                }).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label[locale === 'zh' ? 1 : 0]}
                  </option>
                ))}
              </select>
              <select
                aria-label={locale === 'zh' ? '字面量证据' : 'Literal evidence'}
                value={presence}
                onChange={(e) => setPresence(e.target.value)}
              >
                <option value="all">{locale === 'zh' ? '全部证据' : 'All evidence'}</option>
                <option value="found">{locale === 'zh' ? '包内已发现' : 'Literal found'}</option>
                <option value="missing">
                  {locale === 'zh' ? '包内未发现' : 'Literal not found'}
                </option>
              </select>
            </>
          }
        />
        <Catalog
          items={items}
          renderMeta={(n) => {
            const m = model.methods.find((m) => m.id === n.id)!;
            return (
              <>
                <span className="direction">{m.direction}</span>
                <span className={`presence ${m.presentInApp ? 'found' : ''}`}>
                  <i />
                  {m.presentInApp ? (
                    <L en="Literal found" zh="字面量已发现" />
                  ) : (
                    <L en="Not found" zh="未发现" />
                  )}
                </span>
              </>
            );
          }}
        />
      </Section>
      <Section id="walkthrough" title={bi('Protocol in context', '场景中的协议')}>
        <ScenarioPlayer scenario={model.scenarios.find((s) => s.id === 'thread')!} />
        <ScenarioPlayer scenario={model.scenarios.find((s) => s.id === 'approval')!} />
      </Section>
      <Section
        id="crates"
        title={bi('The reference source tree', '参考源码树')}
        note={bi(
          'Crate membership does not establish desktop reachability. Each link uses the pinned revision.',
          'crate 归属不证明桌面端可达性，所有链接固定到参考提交。'
        )}
      >
        <details className="large-disclosure">
          <summary>
            <FileCode2 size={17} />
            {model.crates.length}{' '}
            <L en="crates · view the complete list" zh="个 crate · 查看完整列表" />
            <ChevronRight size={15} />
          </summary>
          <div className="crate-grid">
            {model.crates.map((c) => (
              <a href={c.href} key={c.name} target="_blank" rel="noreferrer">
                <code>codex-rs/{c.name}</code>
                <ExternalLink size={12} />
              </a>
            ))}
          </div>
        </details>
      </Section>
    </>
  );
}

function CloudPage() {
  const { model, locale } = useAtlas();
  const [service, setService] = useUrlState('service', 'all');
  const [verb, setVerb] = useUrlState('verb', 'all');
  const services = [...new Set(model.endpoints.map((e) => e.service))].sort();
  const items = model.endpoints
    .filter(
      (e) =>
        (service === 'all' || e.service === service) && (verb === 'all' || e.verbs.includes(verb))
    )
    .map((e) => nodeById(model, e.id)!);
  const largest = services
    .map((service) => ({ service, n: model.endpoints.filter((e) => e.service === service).length }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 8);
  return (
    <>
      <div className="stat-strip">
        <Stat
          value={model.endpoints.length}
          label={bi('Indexed paths', '已索引路径')}
          note={bi(
            `${model.baseline.paths} baseline + ${model.endpoints.filter((e) => !e.baseline).length} AST additions`,
            `${model.baseline.paths} 条基线 + ${model.endpoints.filter((e) => !e.baseline).length} 条 AST 新增`
          )}
        />
        <Stat value={services.length} label={bi('Service groups', '服务分组')} />
        <Stat
          value={model.endpoints.filter((e) => e.verbs.length).length}
          label={bi('Paths with parsed call verbs', '已解析调用方法的路径')}
        />
        <Stat
          value={model.coverage.unmatchedLegacyPaths.length}
          label={bi('Legacy paths needing review', '待复核原始路径')}
        />
      </div>
      <Section id="architecture" title={bi('Follow the route', '沿路由追踪')}>
        <GraphExplorer />
      </Section>
      <Section
        id="services"
        title={bi('Services at a glance', '服务概览')}
        note={bi(
          'Path counts describe interface breadth, not usage or business importance. Select a bar to filter the catalog.',
          '路径数描述接口广度，不代表使用量或业务重要性。选择条形即可筛选目录。'
        )}
      >
        <div className="service-bars">
          {largest.map((s) => (
            <button
              key={s.service}
              onClick={() => {
                setService(s.service);
                document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <code>/{s.service}</code>
              <span>
                <i style={{ width: `${(s.n / largest[0].n) * 100}%` }} />
              </span>
              <b>{s.n}</b>
            </button>
          ))}
        </div>
      </Section>
      <Section id="catalog" title={bi('Endpoint explorer', '端点探索')}>
        <FilterBar
          extra={
            <>
              <select
                aria-label={locale === 'zh' ? '服务筛选' : 'Service filter'}
                value={service}
                onChange={(e) => setService(e.target.value)}
              >
                <option value="all">{locale === 'zh' ? '全部服务' : 'All services'}</option>
                {services.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select
                aria-label="HTTP method"
                value={verb}
                onChange={(e) => setVerb(e.target.value)}
              >
                <option value="all">
                  {locale === 'zh' ? '全部 HTTP 方法' : 'All HTTP methods'}
                </option>
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </>
          }
        />
        <Catalog
          items={items}
          renderMeta={(n) => {
            const e = model.endpoints.find((e) => e.id === n.id)!;
            return <span className="http-method">{e.verbs.join(' / ') || '?'}</span>;
          }}
        />
      </Section>
      <Section id="walkthrough" title={bi('Request walkthrough', '请求解读')}>
        <ScenarioPlayer scenario={model.scenarios.find((s) => s.id === 'cloud')!} />
      </Section>
      <Section
        id="policy"
        title={bi('Declared network boundaries', '声明的网络边界')}
        note={bi(
          'CSP is an allowlist, not a record of actual network traffic.',
          'CSP 是允许列表，并非实际网络流量记录。'
        )}
      >
        <div className="policy-grid">
          {[...new Set(model.bundle.csp.map((c) => c.directive))]
            .filter((d) => ['connect-src', 'frame-src', 'default-src', 'worker-src'].includes(d))
            .map((d) => (
              <details key={d}>
                <summary>
                  <code>{d}</code>
                  <ChevronDownIcon />
                </summary>
                <div>
                  {[
                    ...new Set(
                      model.bundle.csp.filter((c) => c.directive === d).flatMap((c) => c.values)
                    ),
                  ].map((v) => (
                    <code key={v}>{v}</code>
                  ))}
                </div>
                <SourceCard id={model.bundle.csp.find((c) => c.directive === d)!.sourceId} />
              </details>
            ))}
        </div>
      </Section>
    </>
  );
}
const ChevronDownIcon = () => <ChevronRight size={15} />;

function ShellPage() {
  const { model } = useAtlas();
  return (
    <>
      <div className="stat-strip">
        <Stat value={model.ipc.length} label={bi('IPC channels', 'IPC 通道')} />
        <Stat value={model.windows.length} label={bi('Window tokens', '窗口令牌')} />
        <Stat
          value={model.bundle.nativeDependencies.length}
          label={bi('Declared dependencies', '已声明依赖')}
        />
        <Stat
          value={model.bundle.modules.filter((m) => m.zone === 'main').length}
          label={bi('Main-process files', '主进程文件')}
        />
      </div>
      <Section id="architecture" title={bi('Processes & bridges', '进程与桥')}>
        <GraphExplorer />
      </Section>
      <Section
        id="catalog"
        title={bi('Desktop IPC explorer', '桌面 IPC 探索')}
        note={bi(
          'Select a channel to compare operations and source locations across the bridge.',
          '选择通道，对照桥两侧的操作与源码位置。'
        )}
      >
        <FilterBar />
        <Catalog
          items={model.nodes.filter((n) => n.kind === 'ipc')}
          renderMeta={(n) => (
            <span className="small muted">
              {model.ipc.find((c) => c.id === n.id)?.roles.join(' · ') || (
                <L en="literal only" zh="仅字面量" />
              )}
            </span>
          )}
        />
      </Section>
      <Section id="walkthrough" title={bi('How the shell connects', '壳层如何连接')}>
        <ScenarioPlayer scenario={model.scenarios.find((s) => s.id === 'shell')!} />
      </Section>
      <Section
        id="windows"
        title={bi('Window tokens are structural evidence', '窗口令牌属于结构性证据')}
      >
        <Catalog
          items={model.nodes.filter((n) => n.kind === 'window')}
          renderMeta={(n) => (
            <span className="small">
              {model.windows.find((w) => `window:${w.token}` === n.id)?.hits}{' '}
              <L en="literal hits" zh="字面量命中" />
            </span>
          )}
        />
        <Notice>
          <L
            en="A window token and a similarly named screenshot are not automatically the same surface. Runtime correspondence remains explicit and unverified where no evidence exists."
            zh="窗口令牌与相似名称的截图不会自动视为同一界面。缺少证据时，运行时对应关系明确保留为未验证。"
          />
        </Notice>
      </Section>
      <Section id="native" title={bi('Native & package boundaries', '原生与包边界')}>
        <FindingCard finding={model.findings.find((f) => f.id === 'native')!} />
        <details className="large-disclosure">
          <summary>
            <L en="All declared package dependencies" zh="全部已声明包依赖" />
            <span>{model.bundle.nativeDependencies.length}</span>
          </summary>
          <div className="dependency-cloud">
            {model.bundle.nativeDependencies.map((n) => (
              <code key={n}>{n}</code>
            ))}
          </div>
        </details>
      </Section>
    </>
  );
}

function FeaturesPage() {
  const { model, locale, select } = useAtlas();
  const [context, setContext] = useUrlState('context', 'all');
  const [inventory, setInventory] = useUrlState('inventory', 'capabilities');
  const ctx = model.contexts.find((c) => c.id === context);
  const ids = ctx?.capabilities.map((id) => `cap:${id}`);
  const items =
    inventory === 'commands'
      ? model.nodes.filter(
          (n) => n.kind === 'command' && (!ctx || ctx.namespaces.includes(n.group ?? ''))
        )
      : model.nodes.filter((n) => n.kind === 'capability' && (!ids || ids.includes(n.id)));
  return (
    <>
      <TraceRibbon />
      <Section
        id="domains"
        title={bi('The domain map', '领域地图')}
        note={bi(
          'Contexts are analytical groupings. Drill into one to see capabilities, command vocabulary and backing interfaces.',
          '上下文是分析分组。深入其中，查看能力、命令词汇与支撑接口。'
        )}
      >
        <GraphExplorer focus={ctx ? `context:${ctx.id}` : undefined} />
        <div
          className="context-tabs"
          role="group"
          aria-label={locale === 'zh' ? '领域筛选' : 'Domain filter'}
        >
          <button aria-pressed={context === 'all'} onClick={() => setContext('all')}>
            <L en="All contexts" zh="全部上下文" />
          </button>
          {model.contexts.map((c) => (
            <button key={c.id} aria-pressed={context === c.id} onClick={() => setContext(c.id)}>
              {t(c.label, locale)}
              <span>{c.capabilities.length}</span>
            </button>
          ))}
        </div>
        {ctx && (
          <div className="context-summary">
            <h3>
              <Txt value={ctx.label} />
            </h3>
            <p>
              <Txt value={ctx.summary} />
            </p>
            <div>
              {ctx.shots.slice(0, 3).map((s) => (
                <button onClick={() => select(`gui:${s}`)} key={s}>
                  <img src={`assets/shots/${s}.jpg`} alt={s} loading="lazy" />
                  <span>{t(model.captures.find((c) => c.name === s)?.label, locale)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Section>
      <Section
        id="catalog"
        title={
          inventory === 'commands'
            ? bi('Command vocabulary', '命令词汇')
            : bi('Capability cards', '能力条目')
        }
        note={bi(
          'Open a record for its purpose, relationships, sources and limitations.',
          '打开记录查看用途、关系、来源和限制。'
        )}
      >
        <FilterBar
          extra={
            <div className="segmented">
              <button
                aria-pressed={inventory === 'capabilities'}
                onClick={() => setInventory('capabilities')}
              >
                <L en="Capabilities" zh="能力" />
              </button>
              <button
                aria-pressed={inventory === 'commands'}
                onClick={() => setInventory('commands')}
              >
                <L en="Commands" zh="命令" /> {model.commands.length}
              </button>
            </div>
          }
        />
        <Catalog items={items} />
      </Section>
      <Section id="gaps" title={bi('Keep the unassigned visible', '保留未归类项')}>
        <Notice>
          <L
            en={`${model.coverage.unmappedCommands.length} command keys are outside the current context grouping. They remain part of the searchable inventory.`}
            zh={`${model.coverage.unmappedCommands.length} 个命令键尚未归入当前上下文，仍保留在可搜索目录中。`}
          />
        </Notice>
        <div className="link-list">
          {model.coverage.unmappedCommands.map((k) => (
            <NodeButton key={k} id={`command:${k}`}>
              {k}
            </NodeButton>
          ))}
        </div>
      </Section>
    </>
  );
}

function CaptureViewer({ capture }: { capture: Capture }) {
  const { locale, select } = useAtlas();
  const [hotspots, setHotspots] = useState(true);
  const spots = capture.hotspots.map((h) => ({
    x: h.x * 100,
    y: h.y * 100,
    w: h.width * 100,
    h: h.height * 100,
    label: h.label,
    target: h.target,
  }));
  return (
    <div className="capture-viewer">
      <div className="capture-toolbar">
        <div>
          <EvidenceTag kind="capture" />
          <span>{capture.name}</span>
        </div>
        <div>
          {spots.length > 0 && (
            <button aria-pressed={hotspots} onClick={() => setHotspots(!hotspots)}>
              <L en="Annotations" zh="标注" />
            </button>
          )}
          <a href={capture.src} target="_blank" rel="noreferrer">
            <L en="Full image" zh="完整图片" />
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
      <div className="capture-image">
        <img src={capture.src} alt={t(capture.label, locale)} decoding="async" />
        {hotspots &&
          spots.map((s, i) => (
            <button
              className="hotspot"
              key={i}
              style={{ left: s.x + '%', top: s.y + '%', width: s.w + '%', height: s.h + '%' }}
              onClick={() => select(s.target)}
              aria-label={t(s.label, locale)}
            >
              <span>
                {i + 1} · <Txt value={s.label} />
              </span>
            </button>
          ))}
      </div>
      <div className="capture-caption">{capture.redacted&&<span className="evidence-tag"><L en="Real capture · privacy mosaic" zh="真实截图 · 隐私马赛克"/></span>}
        <div>
          <h3>
            <Txt value={capture.label} />
          </h3>
          <p>
            <Txt value={capture.how} />
          </p>
        </div>
        <button className="text-button" onClick={() => select(capture.id)}>
          <L en="Evidence & relationships" zh="证据与关系" />
          <ArrowRight size={14} />
        </button>
      </div>
      {spots.length > 0 && (
        <p className="annotation-note">
          <L
            en="Annotations identify visible regions and link analytical relationships; they do not replay the application."
            zh="标注定位可见区域并链接分析关系，不会回放应用操作。"
          />
        </p>
      )}
    </div>
  );
}
function GuiPage() {
  const { model, locale, query, setQuery, selected } = useAtlas();
  const [current, setCurrent] = useUrlState('current', '19-thread-open');
  const [group, setGroup] = useUrlState('group', 'all');
  useEffect(() => {
    if (selected.startsWith('gui:') && model.captures.some((c) => c.id === selected))
      setCurrent(selected.slice(4));
  }, [selected]);
  const filtered = model.captures.filter(
    (c) =>
      (group === 'all' || c.group === group) &&
      (!query ||
        `${c.label.en} ${c.label.zh} ${c.name} ${c.how.en} ${c.how.zh}`
          .toLowerCase()
          .includes(query.toLowerCase()))
  );
  const capture = model.captures.find((c) => c.name === current) ?? model.captures[0];
  return (
    <>
      <Section id="hierarchy" title={bi('The surface map', '界面地图')}>
        <GraphExplorer />
      </Section>
      <Section
        id="captures"
        title={bi('Capture explorer', '截图探索')}
        note={bi(
          'Navigate 19 application captures and 23 settings captures from the archived snapshot.',
          '浏览归档快照中的 19 张应用截图和 23 张设置截图。'
        )}
      >
        <div className="filter-bar">
          <label className="search-input">
            <Search size={16} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={locale === 'zh' ? '搜索截图' : 'Search captures'}
              placeholder={
                locale === 'zh' ? '搜索界面、面板、设置…' : 'Search surfaces, panels, settings…'
              }
            />
          </label>
          <select
            aria-label={locale === 'zh' ? '界面分组' : 'Surface group'}
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            <option value="all">{locale === 'zh' ? '全部界面' : 'All surfaces'}</option>
            {surfaceGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {t(g.label, locale)}
              </option>
            ))}
          </select>
        </div>
        <div className="gui-workspace">
          <nav className="surface-tree" aria-label={locale === 'zh' ? '界面树' : 'Surface tree'}>
            {surfaceGroups.map((g) => {
              const list = filtered.filter((c) => c.group === g.id);
              return (
                list.length > 0 && (
                  <div key={g.id}>
                    <h3>
                      {t(g.label, locale)}
                      <span>{list.length}</span>
                    </h3>
                    {list.map((c) => (
                      <button
                        key={c.id}
                        aria-current={current === c.name ? 'true' : undefined}
                        onClick={() => setCurrent(c.name)}
                      >
                        <span className="surface-dot" />
                        <span>
                          <Txt value={c.label} />
                        </span>
                        <ChevronRight size={12} />
                      </button>
                    ))}
                  </div>
                )
              );
            })}
            {!filtered.length && (
              <p className="empty-state">
                <L en="No matching captures." zh="没有匹配截图。" />
              </p>
            )}
          </nav>
          <div>
            <CaptureViewer capture={capture} />
            <div className="surface-scope">
              <div>
                <span className="eyebrow">
                  <L en="Scope" zh="作用域" />
                </span>
                <p>
                  <Txt value={capture.scope} />
                </p>
              </div>
              <div>
                <span className="eyebrow">
                  <L en="Related capabilities" zh="关联能力" />
                </span>
                <div className="link-list">
                  {capture.capabilities.map((c) => (
                    <NodeButton key={c} id={`cap:${c}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>
      <Section
        id="limits"
        title={bi('Appearance and behavior are different observations', '界面与行为属于不同观测')}
      >
        <Notice>
          <L
            en="The archived images establish what was visible. Scheduled, Pull requests, Security and Explore were not walked end to end; the side-chat send path was not exercised. Window-token correspondence is not inferred from filenames."
            zh="归档图片证明当时可见的内容。定时任务、拉取请求、安全与探索未被端到端走查，侧聊发送链路也未被驱动。不会从文件名推断窗口令牌的对应关系。"
          />
        </Notice>
      </Section>
      <noscript>
        <ul>
          {model.captures.map((c) => (
            <li key={c.id}>
              <a href={c.src}>
                {c.label.en} / {c.label.zh}
              </a>
            </li>
          ))}
        </ul>
      </noscript>
    </>
  );
}

function BundlePage() {
  const { model, locale, select, query, layer, selected } = useAtlas();
  const [family, setFamily] = useUrlState('family', 'all');
  const [zone, setZone] = useUrlState('zone', 'all');
  const [measure, setMeasure] = useUrlState('measure', 'bytes');
  const stats = model.bundle.stats;
  const modules = model.bundle.modules.filter(
    (m) => (family === 'all' || m.family === family) && (zone === 'all' || m.zone === zone)
  );
  const families = [...model.bundle.families].sort((a, b) =>
    measure === 'bytes' ? b.bytes - a.bytes : b.files - a.files
  );
  const top = families.slice(0, 7);
  const other = families
    .slice(7)
    .reduce((n, f) => n + (measure === 'bytes' ? f.bytes : f.files), 0);
  const cells = [
    ...top.map((f) => ({ name: f.family, value: measure === 'bytes' ? f.bytes : f.files })),
    { name: 'Other', value: other },
  ];
  const sum = cells.reduce((n, c) => n + c.value, 0);
  return (
    <>
      <div className="stat-strip">
        <Stat
          value={stats.files.toLocaleString(locale)}
          label={bi('Package files', '发行包文件')}
        />
        <Stat value={humanBytes(stats.bytes)} label={bi('Unpacked bytes', '解包字节')} />
        <Stat
          value={stats.parsed.toLocaleString(locale)}
          label={bi('JavaScript files parsed', '已解析 JS 文件')}
        />
        <Stat
          value={stats.dynamicImports.toLocaleString(locale)}
          label={bi('Dynamic import edges', '动态导入边')}
        />
      </div>
      <Section
        id="composition"
        title={bi('The package, by weight', '发行包的构成')}
        note={bi(
          'The first seven families and the aggregate remainder share the same denominator. Select a family to inspect its files.',
          '前七个模块族与剩余汇总共用同一分母。选择模块族查看文件。'
        )}
        action={
          <div className="segmented">
            <button aria-pressed={measure === 'bytes'} onClick={() => setMeasure('bytes')}>
              <L en="Bytes" zh="字节" />
            </button>
            <button aria-pressed={measure === 'files'} onClick={() => setMeasure('files')}>
              <L en="Files" zh="文件数" />
            </button>
          </div>
        }
      >
        <div
          className="treemap"
          role="group"
          aria-label={locale === 'zh' ? '模块族占比' : 'Module family share'}
        >
          {treemapRects([...cells].sort((a, b) => b.value - a.value)).map((c, i) => (
            <button
              key={c.name}
              className={`treemap-cell cell-${i}`}
              style={{
                left: c.x + '%',
                top: c.y + '%',
                width: c.width + '%',
                height: c.height + '%',
              }}
              onClick={() => {
                setFamily(c.name === 'Other' ? 'all' : c.name);
                document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span>{c.name === 'Other' ? <L en="Other families" zh="其余模块族" /> : c.name}</span>
              <strong>{((c.value / sum) * 100).toFixed(1)}%</strong>
              <small>
                {measure === 'bytes' ? humanBytes(c.value) : c.value.toLocaleString(locale)}
              </small>
            </button>
          ))}
        </div>
        <p className="small muted">
          <L
            en="Rectangle areas and labels encode exact shares of the selected measure. These are disk bytes, not runtime memory or compressed download size."
            zh="矩形面积与标签对应所选指标的精确占比。此处为磁盘字节，不是运行时内存或压缩下载大小。"
          />
        </p>
      </Section>
      <Section id="imports" title={bi('Entry points & dependency paths', '入口与依赖路径')}>
        <GraphExplorer focus={selected.startsWith('mod:') ? selected : undefined} />
      </Section>
      <Section id="findings" title={bi('Beyond the filename census', '超越文件名统计')}>
        <div className="findings-grid">
          {model.findings
            .filter((f) => f.id !== 'proxy')
            .map((f) => (
              <FindingCard finding={f} key={f.id} />
            ))}
        </div>
      </Section>
      <Section
        id="catalog"
        title={bi('File explorer', '文件探索')}
        note={bi(
          'Every indexed file is searchable. Open one for imports, interface references and available excerpts.',
          '全部索引文件均可搜索，打开文件查看导入、接口引用及已有片段。'
        )}
      >
        <FilterBar
          extra={
            <>
              <select
                aria-label={locale === 'zh' ? '文件区域' : 'File zone'}
                value={zone}
                onChange={(e) => setZone(e.target.value)}
              >
                <option value="all">{locale === 'zh' ? '全部区域' : 'All zones'}</option>
                {['main', 'renderer', 'dependencies', 'locales', 'package'].map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </select>
              <select
                aria-label={locale === 'zh' ? '模块族筛选' : 'Module family filter'}
                value={family}
                onChange={(e) => setFamily(e.target.value)}
              >
                <option value="all">{locale === 'zh' ? '全部模块族' : 'All families'}</option>
                {model.bundle.families.map((f) => (
                  <option key={f.family} value={f.family}>
                    {f.family} ({f.files})
                  </option>
                ))}
              </select>
            </>
          }
        />
        <Catalog
          items={modules.map(moduleNode)}
          pageSize={30}
          renderMeta={(n) => (
            <span className="file-bytes">
              {humanBytes(modules.find((m) => m.id === n.id)!.bytes)}
            </span>
          )}
        />
      </Section>
      <Section id="coverage" title={bi('Extraction coverage & open edges', '提取覆盖与未闭合关系')}>
        <div className="stat-strip">
          <Stat value={stats.failed} label={bi('Parse failures', '解析失败')} />
          <Stat
            value={stats.missingImports}
            label={bi('Unresolved relative imports', '未解析相对导入')}
          />
          <Stat
            value={stats.sourceMaps}
            label={bi('Source maps in snapshot', '快照中的 sourcemap')}
          />
          <Stat
            value={stats.exactDuplicateFiles}
            label={bi('Exact duplicate files', '完全重复文件')}
          />
        </div>
        <details className="large-disclosure">
          <summary>
            <L en="Inspect every unresolved import" zh="检查全部未解析导入" />
            <span>{stats.missingImports}</span>
          </summary>
          <div className="unresolved-list">
            {model.bundle.missingImports.map((im, i) => (
              <p key={i}>
                <code>{im.from}</code>
                <ArrowRight size={12} />
                <code>{im.target}</code>
              </p>
            ))}
          </div>
        </details>
        <Notice>
          <L
            en="An unresolved target may be supplied at runtime, platform-specific, external to the extraction, or incorrectly referenced. It is not automatically dead code."
            zh="未解析目标可能由运行时提供、属于特定平台、位于解包范围之外，或引用有误，不自动等同于死代码。"
          />
        </Notice>
      </Section>
    </>
  );
}

function MethodPage() {
  const { data, model } = useAtlas();
  const claims = [
    [
      'protocol',
      'Declared by the reference protocol',
      '参考协议已声明',
      'Method enum and Rust types at the pinned commit.',
      '固定提交中的方法枚举与 Rust 类型。',
      'Does not prove the desktop binary has the same revision.',
      '不证明桌面二进制具有相同版本。',
    ],
    [
      'bundle-literal',
      'Literal appears in the package',
      '字面量出现在包中',
      'Quoted string in an archived file, with exact offsets.',
      '归档文件中的带引号字符串，附精确偏移。',
      'May be a declaration, vendor code or an unexecuted branch.',
      '可能是声明、第三方代码或未执行分支。',
    ],
    [
      'callsite',
      'A call expression was parsed',
      '已解析调用表达式',
      'AST identifies a callee, arguments and source span.',
      'AST 标识被调用对象、参数与源码区间。',
      'Does not prove execution, successful authorization or response shape.',
      '不证明执行、授权成功或响应结构。',
    ],
    [
      'capture',
      'A surface was visible',
      '界面曾可见',
      'Archived image plus a capture receipt when available.',
      '归档图片，以及存在时的截图回执。',
      'Does not prove the complete workflow or an API call ran.',
      '不证明完整工作流或 API 调用已运行。',
    ],
    [
      'analysis',
      'Entities are related by the analysis',
      '分析关联实体',
      'An explicit domain grouping or interpretive mapping.',
      '显式领域分组或解释性映射。',
      'Not a dependency or execution trace unless independently established.',
      '未经独立证明，不等同于依赖或执行轨迹。',
    ],
  ];
  return (
    <>
      <Section id="pipeline" title={bi('How the atlas is built', '图册如何构建')}>
        <GraphExplorer />
      </Section>
      <Section
        id="claims"
        title={bi('Read the evidence labels', '理解证据标记')}
        note={bi(
          'Evidence types are independent. Several can support one record without proving every possible claim.',
          '证据类型相互独立，多类证据可共同支持记录，但不证明所有可能的结论。'
        )}
      >
        <div className="evidence-ladder">
          {claims.map(([kind, en, zh, howEn, howZh, limEn, limZh]) => (
            <article key={kind}>
              <EvidenceTag kind={kind} />
              <div>
                <h3>
                  <L en={en} zh={zh} />
                </h3>
                <p>
                  <L en={howEn} zh={howZh} />
                </p>
                <p className="limit">
                  <L en={limEn} zh={limZh} />
                </p>
              </div>
            </article>
          ))}
        </div>
      </Section>
      <Section
        id="reproduce"
        title={bi('Reproduce the site', '复现站点')}
        note={bi(
          'A clean checkout builds from committed research artifacts. Refreshing the evidence is a separate, explicit operation.',
          '干净 checkout 从已提交研究产物构建站点。刷新证据是独立、显式的操作。'
        )}
      >
        <CodeBlock code={data.code.build} title="Build & preview" />
        <details className="large-disclosure">
          <summary>
            <L en="Refresh the fixed research snapshot" zh="刷新固定研究快照" />
          </summary>
          <CodeBlock code={data.code.research} title="Offline evidence enrichment" />
        </details>
      </Section>
      <Section id="provenance" title={bi('Snapshot identity', '快照身份')}>
        <dl className="provenance-grid">
          <div>
            <dt>
              <L en="App snapshot" zh="App 快照" />
            </dt>
            <dd>{model.provenance.appVersion}</dd>
          </div>
          <div>
            <dt>
              <L en="OSS source revision" zh="OSS 源码提交" />
            </dt>
            <dd>
              <a
                href={`https://github.com/openai/codex/tree/${model.provenance.coreRevision}`}
                target="_blank"
                rel="noreferrer"
              >
                <code>{model.provenance.coreRevision}</code>
                <ExternalLink size={13} />
              </a>
            </dd>
          </div>
          <div>
            <dt>
              <L en="Main bundle SHA-256" zh="主进程包 SHA-256" />
            </dt>
            <dd>
              <code>{model.provenance.mainSha256}</code>
            </dd>
          </div>
          <div>
            <dt>
              <L en="Original join timestamp" zh="原始关联时间" />
            </dt>
            <dd>{model.provenance.sourceAt}</dd>
          </div>
        </dl>
        <Notice>
          <L
            en="The installed app may have advanced. This site preserves the recorded snapshot. Exact bundled-binary to OSS-revision equivalence is unverified."
            zh="已安装应用可能已经更新。本站保留已记录的快照，内置二进制与 OSS 提交的精确等价关系尚未验证。"
          />
        </Notice>
      </Section>
      <Section id="gaps" title={bi('What remains open', '仍然未决的部分')}>
        <div className="gaps-grid">
          {[
            [
              'Runtime depth',
              '运行时深度',
              'Scheduled, Pull requests, Security and Explore were captured, not walked end to end. Side-chat sending was not exercised.',
              '定时任务、拉取请求、安全与探索已有截图，但未端到端走查。侧聊发送尚未驱动。',
            ],
            [
              'Version equivalence',
              '版本等价性',
              'The reference protocol and archived desktop package are independent sources. Matching names does not establish a matching binary build.',
              '参考协议与归档桌面包属于独立来源，同名不证明二进制构建一致。',
            ],
            [
              'Dynamic behavior',
              '动态行为',
              'Dynamic expressions, minified aliases and server-provided configuration may escape a static inventory.',
              '动态表达式、压缩别名和服务端配置可能超出静态索引范围。',
            ],
            [
              'Capture provenance',
              '截图溯源',
              'Settings have a matching recapture receipt. Other frames preserve the archived evidence without inventing missing receipts.',
              '设置截图具有匹配的 recapture 回执，其他画面保留归档证据，不补造缺失回执。',
            ],
          ].map(([en, zh, de, dz]) => (
            <article key={en}>
              <h3>
                <L en={en} zh={zh} />
              </h3>
              <p>
                <L en={de} zh={dz} />
              </p>
            </article>
          ))}
        </div>
      </Section>
      <Section id="downloads" title={bi('Inspect the underlying artifacts', '检查底层产物')}>
        <div className="download-links">
          <a href="assets/data/research.json" download>
            <FileCode2 size={18} />
            <L en="Research model · JSON" zh="研究模型 · JSON" />
            <ArrowRight size={15} />
          </a>
          <a href="assets/data/bundle.json" download>
            <GitBranch size={18} />
            <L en="File & import index · JSON" zh="文件与导入索引 · JSON" />
            <ArrowRight size={15} />
          </a>
          <a href="assets/data/build-manifest.json" download>
            <ShieldCheck size={18} />
            <L en="Build provenance · JSON" zh="构建溯源 · JSON" />
            <ArrowRight size={15} />
          </a>
        </div>
      </Section>
    </>
  );
}

export default function Page() {
  const { data } = useAtlas();
  switch (data.page) {
    case 'index':
      return <Overview />;
    case 'three-way':
      return <ExecutionMap />;
    case 'core-api':
      return <CorePage />;
    case 'cloud-api':
      return <CloudPage />;
    case 'shell':
      return <ShellPage />;
    case 'features':
      return <FeaturesPage />;
    case 'gui-map':
      return <GuiPage />;
    case 'bundle':
      return <BundlePage />;
    case 'method':
      return <MethodPage />;
  }
}
