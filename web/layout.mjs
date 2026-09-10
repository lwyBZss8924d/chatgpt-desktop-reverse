let engine;
function rounded(points) {
  if (!points.length) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1],
      b = points[i],
      c = points[i + 1];
    const before = Math.hypot(b.x - a.x, b.y - a.y),
      after = Math.hypot(c.x - b.x, c.y - b.y);
    const r = Math.min(8, before / 2, after / 2);
    if (!before || !after) continue;
    const p = { x: b.x + ((a.x - b.x) / before) * r, y: b.y + ((a.y - b.y) / before) * r };
    const q = { x: b.x + ((c.x - b.x) / after) * r, y: b.y + ((c.y - b.y) / after) * r };
    d += ` L ${p.x} ${p.y} Q ${b.x} ${b.y} ${q.x} ${q.y}`;
  }
  const last = points.at(-1);
  return d + ` L ${last.x} ${last.y}`;
}
export async function layoutGraph(spec) {
  if (!engine) engine = import('elkjs/lib/elk.bundled.js').then((m) => new m.default());
  const elk = await engine;
  const children = spec.nodes.map((n) => {
    const incoming = spec.edges.filter((e) => e.to === n.id),
      outgoing = spec.edges.filter((e) => e.from === n.id);
    const width = 200,
      height = Math.max(104, (Math.max(incoming.length, outgoing.length) + 1) * 16);
    return {
      id: n.id,
      width,
      height,
      layoutOptions: { 'elk.portConstraints': 'FIXED_POS' },
      ports: [
        ...incoming.map((e, i) => ({
          id: `${n.id}:in:${e.id}`,
          x: 0,
          y: (height * (i + 1)) / (incoming.length + 1),
          width: 0,
          height: 0,
          properties: { 'port.side': 'WEST' },
        })),
        ...outgoing.map((e, i) => ({
          id: `${n.id}:out:${e.id}`,
          x: width,
          y: (height * (i + 1)) / (outgoing.length + 1),
          width: 0,
          height: 0,
          properties: { 'port.side': 'EAST' },
        })),
      ],
    };
  });
  const graph = await elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': '32',
      'elk.layered.spacing.nodeNodeBetweenLayers': '104',
      'elk.padding': '[top=28,left=24,bottom=28,right=24]',
      'elk.randomSeed': '1',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    },
    children,
    edges: spec.edges.map((e) => ({
      id: e.id,
      sources: [`${e.from}:out:${e.id}`],
      targets: [`${e.to}:in:${e.id}`],
    })),
  });
  const nodes = Object.fromEntries(
    graph.children.map((n) => [n.id, { x: n.x, y: n.y, width: n.width, height: n.height }])
  );
  /** @type {Record<string,{path:string,labelX:number,labelY:number}>} */
  const edges = {};
  for (const e of graph.edges ?? []) {
    const s = e.sections?.[0];
    if (!s) continue;
    const points = [s.startPoint, ...(s.bendPoints ?? []), s.endPoint];
    let best = [points[0], points[1]],
      length = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i];
      const len = Math.abs(b.x - a.x);
      if (len > length) {
        length = len;
        best = [a, b];
      }
    }
    edges[e.id] = {
      path: rounded(points),
      labelX: (best[0].x + best[1].x) / 2,
      labelY: (best[0].y + best[1].y) / 2 - 22,
    };
  }
  return { nodes, edges, width: graph.width, height: graph.height };
}
export function mermaidFor(spec) {
  const ids = new Map(spec.nodes.map((n, i) => [n.id, `n${i}`]));
  const label = (s) => s.replaceAll('"', '&quot;').replaceAll('\n', ' ');
  return [
    'flowchart LR',
    ...spec.nodes.map((n) => `  ${ids.get(n.id)}["${label(n.label.en)}"]`),
    ...spec.edges.map(
      (e) =>
        `  ${ids.get(e.from)} ${e.inferred ? '-.' : '--'} "${label(e.label.en)}" ${e.inferred ? '.->' : '-->'} ${ids.get(e.to)}`
    ),
  ].join('\n');
}
