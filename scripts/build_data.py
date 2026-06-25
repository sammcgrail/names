#!/usr/bin/env python3
"""
build_data.py — Data-engineering step for the "global names" dashboard.

Regenerates every JSON file under public/data/ from raw sources staged in raw/.

Run:
    cd /root/names
    uv run --with names-dataset python3 scripts/build_data.py

Sources (all fetched into raw/ by scripts/fetch_sources.sh, or already present):
  - National SSA baby names 1880-2024 .... raw/national/yob*.txt
        (mirror: github.com/leggitta/Names — official SSA yob format `name,sex,count`)
  - State SSA baby names 1910-2020 ........ raw/namesbystate.zip
        (mirror: github.com/RyanMcNeillTR/baby_names_example via Git-LFS;
         canonical SSA format `state,sex,year,name,count`, proper-cased names)
  - State SSA baby names 2021-2024 ........ raw/ba_states_{2021..2024}.json
        (mirror: github.com/BazilAkram/Name-Atlas — derived per-year JSON;
         names are UPPERCASE, title-cased here to match SSA convention)
  - Global first names by country ......... names-dataset PyPI (philipperemy)
  - Country metadata + emoji flags ........ raw/mledoze-countries.json
        (github.com/mledoze/countries)
  - Map geometry .......................... public/data/geo/{world-110m,states-10m}.json
        (world-atlas 2.0.2 / us-atlas 3.0.1, downloaded directly to geo/)

Outputs (public/data/):
  us_national.json, us_name_series.json, us_states.json,
  global_names.json, countries.json, meta.json
"""

import json
import os
import re
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw"
OUT = ROOT / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)

TODAY = "2026-06-25"

# State coverage boundaries
STATE_MIN_YEAR = 1910
STATE_MAX_YEAR = 2025
STATE_CANON_MAX = 2020       # canonical zip covers 1910..2020
STATE_SUPP_YEARS = [2021, 2022, 2023, 2024, 2025]  # 2021-24 BazilAkram; 2025 = official SSA (derived)

TOP_NATIONAL = 50            # top-N names per (year, sex) for rankByYear
TOP_SERIES = 200             # top-N all-time names per sex for full series
TOP_STATE = 10               # top-N names per (state, year, sex)


def write_json(name, obj):
    """Write compact JSON (no spaces) and report size."""
    path = OUT / name
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    size = path.stat().st_size
    print(f"  wrote {name:24} {size:>12,} bytes  ({size/1024/1024:.2f} MB)")
    return size


def smart_title(s):
    """Title-case a name token (SSA names are single tokens; handle any stray sep)."""
    return re.sub(r"[A-Za-z]+", lambda m: m.group(0).capitalize(), s)


# ---------------------------------------------------------------------------
# 1 + 2: National (us_national.json, us_name_series.json)
# ---------------------------------------------------------------------------
def build_national():
    print("[national] reading yob*.txt …")
    nat_dir = RAW / "national"
    files = sorted(nat_dir.glob("yob*.txt"),
                   key=lambda p: int(re.search(r"yob(\d{4})", p.name).group(1)))
    if not files:
        sys.exit("FATAL: no national yob*.txt files found in raw/national/")

    years = []
    # totals[sex][year] = sum of all counts; counts[sex][year] = list[(name,count)]
    totals = {"M": {}, "F": {}}
    per_year = {"M": {}, "F": {}}
    # all-time totals per name per sex
    alltime = {"M": defaultdict(int), "F": defaultdict(int)}
    # full series per name per sex: series[sex][name][year] = count
    series = {"M": defaultdict(dict), "F": defaultdict(dict)}

    for fp in files:
        year = int(re.search(r"yob(\d{4})", fp.name).group(1))
        years.append(year)
        sums = {"M": 0, "F": 0}
        rows = {"M": [], "F": []}
        with open(fp, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                name, sex, cnt = line.split(",")
                cnt = int(cnt)
                sums[sex] += cnt
                rows[sex].append((name, cnt))
                alltime[sex][name] += cnt
                series[sex][name][year] = cnt
        for sex in ("M", "F"):
            totals[sex][str(year)] = sums[sex]
            # top-N by count desc, tie-break name asc
            rows[sex].sort(key=lambda x: (-x[1], x[0]))
            per_year[sex][str(year)] = [[n, c] for n, c in rows[sex][:TOP_NATIONAL]]

    years.sort()
    national = {
        "minYear": years[0],
        "maxYear": years[-1],
        "years": years,
        "totals": totals,
        "rankByYear": per_year,
    }

    # us_name_series: top-200 all-time names per sex, full yearly series
    name_series = {"M": {}, "F": {}}
    for sex in ("M", "F"):
        top = sorted(alltime[sex].items(), key=lambda x: (-x[1], x[0]))[:TOP_SERIES]
        for name, _ in top:
            # only years present, keys as strings, sorted by year
            yr_map = series[sex][name]
            name_series[sex][name] = {str(y): yr_map[y] for y in sorted(yr_map)}

    return national, name_series, years


# ---------------------------------------------------------------------------
# 3: State (us_states.json)
# ---------------------------------------------------------------------------
def build_states():
    print("[states] reading namesbystate.zip (1910-2020) …")
    zpath = RAW / "namesbystate.zip"
    if not zpath.exists():
        sys.exit("FATAL: raw/namesbystate.zip not found")

    # acc[sex][state][year] -> dict(name->count)  (merge supplement into same acc)
    acc = {"M": defaultdict(lambda: defaultdict(lambda: defaultdict(int))),
           "F": defaultdict(lambda: defaultdict(lambda: defaultdict(int)))}
    states_seen = set()

    z = zipfile.ZipFile(zpath)
    for nm in z.namelist():
        if not nm.endswith(".TXT"):
            continue
        st = nm[:-4].upper()
        states_seen.add(st)
        for line in z.read(nm).decode("utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            state, sex, year, name, cnt = line.split(",")
            y = int(year)
            if y > STATE_CANON_MAX:   # safety: canonical zip is 1910..2020
                continue
            acc[sex][st][y][name] += int(cnt)

    print(f"[states] canonical states: {len(states_seen)}  "
          f"(years {STATE_MIN_YEAR}-{STATE_CANON_MAX})")

    # Supplement 2021-2024 from BazilAkram per-year JSON (names UPPERCASE -> title)
    for y in STATE_SUPP_YEARS:
        bp = RAW / f"ba_states_{y}.json"
        if not bp.exists():
            print(f"[states] WARN: supplement {bp.name} missing; skipping {y}")
            continue
        ba = json.load(open(bp, encoding="utf-8"))
        # structure: names[NAME]{ 'M'|'F': { ST: [count, rank, rate] } }
        for raw_name, sexes in ba["names"].items():
            name = smart_title(raw_name)
            for sex in ("M", "F"):
                for st, arr in sexes.get(sex, {}).items():
                    st = st.upper()
                    states_seen.add(st)
                    acc[sex][st][y][name] += int(arr[0])
        print(f"[states] supplemented year {y} from {bp.name}")

    states = sorted(states_seen)
    totals = {"M": {}, "F": {}}
    top = {"M": {}, "F": {}}
    for sex in ("M", "F"):
        for st in states:
            tot_by_year = {}
            top_by_year = {}
            for y, namemap in acc[sex][st].items():
                tot_by_year[str(y)] = sum(namemap.values())
                ranked = sorted(namemap.items(), key=lambda x: (-x[1], x[0]))[:TOP_STATE]
                top_by_year[str(y)] = [[n, c] for n, c in ranked]
            if tot_by_year:
                totals[sex][st] = tot_by_year
                top[sex][st] = top_by_year

    out = {
        "minYear": STATE_MIN_YEAR,
        "maxYear": STATE_MAX_YEAR,
        "states": states,
        "totals": totals,
        "top": top,
    }
    return out, states


# ---------------------------------------------------------------------------
# 4: Global names per country (global_names.json) — names-dataset
# ---------------------------------------------------------------------------
def build_global():
    print("[global] loading names-dataset (~3.2GB RAM, one-time) …")
    try:
        from names_dataset import NameDataset
    except ImportError:
        sys.exit("FATAL: run under `uv run --with names-dataset python3 ...`")
    nd = NameDataset()

    codes = sorted(set(c.upper() for c in nd.get_country_codes(alpha_2=True)))
    print(f"[global] {len(codes)} supported alpha-2 country codes")

    out = {}
    captured = 0
    for cc in codes:
        try:
            res = nd.get_top_names(n=20, country_alpha2=cc)
        except Exception as e:
            continue
        block = res.get(cc) if isinstance(res, dict) else None
        if not block:
            continue
        m = block.get("M") or []
        f = block.get("F") or []
        if not m and not f:
            continue
        out[cc] = {"M": list(m), "F": list(f)}
        captured += 1

    print(f"[global] captured {captured} countries with names")
    return out, captured


# ---------------------------------------------------------------------------
# 5: Country metadata (countries.json) — mledoze
# ---------------------------------------------------------------------------
def build_countries():
    print("[countries] trimming mledoze dataset …")
    src = json.load(open(RAW / "mledoze-countries.json", encoding="utf-8"))
    out = []
    for c in src:
        cap = c.get("capital") or []
        item = {
            "cca2": c.get("cca2", ""),
            "cca3": c.get("cca3", ""),
            "ccn3": c.get("ccn3", ""),
            "name": (c.get("name") or {}).get("common", ""),
            "flag": c.get("flag", ""),
            "region": c.get("region", ""),
            "subregion": c.get("subregion", ""),
            "capital": cap[0] if cap else "",
            "latlng": c.get("latlng", []),
        }
        pop = c.get("population")
        if isinstance(pop, (int, float)) and pop > 0:
            item["population"] = pop
        out.append(item)
    out.sort(key=lambda x: x["name"])
    print(f"[countries] {len(out)} countries")
    return out


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------
def main():
    print("=" * 60)
    print("BUILD global-names data")
    print("=" * 60)
    sizes = {}

    national, name_series, nat_years = build_national()
    sizes["us_national.json"] = write_json("us_national.json", national)
    sizes["us_name_series.json"] = write_json("us_name_series.json", name_series)

    states_obj, state_list = build_states()
    sizes["us_states.json"] = write_json("us_states.json", states_obj)

    # Global names have no year dimension and never change between SSA refreshes;
    # SKIP_GLOBAL=1 reuses the existing JSON (avoids the ~3.2 GB names-dataset load).
    if os.environ.get("SKIP_GLOBAL") == "1":
        existing = json.load(open(OUT / "global_names.json", encoding="utf-8"))
        country_count = len(existing)
        print(f"[global] SKIP_GLOBAL=1 → reusing existing global_names.json "
              f"({country_count} countries)")
    else:
        global_obj, country_count = build_global()
        sizes["global_names.json"] = write_json("global_names.json", global_obj)

    countries = build_countries()
    sizes["countries.json"] = write_json("countries.json", countries)

    meta = {
        "generated": TODAY,
        "sources": [
            {"name": "U.S. Social Security Administration",
             "scope": "US national & state baby names",
             "license": "Public Domain",
             "years": "1880–2025 (states 1910–2025)"},
            {"name": "names-dataset (philipperemy)",
             "scope": "Global first names by country & gender",
             "license": "Apache-2.0; data derived from a 2019 public data leak — names only",
             "countries": country_count},
            {"name": "mledoze/countries",
             "scope": "Country metadata & flags",
             "license": "ODbL"},
            {"name": "world-atlas / us-atlas (Natural Earth)",
             "scope": "Map geometry",
             "license": "Public Domain"},
        ],
        "usNationalYears": [nat_years[0], nat_years[-1]],
        "usStateYears": [STATE_MIN_YEAR, STATE_MAX_YEAR],
        "globalCountryCount": country_count,
    }
    sizes["meta.json"] = write_json("meta.json", meta)

    # geometry sizes (already present)
    for g in ("geo/world-110m.json", "geo/states-10m.json"):
        gp = OUT / g
        if gp.exists():
            print(f"  geometry {g:24} {gp.stat().st_size:>12,} bytes")

    print("=" * 60)
    total = sum(sizes.values())
    print(f"TOTAL data JSON: {total:,} bytes ({total/1024/1024:.2f} MB)")
    print("=" * 60)


if __name__ == "__main__":
    main()
