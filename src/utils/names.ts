import { mergeCombined } from '../data/store';
import { blendHex, nameColor, OTHER_COLOR } from './colors';
import type { GlobalNames, Sex } from '../types';

export function namesFor(global: GlobalNames, alpha2: string, s: Sex, n = 20): string[] {
  const g = global[alpha2];
  if (!g) return [];
  if (s === 'M') return g.M.slice(0, n);
  if (s === 'F') return g.F.slice(0, n);
  return mergeCombined(g.M, g.F, n);
}

export function topName(global: GlobalNames, alpha2: string, s: Sex): string | null {
  return namesFor(global, alpha2, s, 1)[0] ?? null;
}

// Label for badges/lists. In Combined mode the global dataset is rank-only per
// gender (no counts → no true merge), so show BOTH leaders side by side rather
// than silently displaying the male #1.
export function displayTop(global: GlobalNames, alpha2: string, s: Sex): string {
  const g = global[alpha2];
  if (!g) return '—';
  if (s === 'M') return g.M[0] ?? '—';
  if (s === 'F') return g.F[0] ?? '—';
  return [g.M[0], g.F[0]].filter(Boolean).join('  ·  ') || '—';
}

// Map fill colour for a country.
// - M / F: stable per-name colour of that gender's #1.
// - Combined: BLEND of the male-#1 and female-#1 name colours, so the "Both"
//   choropleth is visibly its own map rather than silently identical to Male
//   (the global dataset has no counts, so a true popularity merge is impossible
//   — a colour blend is the honest representation of "both leaders").
export function countryFillColor(global: GlobalNames, alpha2: string, s: Sex): string {
  const g = global[alpha2];
  if (!g) return OTHER_COLOR;
  if (s === 'M') return g.M[0] ? nameColor(g.M[0]) : OTHER_COLOR;
  if (s === 'F') return g.F[0] ? nameColor(g.F[0]) : OTHER_COLOR;
  const m = g.M[0];
  const f = g.F[0];
  if (m && f) return blendHex(nameColor(m), nameColor(f), 0.5);
  return nameColor(m || f) ?? OTHER_COLOR;
}
