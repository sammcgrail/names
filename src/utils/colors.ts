// Qualitative palette for "colour each region by its #1 name" choropleths.
export const PALETTE = [
  '#5a9cff', '#f7637c', '#37c2a8', '#f6b73c', '#9b6bf2', '#41c4f0',
  '#ef7d3b', '#7bc950', '#e85d9e', '#46d0c0', '#d7b740', '#8aa0ff',
  '#ff8f6b', '#62d98a', '#c98bff', '#f0c419',
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
