import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { countryIndex, loadGlobal, loadWorldTopo, type CountryIndex } from '../data/store';
import { topoToGeo } from '../utils/geo';
import { buildNameColorScale } from '../utils/colors';
import { countryFillColor, topName } from '../utils/names';
import { sex, selectedCountry, SEX_LABEL } from '../state';
import type { Country, GlobalNames } from '../types';
import { CountryDrawer } from '../components/CountryDrawer';

export function GlobeView() {
  const s = sex.value;
  const sel = selectedCountry.value;
  const wrapRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const featuresRef = useRef<any[]>([]);
  const sexRef = useRef(s);
  const userInteracted = useRef(false);

  const [data, setData] = useState<{ global: GlobalNames; ix: CountryIndex } | null>(null);

  const derived = useMemo(() => {
    if (!data) return null;
    const withData = data.ix.list.filter((c) => data.global[c.cca2]);
    return buildNameColorScale(withData.map((c) => topName(data.global, c.cca2, s)));
  }, [data, s]);

  // keep accessor ref fresh (used by the polygon-cap colour accessor)
  sexRef.current = s;

  // load data + build globe once
  useEffect(() => {
    let alive = true;
    let cleanupTouch: (() => void) | null = null;
    Promise.all([loadGlobal(), countryIndex(), loadWorldTopo()]).then(async ([global, ix, topo]) => {
      if (!alive) return;
      const geo = topoToGeo(topo, 'countries');
      featuresRef.current = geo.features;
      setData({ global, ix });

      const Globe = (await import('globe.gl')).default;
      if (!alive || !wrapRef.current) return;

      const capColor = (feat: any) => {
        const c = ix.byCcn3.get(String(parseInt(feat.id, 10)));
        return c ? countryFillColor(global, c.cca2, sexRef.current) : 'rgba(38,47,64,0.9)';
      };
      const label = (feat: any) => {
        const c = ix.byCcn3.get(String(parseInt(feat.id, 10)));
        if (!c) return `<div class="globe-tip">${feat.properties?.name ?? ''}</div>`;
        const tn = topName(global, c.cca2, sexRef.current);
        return `<div class="globe-tip"><b>${c.flag} ${c.name}</b>${tn ? `<br/>#1: ${tn}` : ''}</div>`;
      };

      const w = wrapRef.current.clientWidth || 600;
      const h = wrapRef.current.clientHeight || 480;
      const globe = new Globe(wrapRef.current, { rendererConfig: { antialias: true, alpha: true } })
        .width(w)
        .height(h)
        .backgroundColor('#05070d')
        .showAtmosphere(true)
        .atmosphereColor('#3b82f6')
        .atmosphereAltitude(0.16)
        .globeImageUrl((import.meta.env.BASE_URL || '/') + 'img/earth-dark.jpg')
        .bumpImageUrl((import.meta.env.BASE_URL || '/') + 'img/earth-topology.png')
        .polygonsData(geo.features)
        .polygonAltitude(0.012)
        .polygonCapColor(capColor)
        .polygonSideColor(() => 'rgba(0,0,0,0.14)')
        .polygonStrokeColor(() => 'rgba(255,255,255,0.22)')
        .polygonLabel(label)
        .onPolygonHover((hov: any) => {
          globe.polygonAltitude((d: any) => (d === hov ? 0.06 : 0.012));
        })
        .onPolygonClick((d: any) => {
          const c = ix.byCcn3.get(String(parseInt(d.id, 10)));
          if (c) {
            selectedCountry.value = c.cca2;
            flyTo(globe, c);
          }
        });
      globeRef.current = globe;

      const controls = globe.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.45;
      controls.enableDamping = true;
      controls.dampingFactor = 0.12;
      controls.minDistance = 130;
      controls.maxDistance = 520;
      controls.addEventListener('start', () => {
        if (!userInteracted.current) {
          userInteracted.current = true;
          controls.autoRotate = false;
        }
      });
      globe.pointOfView({ lat: 25, lng: 5, altitude: 2.3 });

      // iOS hardening — block long-press magnifier / image save / selection
      const canvas = wrapRef.current.querySelector('canvas');
      const block = (e: Event) => e.preventDefault();
      for (const el of [wrapRef.current, canvas].filter(Boolean) as Element[]) {
        el.addEventListener('contextmenu', block);
        el.addEventListener('selectstart', block);
        el.addEventListener('dragstart', block);
      }
      cleanupTouch = () => {
        for (const el of [wrapRef.current, canvas].filter(Boolean) as Element[]) {
          el.removeEventListener('contextmenu', block);
          el.removeEventListener('selectstart', block);
          el.removeEventListener('dragstart', block);
        }
      };
    });

    const onResize = () => {
      const g = globeRef.current;
      if (g && wrapRef.current) {
        const w = wrapRef.current.clientWidth;
        const h = wrapRef.current.clientHeight;
        if (w > 0 && h > 0) g.width(w).height(h);
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      alive = false;
      window.removeEventListener('resize', onResize);
      cleanupTouch?.();
      try {
        globeRef.current?._destructor?.();
      } catch {
        /* noop */
      }
      globeRef.current = null;
    };
  }, []);

  // recolor caps when sex changes
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    g.polygonCapColor((feat: any) => {
      const c = data?.ix.byCcn3.get(String(parseInt(feat.id, 10)));
      return c ? countryFillColor(data!.global, c.cca2, sexRef.current) : 'rgba(38,47,64,0.9)';
    });
  }, [s, derived, data]);

  // fly to selected country (from search box or badge)
  useEffect(() => {
    const g = globeRef.current;
    if (!g || !sel || !data) return;
    const c = data.ix.byAlpha2.get(sel);
    if (c) flyTo(g, c);
  }, [sel, data]);

  const selCountry = sel && data ? data.ix.byAlpha2.get(sel) : null;

  return (
    <div class="globe-wrap">
      <div class="globe-canvas" ref={wrapRef} />
      <div class="globe-overlay">
        <div class="panel" style={{ padding: 12 }}>
          <h2 style={{ fontSize: 13 }}>🪐 Spin the world</h2>
          <div class="sub" style={{ marginBottom: 8 }}>
            Coloured by top {SEX_LABEL[s].toLowerCase()} name. Tap a country to dig in.
          </div>
          {derived && (
            <div class="legend" style={{ marginTop: 0 }}>
              {derived.legend.slice(0, 6).map((l) => (
                <span class="item" key={l.name}>
                  <span class="chip" style={{ background: l.color }} />
                  <b>{l.name}</b>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {selCountry && data && (
        <div class="globe-detail">
          <CountryDrawer
            country={selCountry}
            global={data.global}
            onClose={() => (selectedCountry.value = null)}
          />
        </div>
      )}
      {!data && (
        <div class="loading" style={{ position: 'absolute', inset: 0 }}>
          <div class="spinner" />
          Building the globe…
        </div>
      )}
    </div>
  );
}

function flyTo(globe: any, c: Country) {
  if (!c.latlng || c.latlng.length !== 2) return;
  globe.pointOfView({ lat: c.latlng[0], lng: c.latlng[1], altitude: 1.6 }, 1000);
}
