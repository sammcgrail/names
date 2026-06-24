#!/usr/bin/env bash
#
# fetch_sources.sh — download every raw source the build needs into raw/ and
# the map geometry into public/data/geo/. Idempotent; safe to re-run.
#
# Notes on provenance:
#   * www.ssa.gov is Akamai bot-blocked from this datacenter IP (403), so all
#     SSA data is pulled from GitHub mirrors instead.
#   * National 1880-2024 .... github.com/leggitta/Names (official yob*.txt)
#   * State  1910-2020 ...... github.com/RyanMcNeillTR/baby_names_example
#                             (namesbystate.zip stored via Git-LFS -> resolved
#                              through the LFS batch API, no git-lfs binary needed)
#   * State  2021-2024 ...... github.com/BazilAkram/Name-Atlas (per-year JSON)
#   * Countries ............. github.com/mledoze/countries
#   * Geometry .............. world-atlas 2.0.2 / us-atlas 3.0.1 (jsdelivr)
#
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RAW="$ROOT/raw"
GEO="$ROOT/public/data/geo"
mkdir -p "$RAW/national" "$GEO"

echo "== national yob*.txt (leggitta/Names, 1880-2024) =="
curl -sSL "https://codeload.github.com/leggitta/Names/tar.gz/refs/heads/master" -o /tmp/_leggitta.tar.gz
tmp=$(mktemp -d)
tar -xzf /tmp/_leggitta.tar.gz -C "$tmp"
cp "$tmp"/Names-master/names/yob*.txt "$RAW/national/"
rm -rf "$tmp" /tmp/_leggitta.tar.gz
echo "   national files: $(ls "$RAW"/national/yob*.txt | wc -l)"

echo "== state namesbystate.zip (RyanMcNeillTR via LFS, 1910-2020) =="
# Read the LFS pointer to get oid+size, then resolve via the LFS batch API.
PTR=$(curl -sSL "https://raw.githubusercontent.com/RyanMcNeillTR/baby_names_example/main/data/namesbystate.zip")
OID=$(echo "$PTR" | sed -n 's/^oid sha256:\(.*\)$/\1/p')
SZ=$(echo "$PTR" | sed -n 's/^size \(.*\)$/\1/p')
HREF=$(curl -sSL -X POST \
  "https://github.com/RyanMcNeillTR/baby_names_example.git/info/lfs/objects/batch" \
  -H "Accept: application/vnd.git-lfs+json" \
  -H "Content-Type: application/vnd.git-lfs+json" \
  -d "{\"operation\":\"download\",\"transfers\":[\"basic\"],\"objects\":[{\"oid\":\"$OID\",\"size\":$SZ}]}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['objects'][0]['actions']['download']['href'])")
curl -sSL "$HREF" -o "$RAW/namesbystate.zip"
echo "   namesbystate.zip: $(stat -c%s "$RAW/namesbystate.zip") bytes"

echo "== state supplement 2021-2024 (BazilAkram/Name-Atlas) =="
for y in 2021 2022 2023 2024; do
  curl -sSL "https://raw.githubusercontent.com/BazilAkram/Name-Atlas/main/data/states/$y.json" \
    -o "$RAW/ba_states_$y.json"
done

echo "== country metadata (mledoze/countries) =="
curl -sSL "https://raw.githubusercontent.com/mledoze/countries/master/dist/countries.json" \
  -o "$RAW/mledoze-countries.json"

echo "== map geometry (jsdelivr) =="
curl -sSL "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json" \
  -o "$GEO/world-110m.json"
curl -sSL "https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/states-10m.json" \
  -o "$GEO/states-10m.json"

echo "== done. now run: uv run --with names-dataset python3 scripts/build_data.py =="
