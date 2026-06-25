import { usPlaying, usRange, usSpeed, usYear } from '../state';

const SPEEDS = [
  { label: '0.5×', ms: 900 },
  { label: '1×', ms: 450 },
  { label: '2×', ms: 180 },
  { label: '4×', ms: 90 },
];

// The US year scrubber. Lives as a second row inside the sticky topbar (moved
// up from a fixed bottom bar, which sat in the iOS home-indicator gesture strip
// and was unreliable to grab). Drives the usYear signal for the map + every
// chart. The play interval itself lives in USView.
export function USTimeBar() {
  const year = usYear.value;
  const playing = usPlaying.value;
  const range = usRange.value;

  return (
    <div class="timebar">
      <div class="timebar-inner">
        <button
          class={'playbtn' + (playing ? ' playing' : '')}
          onClick={() => (usPlaying.value = !playing)}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 5l12 7-12 7z" />
            </svg>
          )}
        </button>
        <span class="timebar-year">{year}</span>
        <input
          type="range"
          min={range.min}
          max={range.max}
          value={year}
          onInput={(e) => {
            usPlaying.value = false;
            usYear.value = parseInt((e.target as HTMLInputElement).value, 10);
          }}
        />
        <select
          class="speedsel"
          value={String(usSpeed.value)}
          onChange={(e) => (usSpeed.value = parseInt((e.target as HTMLSelectElement).value, 10))}
        >
          {SPEEDS.map((sp) => (
            <option value={String(sp.ms)} key={sp.ms}>
              {sp.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
