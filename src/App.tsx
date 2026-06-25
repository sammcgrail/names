import { view } from './state';
import { SexToggle } from './components/SexToggle';
import { USTimeBar } from './components/USTimeBar';
import { Footer } from './components/Footer';
import { GlobalView } from './pages/GlobalView';
import { USView } from './pages/USView';
import { GlobeView } from './pages/GlobeView';
import type { View } from './types';

const TABS: { k: View; label: string }[] = [
  { k: 'global', label: '🌍 Global' },
  { k: 'us', label: '🇺🇸 US by state' },
  { k: 'globe', label: '🪐 3D Globe' },
];

export function App() {
  const v = view.value;
  return (
    <div class="app">
      <header class="topbar">
        <div class="topbar-inner">
          <div class="brand">
            names<span class="dot">.</span>
            <small>a global name explorer</small>
          </div>
          <nav class="tabs">
            {TABS.map((t) => (
              <button
                key={t.k}
                class={'tab' + (v === t.k ? ' active' : '')}
                onClick={() => (view.value = t.k)}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <span class="spacer" />
          <SexToggle />
        </div>
        {v === 'us' && <USTimeBar />}
      </header>
      <main class="main">
        {v === 'global' && <GlobalView />}
        {v === 'us' && <USView />}
        {v === 'globe' && <GlobeView />}
      </main>
      <Footer />
    </div>
  );
}
