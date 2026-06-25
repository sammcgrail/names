import { feature } from 'topojson-client';

// Convert a TopoJSON object into a GeoJSON FeatureCollection, normalising any
// polygon ring that crosses the ±180° antimeridian. Without this, countries
// whose longitudes wrap the seam (Russia, Fiji, Antarctica in Natural Earth)
// smear a solid horizontal band across the whole equirectangular world map —
// the orange "Russia" glitch seen on the Global view.
export function topoToGeo(topo: any, objectName: string): any {
  const obj = topo.objects[objectName];
  if (!obj) throw new Error(`topojson object '${objectName}' not found`);
  const geo: any = feature(topo, obj);
  for (const f of geo.features) unwrapFeature(f);
  return geo;
}

// Walk every ring of a (Multi)Polygon and strip ±360° longitude jumps so each
// ring stays continuous (e.g. eastern Russia's −179° becomes +181°, contiguous
// with the +179° mainland) instead of stretching across the map. Rings that
// never touch the seam are untouched — the while-loops simply never fire.
// Harmless on the 3D globe: a longitude of 181° is the same sphere point as
// −179°.
function unwrapFeature(f: any): void {
  const g = f?.geometry;
  if (!g) return;
  if (g.type === 'Polygon') g.coordinates.forEach(unwrapRing);
  else if (g.type === 'MultiPolygon')
    g.coordinates.forEach((poly: any) => poly.forEach(unwrapRing));
}

function unwrapRing(ring: number[][]): void {
  if (!ring || ring.length < 2) return;
  let prev = ring[0][0];
  for (let i = 1; i < ring.length; i++) {
    let lng = ring[i][0];
    while (lng - prev > 180) lng -= 360;
    while (lng - prev < -180) lng += 360;
    ring[i][0] = lng;
    prev = lng;
  }
}
