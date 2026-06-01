import { describe, it, expect } from 'vitest';
import {
  pwaOptions,
  assertPwaIdentity,
  PWA_SCOPE,
  PWA_START_URL,
  PWA_REGISTER_TYPE,
  PWA_THEME_COLOR,
  PWA_BACKGROUND_COLOR,
  type PwaOptionsWithManifest,
} from './pwa-config.ts';

// `manifest` is typed `false | Partial<ManifestOptions>`; the live config sets
// it to an object — assert that and narrow for the field-level expectations.
const manifest = pwaOptions.manifest;
if (!manifest) {
  throw new Error('test setup: pwaOptions.manifest must be an object');
}

describe('PWA config — cutover identity (§10.6, AC6)', () => {
  it('manifest scope and start_url are "/" (installed v1 shortcut survives)', () => {
    expect(manifest.scope).toBe('/');
    expect(manifest.start_url).toBe('/');
    expect(PWA_SCOPE).toBe('/');
    expect(PWA_START_URL).toBe('/');
  });

  it('registerType is autoUpdate (in-place SW auto-update)', () => {
    expect(pwaOptions.registerType).toBe('autoUpdate');
    expect(PWA_REGISTER_TYPE).toBe('autoUpdate');
  });

  it('workbox evicts the old SW via skipWaiting + clientsClaim', () => {
    expect(pwaOptions.workbox?.skipWaiting).toBe(true);
    expect(pwaOptions.workbox?.clientsClaim).toBe(true);
  });

  it('manifest identity fields use Calm name + standalone + pinned hex', () => {
    expect(manifest.name).toBe('Lingvago');
    expect(manifest.short_name).toBe('Lingvago');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe(PWA_THEME_COLOR);
    expect(manifest.background_color).toBe(PWA_BACKGROUND_COLOR);
    // Calm light "paper" background from DESIGN_TOKENS.
    expect(PWA_THEME_COLOR).toBe('#f7f4ef');
    expect(PWA_BACKGROUND_COLOR).toBe('#f7f4ef');
  });

  it('icons reference the existing public/ assets (192 + 512 + maskable)', () => {
    const icons = manifest.icons ?? [];
    const srcs = icons.map((i) => i.src);
    expect(srcs).toContain('pwa-192.png');
    expect(srcs).toContain('pwa-512.png');
    expect(icons.some((i) => i.purpose === 'maskable')).toBe(true);
  });

  it('workbox precaches the app-shell + content.v*.json but NOT the audio-pack', () => {
    const globs = pwaOptions.workbox?.globPatterns ?? [];
    expect(globs).toContain('**/*.{js,css,html,svg,png,woff2}');
    // The versioned content bundle IS precached (§10.2 — offline content).
    expect(globs.some((g) => /content\.v\*?\.json/.test(g))).toBe(true);
    // No audio extensions are precached (§10.2 — audio-pack excluded).
    const joined = globs.join('|');
    expect(joined).not.toMatch(/mp3|ogg|m4a|wav|aac|opus/i);
    expect(pwaOptions.workbox?.navigateFallback).toBe('/index.html');
  });

  it('the live config passes the identity guard', () => {
    expect(() => assertPwaIdentity(pwaOptions)).not.toThrow();
  });
});

describe('PWA identity guard rejects drift (error case, AC6)', () => {
  const base = (): PwaOptionsWithManifest => ({
    registerType: 'autoUpdate',
    workbox: {
      skipWaiting: true,
      clientsClaim: true,
      globPatterns: ['**/*.{js,css,html,svg,png,woff2}', '**/content.v*.json'],
    },
    manifest: { scope: '/', start_url: '/' },
  });

  it('throws when scope is not "/"', () => {
    const bad = base();
    bad.manifest = { ...bad.manifest, scope: '/app/' };
    expect(() => assertPwaIdentity(bad)).toThrow(/scope/i);
  });

  it('throws when start_url is not "/"', () => {
    const bad = base();
    bad.manifest = { ...bad.manifest, start_url: '/home' };
    expect(() => assertPwaIdentity(bad)).toThrow(/start_url/i);
  });

  it('throws when registerType is not autoUpdate', () => {
    const bad = base();
    bad.registerType = 'prompt';
    expect(() => assertPwaIdentity(bad)).toThrow(/autoUpdate/i);
  });

  it('throws when skipWaiting/clientsClaim are not both true', () => {
    const bad = base();
    bad.workbox = {
      skipWaiting: false,
      clientsClaim: true,
      globPatterns: ['**/content.v*.json'],
    };
    expect(() => assertPwaIdentity(bad)).toThrow(/skipWaiting|clientsClaim/i);
  });

  it('throws when content.v*.json is NOT precached (§10.2)', () => {
    const bad = base();
    bad.workbox = {
      ...bad.workbox,
      globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
    };
    expect(() => assertPwaIdentity(bad)).toThrow(/content\.v\*\.json/i);
  });

  it('throws when audio assets WOULD be precached (§10.2)', () => {
    const bad = base();
    bad.workbox = {
      ...bad.workbox,
      globPatterns: ['**/content.v*.json', '**/*.mp3'],
    };
    expect(() => assertPwaIdentity(bad)).toThrow(/audio/i);
  });
});
