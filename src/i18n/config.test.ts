import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  detectSystemLang,
  initI18n,
  isAppLang,
  LANG_STORAGE_KEY,
  normalizeLang,
  persistLang,
  readStoredLang,
} from './config.ts';

/** Override navigator.language for the duration of one test. */
function withNavigatorLanguage(value: string): void {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue(value);
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('normalizeLang (system language resolution)', () => {
  it('ru → ru', () => {
    expect(normalizeLang('ru')).toBe('ru');
  });

  it('en → en', () => {
    expect(normalizeLang('en')).toBe('en');
  });

  it('fr → en (fallback for unsupported language)', () => {
    expect(normalizeLang('fr')).toBe('en');
  });

  it('resolves region subtags by base (ru-RU → ru, en-GB → en)', () => {
    expect(normalizeLang('ru-RU')).toBe('ru');
    expect(normalizeLang('en-GB')).toBe('en');
  });

  it('is case-insensitive', () => {
    expect(normalizeLang('RU')).toBe('ru');
    expect(normalizeLang('En-us')).toBe('en');
  });

  it('falls back to en for empty / null / undefined', () => {
    expect(normalizeLang('')).toBe('en');
    expect(normalizeLang(null)).toBe('en');
    expect(normalizeLang(undefined)).toBe('en');
  });
});

describe('isAppLang', () => {
  it('accepts only supported languages', () => {
    expect(isAppLang('ru')).toBe(true);
    expect(isAppLang('en')).toBe(true);
    expect(isAppLang('fr')).toBe(false);
    expect(isAppLang('')).toBe(false);
    expect(isAppLang(null)).toBe(false);
    expect(isAppLang(42)).toBe(false);
  });
});

describe('detectSystemLang', () => {
  it('maps the system language to a supported UI language', () => {
    withNavigatorLanguage('ru-RU');
    expect(detectSystemLang()).toBe('ru');

    withNavigatorLanguage('fr-FR');
    expect(detectSystemLang()).toBe('en');
  });
});

describe('readStoredLang (persist + apply-on-start)', () => {
  it('reads a valid persisted language', () => {
    withNavigatorLanguage('en-US');
    persistLang('ru');
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('ru');
    expect(readStoredLang()).toBe('ru');
  });

  it('uses the system language when nothing is persisted', () => {
    withNavigatorLanguage('ru-RU');
    expect(readStoredLang()).toBe('ru');
  });

  it('falls back to en when the system language is unsupported and none persisted', () => {
    withNavigatorLanguage('de-DE');
    expect(readStoredLang()).toBe('en');
  });

  it('ignores an empty / invalid persisted value and uses the system default', () => {
    withNavigatorLanguage('ru-RU');
    localStorage.setItem(LANG_STORAGE_KEY, '');
    expect(readStoredLang()).toBe('ru');

    localStorage.setItem(LANG_STORAGE_KEY, 'not-a-lang');
    expect(readStoredLang()).toBe('ru');
  });

  it('does not throw when localStorage is unreadable (falls back to system)', () => {
    withNavigatorLanguage('en-US');
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => readStoredLang()).not.toThrow();
    expect(readStoredLang()).toBe('en');
    getItem.mockRestore();
  });
});

describe('persistLang', () => {
  it('does not throw when localStorage is unwritable', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => persistLang('ru')).not.toThrow();
    setItem.mockRestore();
  });
});

describe('initI18n (AC2: fallbackLng / supportedLngs wiring)', () => {
  it('wires fallbackLng=en and supportedLngs={ru,en}, and falls back to EN at runtime', () => {
    const i18n = initI18n();

    // i18next normalizes fallbackLng to an array internally.
    expect(i18n.options.fallbackLng).toEqual(['en']);
    expect(i18n.options.supportedLngs).toEqual(
      expect.arrayContaining(['ru', 'en']),
    );

    // Runtime fallback: an unsupported active language still resolves EN strings.
    const fixed = i18n.getFixedT('fr', 'translation');
    const en = i18n.getFixedT('en', 'translation');
    expect(fixed('settings.title')).toBe(en('settings.title'));
  });
});
