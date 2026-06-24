import type {
  Country,
  GlobalNames,
  Meta,
  USNational,
  USNameSeries,
  USStates,
} from '../types';

const cache = new Map<string, Promise<unknown>>();

export function loadJSON<T = unknown>(path: string): Promise<T> {
  const base = import.meta.env.BASE_URL || '/';
  const url = base.replace(/\/$/, '/') + path.replace(/^\//, '');
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`fetch ${url} -> ${r.status}`);
        return r.json();
      }),
    );
  }
  return cache.get(url)! as Promise<T>;
}

export const loadUSNational = () => loadJSON<USNational>('data/us_national.json');
export const loadUSStates = () => loadJSON<USStates>('data/us_states.json');
export const loadUSSeries = () => loadJSON<USNameSeries>('data/us_name_series.json');
export const loadGlobal = () => loadJSON<GlobalNames>('data/global_names.json');
export const loadCountries = () => loadJSON<Country[]>('data/countries.json');
export const loadMeta = () => loadJSON<Meta>('data/meta.json');
export const loadWorldTopo = () => loadJSON<any>('data/geo/world-110m.json');
// Canonical ECharts USA map (GeoJSON): Alaska & Hawaii repositioned as insets,
// clean bbox. The raw us-atlas states-10m is lon/lat with Alaska crossing the
// antimeridian + Pacific territories, which blows up the fit.
export const loadUSGeo = () => loadJSON<any>('data/geo/usa-echarts.json');

// ---- country lookups -------------------------------------------------------

export interface CountryIndex {
  list: Country[];
  byAlpha2: Map<string, Country>;
  byCcn3: Map<string, Country>;
}

let countryIndexPromise: Promise<CountryIndex> | null = null;
export function countryIndex(): Promise<CountryIndex> {
  if (!countryIndexPromise) {
    countryIndexPromise = loadCountries().then((list) => {
      const byAlpha2 = new Map<string, Country>();
      const byCcn3 = new Map<string, Country>();
      for (const c of list) {
        byAlpha2.set(c.cca2, c);
        if (c.ccn3) byCcn3.set(String(parseInt(c.ccn3, 10)), c);
      }
      return { list, byAlpha2, byCcn3 };
    });
  }
  return countryIndexPromise;
}

// merge male + female ranked lists into a single "combined" ordering by rank
export function mergeCombined(m: string[], f: string[], n = 20): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const max = Math.max(m.length, f.length);
  for (let i = 0; i < max && out.length < n; i++) {
    for (const name of [m[i], f[i]]) {
      if (name && !seen.has(name)) {
        seen.add(name);
        out.push(name);
      }
    }
  }
  return out;
}
