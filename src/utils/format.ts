export const fmtInt = (n: number | undefined | null): string =>
  n == null ? '—' : n.toLocaleString('en-US');

export const fmtPct = (x: number, digits = 1): string => `${(x * 100).toFixed(digits)}%`;

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// flag emoji from an ISO 3166-1 alpha-2 code (fallback when dataset flag is missing)
export function flagEmoji(cca2: string): string {
  if (!cca2 || cca2.length !== 2) return '🏳️';
  const A = 0x1f1e6;
  return String.fromCodePoint(
    A + cca2.toUpperCase().charCodeAt(0) - 65,
    A + cca2.toUpperCase().charCodeAt(1) - 65,
  );
}
