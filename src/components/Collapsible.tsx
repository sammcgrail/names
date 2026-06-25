import type { ComponentChildren } from 'preact';

// A panel that is a plain always-open card on desktop and a tap-to-collapse
// accordion on narrow screens (CSS-driven via `details.collapsible`). The
// summary holds the title; `defaultOpen` controls the initial mobile state.
export function Collapsible({
  title,
  defaultOpen = true,
  children,
}: {
  title: ComponentChildren;
  defaultOpen?: boolean;
  children: ComponentChildren;
}) {
  return (
    <details class="panel collapsible" open={defaultOpen}>
      <summary>
        <h2 class="panel-h2">{title}</h2>
        <svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div class="collapsible-body">{children}</div>
    </details>
  );
}
