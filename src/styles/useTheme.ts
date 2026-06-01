import { useCallback, useEffect, useState } from 'react';

/**
 * Theme preference (SPEC §10.4 / DESIGN_TOKENS «Тема»).
 * - `auto`  → follow the system via @media (no forced data-theme).
 * - `light` → force light palette (data-theme="light").
 * - `dark`  → force dark palette (data-theme="dark").
 */
export type ThemePref = 'auto' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'lg.theme';

const THEME_PREFS: readonly ThemePref[] = ['auto', 'light', 'dark'];

/** Type guard for a valid stored preference. */
export function isThemePref(value: unknown): value is ThemePref {
  return (
    typeof value === 'string' && (THEME_PREFS as readonly string[]).includes(value)
  );
}

/**
 * Read the persisted preference, falling back to `auto` for any
 * missing / empty / invalid / unreadable value (never throws).
 */
export function readStoredTheme(): ThemePref {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePref(raw) ? raw : 'auto';
  } catch {
    return 'auto';
  }
}

/**
 * Apply a preference to <html> and persist it.
 * `auto` removes the attribute so the @media (prefers-color-scheme) path wins;
 * `light`/`dark` set an explicit data-theme. Persistence failures are ignored.
 */
export function applyTheme(pref: ThemePref): void {
  const root = document.documentElement;
  if (pref === 'auto') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', pref);
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    /* persistence is best-effort; ignore quota/private-mode failures */
  }
}

/** Apply the stored (or default `auto`) preference. Call once at startup. */
export function initTheme(): ThemePref {
  const pref = readStoredTheme();
  applyTheme(pref);
  return pref;
}

/**
 * React hook for reading and changing the theme preference.
 * On mount it syncs to the persisted value; `setTheme` applies + persists.
 */
export function useTheme(): {
  theme: ThemePref;
  setTheme: (pref: ThemePref) => void;
} {
  const [theme, setThemeState] = useState<ThemePref>(readStoredTheme);

  useEffect(() => {
    // Ensure the DOM reflects the current preference.
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((pref: ThemePref) => {
    applyTheme(pref);
    setThemeState(pref);
  }, []);

  return { theme, setTheme };
}
