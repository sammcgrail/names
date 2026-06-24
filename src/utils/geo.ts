import { feature } from 'topojson-client';

// Convert a TopoJSON object into a GeoJSON FeatureCollection.
export function topoToGeo(topo: any, objectName: string): any {
  const obj = topo.objects[objectName];
  if (!obj) throw new Error(`topojson object '${objectName}' not found`);
  return feature(topo, obj);
}
