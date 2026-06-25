// ---------------------------------------------------------------------------
// Per-name colour system.
//
// Design goal (user feedback D): a given NAME must keep ONE stable, distinct
// colour everywhere it appears — world map, US state map, bar-race, legend,
// badges — and across years/views. So colour is a pure function of the name,
// never of its frequency rank in the current frame.
//
// nameColor(name) hashes the string into HSL. Hue is spread with a large odd
// multiplier so neighbouring names land far apart on the wheel; saturation and
// lightness are jittered within a tight, dark-theme-friendly band so every hue
// reads as a saturated, legible fill on the #0b0d12 background.
// ---------------------------------------------------------------------------

// 12 hand-picked, perceptually-distinct anchors. Kept for the few places that
// still want a small categorical ramp (none after this change, but exported
// for safety / future use).
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

function hash32(str: string): number {
  let h = 2166136261 >>> 0; // FNV-1a basis
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const colorCache = new Map<string, string>();

// Stable, distinct colour for a single name. Same name → same colour, forever.
export function nameColor(name?: string | null): string {
  if (!name) return OTHER_COLOR;
  const cached = colorCache.get(name);
  if (cached) return cached;
  const hh = hash32(name);
  // 0xC0FFEE-ish spreading: large odd factor keeps adjacent hashes far apart.
  const hue = ((hh % 360) * 137 + (hh >>> 9) % 360) % 360;
  const sat = 58 + ((hh >>> 17) % 26); // 58–84
  const light = 56 + ((hh >>> 23) % 14); // 56–70 (bright enough to read dark labels on)
  const hex = hslToHex(hue, sat, light);
  colorCache.set(name, hex);
  return hex;
}

function hexToRgb(h: string): [number, number, number] {
  const m = h.replace('#', '');
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}
function rgbToHex(r: number, g: number, b: number): string {
  const f = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}

// Blend two hex colours (t=0 → a, t=1 → b). Used for the "Both" global map,
// where each country is tinted by mixing its male-#1 and female-#1 name colours
// — visibly distinct from either single-gender map (fixes the silent
// Combined≡Male bug for the count-less global dataset).
export function blendHex(a: string, b: string, t = 0.5): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export interface ColorScale {
  colorFor: (name?: string | null) => string;
  legend: { name: string; color: string; count: number }[];
}

// Build a legend (most-frequent #1 names in a set) while colouring every name
// by its STABLE per-name colour. Frequency only decides legend ORDER now — it
// never decides colour, so a name's swatch matches its fill on the map exactly.
export function buildNameColorScale(
  topNames: (string | null | undefined)[],
  maxLegend = 12,
): ColorScale {
  const freq = new Map<string, number>();
  for (const n of topNames) {
    if (!n) continue;
    freq.set(n, (freq.get(n) || 0) + 1);
  }
  const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  return {
    colorFor: (name) => nameColor(name),
    legend: ranked
      .slice(0, maxLegend)
      .map(([name, count]) => ({ name, color: nameColor(name), count })),
  };
}
