import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  ExternalLink,
  FileCode2,
  Filter,
  GitBranch,
  Info,
  Layers,
  LoaderCircle,
  Search,
  X,
} from 'lucide-react';
import type { AtlasNode, Field, Finding, PreparedCode, SourceRef, Text } from './types';
import {
  bi,
  hashId,
  humanBytes,
  nodeById,
  nodeHref,
  relationZh,
  searchable,
  short,
  t,
} from './model';
import { evidenceLabels } from '../scripts/research/content.mjs';
import { useAtlas } from './state';

export function L({ en, zh }: { en: string; zh: string }) {
  return (
    <>
      <span data-lang="en">{en}</span>
      <span data-lang="zh">{zh}</span>
    </>
  );
}
export function Txt({ value }: { value: Text | undefined }) {
  return value ? <L en={value.en} zh={value.zh} /> : null;
}
export function Bilingual({
  value,
  as: Tag = 'span',
  className = '',
}: {
  value: Text;
  as?: 'span' | 'p' | 'h1';
  className?: string;
}) {
  return (
    <Tag className={className}>
      <span data-lang="en">{value.en}</span>
      <span data-lang="zh">{value.zh}</span>
    </Tag>
  );
}
export function LayerTag({ layer }: { layer: string }) {
  return (
    <span className={`layer-tag ${layer}`}>
      <i />
      {layer === 'core' ? (
        <L en="Core" zh="内核" />
      ) : layer === 'cloud' ? (
        <L en="Cloud" zh="云端" />
      ) : (
        <L en="Shell" zh="壳层" />
      )}
    </span>
  );
}
export function EvidenceTag({ kind }: { kind: string }) {
  const label = (evidenceLabels as Record<string, Text>)[kind] ?? bi(kind, kind);
  return (
    <span className={`evidence-tag ${kind}`}>
      <span aria-hidden="true">
        {kind === 'capture' ? '◉' : kind === 'protocol' ? '▣' : kind === 'callsite' ? '↗' : '◇'}
      </span>
      <Txt value={label} />
    </span>
  );
}
export function Section({
  id,
  title,
  note,
  children,
  action,
}: {
  id: string;
  title: Text;
  note?: Text;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section id={id} className="research-section">
      <div className="section-heading">
        <div>
          <h2>
            <Txt value={title} />
            <a className="anchor" href={`#${id}`} aria-label="Section link">
              #
            </a>
          </h2>
          {note && (
            <p>
              <Txt value={note} />
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Notice({ children, tone = 'info' }: { children: React.ReactNode; tone?: string }) {
  return (
    <div className={`notice ${tone}`}>
      <Info size={16} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
export function Stat({ value, label, note }: { value: React.ReactNode; label: Text; note?: Text }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>
        <Txt value={label} />
      </span>
      {note && (
        <small>
          <Txt value={note} />
        </small>
      )}
    </div>
  );
}

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
export function CodeBlock({
  code,
  title,
  source,
  startLine,
}: {
  code: PreparedCode;
  title?: string;
  source?: SourceRef;
  startLine?: number;
}) {
  const { locale } = useAtlas();
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [wrap, setWrap] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(code.text);
      setCopied(true);
      setFailed(false);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      setFailed(true);
    }
  };
  const clickCode = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a,button,input') || window.getSelection()?.toString())
      return;
    void copy();
  };
  return (
    <div
      className={`code-block ${expanded ? 'expanded' : ''} ${wrap ? 'wrap-code' : ''}`}
      data-testid="code-block"
    >
      <div className="code-toolbar">
        <span className="code-language">{code.language}</span>
        <span className="code-title" title={title}>
          {title ?? <L en="Code excerpt" zh="代码片段" />}
        </span>
        {source?.href && (
          <a
            href={source.href}
            target="_blank"
            rel="noreferrer"
            aria-label={locale === 'zh' ? '在 GitHub 查看源码' : 'View source on GitHub'}
          >
            <ExternalLink size={14} />
          </a>
        )}
        <button
          type="button"
          onClick={() => setWrap(!wrap)}
          aria-pressed={wrap}
          title={locale === 'zh' ? '切换换行' : 'Toggle line wrapping'}
        >
          ↵
        </button>
        <button
          type="button"
          className="copy-button"
          onClick={() => void copy()}
          aria-label={locale === 'zh' ? '复制代码' : 'Copy code'}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? <L en="Copied" zh="已复制" /> : <L en="Copy" zh="复制" />}</span>
        </button>
      </div>
      <div
        className="code-body"
        onClick={clickCode}
        style={{ '--start-line': startLine ?? 1 } as React.CSSProperties}
        dangerouslySetInnerHTML={{
          __html: code.html || `<pre><code>${escape(code.text)}</code></pre>`,
        }}
      />
      {(code.text.split('\n').length > 9 || code.text.length > 750) && (
        <button className="code-expand" onClick={() => setExpanded(!expanded)}>
          {expanded ? (
            <L en="Collapse excerpt" zh="折叠片段" />
          ) : (
            <L en="Expand full excerpt" zh="展开完整片段" />
          )}
          <ChevronDown size={13} />
        </button>
      )}
      <span className="sr-only" role="status">
        {copied ? (locale === 'zh' ? '代码已复制' : 'Code copied') : ''}
      </span>
      {failed && (
        <div className="copy-failure" role="status">
          <L
            en="Clipboard is unavailable. Select the code and copy it manually."
            zh="剪贴板不可用，请选择代码后手动复制。"
          />
        </div>
      )}
    </div>
  );
}

export function SourceCard({ id, initialOpen = false }: { id: string; initialOpen?: boolean }) {
  const { model, getSource, locale } = useAtlas();
  const initial = model.sources.find((s) => s.id === id);
  const [source, setSource] = useState<SourceRef | undefined>(
    initial?.excerpt ? initial : undefined
  );
  const meta = source ?? initial;
  const [open, setOpen] = useState(initialOpen);
  const [failed, setFailed] = useState(false);
  const [formatted, setFormatted] = useState(true);
  useEffect(() => {
    let live = true;
    if ((open || !initial) && !source)
      getSource(id)
        .then((s) => {
          if (live) setSource(s);
        })
        .catch(() => {
          if (live) setFailed(true);
        });
    return () => {
      live = false;
    };
  }, [open, source, id, getSource, initial]);
  return (
    <div className="source-card" id={id}>
      <div className="source-heading">
        <FileCode2 size={15} />
        <button onClick={() => setOpen(!open)} aria-expanded={open}>
          <span title={meta?.path ?? id}>{meta?.path ?? id}</span>
          <small>
            {meta?.lineStart
              ? `L${meta.lineStart}${meta.lineEnd !== meta.lineStart ? '–' + meta.lineEnd : ''}`
              : ''}
            {meta?.revision ? ' · ' + meta.revision.slice(0, 9) : ''}
          </small>
        </button>
        {meta?.href && (
          <a href={meta.href} target="_blank" rel="noreferrer" title="GitHub">
            <ExternalLink size={14} />
          </a>
        )}
      </div>
      {open && (
        <div className="source-content">
          {source ? (
            <>
              <div className="source-meta">
                <EvidenceTag kind={source.kind} />
                {source.formatted && (
                  <button className="text-button" onClick={() => setFormatted(!formatted)}>
                    {formatted ? (
                      <L en="Show original" zh="查看原始片段" />
                    ) : (
                      <L en="Format for reading" zh="格式化阅读" />
                    )}
                  </button>
                )}
              </div>
              {source.note && (
                <p className="small muted">
                  <Txt value={source.note} />
                </p>
              )}
              <CodeBlock
                code={{
                  text: formatted && source.formatted ? source.formatted : source.excerpt,
                  html:
                    formatted && source.formatted
                      ? (source.formattedHtml ?? '')
                      : (source.html ?? ''),
                  language: source.language,
                }}
                title={
                  formatted && source.formatted
                    ? locale === 'zh'
                      ? '格式化展示 · 原始定位保留'
                      : 'Formatted display · original locator retained'
                    : undefined
                }
                source={source}
                startLine={formatted && source.formatted ? undefined : source.lineStart}
              />
              <details className="provenance-detail">
                <summary>
                  <L en="Fingerprint & original location" zh="摘要与原始定位" />
                </summary>
                <dl>
                  <dt>SHA-256</dt>
                  <dd>
                    <code>{source.sha256}</code>
                  </dd>
                  <dt>
                    <L en="Excerpt" zh="片段" />
                  </dt>
                  <dd>
                    <code>{source.excerptSha256}</code>
                  </dd>
                  {source.byteStart !== undefined && (
                    <>
                      <dt>
                        <L en="UTF-8 bytes" zh="UTF-8 字节" />
                      </dt>
                      <dd>
                        {source.byteStart}–{source.byteEnd}
                      </dd>
                    </>
                  )}
                </dl>
              </details>
            </>
          ) : failed ? (
            <p className="small" role="alert">
              <L
                en="Evidence could not be loaded. Serve the site over HTTP and retry."
                zh="证据未能加载，请通过 HTTP 提供站点后重试。"
              />
              <button
                className="text-button"
                onClick={() => {
                  setFailed(false);
                  void getSource(id)
                    .then(setSource)
                    .catch(() => setFailed(true));
                }}
              >
                <L en="Retry" zh="重试" />
              </button>
            </p>
          ) : (
            <p className="loading">
              <LoaderCircle size={15} />
              <L en="Loading excerpt…" zh="正在加载片段…" />
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function FilterBar({ placeholder, extra }: { placeholder?: Text; extra?: React.ReactNode }) {
  const { locale, query, setQuery, layer, setLayer } = useAtlas();
  return (
    <div className="filter-bar">
      <label className="search-input">
        <Search size={16} />
        <span className="sr-only">
          <L en="Search this page" zh="搜索此页" />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            placeholder ?? bi('Search names, methods, paths…', '搜索名称、方法、路径…'),
            locale
          )}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label={locale === 'zh' ? '清空搜索' : 'Clear search'}
          >
            <X size={14} />
          </button>
        )}
      </label>
      <label className="select-control">
        <Filter size={14} />
        <select
          aria-label={locale === 'zh' ? '执行层筛选' : 'Execution layer filter'}
          value={layer}
          onChange={(e) => setLayer(e.target.value)}
        >
          <option value="all">{locale === 'zh' ? '全部执行层' : 'All layers'}</option>
          <option value="core">Core</option>
          <option value="cloud">Cloud</option>
          <option value="shell">Shell</option>
        </select>
      </label>
      {extra}
    </div>
  );
}
export function Catalog({
  items,
  label,
  renderMeta,
  pageSize = 24,
}: {
  items: AtlasNode[];
  label?: Text;
  renderMeta?: (n: AtlasNode) => React.ReactNode;
  pageSize?: number;
}) {
  const { model, query, layer, select, locale } = useAtlas();
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return items.filter(
      (n) =>
        (layer === 'all' || n.layers.includes(layer as never)) &&
        (!q || searchable(n, model).includes(q))
    );
  }, [items, model, query, layer]);
  useEffect(() => setPage(0), [query, layer, items.length]);
  const total = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, total - 1);
  const visible = filtered.slice(current * pageSize, (current + 1) * pageSize);
  return (
    <div className="catalog">
      <div className="catalog-caption">
        <span>{label ? <Txt value={label} /> : <L en="Complete inventory" zh="完整目录" />}</span>
        <span aria-live="polite">
          {filtered.length.toLocaleString(locale)} <L en="matches" zh="项匹配" />
        </span>
      </div>
      {visible.length ? (
        <div className="catalog-rows">
          {visible.map((n) => (
            <button
              className="catalog-row"
              key={n.id}
              onClick={() => select(n.id)}
              data-node-id={n.id}
            >
              <span className={`node-mark ${n.layers[0] ?? ''}`} aria-hidden="true">
                {n.kind === 'module' ? (
                  <FileCode2 size={17} />
                ) : n.kind === 'surface' ? (
                  <Layers size={17} />
                ) : (
                  <Code2 size={17} />
                )}
              </span>
              <span className="catalog-label">
                <strong>{t(n.label, locale)}</strong>
                <small>
                  {n.kind === 'method' || n.kind === 'endpoint' || n.kind === 'ipc'
                    ? (n.group ?? n.kind)
                    : t(n.summary, locale)}
                </small>
              </span>
              <span className="catalog-meta">
                {renderMeta ? renderMeta(n) : n.layers.map((l) => <LayerTag key={l} layer={l} />)}
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Search size={24} />
          <h3>
            <L en="No matching records" zh="没有匹配记录" />
          </h3>
          <p>
            <L
              en="Try a shorter query or another execution layer."
              zh="试试更短的关键词，或切换执行层。"
            />
          </p>
        </div>
      )}
      <div className="pagination">
        <span>
          <L en="All records remain searchable." zh="全部记录均可搜索。" />
        </span>
        <div>
          <button
            onClick={() => setPage(current - 1)}
            disabled={current === 0}
            aria-label={locale === 'zh' ? '上一页' : 'Previous page'}
          >
            <ChevronLeft size={15} />
          </button>
          <span>
            {current + 1} / {total}
          </span>
          <button
            onClick={() => setPage(current + 1)}
            disabled={current >= total - 1}
            aria-label={locale === 'zh' ? '下一页' : 'Next page'}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
export function NodeButton({ id, children }: { id: string; children?: React.ReactNode }) {
  const { model, select, locale } = useAtlas();
  const n = nodeById(model, id);
  return (
    <button className="node-link" onClick={() => select(id)}>
      {children ?? (n ? t(n.label, locale) : id)}
      <ArrowRight size={13} />
    </button>
  );
}
export function FindingCard({ finding, compact = false }: { finding: Finding; compact?: boolean }) {
  const { select } = useAtlas();
  return (
    <article className={`finding-card ${compact ? 'compact' : ''}`}>
      <span className="eyebrow">
        <GitBranch size={13} />
        <L en="Research finding" zh="研究发现" />
      </span>
      <h3>
        <Txt value={finding.title} />
      </h3>
      <p>
        <Txt value={finding.body} />
      </p>
      {!compact && (
        <p className="finding-limit">
          <Txt value={finding.limit} />
        </p>
      )}
      <button className="text-button" onClick={() => select(`finding:${finding.id}`)}>
        <L en="Inspect the evidence" zh="查看证据" />
        <ArrowRight size={14} />
      </button>
    </article>
  );
}
function Fields({ fields, title }: { fields: Field[]; title: Text }) {
  return (
    <div className="field-section">
      <h3>
        <Txt value={title} />
        <span>{fields.length}</span>
      </h3>
      {fields.length ? (
        <div className="fields">
          {fields.map((f) => (
            <details key={f.name}>
              <summary>
                <code>{f.name}</code>
                <span className="field-type">{f.type}</span>
                {f.required && (
                  <span className="required-dot" title="Required">
                    *
                  </span>
                )}
              </summary>
              <p>
                {f.description || (
                  <L en="No description in the reference schema." zh="参考 Schema 未提供说明。" />
                )}
              </p>
            </details>
          ))}
        </div>
      ) : (
        <p className="small muted">
          <L
            en="No object fields recovered for this surface; inspect the source declaration."
            zh="此接口未提取到对象字段，请查看源码声明。"
          />
        </p>
      )}
    </div>
  );
}

export function DetailPanel() {
  const { model, selected, select, locale } = useAtlas();
  const dialog = useRef<HTMLDialogElement>(null);
  const [narrow, setNarrow] = useState(false);
  const [relationsOpen, setRelationsOpen] = useState(false);
  const prior = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const media = matchMedia('(max-width: 1199px)');
    const f = () => setNarrow(media.matches);
    f();
    media.addEventListener('change', f);
    return () => media.removeEventListener('change', f);
  }, []);
  useEffect(() => {
    setRelationsOpen(false);
  }, [selected]);
  useEffect(() => {
    if (!selected) return;
    prior.current = document.activeElement as HTMLElement;
    if (narrow) dialog.current?.showModal();
    return () => {
      dialog.current?.close();
      prior.current?.focus?.();
    };
  }, [selected, narrow]);
  const node = nodeById(model, selected);
  const finding = selected.startsWith('finding:')
    ? model.findings.find((f) => `finding:${f.id}` === selected)
    : undefined;
  if (!selected || (!node && !finding)) return null;
  const method = model.methods.find((m) => m.id === selected);
  const ep = model.endpoints.find((m) => m.id === selected);
  const ipc = model.ipc.find((m) => m.id === selected);
  const mod = model.bundle.modules.find((m) => m.id === selected);
  const capture = model.captures.find((c) => c.id === selected);
  const cap = model.capabilities.find((c) => `cap:${c.id}` === selected);
  const related = model.relations.filter((e) => e.from === selected || e.to === selected);
  const ids = [...new Set(related.map((e) => (e.from === selected ? e.to : e.from)))];
  const sourceIds = finding?.sourceIds ?? node?.sourceIds ?? [];
  const body = (
    <>
      <div className="inspector-header">
        <span className="eyebrow">
          <L en="Evidence inspector" zh="证据查看器" />
        </span>
        <button
          className="icon-button"
          onClick={() => select('')}
          aria-label={locale === 'zh' ? '关闭详情' : 'Close details'}
        >
          <X size={18} />
        </button>
      </div>
      <div className="inspector-scroll">
        <div className="inspector-title">
          <span className="kind-label">{finding ? <L en="Finding" zh="洞察" /> : node?.kind}</span>
          <h2>
            <Txt value={finding?.title ?? node?.label} />
          </h2>
          <p>
            <Txt value={finding?.body ?? node?.summary} />
          </p>
          <div className="tag-row">
            {node?.layers.map((l) => (
              <LayerTag key={l} layer={l} />
            ))}
            {node?.evidence.map((k) => (
              <EvidenceTag key={k} kind={k} />
            ))}
          </div>
          {node && (
            <a className="text-button" href={nodeHref(node)}>
              <L en="Open its page" zh="打开对应页面" />
              <ExternalLink size={13} />
            </a>
          )}
        </div>
        {finding && (
          <Notice>
            <Txt value={finding.limit} />
          </Notice>
        )}
        {method && (
          <>
            <dl className="metadata">
              <dt>
                <L en="Channel" zh="通道" />
              </dt>
              <dd>{method.channel}</dd>
              <dt>
                <L en="Direction" zh="方向" />
              </dt>
              <dd>{method.direction}</dd>
              <dt>
                <L en="Bundle literal" zh="包内字面量" />
              </dt>
              <dd>
                {method.presentInApp ? (
                  <L en="Found in archived scan" zh="归档扫描中已发现" />
                ) : (
                  <L en="Not found in archived scan" zh="归档扫描中未发现" />
                )}
              </dd>
              <dt>
                <L en="Parameters" zh="参数" />
              </dt>
              <dd>
                <code>{method.params ?? '—'}</code>
              </dd>
              <dt>
                <L en="Response" zh="响应" />
              </dt>
              <dd>
                <code>{method.response ?? '—'}</code>
              </dd>
            </dl>
            <Notice>
              <L
                en="A literal match is not proof of execution. The OSS reference revision is pinned; its exact match to the bundled binary is unverified."
                zh="字面量匹配不证明执行。OSS 参考版本已固定，其与内置二进制的精确匹配尚未验证。"
              />
            </Notice>
            <Fields fields={method.fields} title={bi('Input structure', '输入结构')} />
            <Fields fields={method.resultFields} title={bi('Response structure', '响应结构')} />
          </>
        )}
        {ep && (
          <>
            <dl className="metadata">
              <dt>HTTP</dt>
              <dd>{ep.verbs.join(' / ') || <L en="Unresolved" zh="未解析" />}</dd>
              <dt>
                <L en="Service" zh="服务" />
              </dt>
              <dd>{ep.service}</dd>
              <dt>
                <L en="Observed in" zh="发现于" />
              </dt>
              <dd>{ep.layers.join(', ') || '—'}</dd>
              <dt>
                <L en="Baseline" zh="基线" />
              </dt>
              <dd>
                {ep.baseline ? (
                  <L en="Original path inventory" zh="原始路径清单" />
                ) : (
                  <L en="Added by AST extraction" zh="AST 提取新增" />
                )}
              </dd>
            </dl>
            <Notice>
              <L
                en="Static HTTP-shaped call. Authorization, runtime host and response schema are not established."
                zh="静态 HTTP 风格调用；授权结果、实际主机与响应 Schema 尚未得到证明。"
              />
            </Notice>
            {ep.inputs.length > 0 && (
              <div className="field-section">
                <h3>
                  <L en="Argument expressions" zh="参数表达式" />
                </h3>
                {ep.inputs.slice(0, 3).map((a, i) => (
                  <p className="argument" key={i}>
                    <code>{a}</code>
                  </p>
                ))}
              </div>
            )}
            <p className="small muted">
              <L
                en="The complete call expression is preserved in the evidence below."
                zh="完整调用表达式保留在下方证据中。"
              />
            </p>
          </>
        )}
        {ipc && (
          <>
            <dl className="metadata">
              <dt>
                <L en="Channel" zh="通道" />
              </dt>
              <dd>
                <code>{ipc.channel}</code>
              </dd>
              <dt>
                <L en="Operations" zh="操作" />
              </dt>
              <dd>{ipc.roles.join(' · ') || <L en="Literal only" zh="仅字面量" />}</dd>
            </dl>
            <Notice>
              <L
                en="Registration, invocation and handling are separate evidence. A registered channel may never be invoked."
                zh="注册、调用与处理是不同证据，已注册通道可能从未被调用。"
              />
            </Notice>
          </>
        )}
        {mod && (
          <>
            <dl className="metadata">
              <dt>
                <L en="File" zh="文件" />
              </dt>
              <dd>
                <code>{mod.path}</code>
              </dd>
              <dt>
                <L en="Unpacked size" zh="解包大小" />
              </dt>
              <dd>{humanBytes(mod.bytes)}</dd>
              <dt>
                <L en="Family" zh="模块族" />
              </dt>
              <dd>{mod.family}</dd>
              <dt>
                <L en="AST" zh="AST" />
              </dt>
              <dd>
                {mod.parsed === null ? (
                  <L en="Not JavaScript" zh="非 JavaScript" />
                ) : mod.parsed ? (
                  <L en="Parsed" zh="已解析" />
                ) : (
                  mod.parseError
                )}
              </dd>
              <dt>SHA-256</dt>
              <dd>
                <code>{mod.sha256}</code>
              </dd>
            </dl>
            <h3>
              <L en="Imports / requires" zh="导入／require" /> <small>{mod.imports.length}</small>
            </h3>
            <div className="relation-list">
              {mod.imports.map((im, i) => (
                <div key={i}>
                  <span className="kind-label">{im.dynamic ? 'dynamic' : 'static'}</span>
                  {model.bundle.modules.some((m) => m.path === im.target) ? (
                    <NodeButton id={`mod:${im.target}`}>{short(im.target, 48)}</NodeButton>
                  ) : (
                    <code>{im.target}</code>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
        {capture && (
          <>
            <a href={capture.src} target="_blank" rel="noreferrer">
              <img className="inspector-shot" src={capture.src} alt={t(capture.label, locale)} />
            </a>
            <dl className="metadata">
              <dt>
                <L en="Entry" zh="进入路径" />
              </dt>
              <dd>
                <Txt value={capture.how} />
              </dd>
              <dt>
                <L en="Scope" zh="作用域" />
              </dt>
              <dd>
                <Txt value={capture.scope} />
              </dd>
              <dt>
                <L en="Capture receipt" zh="截图回执" />
              </dt>
              <dd>
                {capture.receipt ? (
                  <L en="Recorded in recapture results" zh="记录于 recapture 结果" />
                ) : (
                  <L
                    en="Archived frame; no matching recapture receipt"
                    zh="归档画面；无匹配的 recapture 回执"
                  />
                )}
              </dd>
            </dl>
            <Notice>
              <L
                en="This is an archived image, not a live app. Frame names and domain links do not prove that an action ran."
                zh="这是归档图片，并非实时应用。画面名称与领域关联不证明动作已执行。"
              />
            </Notice>
          </>
        )}
        {cap && (
          <div className="inspector-stats">
            <Stat value={cap.core.total} label={bi('Core declarations', '内核声明')} />
            <Stat value={cap.cloud.total} label={bi('Cloud paths', '云端路径')} />
            <Stat value={cap.shell.total} label={bi('IPC channels', 'IPC 通道')} />
          </div>
        )}
        {ids.length > 0 && (
          <div className="field-section">
            <h3>
              <L en="Related records" zh="关联记录" />
              <span>{ids.length}</span>
            </h3>
            <p className="small muted">
              <L
                en="Domain associations are analytical mappings. Inspect each endpoint for direct source evidence."
                zh="领域关联属于分析映射，请逐项查看直接源码证据。"
              />
            </p>
            <div className="relation-list">
              {(relationsOpen ? ids : ids.slice(0, 12)).map((id) => (
                <NodeButton id={id} key={id} />
              ))}
            </div>
            {ids.length > 12 && (
              <button className="text-button" onClick={() => setRelationsOpen(!relationsOpen)}>
                {relationsOpen ? (
                  <L en="Show fewer" zh="收起" />
                ) : (
                  <L en={`Show all ${ids.length} relations`} zh={`显示全部 ${ids.length} 条关系`} />
                )}
                <ChevronDown size={14} />
              </button>
            )}
          </div>
        )}
        <div className="field-section">
          <h3>
            <L en="Source evidence" zh="来源证据" />
            <span>{sourceIds.length}</span>
          </h3>
          {sourceIds.length ? (
            sourceIds.map((id, i) => <SourceCard key={id} id={id} initialOpen={i === 0} />)
          ) : (
            <Notice>
              <L
                en="This record is an analytical grouping. Its linked members carry the underlying evidence."
                zh="本记录为分析分组，底层证据位于关联成员中。"
              />
            </Notice>
          )}
        </div>
      </div>
    </>
  );
  return narrow ? (
    <dialog className="inspector-dialog" ref={dialog} onCancel={() => select('')}>
      {body}
    </dialog>
  ) : (
    <aside className="inspector" aria-label={locale === 'zh' ? '证据详情' : 'Evidence details'}>
      {body}
    </aside>
  );
}
