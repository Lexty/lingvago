/**
 * Service-Worker registration (SPEC §10.2 offline-after-first-load, §10.6
 * in-place cutover). Uses vite-plugin-pwa's virtual register module so the SW
 * (app-shell precache) is registered with `autoUpdate` semantics: a new SW
 * takes over via Workbox `skipWaiting`+`clientsClaim` without a stuck shell.
 *
 * Precache scope is the app-shell only — the audio-pack is NOT precached
 * (§10.2), and versioned `content.vN.json` is wired later (T6).
 */
export function registerPwa(): void {
  // No-op outside a browser (SSR / tests / unsupported environments).
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  // Dynamic import so the virtual module is only pulled in the browser bundle
  // and never evaluated during unit tests / typecheck of non-bundled code.
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}
