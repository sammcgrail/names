import { mergeCombined } from '../data/store';
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
