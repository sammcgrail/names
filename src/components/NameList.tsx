import { fmtInt } from '../utils/format';

export function NameList({
  names,
  counts,
  accent = 'var(--accent)',
  max = 20,
}: {
  names: string[];
  counts?: (number | undefined)[];
  accent?: string;
  max?: number;
}) {
  const shown = names.slice(0, max);
  const peak = counts ? Math.max(1, ...counts.filter((x): x is number => x != null)) : 0;
  return (
    <div class="namelist">
      {shown.map((n, i) => {
        const c = counts ? counts[i] : undefined;
        return (
          <div class="namerow" key={n + i}>
            <span class="rank">{i + 1}</span>
            <span class="nm">{n}</span>
            <span class="ct">{c != null ? fmtInt(c) : `#${i + 1}`}</span>
            {c != null && (
              <span
                class="bar"
                style={{ width: 6 + 94 * (c / peak) + '%', background: accent }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
