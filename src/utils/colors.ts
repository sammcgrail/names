// Qualitative palette for "colour each region by its #1 name" choropleths.
// 12 perceptually-distinct hues (no near-duplicate greens/teals).
export const PALETTE = [
  '#5a9cff', // blue
  '#f7637c', // red-pink
  '#37c2a8', // teal
  '#f6b73c', // amber
  '#9b6bf2', // purple
  '#41c4f0', // cyan
  '#ef7d3b', // orange
  '#7bc950', // green
  '#e85d9e', // magenta
  '#c9d24a', // lime
  '#ff8f6b', // coral
  '#b388ff', // lavender
];
export const OTHER_COLOR = '#283142';

export interface ColorScale {
  colorFor: (name?: string | null) => string;
  legend: { name: string; color: string; count: number }[];
}

// Build a stable colour mapping over the most frequent #1 names in a set.
export function buildNameColorScale(
  topNames: (string | null | undefined)[],
  maxColors = PALETTE.length,
): ColorScale {
  const freq = new Map<string, number>();
  for (const n of topNames) {
    if (!n) continue;
    freq.set(n, (freq.get(n) || 0) + 1);
  }
  const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  const map = new Map<string, string>();
  ranked.slice(0, maxColors).forEach(([name], i) => map.set(name, PALETTE[i % PALETTE.length]));
  return {
    colorFor: (name) => (name && map.get(name)) || OTHER_COLOR,
    legend: ranked
      .slice(0, maxColors)
      .map(([name, count]) => ({ name, color: map.get(name)!, count })),
  };
}

// Stable colour for a single name (so the same name keeps its colour across
// years in the bar-chart race). Hash → palette index.
export function nameColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
