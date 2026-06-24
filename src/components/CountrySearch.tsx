import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { countryIndex } from '../data/store';
import { query, selectedCountry } from '../state';
import type { Country } from '../types';

export function CountrySearch() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    countryIndex().then((ix) => setCountries(ix.list));
  }, []);

  const q = query.value.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return [];
    return countries
      .map((c) => ({ c, idx: c.name.toLowerCase().indexOf(q) }))
      .filter(
        ({ c, idx }) =>
          idx >= 0 || c.cca2.toLowerCase() === q || c.cca3.toLowerCase() === q,
      )
      .sort((a, b) => (a.idx < 0 ? 99 : a.idx) - (b.idx < 0 ? 99 : b.idx) || a.c.name.localeCompare(b.c.name))
      .slice(0, 8)
      .map(({ c }) => c);
  }, [q, countries]);

  useEffect(() => setHi(0), [q]);

  useEffect(() => {
    const f = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, []);

  function pick(c: Country) {
    selectedCountry.value = c.cca2;
    query.value = c.name;
    setOpen(false);
  }
  function onKey(e: KeyboardEvent) {
    if (!open || !matches.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHi((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(matches[hi]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div class="search" ref={boxRef}>
      <svg class="mag" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        placeholder="Search a country…"
        value={query.value}
        onInput={(e) => {
          query.value = (e.target as HTMLInputElement).value;
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        autocomplete="off"
        spellcheck={false}
      />
      {query.value && (
        <button
          class="clearbtn"
          aria-label="Clear"
          onClick={() => {
            query.value = '';
            selectedCountry.value = null;
          }}
        >
          ✕
        </button>
      )}
      {open && matches.length > 0 && (
        <div class="ac-list">
          {matches.map((c, i) => (
            <div
              key={c.cca2}
              class={'ac-item' + (i === hi ? ' active' : '')}
              onMouseEnter={() => setHi(i)}
              onClick={() => pick(c)}
            >
              <span class="flag">{c.flag}</span>
              <div style={{ minWidth: 0 }}>
                <div>{c.name}</div>
                <div class="sub">{c.region}{c.subregion ? ' · ' + c.subregion : ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
