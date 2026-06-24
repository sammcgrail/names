import type { Sex, USNational, USNameSeries, USStates } from '../types';

export const SEX_ACCENT: Record<Sex, string> = { M: '#5a9cff', F: '#f7637c', C: '#37c2a8' };

export function combineRanked(
  m: [string, number][] = [],
  f: [string, number][] = [],
  n = 12,
): [string, number][] {
  const map = new Map<string, number>();
  for (const [nm, c] of m) map.set(nm, (map.get(nm) || 0) + c);
  for (const [nm, c] of f) map.set(nm, (map.get(nm) || 0) + c);
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

export function nationalRank(nat: USNational, s: Sex, year: number, n = 12): [string, number][] {
  const y = String(year);
  if (s === 'C') return combineRanked(nat.rankByYear.M[y], nat.rankByYear.F[y], n);
  return (nat.rankByYear[s][y] || []).slice(0, n);
}

export function nationalTotal(nat: USNational, s: Sex, year: number): number {
  const y = String(year);
  if (s === 'C') return (nat.totals.M[y] || 0) + (nat.totals.F[y] || 0);
  return nat.totals[s][y] || 0;
}

export function stateTop(
  st: USStates,
  s: Sex,
  abbr: string,
  year: number,
  n = 10,
): [string, number][] {
  const y = String(year);
  if (s === 'C') return combineRanked(st.top.M[abbr]?.[y], st.top.F[abbr]?.[y], n);
  return (st.top[s][abbr]?.[y] || []).slice(0, n);
}

export function stateTotal(st: USStates, s: Sex, abbr: string, year: number): number {
  const y = String(year);
  if (s === 'C') return (st.totals.M[abbr]?.[y] || 0) + (st.totals.F[abbr]?.[y] || 0);
  return st.totals[s][abbr]?.[y] || 0;
}

// merged yearly series for one name (handles combined)
export function nameSeries(series: USNameSeries, s: Sex, name: string): Record<string, number> {
  if (s !== 'C') return series[s][name] || {};
  const m = series.M[name] || {};
  const f = series.F[name] || {};
  const out: Record<string, number> = { ...m };
  for (const [y, c] of Object.entries(f)) out[y] = (out[y] || 0) + c;
  return out;
}

export function allTimeTop(series: USNameSeries, s: Sex, k = 6): string[] {
  const sums = new Map<string, number>();
  const add = (obj: Record<string, Record<string, number>>) => {
    for (const [name, ys] of Object.entries(obj)) {
      let t = 0;
      for (const c of Object.values(ys)) t += c;
      sums.set(name, (sums.get(name) || 0) + t);
    }
  };
  if (s === 'M' || s === 'C') add(series.M);
  if (s === 'F' || s === 'C') add(series.F);
  return [...sums.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map((e) => e[0]);
}

export function availableNames(series: USNameSeries, s: Sex): string[] {
  const set = new Set<string>();
  if (s === 'M' || s === 'C') Object.keys(series.M).forEach((n) => set.add(n));
  if (s === 'F' || s === 'C') Object.keys(series.F).forEach((n) => set.add(n));
  return [...set].sort();
}
