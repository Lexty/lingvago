import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyTheme,
  initTheme,
  isThemePref,
  readStoredTheme,
  THEME_STORAGE_KEY,
  useTheme,
} from './useTheme.ts';

function dataTheme(): string | null {
  return document.documentElement.getAttribute('data-theme');
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('applyTheme', () => {
  it('auto: removes data-theme (follows @media) and persists', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    applyTheme('auto');
    expect(dataTheme()).toBeNull();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('auto');
  });

  it('light: sets data-theme="light" and persists', () => {
    applyTheme('light');
    expect(dataTheme()).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('dark: sets data-theme="dark" and persists', () => {
    applyTheme('dark');
    expect(dataTheme()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });
});

describe('readStoredTheme / isThemePref', () => {
  it('returns the persisted valid value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(readStoredTheme()).toBe('dark');
  });

  it('falls back to auto when nothing is stored', () => {
    expect(readStoredTheme()).toBe('auto');
  });

  it('falls back to auto for an empty stored value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, '');
    expect(readStoredTheme()).toBe('auto');
  });

  it('falls back to auto for an invalid stored value without throwing', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'neon');
    expect(() => readStoredTheme()).not.toThrow();
    expect(readStoredTheme()).toBe('auto');
  });

  it('isThemePref guards values', () => {
    expect(isThemePref('auto')).toBe(true);
    expect(isThemePref('light')).toBe(true);
    expect(isThemePref('dark')).toBe(true);
    expect(isThemePref('')).toBe(false);
    expect(isThemePref('neon')).toBe(false);
    expect(isThemePref(null)).toBe(false);
    expect(isThemePref(42)).toBe(false);
  });
});

describe('initTheme', () => {
  it('applies the stored preference at startup', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(initTheme()).toBe('dark');
    expect(dataTheme()).toBe('dark');
  });

  it('applies auto (no data-theme) when stored value is invalid', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'bogus');
    document.documentElement.setAttribute('data-theme', 'light');
    expect(initTheme()).toBe('auto');
    expect(dataTheme()).toBeNull();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('auto');
  });
});

describe('useTheme', () => {
  it('auto: no forced data-theme + persisted value', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('dark');
    });
    expect(dataTheme()).toBe('dark');

    act(() => {
      result.current.setTheme('auto');
    });
    expect(result.current.theme).toBe('auto');
    expect(dataTheme()).toBeNull();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('auto');
  });

  it('light: data-theme="light" + persist', () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.setTheme('light');
    });
    expect(result.current.theme).toBe('light');
    expect(dataTheme()).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('dark: data-theme="dark" + persist', () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.setTheme('dark');
    });
    expect(result.current.theme).toBe('dark');
    expect(dataTheme()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('initializes from a persisted preference on mount', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(dataTheme()).toBe('dark');
  });

  it('falls back to auto on mount when stored value is invalid', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'invalid-value');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('auto');
    expect(dataTheme()).toBeNull();
  });
});
