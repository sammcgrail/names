import { useEffect, useMemo, useState } from 'preact/hooks';
import { countryIndex, loadGlobal, loadWorldTopo, type CountryIndex } from '../data/store';
import { registerMapOnce } from '../utils/echartsLoader';
import { useEChart } from '../utils/useEChart';
import { topoToGeo } from '../utils/geo';
import { buildNameColorScale, type ColorScale } from '../utils/colors';
import { countryFillColor, displayTop, namesFor, topName } from '../utils/names';
import { sex, selectedCountry, SEX_LABEL } from '../state';
import type { Country, GlobalNames, Sex } from '../types';
import { CountryDrawer } from '../components/CountryDrawer';
import { Collapsible } from '../components/Collapsible';

interface Loaded {
  global: GlobalNames;
  ix: CountryIndex;
  geo: any;
  nameToA2: Map<string, string>;
}

interface Derived {
  scale: ColorScale;
  data: any[];
  badges: { c: Country; tn: string | null }[];
  withDataCount: number;
}

export function GlobalView() {
  const s = sex.value;
  const sel = selectedCountry.value;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([loadGlobal(), countryIndex(), loadWorldTopo()]).then(async ([global, ix, topo]) => {
      const geo = topoToGeo(topo, 'countries');
      const nameToA2 = new Map<string, string>();
      for (const f of geo.features) {
        const c = ix.byCcn3.get(String(parseInt(f.id, 10)));
        if (c) {
          f.properties.name = c.name;
          nameToA2.set(c.name, c.cca2);
        }
      }
      await registerMapOnce('world', geo);
      if (alive) setLoaded({ global, ix, geo, nameToA2 });
    });
    return () => {
      alive = false;
    };
  }, []);

  const derived = useMemo<Derived | null>(() => {
    if (!loaded) return null;
    const { global, ix, geo } = loaded;
    const withData = ix.list.filter((c) => global[c.cca2]);
    // Legend / "shared names" source. In Combined mode include BOTH each
    // country's male-#1 and female-#1 so the panel honestly reflects both
    // genders (not just the male leaders that topName('C') would surface).
    const legendNames =
      s === 'C'
        ? withData.flatMap((c) => [global[c.cca2]?.M[0], global[c.cca2]?.F[0]])
        : withData.map((c) => topName(global, c.cca2, s));
    const scale = buildNameColorScale(legendNames);
    const data = geo.features.map((f: any) => {
      const c = ix.byCcn3.get(String(parseInt(f.id, 10)));
      const tn = c ? topName(global, c.cca2, s) : null;
      return {
        name: f.properties.name,
        value: tn ? 1 : 0,
        _a2: c?.cca2 ?? null,
        // stable per-name colour (M/F) or male+female blend (Combined) — never
        // a single-hue intensity ramp, and Combined ≠ Male (feedback D + E).
        itemStyle: { areaColor: c ? countryFillColor(global, c.cca2, s) : '#19202e' },
      };
    });
    const badges = withData
      .map((c) => ({ c, tn: displayTop(global, c.cca2, s) }))
      .sort((a, b) => a.c.name.localeCompare(b.c.name));
    return { scale, data, badges, withDataCount: withData.length };
  }, [loaded, s]);

  if (!loaded || !derived)
    return (
      <div class="loading">
        <div class="spinner" />
        Loading global names…
      </div>
    );

  const { ix, global } = loaded;
  const selCountry = sel ? ix.byAlpha2.get(sel) : null;

  return (
    <div class="grid cols-3">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>🗺️ Top {SEX_LABEL[s].toLowerCase()} name by country</h2>
              <div class="sub">
                Each country is coloured by its most popular given name — clusters reveal where a
                name dominates a whole region. Tap a country to inspect.
              </div>
            </div>
          </div>
          <WorldMap loaded={loaded} derived={derived} sx={s} />
          <div class="legend">
            {derived.scale.legend.slice(0, 10).map((l) => (
              <span class="item" key={l.name}>
                <span class="chip" style={{ background: l.color }} />
                <b>{l.name}</b> ×{l.count}
              </span>
            ))}
          </div>
          <p class="hint" style="margin-top:8px">
            Global names are popularity rankings per gender (names-dataset), not birth counts — so
            “Both” lists each gender’s leaders side by side.
          </p>
        </div>

        <Collapsible
          title={<>🏳️ Countries <span class="tag">{derived.withDataCount}</span></>}
          defaultOpen={false}
        >
          <div class="sub">Each badge shows a country’s #1 {SEX_LABEL[s].toLowerCase()} name — tap to focus.</div>
          <div class="badges" style={{ maxHeight: '330px', overflowY: 'auto' }}>
            {derived.badges.map(({ c, tn }) => (
              <div
                class={'badge' + (sel === c.cca2 ? ' sel' : '')}
                key={c.cca2}
                onClick={() => (selectedCountry.value = c.cca2)}
              >
                <span class="flag">{c.flag}</span>
                <div class="meta">
                  <div class="c">{c.name}</div>
                  <div class="n">{tn ?? '—'}</div>
                </div>
              </div>
            ))}
          </div>
        </Collapsible>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        {selCountry ? (
          <CountryDrawer
            country={selCountry}
            global={global}
            onClose={() => (selectedCountry.value = null)}
          />
        ) : (
          <InferencePanel derived={derived} s={s} />
        )}
      </div>
    </div>
  );
}

function WorldMap({ loaded, derived, sx }: { loaded: Loaded; derived: Derived; sx: Sex }) {
  const { elRef, chartRef, ready, onClickRef } = useEChart();

  onClickRef.current = (p: any) => {
    const a2 = p?.data?._a2 || loaded.nameToA2.get(p?.name);
    if (a2) selectedCountry.value = a2;
  };

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !ready) return;
    const { global, ix } = loaded;
    chart.setOption(
      {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          backgroundColor: '#0d1320',
          borderColor: 'rgba(255,255,255,0.12)',
          textStyle: { color: '#e7eaf2', fontSize: 12 },
          formatter: (p: any) => {
            const a2 = p?.data?._a2;
            if (!a2) return `<b>${p.name}</b><br/><span style="color:#8b93a7">no data</span>`;
            const c = ix.byAlpha2.get(a2)!;
            const list = namesFor(global, a2, sx, 5);
            return (
              `<div style="font-weight:700;margin-bottom:3px">${c.flag} ${c.name}</div>` +
              `<div style="color:#8b93a7;font-size:11px;margin-bottom:2px">Top ${SEX_LABEL[sx].toLowerCase()} names</div>` +
              list.map((n, i) => `<span style="color:#cfd6e6">${i + 1}. ${n}</span>`).join('<br/>')
            );
          },
        },
        series: [
          {
            type: 'map',
            map: 'world',
            roam: true,
            nameProperty: 'name',
            scaleLimit: { min: 1, max: 8 },
            itemStyle: { borderColor: 'rgba(255,255,255,0.16)', borderWidth: 0.4, areaColor: '#19202e' },
            emphasis: { label: { show: false }, itemStyle: { areaColor: '#aebfe0' } },
            select: { disabled: true },
            data: derived.data,
          },
        ],
      },
      { notMerge: true },
    );
  }, [derived, sx, ready]);

  return <div ref={elRef} class="viz" style={{ width: '100%', aspectRatio: '1.9 / 1', maxHeight: '560px' }} />;
}

function InferencePanel({ derived, s }: { derived: Derived; s: Sex }) {
  const top = derived.scale.legend.slice(0, 8);
  return (
    <div class="panel">
      <h2>💡 Shared names</h2>
      <div class="sub">
        The same given name tops dozens of countries. Most frequent #1 {SEX_LABEL[s].toLowerCase()}{' '}
        names worldwide:
      </div>
      <div class="namelist">
        {top.map((l, i) => (
          <div class="namerow" key={l.name}>
            <span class="rank">{i + 1}</span>
            <span class="nm">
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: l.color,
                  marginRight: 8,
                }}
              />
              {l.name}
            </span>
            <span class="ct">{l.count} countries</span>
          </div>
        ))}
      </div>
      <p class="hint" style="margin-top:12px">
        Pick a country from the search bar, the map, or the badges to see its full top-20.
      </p>
    </div>
  );
}
