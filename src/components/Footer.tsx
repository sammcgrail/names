import { useEffect, useState } from 'preact/hooks';
import { loadMeta } from '../data/store';
import type { Meta } from '../types';

export function Footer() {
  const [meta, setMeta] = useState<Meta | null>(null);
  useEffect(() => {
    loadMeta().then(setMeta).catch(() => {});
  }, []);
  return (
    <footer class="footer">
      <div>
        <strong>Sources.</strong> US names — U.S. Social Security Administration (public domain).
        Global names — names-dataset (Apache-2.0; given names derived from a large public dataset).
        Country metadata &amp; flags © mledoze/countries (ODbL). Map geometry — Natural Earth via
        world-atlas / us-atlas (public domain).
      </div>
      {meta && (
        <div style="margin-top:6px">
          Built {meta.generated} · {meta.globalCountryCount} countries with name data · US national{' '}
          {meta.usNationalYears?.[0]}–{meta.usNationalYears?.[1]}, by state{' '}
          {meta.usStateYears?.[0]}–{meta.usStateYears?.[1]}.
        </div>
      )}
    </footer>
  );
}
