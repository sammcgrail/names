import { useEffect, useMemo, useState } from 'preact/hooks';
import { loadUSGeo, loadUSNational, loadUSSeries, loadUSStates } from '../data/store';
import { registerMapOnce } from '../utils/echartsLoader';
import { useEChart } from '../utils/useEChart';
import { buildNameColorScale, nameColor } from '../utils/colors';
import { fmtInt, fmtPct } from '../utils/format';
import { ABBR_TO_NAME, NAME_TO_ABBR, US_STATES } from '../data/usStates';
import {
  SEX_ACCENT,
  allTimeTop,
  availableNames,
  nameSeries,
  nationalRank,
  nationalTotal,
  stateTop,
  stateTotal,
} from '../data/usHelpers';
import { sex, SEX_LABEL, selectedState, usPlaying, usYear } from '../state';
import type { USNameSeries, USNational, USStates } from '../types';

interface Bundle {
  nat: USNational;
  states: USStates;
  series: USNameSeries;
}

const SPEEDS = [
  { label: '0.5×', ms: 900 },
  { label: '1×', ms: 450 },
  { label: '2×', ms: 180 },
  { label: '4×', ms: 90 },
];

export function USView() {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [speed, setSpeed] = useState(450);

  const s = sex.value;
  const year = usYear.value;
  const playing = usPlaying.value;
  const selSt = selectedState.value;

  useEffect(() => {
    Promise.all([loadUSNational(), loadUSStates(), loadUSSeries(), loadUSGeo()]).then(
      async ([nat, states, series, usGeo]) => {
        await registerMapOnce('US', usGeo);
        usYear.value = states.maxYear;
        setBundle({ nat, states, series });
        setMapReady(true);
      },
    );
    return () => {
      usPlaying.value = false;
    };
  }, []);

  const range = bundle ? { min: bundle.states.minYear, max: bundle.states.maxYear } : { min: 1910, max: 2024 };

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      usYear.value = usYear.value >= range.max ? range.min : usYear.value + 1;
    }, speed);
    return () => window.clearInterval(id);
  }, [playing, speed, range.min, range.max]);

  if (!bundle)
    return (
      <div class="loading">
        <div class="spinner" />
        Loading 145 years of US names…
      </div>
    );

  const { nat, states, series } = bundle;
  const natTop = nationalRank(nat, s, year, 1)[0];
  const natTotal = nationalTotal(nat, s, year);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div class="grid cols-3">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>🇺🇸 Most popular {SEX_LABEL[s].toLowerCase()} name by state · {year}</h2>
              <div class="sub">
                Press play to sweep {range.min}–{range.max} and watch names roll across the country.
                Tap a state to inspect it.
              </div>
            </div>
          </div>

          {mapReady && <USMap states={states} />}

          <div class="scrubber">
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
            <span class="yearbadge">{year}</span>
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
            <select class="speedsel" value={String(speed)} onChange={(e) => setSpeed(parseInt((e.target as HTMLSelectElement).value, 10))}>
              {SPEEDS.map((sp) => (
                <option value={String(sp.ms)} key={sp.ms}>
                  {sp.label}
                </option>
              ))}
            </select>
          </div>

          <MapLegend states={states} />
        </div>

        <div class="panel">
          {selSt ? (
            <StateDetail states={states} abbr={selSt} year={year} />
          ) : (
            <>
              <h2>📊 {year} at a glance</h2>
              <div class="sub">National {SEX_LABEL[s].toLowerCase()} totals for the selected year.</div>
              <div class="stats">
                <div class="stat">
                  <div class="v">{natTop ? natTop[0] : '—'}</div>
                  <div class="k">#1 name</div>
                </div>
                <div class="stat">
                  <div class="v">{natTop ? fmtInt(natTop[1]) : '—'}</div>
                  <div class="k">babies named it</div>
                </div>
                <div class="stat">
                  <div class="v">{fmtInt(natTotal)}</div>
                  <div class="k">babies tracked</div>
                </div>
                <div class="stat">
                  <div class="v">{natTop && natTotal ? fmtPct(natTop[1] / natTotal) : '—'}</div>
                  <div class="k">#1 share</div>
                </div>
              </div>
              <p class="hint" style="margin-top:14px">
                Tap any state on the map for its top-10 that year, or scrub the timeline to watch
                trends move.
              </p>
            </>
          )}
        </div>
      </div>

      <div class="grid cols-2">
        <div class="panel">
          <h2>🏁 Name race · national top 12</h2>
          <div class="sub">Bars re-sort live as you play — watch names overtake each other.</div>
          <BarRace nat={nat} />
        </div>
        <div class="panel">
          <h2>📈 Name trends over time</h2>
          <div class="sub">Add names to compare their rise and fall. The marker tracks the scrubber.</div>
          <TrendChart series={series} years={nat.years} />
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
function USMap({ states }: { states: USStates }) {
  const s = sex.value;
  const year = usYear.value;
  const { elRef, chartRef, ready, onClickRef } = useEChart();

  onClickRef.current = (p: any) => {
    const abbr = p?.data?._abbr || NAME_TO_ABBR.get(p?.name);
    if (abbr) selectedState.value = selectedState.value === abbr ? null : abbr;
  };

  const derived = useMemo(() => {
    const tops = US_STATES.map((row) => stateTop(states, s, row.abbr, year, 1)[0]?.[0] ?? null);
    const scale = buildNameColorScale(tops);
    const data = US_STATES.map((row, i) => {
      const top = stateTop(states, s, row.abbr, year, 1)[0];
      return {
        name: row.name,
        value: top ? top[1] : 0,
        _abbr: row.abbr,
        _top: tops[i],
        itemStyle: { areaColor: tops[i] ? scale.colorFor(tops[i]) : '#19202e' },
      };
    });
    return { scale, data };
  }, [states, s, year]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !ready) return;
    chart.setOption(
      {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          backgroundColor: '#0d1320',
          borderColor: 'rgba(255,255,255,0.12)',
          textStyle: { color: '#e7eaf2', fontSize: 12 },
          formatter: (p: any) => {
            const d = p?.data;
            if (!d || !d._top) return `<b>${p.name}</b><br/><span style="color:#8b93a7">no data</span>`;
            const births = stateTotal(states, s, d._abbr, usYear.value);
            return (
              `<div style="font-weight:700">${p.name}</div>` +
              `<div style="margin-top:2px">#1: <b>${d._top}</b> · ${fmtInt(d.value)}</div>` +
              `<div style="color:#8b93a7;font-size:11px">${fmtInt(births)} babies tracked</div>`
            );
          },
        },
        series: [
          {
            type: 'map',
            map: 'US',
            roam: false,
            nameProperty: 'name',
            label: {
              show: true,
              color: '#0a0e18',
              fontSize: 9,
              fontWeight: 700,
              formatter: (p: any) => p.data?._top ?? '',
            },
            labelLayout: { hideOverlap: true },
            itemStyle: { borderColor: 'rgba(10,14,24,0.7)', borderWidth: 0.6, areaColor: '#19202e' },
            emphasis: { label: { color: '#06101f' }, itemStyle: { areaColor: '#cfe0ff' } },
            select: { disabled: true },
            data: derived.data,
          },
        ],
      },
      { notMerge: true },
    );
  }, [derived, s, ready]);

  return <div ref={elRef} class="viz" style={{ width: '100%', aspectRatio: '1.7 / 1', maxHeight: '480px' }} />;
}

function MapLegend({ states }: { states: USStates }) {
  const s = sex.value;
  const year = usYear.value;
  const legend = useMemo(() => {
    const tops = US_STATES.map((row) => stateTop(states, s, row.abbr, year, 1)[0]?.[0] ?? null);
    return buildNameColorScale(tops).legend;
  }, [states, s, year]);
  return (
    <div class="legend">
      {legend.map((l) => (
        <span class="item" key={l.name}>
          <span class="chip" style={{ background: l.color }} />
          <b>{l.name}</b> ×{l.count}
        </span>
      ))}
    </div>
  );
}

function StateDetail({ states, abbr, year }: { states: USStates; abbr: string; year: number }) {
  const s = sex.value;
  const list = stateTop(states, s, abbr, year, 10);
  const births = stateTotal(states, s, abbr, year);
  const name = ABBR_TO_NAME.get(abbr) || abbr;
  return (
    <div>
      <div class="panel-head">
        <div>
          <h2>📍 {name} · {year}</h2>
          <div class="sub">Top {SEX_LABEL[s].toLowerCase()} names · {fmtInt(births)} babies tracked</div>
        </div>
        <button class="speedsel" onClick={() => (selectedState.value = null)}>
          ✕
        </button>
      </div>
      <div class="namelist">
        {list.length === 0 && <p class="hint">No data for this state/year.</p>}
        {list.map(([nm, ct], i) => (
          <div class="namerow" key={nm}>
            <span class="rank">{i + 1}</span>
            <span class="nm">{nm}</span>
            <span class="ct">{fmtInt(ct)}</span>
            <span
              class="bar"
              style={{ width: 6 + 94 * (ct / (list[0]?.[1] || 1)) + '%', background: SEX_ACCENT[s] }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
function BarRace({ nat }: { nat: USNational }) {
  const s = sex.value;
  const year = usYear.value;
  const { elRef, chartRef, ready } = useEChart();

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !ready) return;
    const rows = nationalRank(nat, s, year, 12);
    const names = rows.map((r) => r[0]);
    chart.setOption({
      backgroundColor: 'transparent',
      grid: { left: 8, right: 56, top: 6, bottom: 6, containLabel: true },
      xAxis: {
        max: 'dataMax',
        axisLabel: { color: '#8b93a7', fontSize: 10, formatter: (v: number) => (v >= 1000 ? v / 1000 + 'k' : v) },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
      },
      yAxis: {
        type: 'category',
        data: names,
        inverse: true,
        max: 11,
        axisLabel: { color: '#e7eaf2', fontWeight: 600, fontSize: 12 },
        axisTick: { show: false },
        axisLine: { show: false },
        animationDuration: 280,
        animationDurationUpdate: 280,
      },
      series: [
        {
          type: 'bar',
          realtimeSort: true,
          data: rows.map((r) => ({
            value: r[1],
            itemStyle: { color: nameColor(r[0]), borderRadius: [0, 4, 4, 0] },
          })),
          label: {
            show: true,
            position: 'right',
            color: '#cfd6e6',
            fontSize: 11,
            valueAnimation: true,
            formatter: (p: any) => fmtInt(p.value),
          },
        },
      ],
      animationDuration: 0,
      animationDurationUpdate: 320,
      animationEasing: 'linear',
      animationEasingUpdate: 'linear',
    });
  }, [nat, s, year, ready]);

  return <div ref={elRef} class="viz" style={{ height: '360px' }} />;
}

// --------------------------------------------------------------------------
function TrendChart({ series, years }: { series: USNameSeries; years: number[] }) {
  const s = sex.value;
  const year = usYear.value;
  const { elRef, chartRef, ready } = useEChart();
  const [picked, setPicked] = useState<string[]>([]);
  const allNames = useMemo(() => availableNames(series, s), [series, s]);

  useEffect(() => {
    setPicked(
      s === 'C'
        ? [...allTimeTop(series, 'M', 3), ...allTimeTop(series, 'F', 2)]
        : allTimeTop(series, s, 5),
    );
  }, [series, s]);

  const palette = ['#5a9cff', '#f7637c', '#37c2a8', '#f6b73c', '#9b6bf2', '#41c4f0', '#ef7d3b', '#7bc950'];

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !ready) return;
    const seriesData = picked.map((name, i) => {
      const ys = nameSeries(series, s, name);
      return {
        name,
        type: 'line',
        smooth: true,
        showSymbol: false,
        emphasis: { focus: 'series' },
        lineStyle: { width: 2 },
        itemStyle: { color: palette[i % palette.length] },
        data: years.map((y) => ys[String(y)] ?? null),
        connectNulls: false,
      };
    });
    chart.setOption(
      {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: '#0d1320',
          borderColor: 'rgba(255,255,255,0.12)',
          textStyle: { color: '#e7eaf2', fontSize: 12 },
        },
        legend: { show: false },
        grid: { left: 8, right: 14, top: 10, bottom: 24, containLabel: true },
        xAxis: {
          type: 'category',
          data: years,
          axisLabel: { color: '#8b93a7', fontSize: 10 },
          axisLine: { lineStyle: { color: 'rgba(255,255,255,0.12)' } },
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: '#8b93a7', fontSize: 10, formatter: (v: number) => (v >= 1000 ? v / 1000 + 'k' : v) },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        },
        series: [
          ...seriesData,
          {
            type: 'line',
            data: [],
            markLine: {
              symbol: 'none',
              silent: true,
              lineStyle: { color: 'rgba(255,255,255,0.5)', type: 'dashed' },
              label: { show: false },
              data: [{ xAxis: String(year) }],
            },
          },
        ],
      },
      { notMerge: true },
    );
  }, [series, s, picked, years, year, ready]);

  return (
    <>
      <div ref={elRef} class="viz" style={{ height: '300px' }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' }}>
        {picked.map((n) => (
          <span class="tag" key={n} style={{ cursor: 'pointer' }} onClick={() => setPicked((p) => p.filter((x) => x !== n))}>
            {n} ✕
          </span>
        ))}
        <input
          list="us-name-options"
          placeholder="+ add name"
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            color: 'var(--text)',
            padding: '6px 10px',
            width: 130,
          }}
          onChange={(e) => {
            const v = (e.target as HTMLInputElement).value;
            const match = allNames.find((n) => n.toLowerCase() === v.toLowerCase());
            if (match && !picked.includes(match)) setPicked((p) => [...p, match]);
            (e.target as HTMLInputElement).value = '';
          }}
        />
        <datalist id="us-name-options">
          {allNames.slice(0, 1200).map((n) => (
            <option value={n} key={n} />
          ))}
        </datalist>
      </div>
    </>
  );
}
