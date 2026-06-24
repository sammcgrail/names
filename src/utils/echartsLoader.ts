import type * as EChartsNS from 'echarts';

let p: Promise<typeof EChartsNS> | null = null;
export function getECharts(): Promise<typeof EChartsNS> {
  if (!p) p = import('echarts');
  return p;
}

const registered = new Set<string>();
export async function registerMapOnce(name: string, geojson: unknown) {
  const ec = await getECharts();
  if (!registered.has(name)) {
    ec.registerMap(name, geojson as any);
    registered.add(name);
  }
  return ec;
}
