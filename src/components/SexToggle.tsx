import { sex } from '../state';
import type { Sex } from '../types';

const OPTS: { k: Sex; label: string; sw: string }[] = [
  { k: 'C', label: 'Both', sw: 'var(--combined)' },
  { k: 'M', label: 'Male', sw: 'var(--male)' },
  { k: 'F', label: 'Female', sw: 'var(--female)' },
];

export function SexToggle() {
  const cur = sex.value;
  return (
    <div class="segmented" role="group" aria-label="Sex filter">
      {OPTS.map((o) => (
        <button
          key={o.k}
          data-on={o.k}
          class={cur === o.k ? 'on' : ''}
          onClick={() => (sex.value = o.k)}
          aria-pressed={cur === o.k}
        >
          <span class="swatch" style={{ background: o.sw }} />
          {o.label}
        </button>
      ))}
    </div>
  );
}
