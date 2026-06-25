# names — global name explorer · build decisions

**Live:** https://names.sebland.com · **Port:** 20041 (container `names`, bridge network) · **Tile:** halfway down the sebland.com homepage grid (after MP Paint).

## Stack
Preact + TypeScript + Vite (mirrors tonykudo). **ECharts** for the choropleths, bar-chart race and trend lines; **globe.gl** (+ three) for the 3D globe (mirrors radarling/tonykudo's globe.gl usage). State via `@preact/signals`. Docker multi-stage (node build → nginx serve). Subdomain via Caddy `reverse_proxy host.docker.internal:20041`.

## Views
- **Global** — world choropleth where every country is coloured by its #1 given name (reveals regional name-sharing clusters); "Shared names" inference panel; country badges with emoji flags; country detail drawer.
- **US by state** — animated state choropleth (#1 name per state) driven by a single year scrubber + play/speed that ALSO drives a synced national bar-chart **race**; name-trend line chart with add/remove chips + a marker tracking the scrubber; click-a-state → top-10 panel; at-a-glance stats.
- **3D Globe** — globe.gl polygons coloured by top name; click or search a country → fly-to + detail drawer; legend overlay; iOS touch hardening.

Male / Female / Combined toggle affects every view. Country search autocomplete (top bar) focuses a country everywhere; globe/map clicks sync the same `selectedCountry` signal.

## Data (`public/data/`, built by `scripts/build_data.py`)
- **US** — Social Security Administration: national 1880–2024 (`us_national.json`, `us_name_series.json`), by-state 1910–2024 (`us_states.json`, top-10 M/F per state/year; combined derived in-frontend). SSA's own site is Akamai-bot-blocked from datacenter IPs → sourced from GitHub mirrors (leggitta/Names national; RyanMcNeillTR + BazilAkram for state, LFS resolved via batch API).
- **Global** — `names-dataset` (philipperemy, Apache-2.0; names derived from a large public dataset), 105 countries, top-20 M/F → `global_names.json`.
- **Country metadata + emoji flags** — mledoze/countries (ODbL) → `countries.json` (250 countries).
- **Geometry** — world-atlas `countries-110m` + us-atlas `states-10m` (Natural Earth, public domain), bundled in `geo/`. Joins: world topo `id` = ISO ccn3; US topo `id` = FIPS (mapped to USPS abbrev in `src/data/usStates.ts`).
- Earth textures bundled locally in `public/img/` (avoids runtime CORS from unpkg).

## Key gotchas hit
- **ECharts async-init race**: `echarts.init` resolves after the `setOption` effect ran once → blank charts. Fixed with `useEChart` hook exposing a `ready` flag that `setOption` effects depend on.
- **Chart div behind an early `return <loading>`**: the chart container must be a child component mounted only after data loads, else the mount-effect fires with no element. (GlobalView's `WorldMap` extraction.)
- **globe.gl clears its mount node's children** → Preact overlays vanished. Fixed by giving globe.gl its own inner `.globe-canvas` div with overlays as siblings.
- **Docker network pool exhausted** (33 compose networks) → `network_mode: bridge` (Caddy reaches via host published port, no dedicated subnet needed).

## Feedback round 2 (B/C/D/E/F)
- **D — stable per-name colours**: `nameColor(name)` is now a pure FNV-1a→HSL hash (bright 56–70% L band), cached. `buildNameColorScale.colorFor` routes through it, so a name keeps ONE colour everywhere (world/US/globe maps, legend, badges, bar-race). Frequency only orders the legend now, never picks colour.
- **E1 — global "Both" map ≠ Male**: world + globe choropleths use `countryFillColor()`. M/F = that gender's #1 colour; Combined = `blendHex(maleColour, femaleColour)` — visibly its own map (the dataset has no counts, so a blend is the honest "both"). Badges/legend already dual via `displayTop`; legend source in Combined now includes both genders' #1s.
- **C — year overlay**: big tabular `<div class="year-overlay">` floats top-right over the bar-race (44px) and trend chart (34px), bound to the `usYear` signal so it updates live while playing/scrubbing.
- **B — US map fit**: `scripts`-style one-off rewrote `geo/usa-echarts.json` — Alaska scaled to ~16° wide (×0.62 height squash) inset under the SW, Hawaii scaled UP to ~7° wide under TX, Puerto Rico dropped. Overall bbox lon[-124.7,-67] lat[20.6,49.4] (~2:1) so CONUS fills the panel; container aspect 1.95:1.
- **E3 — state label clip**: tiny/crowded states (RI DE CT NJ MD DC MA NH VT) drop their persistent label (`label.show:false` per-datum); name still shows on hover via emphasis. `hideOverlap` kept.
- **F — mobile**: globe capped `min(56vh,460px)` on phones; long side panels use `<Collapsible>` (`<details>`-based — accordion <900px, force-open on desktop via `::details-content{content-visibility:visible}`); tappable UI gets `user-select:none`. Gate (`check-mobile.py`) exit 0.

## Deploy
`docker compose up --build -d` in /root/names; Caddy block + `/names` redirect + homepage tile in /root/box; status container list in /root/seb; rebuild `web` (`docker compose build --no-cache web` in /root/box); CF cache purge. Mobile baseline gate (`check-mobile.py`) passes.

## 2026-06-25 — slider grab fix (iOS Safari bottom bar)
Problem: time-bar slider unusable on iPhone, esp. when Safari's bottom toolbar is
hidden — the control sat in the home-indicator gesture strip (`bottom:0` + only
`10px + safe-area`; safe-area is unreliable/transient on iOS so the standoff
collapsed). Thumb was a 30px circle = tiny target.
Fix (src/styles/main.css):
- `.timebar` padding-bottom → `calc(24px + env(safe-area-inset-bottom))`: a fixed
  24px standoff that holds even if iOS reports safe-area as 0. Lifts the grip out
  of the gesture/toolbar-re-summon zone in BOTH toolbar states.
- Slider redesigned via `::-webkit-slider-runnable-track`/`::-moz-range-track`:
  20px rounded rectangle track with decade tick marks (graduations), and a tall
  26x46 rounded-rectangle grip with finger ridges. 52px touch target.
- `touch-action:none` on the input so iOS doesn't steal the drag to scroll.
- `.us-view` spacer bumped to `calc(116/112px + safe-area)` for the taller bar.
