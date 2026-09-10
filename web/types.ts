export type Locale = 'en' | 'zh';
export type Text = { en: string; zh: string };
export type Layer = 'core' | 'cloud' | 'shell';
export type PageId =
  | 'index'
  | 'three-way'
  | 'core-api'
  | 'cloud-api'
  | 'shell'
  | 'features'
  | 'gui-map'
  | 'bundle'
  | 'method';
export type SourceKind =
  'protocol' | 'bundle-literal' | 'callsite' | 'capture' | 'manifest' | 'analysis';
export interface SourceRef {
  id: string;
  kind: SourceKind;
  path: string;
  revision?: string;
  sha256: string;
  lineStart?: number;
  lineEnd?: number;
  byteStart?: number;
  byteEnd?: number;
  excerpt: string;
  excerptSha256: string;
  language: string;
  href?: string;
  formatted?: string;
  html?: string;
  formattedHtml?: string;
  note?: Text;
}
export interface AtlasNode {
  id: string;
  kind: string;
  label: Text;
  summary: Text;
  layers: Layer[];
  page: PageId;
  sourceIds: string[];
  evidence: SourceKind[];
  group?: string;
}
export interface AtlasRelation {
  id: string;
  from: string;
  to: string;
  kind: string;
  evidenceIds: string[];
  inference: boolean;
  label?: Text;
}
export interface Finding {
  id: string;
  title: Text;
  body: Text;
  limit: Text;
  sourceIds: string[];
  nodes: string[];
}
export interface Scenario {
  id: string;
  title: Text;
  summary: Text;
  steps: {
    title: Text;
    body: Text;
    nodeIds: string[];
    sourceIds: string[];
  }[];
}
export interface Field {
  name: string;
  type: string;
  required: boolean;
  description: string;
}
export interface CoreMethod {
  id: string;
  method: string;
  domain: string;
  channel: string;
  direction: string;
  type: string | null;
  params: string | null;
  response?: string | null;
  presentInApp: boolean;
  files: string[];
  sourceIds: string[];
  fields: Field[];
  resultFields: Field[];
  description: string;
}
export interface Endpoint {
  id: string;
  path: string;
  service: string;
  verbs: string[];
  sourceIds: string[];
  files: string[];
  inputs: string[];
  outputs: string[];
  baseline: boolean;
  layers: string[];
}
export interface IpcChannel {
  id: string;
  channel: string;
  suffix: string;
  files: string[];
  sourceIds: string[];
  roles: string[];
}
export interface Capability {
  id: string;
  title: string;
  zh: string;
  backing: Layer[];
  summary: Text;
  core: { total: number; present: number; methods: string[] };
  cloud: { total: number; paths: string[] };
  shell: { total: number; channels: string[] };
  coreDomains: string[];
  cloudServices: string[];
}
export interface Context {
  id: string;
  label: Text;
  summary: Text;
  namespaces: string[];
  capabilities: string[];
  shots: string[];
}
export interface Capture {
  redacted?: boolean;
  originalSha256?: string;
  id: string;
  name: string;
  label: Text;
  group: string;
  src: string;
  sha256: string;
  how: Text;
  scope: Text;
  capabilities: string[];
  sourceIds: string[];
  receipt: boolean;
  hotspots: { label: Text; x: number; y: number; width: number; height: number; target: string }[];
}
export interface BundleModule {
  id: string;
  path: string;
  family: string;
  bytes: number;
  sha256: string;
  ext: string;
  zone: string;
  imports: {
    target: string;
    dynamic: boolean;
    line: number;
    kind?: string;
    specifier?: string;
    resolution?: string;
    originalTarget?: string;
  }[];
  parsed: boolean | null;
  parseError?: string;
  sourceIds: string[];
  coreMethods: string[];
  endpointIds: string[];
  ipc: string[];
}
export interface BundleData {
  modules: BundleModule[];
  stats: {
    files: number;
    bytes: number;
    js: number;
    parsed: number;
    failed: number;
    imports: number;
    dynamicImports: number;
    missingImports: number;
    sourceMaps: number;
    exactDuplicateFiles: number;
    duplicateBytes: number;
  };
  families: { family: string; files: number; bytes: number }[];
  extensions: { ext: string; files: number; bytes: number }[];
  missingImports: { from: string; target: string }[];
  flags: { file: string; marker: string; sourceId: string }[];
  nativeDependencies: string[];
  csp: { directive: string; values: string[]; sourceId: string }[];
}
export interface AtlasModel {
  publication?: {privacy: string; originalEvidence: string};
  schemaVersion: 1;
  provenance: {
    appVersion: string;
    coreRevision: string;
    snapshotRoot: string;
    mainSha256: string;
    inputDigests: Record<string, string>;
    sourceAt: string;
    coreBinaryMatch: 'unverified';
  };
  baseline: {
    methods: number;
    present: number;
    paths: number;
    services: number;
    ipc: number;
    assets: number;
    commandKeys: number;
    locales: number;
    captures: number;
  };
  nodes: AtlasNode[];
  relations: AtlasRelation[];
  sources: SourceRef[];
  findings: Finding[];
  scenarios: Scenario[];
  contexts: Context[];
  capabilities: Capability[];
  methods: CoreMethod[];
  endpoints: Endpoint[];
  ipc: IpcChannel[];
  commands: {
    key: string;
    namespace: string;
    surface: string;
    label: Text;
    locales: number;
    sourceIds: string[];
  }[];
  captures: Capture[];
  crates: { name: string; href: string }[];
  windows: { token: string; hits: number; sourceIds: string[] }[];
  bundle: BundleData;
  coverage: {
    unresolvedCoreSources: string[];
    unmappedCommands: string[];
    unmatchedLegacyPaths: string[];
    parseFailures: string[];
  };
}
export interface PreparedCode {
  text: string;
  html: string;
  language: string;
}
export interface PageData {
  page: PageId;
  model: AtlasModel;
  code: Record<string, PreparedCode>;
  graphLayout: GraphLayout;
  scopeLayouts: Record<string, GraphLayout>;
  bundleUrl: string;
  searchUrl: string;
  sourcesUrl: string;
}
export interface GraphLayout {
  nodes: Record<string, { x: number; y: number; width: number; height: number }>;
  edges: Record<string, { path: string; labelX: number; labelY: number }>;
  width: number;
  height: number;
}
