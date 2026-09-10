import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  ChevronRight,
  Command,
  ExternalLink,
  FileCode2,
  Github,
  Globe2,
  Layers,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from 'lucide-react';
import { AtlasProvider, useAtlas } from './state';
import type { AtlasNode, PageData } from './types';
import { bi, hashId, nodeById, nodeHref, t } from './model';
import { pageMeta } from '../scripts/research/content.mjs';
import { Bilingual, DetailPanel, L } from './components';
import Page from './pages';

const toc: Record<string, [string, string, string][]> = {
  index: [
    ['architecture', 'Architecture', '架构'],
    ['findings', 'Findings', '发现'],
    ['routes', 'Reading routes', '阅读路线'],
    ['walkthrough', 'Walkthrough', '逐步解读'],
  ],
  'three-way': [
    ['architecture', 'Boundaries', '边界'],
    ['matrix', 'Execution matrix', '执行矩阵'],
    ['catalog', 'Capabilities', '能力目录'],
  ],
  'core-api': [
    ['protocol', 'Protocol channels', '协议通道'],
    ['catalog', 'Method explorer', '方法探索'],
    ['walkthrough', 'Walkthroughs', '逐步解读'],
    ['crates', 'Source tree', '源码树'],
  ],
  'cloud-api': [
    ['architecture', 'Request route', '请求路径'],
    ['services', 'Service groups', '服务分组'],
    ['catalog', 'Endpoints', '端点'],
    ['walkthrough', 'Walkthrough', '逐步解读'],
    ['policy', 'Network policy', '网络策略'],
  ],
  shell: [
    ['architecture', 'Processes', '进程'],
    ['catalog', 'IPC channels', 'IPC 通道'],
    ['walkthrough', 'Walkthrough', '逐步解读'],
    ['windows', 'Window tokens', '窗口令牌'],
    ['native', 'Native boundary', '原生边界'],
  ],
  features: [
    ['domains', 'Domain graph', '领域图谱'],
    ['catalog', 'Feature inventory', '功能目录'],
    ['gaps', 'Unassigned', '未归类'],
  ],
  'gui-map': [
    ['hierarchy', 'Surface hierarchy', '界面层级'],
    ['captures', 'Capture explorer', '截图探索'],
    ['limits', 'Observation limits', '观测边界'],
  ],
  bundle: [
    ['composition', 'Composition', '组成'],
    ['imports', 'Entry points', '入口'],
    ['findings', 'Findings', '洞察'],
    ['catalog', 'Files', '文件'],
    ['coverage', 'Coverage', '覆盖'],
  ],
  method: [
    ['pipeline', 'Research pipeline', '研究流程'],
    ['claims', 'Evidence labels', '证据标记'],
    ['reproduce', 'Reproduce', '复现'],
    ['provenance', 'Snapshot identity', '快照身份'],
    ['gaps', 'Open questions', '未决问题'],
    ['downloads', 'Artifacts', '产物'],
  ],
};
function SearchDialog({ dialog }: { dialog: React.RefObject<HTMLDialogElement | null> }) {
  const { model, data, locale } = useAtlas();
  const [q, setQ] = useState('');
  const [index, setIndex] = useState(model.nodes);
  const [loading, setLoading] = useState(false);
  const requested = useRef(false);
  const load = () => {
    if (requested.current) return;
    requested.current = true;
    setLoading(true);
    fetch(data.searchUrl)
      .then((r) => r.json())
      .then((nodes: AtlasNode[]) => setIndex(nodes))
      .catch(() => {
        requested.current = false;
      })
      .finally(() => setLoading(false));
  };
  const matches = index
    .filter((n) =>
      `${n.id} ${n.label.en} ${n.label.zh} ${n.summary.en} ${n.summary.zh}`
        .toLowerCase()
        .includes(q.toLowerCase())
    )
    .slice(0, 14);
  return (
    <dialog
      ref={dialog}
      className="search-dialog"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          dialog.current?.close();
        }
      }}
    >
      <div className="global-search-input">
        <Search size={20} />
        <input
          type="search"
          placeholder={
            locale === 'zh'
              ? '探索功能、接口、模块…'
              : 'Explore features, interfaces, modules…'
          }
          value={q}
          onFocus={load}
          onChange={(e) => setQ(e.target.value)}
          aria-label={locale === 'zh' ? '全局搜索' : 'Global search'}
        />
        <button
          className="icon-button"
          onClick={() => dialog.current?.close()}
          aria-label={locale === 'zh' ? '关闭搜索' : 'Close search'}
        >
          <X size={17} />
        </button>
      </div>
      <div className="search-dialog-caption">
        <L
          en={
            loading
              ? 'Loading the complete file index…'
              : `${index.length.toLocaleString()} searchable records`
          }
          zh={loading ? '正在加载完整文件索引…' : `${index.length.toLocaleString()} 条可搜索记录`}
        />
      </div>
      <div className="global-results">
        {matches.map((n) => (
          <a href={nodeHref(n)} key={n.id}>
            <FileCode2 size={17} />
            <span>
              <strong>{t(n.label, locale)}</strong>
              <small>
                {n.kind} · {t(n.summary, locale)}
              </small>
            </span>
            <ArrowRight size={15} />
          </a>
        ))}
        {!matches.length && (
          <p className="empty-state">
            <L
              en="No matches. Try a method name or filename."
              zh="没有匹配项，试试方法名或文件名。"
            />
          </p>
        )}
      </div>
      <div className="search-dialog-footer">
        <kbd>Esc</kbd>
        <L en="to close" zh="关闭" />
        <span>
          <L en="Local snapshot search" zh="本地快照检索" />
        </span>
      </div>
    </dialog>
  );
}
function Workbench() {
  const { data, model, locale, setLocale, selected } = useAtlas();
  const meta = pageMeta.find((p) => p.id === data.page)!;
  const [menu, setMenu] = useState(false);
  const [theme, setTheme] = useState('system');
  const [active, setActive] = useState('');
  const search = useRef<HTMLDialogElement>(null);
  const hasInspector = Boolean(
    nodeById(model, selected) || model.findings.some((f) => `finding:${f.id}` === selected)
  );
  useEffect(() => {
    document.documentElement.dataset.atlasReady = 'true';
    setTheme(document.documentElement.dataset.theme ?? 'system');
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        search.current?.showModal();
      }
      if (e.key === 'Escape') setMenu(false);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const e = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (e) setActive(e.target.id);
      },
      { rootMargin: '-80px 0px -65% 0px' }
    );
    document.querySelectorAll('.research-section').forEach((e) => observer.observe(e));
    return () => observer.disconnect();
  }, []);
  const toggleTheme = () => {
    const dark =
      theme === 'dark' ||
      (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    const next = dark ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('atlas-theme', next);
    } catch {}
  };
  const navGroups = [
    ['Research', '研究', ['index', 'three-way']],
    ['Architecture & APIs', '架构与接口', ['core-api', 'cloud-api', 'shell']],
    ['Product surfaces', '产品界面', ['features', 'gui-map', 'bundle']],
    ['Evidence', '证据', ['method']],
  ] as const;
  return (
    <>
      <a className="skip-link" href="#main">
        <L en="Skip to content" zh="跳到正文" />
      </a>
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="icon-button mobile-menu"
            onClick={() => setMenu(!menu)}
            aria-expanded={menu}
            aria-controls="site-nav"
            aria-label={locale === 'zh' ? '切换导航' : 'Toggle navigation'}
          >
            {menu ? <X size={19} /> : <Menu size={19} />}
          </button>
          <a
            className="wordmark"
            href="index.html"
            aria-label="Codex(ChatGPT) Desktop App DeepWiki"
          >
            <span className="brand-symbol" aria-hidden="true">
              <img className="official-logo" src="assets/logos/chatgpt.svg" alt="" />
            </span>
            <span className="site-name">
              <strong className="site-name-primary">Codex(ChatGPT)</strong>
              <span className="site-name-secondary">Desktop App DeepWiki</span>
            </span>
          </a>
        </div>
        <div className="topbar-controls">
          <button
            className="global-search-trigger"
            onClick={() => search.current?.showModal()}
            aria-label={locale === 'zh' ? '打开全局搜索' : 'Open global search'}
          >
            <Search size={15} />
            <span>
              <L en="Explore DeepWiki" zh="探索 DeepWiki" />
            </span>
            <kbd>⌘ K</kbd>
          </button>
          <button
            className="language-control"
            onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
            aria-label={locale === 'zh' ? 'Switch to English' : '切换到中文'}
          >
            <Globe2 size={15} />
            {locale === 'en' ? '中文' : 'EN'}
          </button>
          <button
            className="icon-button"
            onClick={toggleTheme}
            aria-label={locale === 'zh' ? '切换主题' : 'Toggle theme'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </header>
      <div className={`workbench ${hasInspector ? 'has-inspector' : ''}`}>
        <aside className={`sidebar ${menu ? 'mobile-open' : ''}`} id="site-nav">
          <div className="sidebar-heading">
            <span className="eyebrow">DESKTOP APP DEEPWIKI</span>
            <p>
              <L en="Inside the desktop" zh="深入桌面应用" />
            </p>
          </div>
          <nav aria-label={locale === 'zh' ? '站点导航' : 'Site navigation'}>
            {navGroups.map(([en, zh, ids]) => (
              <div className="nav-group" key={en}>
                <h2>
                  <L en={en} zh={zh} />
                </h2>
                {ids.map((id) => {
                  const p = pageMeta.find((p) => p.id === id)!;
                  return (
                    <a
                      key={id}
                      href={`${id}.html`}
                      aria-current={data.page === id ? 'page' : undefined}
                    >
                      <span className="nav-dot" />
                      <span>{t(p.label, locale)}</span>
                      {data.page === id && <ChevronRight size={13} />}
                    </a>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <a className="snapshot-status" href="method.html#provenance">
              <span className="status-dot" />
              <span>
                <L en="Fixed research snapshot" zh="固定研究快照" />
                <code>{model.provenance.appVersion}</code>
              </span>
            </a>
            <a
              className="repo-link"
              href="https://github.com/lwyBZss8924d/chatgpt-desktop-reverse"
              target="_blank"
              rel="noreferrer"
            >
              <Github size={15} />
              <L en="Research repository" zh="研究仓库" />
              <ExternalLink size={12} />
            </a>
          </div>
        </aside>
        {menu && (
          <button
            className="menu-backdrop"
            aria-label={locale === 'zh' ? '关闭导航' : 'Close navigation'}
            onClick={() => setMenu(false)}
          />
        )}
        <main id="main" className="main-content">
          <div className="breadcrumb">
            <a href="index.html">DeepWiki</a>
            <ChevronRight size={12} />
            <span>{t(meta.label, locale)}</span>
          </div>
          <div className={`page-heading ${data.page === 'index' ? 'overview-heading' : ''}`}>
            <div>
              <span className="eyebrow">
                {data.page === 'index'
                  ? 'CHATGPT (CODEX) DESKTOP'
                  : t(meta.label, locale).toUpperCase()}
              </span>
              <Bilingual value={meta.title} as="h1" />
              <Bilingual value={meta.description} as="p" className="page-description" />
            </div>
            {data.page === 'index' && (
              <a className="hero-artifact" href="gui-map.html">
                <img
                  src="assets/shots/19-thread-open.jpg"
                  alt={
                    locale === 'zh' ? '归档 Codex Desktop 界面' : 'Archived Codex Desktop interface'
                  }
                />
                <span>
                  <Camera size={13} />
                  <L en="Explore the archived interface" zh="探索归档界面" />
                  <ArrowRight size={14} />
                </span>
              </a>
            )}
          </div>
          <Page />
          <footer className="page-footer">
            <span>
              <L en="Evidence before inference." zh="先有证据，再作推断。" />
            </span>
            <a href="method.html">
              <BookOpen size={14} />
              <L en="Method & limitations" zh="方法与限制" />
              <ArrowRight size={13} />
            </a>
          </footer>
        </main>
        {hasInspector ? (
          <DetailPanel />
        ) : (
          <aside className="page-toc">
            <span className="eyebrow">
              <L en="On this page" zh="本页目录" />
            </span>
            <nav aria-label={locale === 'zh' ? '本页目录' : 'On this page'}>
              {toc[data.page].map(([id, en, zh]) => (
                <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined}>
                  <L en={en} zh={zh} />
                </a>
              ))}
            </nav>
            <div className="toc-note">
              <Layers size={18} />
              <p>
                <L
                  en="Every view connects to the same evidence model."
                  zh="每个视图都连接到同一证据模型。"
                />
              </p>
              <a href="method.html#claims">
                <L en="Read the labels" zh="理解标记" />
                <ArrowRight size={12} />
              </a>
            </div>
          </aside>
        )}
      </div>
      <SearchDialog dialog={search} />
    </>
  );
}
export default function App({ data }: { data: PageData }) {
  return (
    <AtlasProvider data={data}>
      <Workbench />
    </AtlasProvider>
  );
}
