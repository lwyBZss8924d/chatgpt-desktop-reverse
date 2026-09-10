import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  BaseEdge,
  EdgeLabelRenderer,
  Handle,
  MiniMap,
  Panel,
  Position,
  useReactFlow,
  useViewport,
  type EdgeProps,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import { Map, Minus, Plus, Scan } from 'lucide-react';
import '@xyflow/react/dist/style.css';
import type { GraphSpec, GraphNode } from './model';
import { edgeTone, graphBrand, short, t } from './model';
import type { GraphLayout } from './types';
import { useAtlas } from './state';
type AtlasFlowNode = Node<
  {
    info: GraphNode;
    label: string;
    detail: string;
    inputs: string[];
    outputs: string[];
    inspect: () => void;
  },
  'atlas'
>;

function ResearchNode({ data }: NodeProps<AtlasFlowNode>) {
  return (
    <>
      {data.inputs.map((id, i) => (
        <Handle
          key={id}
          type="target"
          position={Position.Left}
          id={id}
          style={{ top: `${(100 * (i + 1)) / (data.inputs.length + 1)}%` }}
        />
      ))}
      <button
        className={`flow-node ${data.info.layer ?? ''}`}
        onClick={data.inspect}
        title={data.label}
      >
        <span className="flow-node-kind">
          {graphBrand(data.info) && (
            <img
              className="official-logo"
              src={`assets/logos/${graphBrand(data.info)}.svg`}
              alt=""
            />
          )}
          {data.info.layer ?? data.detail}
        </span>
        <strong>{data.label}</strong>
        <small>
          {short(data.detail, 36)}
          {data.info.count ? ` · ${data.info.count}` : ''}
        </small>
      </button>
      {data.outputs.map((id, i) => (
        <Handle
          key={id}
          type="source"
          position={Position.Right}
          id={id}
          style={{ top: `${(100 * (i + 1)) / (data.outputs.length + 1)}%` }}
        />
      ))}
    </>
  );
}
function ResearchEdge(props: EdgeProps) {
  const d = props.data as {
    path: string;
    labelX: number;
    labelY: number;
    label: string;
    inferred: boolean;
    dim: boolean;
    active: boolean;
    tone: string;
    markerId: string;
  };
  return (
    <>
      <BaseEdge
        id={props.id}
        path={d.path}
        markerEnd={`url(#${d.markerId})`}
        style={{
          stroke: `var(--edge-${d.active ? 'active' : d.tone})`,
          strokeWidth: d.active ? 3 : 2.25,
          strokeDasharray: d.inferred ? '7 5' : undefined,
          opacity: d.dim ? 0.65 : 1,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={`edge-label ${d.active ? 'active' : ''}`}
          style={{
            transform: `translate(-50%, -50%) translate(${d.labelX}px,${d.labelY}px)`,
            opacity: d.dim ? 0.85 : 1,
          }}
        >
          {d.label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
const nodeTypes = { atlas: ResearchNode };
const edgeTypes = { research: ResearchEdge };

function FitViewport({ layout }: { layout: GraphLayout }) {
  const { fitView } = useReactFlow();
  const { locale } = useAtlas();
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = marker.current?.closest('.react-flow');
    if (!element) return;
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(
        () => void fitView({ padding: 0.14, minZoom: locale === 'zh' ? 0.95 : 0.85, maxZoom: 1.4 })
      );
    };
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    fit();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [fitView, layout, locale]);
  return <span ref={marker} hidden />;
}
function CanvasControls({ map, onMap }: { map: boolean; onMap: () => void }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();
  const { locale } = useAtlas();
  return (
    <Panel position="bottom-left" className="playground-controls">
      <button onClick={() => void zoomOut()} aria-label={locale === 'zh' ? '缩小' : 'Zoom out'}>
        <Minus size={15} />
      </button>
      <output aria-label={locale === 'zh' ? '当前缩放比例' : 'Current zoom'}>
        {Math.round(zoom * 100)}%
      </output>
      <button onClick={() => void zoomIn()} aria-label={locale === 'zh' ? '放大' : 'Zoom in'}>
        <Plus size={15} />
      </button>
      <span className="control-divider" />
      <button
        onClick={() => void fitView({ padding: 0.14 })}
        aria-label={locale === 'zh' ? '适配整个图谱' : 'Fit entire graph'}
        title={locale === 'zh' ? '适配整个图谱' : 'Fit entire graph'}
      >
        <Scan size={15} />
      </button>
      <button
        onClick={() => void fitView({ padding: 0.1, minZoom: 1, maxZoom: 1 })}
        aria-label={locale === 'zh' ? '100% 阅读' : 'Read at 100%'}
        title={locale === 'zh' ? '100% 阅读' : 'Read at 100%'}
      >
        1:1
      </button>
      <button
        onClick={onMap}
        aria-pressed={map}
        aria-label={locale === 'zh' ? '切换小地图' : 'Toggle minimap'}
        title={locale === 'zh' ? '切换小地图' : 'Toggle minimap'}
      >
        <Map size={15} />
      </button>
    </Panel>
  );
}
export default function FlowCanvas({
  spec,
  layout,
  onPick,
}: {
  spec: GraphSpec;
  layout: GraphLayout;
  onPick: (id: string) => void;
}) {
  const { locale, selected } = useAtlas();
  const markerPrefix = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [hover, setHover] = useState('');
  const [activeEdge, setActiveEdge] = useState('');
  const [map, setMap] = useState(false);
  const nodes = useMemo(
    () =>
      spec.nodes.map((n) => ({
        id: n.id,
        type: 'atlas' as const,
        selected: selected === (n.target ?? n.id),
        position: { x: layout.nodes[n.id]?.x ?? 0, y: layout.nodes[n.id]?.y ?? 0 },
        width: layout.nodes[n.id]?.width ?? 200,
        height: layout.nodes[n.id]?.height ?? 104,
        data: {
          info: n,
          label: t(n.label, locale),
          detail: t(n.detail, locale),
          inputs: spec.edges.filter((e) => e.to === n.id).map((e) => `in:${e.id}`),
          outputs: spec.edges.filter((e) => e.from === n.id).map((e) => `out:${e.id}`),
          inspect: () => onPick(n.target ?? n.id),
        },
      })),
    [spec, layout, locale, onPick, selected]
  );
  const edges = useMemo(
    () =>
      spec.edges
        .filter((e) => layout.edges[e.id])
        .map((e) => ({
          id: e.id,
          source: e.from,
          target: e.to,
          sourceHandle: `out:${e.id}`,
          targetHandle: `in:${e.id}`,
          type: 'research',
          data: {
            ...layout.edges[e.id],
            label: t(e.label, locale),
            inferred: !!e.inferred,
            tone: edgeTone(spec, e),
            markerId: `flow-${markerPrefix}-${activeEdge === e.id ? 'active' : edgeTone(spec, e)}`,
            active: activeEdge === e.id,
            dim: activeEdge ? activeEdge !== e.id : !!hover && hover !== e.from && hover !== e.to,
          },
        })),
    [spec, layout, locale, hover, activeEdge, markerPrefix]
  );
  const selectedEdge = spec.edges.find((e) => e.id === activeEdge);
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.14 }}
      minZoom={0.4}
      maxZoom={2.5}
      nodesDraggable={false}
      nodesConnectable={false}
      nodesFocusable={false}
      edgesFocusable={false}
      edgesReconnectable={false}
      deleteKeyCode={null}
      panOnScroll={false}
      zoomOnScroll={false}
      zoomActivationKeyCode={['Meta', 'Control']}
      preventScrolling={false}
      zoomOnPinch
      onNodeMouseEnter={(_, n) => setHover(n.id)}
      onNodeMouseLeave={() => setHover('')}
      onEdgeClick={(_, e) => setActiveEdge(e.id)}
      onPaneClick={() => {
        setHover('');
        setActiveEdge('');
      }}
      proOptions={{ hideAttribution: false }}
      aria-label={t(spec.title, locale)}
    >
      <svg width="0" height="0" aria-hidden="true" className="flow-marker-defs">
        <defs>
          {['neutral', 'core', 'cloud', 'shell', 'active'].map((tone) => (
            <marker
              key={tone}
              id={`flow-${markerPrefix}-${tone}`}
              viewBox="0 0 9 8"
              refX="8"
              refY="4"
              markerWidth="9"
              markerHeight="8"
              markerUnits="userSpaceOnUse"
              orient="auto"
            >
              <path d="M0 0 L9 4 L0 8z" fill={`var(--edge-${tone})`} />
            </marker>
          ))}
        </defs>
      </svg>
      <FitViewport layout={layout} />
      <Background color="var(--line)" gap={24} size={0.6} />
      <Panel position="top-left" className="playground-info">
        {spec.nodes.length} {locale === 'zh' ? '节点' : 'nodes'} <span>·</span> {spec.edges.length}{' '}
        {locale === 'zh' ? '关系' : 'relations'}{' '}
        <small>
          {locale === 'zh'
            ? '拖动画布 · ⌘/Ctrl + 滚轮缩放'
            : 'Drag to pan · ⌘/Ctrl + scroll to zoom'}
        </small>
      </Panel>
      {selectedEdge && (
        <Panel position="top-right" className="playground-edge-info">
          <strong>{t(selectedEdge.label, locale)}</strong>
          <span>
            {selectedEdge.inferred
              ? locale === 'zh'
                ? '分析映射'
                : 'Analytical mapping'
              : locale === 'zh'
                ? '声明方向／导入'
                : 'Declared direction / import'}
          </span>
        </Panel>
      )}
      <CanvasControls map={map} onMap={() => setMap(!map)} />
      {map && (
        <MiniMap
          pannable
          zoomable
          position="bottom-right"
          bgColor="var(--paper)"
          maskColor="color-mix(in srgb, var(--paper) 60%, transparent)"
          maskStrokeColor="var(--accent)"
          nodeColor={(n) =>
            `var(--${(n.data as AtlasFlowNode['data']).info?.layer ?? 'line-strong'})`
          }
          style={{ width: 140, height: 96 }}
        />
      )}
    </ReactFlow>
  );
}
