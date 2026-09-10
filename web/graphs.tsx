import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Code2,
  GitBranch,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  edgeTone,
  graphFor,
  graphTitleLines,
  graphBrand,
  type GraphSpec,
  t,
  nodeById,
  nodeHref,
  bi,
} from './model';
import { layoutGraph } from './layout.mjs';
import type { GraphLayout, Scenario } from './types';
import { useAtlas, useUrlState } from './state';
import { CodeBlock, L, LayerTag, NodeButton, Notice, SourceCard, Txt } from './components';
const FlowCanvas = lazy(() => import('./FlowCanvas'));

function StaticGraph({
  spec,
  layout,
  onPick,
}: {
  spec: GraphSpec;
  layout: GraphLayout;
  onPick: (id: string) => void;
}) {
  const { locale, model } = useAtlas();
  const id = useId().replaceAll(':', '');
  return (
    <svg
      className="static-graph"
      style={{
        minWidth: layout.width * (locale === 'zh' ? 0.95 : 0.9),
        minHeight: layout.height * (locale === 'zh' ? 0.95 : 0.9),
      }}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
    >
      <title id={`${id}-title`}>{t(spec.title, locale)}</title>
      <desc id={`${id}-desc`}>{t(spec.description, locale)}</desc>
      <defs>
        <marker
          id={`${id}-arrow`}
          viewBox="0 0 8 6"
          refX="7"
          refY="3"
          markerWidth="8"
          markerHeight="6"
          orient="auto"
        >
          <path d="M0 0 L8 3 L0 6z" fill="var(--edge-neutral)" />
        </marker>
      </defs>
      {spec.edges.map((e) => {
        const d = layout.edges[e.id];
        return (
          d && (
            <g key={e.id}>
              <path
                d={d.path}
                fill="none"
                stroke={`var(--edge-${edgeTone(spec, e)})`}
                strokeWidth="2.25"
                strokeDasharray={e.inferred ? '7 5' : undefined}
                markerEnd={`url(#${id}-arrow)`}
              />
              <rect
                x={d.labelX - 50}
                y={d.labelY - 12}
                width="100"
                height="24"
                rx="3"
                fill="var(--surface)"
              />
              <text x={d.labelX} y={d.labelY + 4} textAnchor="middle" className="svg-edge-label">
                {t(e.label, locale)}
              </text>
            </g>
          )
        );
      })}
      {spec.nodes.map((n) => {
        const p = layout.nodes[n.id];
        const target = nodeById(model, n.target ?? n.id);
        const lines = graphTitleLines(t(n.label, locale));
        const brand = graphBrand(n);
        return (
          p && (
            <a
              key={n.id}
              href={target ? nodeHref(target) : '#catalog'}
              onClick={(e) => {
                e.preventDefault();
                onPick(n.target ?? n.id);
              }}
              className={`svg-node ${n.layer ?? ''}`}
              aria-label={t(n.label, locale)}
            >
              <rect
                x={p.x}
                y={p.y}
                width={p.width}
                height={p.height}
                rx="7"
                fill="var(--surface)"
                stroke="var(--node-border,var(--line-strong))"
              />
              <rect
                x={p.x}
                y={p.y + 20}
                width="3"
                height={p.height - 40}
                rx="1"
                fill="var(--node-accent,var(--muted))"
              />
              {brand && (
                <image
                  className="official-logo"
                  href={`assets/logos/${brand}.svg`}
                  x={p.x + 18}
                  y={p.y + 10}
                  width="16"
                  height="16"
                />
              )}
              <text x={p.x + (brand ? 42 : 18)} y={p.y + 23} className="svg-eyebrow">
                {n.layer?.toUpperCase() ?? (locale === 'zh' ? '研究映射' : 'RESEARCH MAP')}
              </text>
              <text x={p.x + 18} y={p.y + (lines.length > 1 ? 45 : 52)} className="svg-node-title">
                {lines.map((line, i) => (
                  <tspan key={i} x={p.x + 18} dy={i ? 20 : 0}>
                    {line}
                  </tspan>
                ))}
              </text>
              <text x={p.x + 18} y={p.y + 88} className="svg-node-detail">
                {t(n.detail, locale).slice(0, 34)}
              </text>
            </a>
          )
        );
      })}
    </svg>
  );
}
export function GraphExplorer({ focus: externalFocus }: { focus?: string }) {
  const { data, model, locale, select } = useAtlas();
  const [focus, setFocus] = useUrlState('focus', '');
  const [interactive, setInteractive] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const saved = new URLSearchParams(location.search).get('graph');
    setInteractive(
      saved === 'interactive' || (saved !== 'static' && matchMedia('(min-width: 768px)').matches)
    );
  }, []);
  const toggleInteractive = () => {
    const next = !interactive;
    setInteractive(next);
    const url = new URL(location.href);
    url.searchParams.set('graph', next ? 'interactive' : 'static');
    history.replaceState({}, '', url);
  };
  const focusId = externalFocus ?? focus;
  const spec = useMemo(() => graphFor(data.page, model, focusId), [data.page, model, focusId]);
  const [layout, setLayout] = useState<GraphLayout>(data.graphLayout);
  const [readySpec, setReadySpec] = useState(spec);
  useEffect(() => {
    let active = true;
    setError('');
    const prepared = focusId ? data.scopeLayouts?.[focusId] : data.graphLayout;
    if (prepared) {
      setLayout(prepared);
      setReadySpec(spec);
      return;
    }
    layoutGraph(spec)
      .then((l: GraphLayout) => {
        if (active) {
          setLayout(l);
          setReadySpec(spec);
        }
      })
      .catch(() => {
        if (active)
          setError(
            locale === 'zh'
              ? '布局暂不可用，保留静态总览。'
              : 'Layout unavailable; the static overview remains visible.'
          );
      });
    return () => {
      active = false;
    };
  }, [spec, locale, focusId, data.graphLayout, data.scopeLayouts]);
  useEffect(() => {
    const f = () => setFullscreen(document.fullscreenElement === box.current);
    document.addEventListener('fullscreenchange', f);
    return () => document.removeEventListener('fullscreenchange', f);
  }, []);
  const pick = useCallback(
    (id: string) => {
      if (id === 'more') {
        if (focusId) select(focusId);
        else document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      if (nodeById(model, id) || id.startsWith('finding:')) select(id);
    },
    [model, select, focusId]
  );
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await box.current?.requestFullscreen();
    } catch {
      setFullscreen((v) => !v);
    }
  };
  return (
    <div
      className={`graph-shell ${fullscreen ? 'is-fullscreen' : ''} ${interactive ? 'interactive' : ''}`}
      ref={box}
      style={
        {
          '--graph-height': `${Math.max(440, Math.min(780, layout.height * 0.95))}px`,
        } as React.CSSProperties
      }
    >
      <div className="graph-toolbar">
        <div>
          <GitBranch size={15} />
          <strong>
            <Txt value={spec.title} />
          </strong>
        </div>
        <div className="graph-actions">
          {!externalFocus && (
            <select
              aria-label={locale === 'zh' ? '图谱范围' : 'Graph scope'}
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
            >
              <option value="">{locale === 'zh' ? '总览' : 'Overview'}</option>
              {model.contexts.map((c) => (
                <option value={`context:${c.id}`} key={c.id}>
                  {t(c.label, locale)}
                </option>
              ))}
              {model.capabilities.map((c) => (
                <option value={`cap:${c.id}`} key={c.id}>
                  {locale === 'zh' ? c.zh : c.title}
                </option>
              ))}
            </select>
          )}
          <button onClick={toggleInteractive} aria-pressed={interactive}>
            <L
              en={interactive ? 'Reading layout' : 'Interactive canvas'}
              zh={interactive ? '阅读布局' : '交互画布'}
            />
          </button>
          {!focusId && (
            <button onClick={() => setShowCode(!showCode)} aria-pressed={showCode} title="Mermaid">
              <Code2 size={15} />
            </button>
          )}
          <button
            onClick={() => void toggleFullscreen()}
            aria-label={locale === 'zh' ? '切换全屏' : 'Toggle fullscreen'}
          >
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>
      <ol className="graph-node-list">
        {readySpec.nodes.map((n) => (
          <li key={n.id}>
            <button onClick={() => pick(n.target ?? n.id)}>
              <strong>{t(n.label, locale)}</strong>
              <small>{t(n.detail, locale)}</small>
              <ArrowRight size={14} />
            </button>
          </li>
        ))}
      </ol>
      <div className="graph-canvas">
        {interactive ? (
          <Suspense fallback={<StaticGraph spec={readySpec} layout={layout} onPick={pick} />}>
            <FlowCanvas spec={readySpec} layout={layout} onPick={pick} />
          </Suspense>
        ) : (
          <StaticGraph spec={readySpec} layout={layout} onPick={pick} />
        )}
      </div>
      <div className="graph-legend">
        <span>
          <i className="legend-dash" />
          <L en="Analytical relationship" zh="分析关系" />
        </span>
        <span>
          <i className="legend-line" />
          <L en="Declared direction / import" zh="声明方向／导入" />
        </span>
        <div>
          <LayerTag layer="core" />
          <LayerTag layer="cloud" />
          <LayerTag layer="shell" />
        </div>
      </div>
      {error && <Notice>{error}</Notice>}
      {showCode && data.code[`mermaid:${data.page}`] && (
        <CodeBlock code={data.code[`mermaid:${data.page}`]} title="Mermaid · same graph model" />
      )}
    </div>
  );
}

export function ScenarioPlayer({ scenario }: { scenario: Scenario }) {
  const { locale } = useAtlas();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sources, setSources] = useState(false);
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const q = matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => {
      setReduce(q.matches);
      if (q.matches) setPlaying(false);
    };
    changed();
    q.addEventListener('change', changed);
    return () => q.removeEventListener('change', changed);
  }, []);
  useEffect(() => {
    if (!playing || reduce) return;
    const timer = setTimeout(() => {
      if (step === scenario.steps.length - 1) setPlaying(false);
      else setStep(step + 1);
    }, 2800);
    return () => clearTimeout(timer);
  }, [playing, step, scenario.steps.length, reduce]);
  const s = scenario.steps[step];
  return (
    <div className="scenario">
      <div className="scenario-heading">
        <div>
          <span className="eyebrow">
            <L en="Guided reading" zh="逐步解读" />
          </span>
          <h3>
            <Txt value={scenario.title} />
          </h3>
          <p>
            <Txt value={scenario.summary} />
          </p>
        </div>
        <span className="scenario-counter">
          {String(step + 1).padStart(2, '0')}
          <small> / {String(scenario.steps.length).padStart(2, '0')}</small>
        </span>
      </div>
      <nav className="step-nav" aria-label={locale === 'zh' ? '解读步骤' : 'Reading steps'}>
        {scenario.steps.map((s, i) => (
          <button
            key={i}
            onClick={() => {
              setStep(i);
              setPlaying(false);
            }}
            aria-current={step === i ? 'step' : undefined}
          >
            <span>{i + 1}</span>
            <Txt value={s.title} />
          </button>
        ))}
      </nav>
      <div className="scenario-body" aria-live={playing ? 'off' : 'polite'}>
        <div className="step-glyph" aria-hidden="true">
          {step + 1}
        </div>
        <div>
          <h4>
            <Txt value={s.title} />
          </h4>
          <p>
            <Txt value={s.body} />
          </p>
          <div className="step-links">
            {s.nodeIds.map((id) => (
              <NodeButton key={id} id={id} />
            ))}
          </div>
        </div>
      </div>
      <div className="scenario-controls">
        <div>
          <button
            className="icon-button"
            onClick={() => {
              setStep(Math.max(0, step - 1));
              setPlaying(false);
            }}
            disabled={step === 0}
            aria-label={locale === 'zh' ? '上一步' : 'Previous step'}
          >
            <ArrowLeft size={16} />
          </button>
          <button onClick={() => setPlaying(!playing)} disabled={reduce}>
            {playing ? <Pause size={15} /> : <Play size={15} />}
            <L en={playing ? 'Pause' : 'Play'} zh={playing ? '暂停' : '播放'} />
          </button>
          <button
            className="icon-button"
            onClick={() => {
              setStep(Math.min(scenario.steps.length - 1, step + 1));
              setPlaying(false);
            }}
            disabled={step === scenario.steps.length - 1}
            aria-label={locale === 'zh' ? '下一步' : 'Next step'}
          >
            <ArrowRight size={16} />
          </button>
          <button
            className="icon-button"
            onClick={() => {
              setStep(0);
              setPlaying(false);
            }}
            aria-label={locale === 'zh' ? '重置解读' : 'Reset walkthrough'}
          >
            <RotateCcw size={14} />
          </button>
        </div>
        <button
          className="text-button"
          onClick={() => setSources(!sources)}
          aria-expanded={sources}
        >
          <L en="Step evidence" zh="本步证据" /> ({s.sourceIds.length})
        </button>
      </div>
      {sources && (
        <div className="scenario-sources">
          {s.sourceIds.length ? (
            s.sourceIds.map((id) => <SourceCard key={id} id={id} initialOpen />)
          ) : (
            <Notice>
              <L
                en="This is an interpretive step; follow its related records for evidence."
                zh="此步为解读，请通过关联记录查看证据。"
              />
            </Notice>
          )}
        </div>
      )}
      <details className="transcript">
        <summary>
          <L en="Read the complete walkthrough" zh="阅读完整解读" />
        </summary>
        <ol>
          {scenario.steps.map((s, i) => (
            <li key={i}>
              <strong>
                <Txt value={s.title} />
              </strong>
              <p>
                <Txt value={s.body} />
              </p>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
