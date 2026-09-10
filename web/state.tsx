import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { AtlasModel, BundleData, Locale, PageData, SourceRef } from './types';
import { hashId } from './model';
interface AtlasState {
  data: PageData;
  model: AtlasModel;
  locale: Locale;
  setLocale: (l: Locale) => void;
  selected: string;
  select: (id: string) => void;
  query: string;
  setQuery: (q: string) => void;
  layer: string;
  setLayer: (q: string) => void;
  view: string;
  setView: (q: string) => void;
  getSource: (id: string) => Promise<SourceRef | undefined>;
  ensureBundle: () => Promise<void>;
}
const Context = createContext<AtlasState | null>(null);
export function useUrlState(key: string, fallback: string): [string, (value: string) => void] {
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    const read = () => setValue(new URLSearchParams(location.search).get(key) ?? fallback);
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, [key, fallback]);
  const update = useCallback(
    (next: string) => {
      setValue(next);
      const url = new URL(location.href);
      if (next === fallback) url.searchParams.delete(key);
      else url.searchParams.set(key, next);
      history.replaceState({}, '', url);
    },
    [key, fallback]
  );
  return [value, update];
}
export const useAtlas = () => {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('Missing AtlasProvider');
  return ctx;
};
export function AtlasProvider({ data, children }: { data: PageData; children: React.ReactNode }) {
  const [model, setModel] = useState(data.model);
  const [locale, setLocaleState] = useState<Locale>('en');
  const [selected, setSelected] = useState('');
  const [query, setQueryState] = useState('');
  const [layer, setLayerState] = useState('all');
  const [view, setViewState] = useState('overview');
  const sources = useRef(
    new Map(data.model.sources.filter((s) => s.excerpt).map((s) => [s.id, Promise.resolve(s)]))
  );
  const bundlePromise = useRef<Promise<void> | null>(null);
  const ensureBundle = useCallback(async () => {
    if (data.model.bundle.modules.length === data.model.bundle.stats.files) return;
    if (!bundlePromise.current)
      bundlePromise.current = fetch(data.bundleUrl)
        .then((r) => {
          if (!r.ok) throw new Error('Bundle index unavailable');
          return r.json();
        })
        .then((bundle: BundleData) => {
          setModel((m) => ({ ...m, bundle }));
        })
        .catch((e) => {
          bundlePromise.current = null;
          throw e;
        });
    await bundlePromise.current;
  }, [data.bundleUrl, data.page]);
  useEffect(() => {
    if (data.page === 'bundle') void ensureBundle().catch(() => {});
  }, [data.page, ensureBundle]);
  useEffect(() => {
    const read = () => {
      const p = new URLSearchParams(location.search);
      setSelected(hashId(location.hash));
      setQueryState(p.get('q') ?? '');
      setLayerState(p.get('layer') ?? 'all');
      setViewState(p.get('view') ?? 'overview');
    };
    read();
    const loc = document.documentElement.dataset.locale === 'zh' ? 'zh' : 'en';
    setLocaleState(loc);
    window.addEventListener('popstate', read);
    window.addEventListener('hashchange', read);
    return () => {
      window.removeEventListener('popstate', read);
      window.removeEventListener('hashchange', read);
    };
  }, []);
  const setLocale = useCallback((loc: Locale) => {
    setLocaleState(loc);
    document.documentElement.dataset.locale = loc;
    document.documentElement.lang = loc === 'zh' ? 'zh-Hans' : 'en';
    try {
      localStorage.setItem('atlas-locale', loc);
    } catch {}
  }, []);
  const update = useCallback((key: string, value: string, push = false) => {
    const url = new URL(location.href);
    if (key === 'hash')
      url.hash = value ? (value.startsWith('cap:') ? 'cap-' + value.slice(4) : value) : '';
    else if (value && value !== 'all' && value !== 'overview') url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    history[push ? 'pushState' : 'replaceState']({}, '', url);
  }, []);
  const select = useCallback(
    (id: string) => {
      setSelected(id);
      update('hash', id, true);
      if (id.startsWith('mod:')) void ensureBundle().catch(() => {});
    },
    [ensureBundle, update]
  );
  useEffect(() => {
    if (selected.startsWith('mod:')) void ensureBundle().catch(() => {});
  }, [selected, ensureBundle]);
  const getSource = useCallback(
    async (id: string) => {
      if (!sources.current.has(id))
        sources.current.set(
          id,
          fetch(`${data.sourcesUrl}${encodeURIComponent(id)}.json`)
            .then((r) => {
              if (!r.ok) throw new Error('Evidence unavailable');
              return r.json();
            })
            .catch((e) => {
              sources.current.delete(id);
              throw e;
            })
        );
      return sources.current.get(id);
    },
    [data.sourcesUrl]
  );
  const value = useMemo(
    () => ({
      data,
      model,
      locale,
      setLocale,
      selected,
      select,
      query,
      setQuery: (q: string) => {
        setQueryState(q);
        update('q', q);
      },
      layer,
      setLayer: (l: string) => {
        setLayerState(l);
        update('layer', l);
      },
      view,
      setView: (v: string) => {
        setViewState(v);
        update('view', v, true);
      },
      getSource,
      ensureBundle,
    }),
    [
      data,
      model,
      locale,
      setLocale,
      selected,
      select,
      query,
      layer,
      view,
      getSource,
      ensureBundle,
      update,
    ]
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
