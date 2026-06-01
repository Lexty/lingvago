import type { ManifestOptions, VitePWAOptions } from 'vite-plugin-pwa';

/**
 * PWA / Service-Worker configuration for the app-shell (SPEC §10.2, §10.6).
 *
 * Identity invariants (cutover §10.6 — v2 replaces v1 in-place on the same
 * origin): `scope` and `start_url` MUST stay `/` so the installed PWA shortcut
 * auto-updates on the same install. `registerType:'autoUpdate'` + Workbox
 * `skipWaiting`/`clientsClaim` evict the old SW without a stuck app-shell.
 *
 * Precache scope is the app-shell (js/css/html/svg/png/woff2) PLUS the
 * versioned content bundle `content.v*.json` (§10.2 — required for offline
 * content). The audio-pack is deliberately NOT precached (§10.2 — only with
 * ListeningMode).
 */

/** Canonical PWA identity — same origin scope as v1 for in-place cutover. */
export const PWA_SCOPE = '/' as const;
export const PWA_START_URL = '/' as const;
export const PWA_REGISTER_TYPE = 'autoUpdate' as const;

/**
 * Calm theme/background color (DESIGN_TOKENS — light "paper" background).
 * Concrete hex pinned here (manifest is config, not a CSS token consumer).
 */
export const PWA_THEME_COLOR = '#f7f4ef' as const;
export const PWA_BACKGROUND_COLOR = '#f7f4ef' as const;

/**
 * VitePWA options with a concrete manifest object (not `false`). The cutover
 * guard only ever validates configs whose manifest is a defined object literal
 * (the live {@link pwaOptions} and the unit-test fixtures), so requiring it at
 * the type level removes a runtime branch that no real caller can reach.
 */
export type PwaOptionsWithManifest = Partial<VitePWAOptions> & {
  manifest: Partial<ManifestOptions>;
};

export const pwaOptions: PwaOptionsWithManifest = {
  registerType: PWA_REGISTER_TYPE,
  // Existing icons live at the public/ root, not under public/icons/.
  includeAssets: ['favicon.svg', 'pwa-192.png', 'pwa-512.png'],
  manifest: {
    name: 'Lingvago',
    short_name: 'Lingvago',
    description: 'Lingvago — Portuguese A1 exam practice (offline).',
    scope: PWA_SCOPE,
    start_url: PWA_START_URL,
    display: 'standalone',
    theme_color: PWA_THEME_COLOR,
    background_color: PWA_BACKGROUND_COLOR,
    icons: [
      { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: 'pwa-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  },
  workbox: {
    // App-shell + versioned content bundle — NO audio-pack (§10.2). The
    // `content.v*.json` glob precaches the content artifact while keeping the
    // broad `**/*.json` (which would pull audio sidecars/manifests) out.
    globPatterns: ['**/*.{js,css,html,svg,png,woff2}', '**/content.v*.json'],
    navigateFallback: '/index.html',
    skipWaiting: true,
    clientsClaim: true,
  },
};

/**
 * Cutover-identity guard (§10.6). Throws if `scope`/`start_url` drift from `/`
 * or if the SW would not auto-update — these are the invariants that keep the
 * installed v1 shortcut working when v2 ships. Called at config build time so a
 * regression fails the build (and is asserted directly by the unit test).
 */
export function assertPwaIdentity(options: PwaOptionsWithManifest): void {
  const manifest = options.manifest;
  const scope = manifest.scope;
  const startUrl = manifest.start_url;
  if (scope !== '/') {
    throw new Error(
      `PWA identity violation (§10.6): manifest.scope must be "/" for v1 cutover, got ${JSON.stringify(scope)}`,
    );
  }
  if (startUrl !== '/') {
    throw new Error(
      `PWA identity violation (§10.6): manifest.start_url must be "/" for v1 cutover, got ${JSON.stringify(startUrl)}`,
    );
  }
  if (options.registerType !== 'autoUpdate') {
    throw new Error(
      `PWA identity violation (§10.6): registerType must be "autoUpdate" for in-place SW update, got ${JSON.stringify(options.registerType)}`,
    );
  }
  if (options.workbox?.skipWaiting !== true || options.workbox?.clientsClaim !== true) {
    throw new Error(
      'PWA identity violation (§10.6): workbox skipWaiting+clientsClaim must be true to evict the old SW',
    );
  }
  const globs = options.workbox?.globPatterns ?? [];
  const joined = globs.join('|');
  // §10.2: the versioned content bundle MUST be precached for offline content.
  if (!globs.some((g) => /content\.v\*?\.json/.test(g))) {
    throw new Error(
      'PWA precache violation (§10.2): workbox globPatterns must precache content.v*.json',
    );
  }
  // §10.2: the audio-pack MUST NOT be precached (only with ListeningMode).
  if (/mp3|ogg|m4a|wav|aac|opus/i.test(joined)) {
    throw new Error(
      'PWA precache violation (§10.2): audio assets must NOT be precached (no audio extensions in globPatterns)',
    );
  }
}

// Fail fast at import/config time if identity invariants are violated.
assertPwaIdentity(pwaOptions);
