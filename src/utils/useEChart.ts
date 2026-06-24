import { useEffect, useRef, useState } from 'preact/hooks';
import { getECharts } from './echartsLoader';

// Mounts an ECharts instance on elRef, exposes a `ready` flag that flips true
// once the (async-imported) instance exists — so setOption effects can depend
// on it and reliably run after init. Handles resize + dispose.
export function useEChart() {
  const elRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const onClickRef = useRef<((p: any) => void) | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let ro: ResizeObserver | null = null;
    let disposed = false;
    getECharts().then((ec) => {
      if (disposed || !elRef.current) return;
      const chart = ec.init(elRef.current, undefined, { renderer: 'canvas' });
      chartRef.current = chart;
      chart.on('click', (p: any) => onClickRef.current?.(p));
      ro = new ResizeObserver(() => chart.resize());
      ro.observe(elRef.current);
      setReady(true);
    });
    return () => {
      disposed = true;
      ro?.disconnect();
      chartRef.current?.dispose?.();
      chartRef.current = null;
    };
  }, []);

  return { elRef, chartRef, ready, onClickRef };
}
