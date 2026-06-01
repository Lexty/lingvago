import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import ru from '../locales/ru.json';

/**
 * UI language (SPEC §10.4 / DEV_LOOP_PLAN T2).
 * Only `ru` and `en` are supported from the first version; any other system
 * language falls back to `en`. The PT learning content is NOT localized.
 */
export type AppLang = 'ru' | 'en';

export const FALLBACK_LANG: AppLang = 'en';

export const LANG_STORAGE_KEY = 'lg.lang';

export const SUPPORTED_LANGS: readonly AppLang[] = ['ru', 'en'];

export const resources = {
  ru: { translation: ru },
  en: { translation: en },
} as const;

/** Type guard for a supported, persisted UI language. */
export function isAppLang(value: unknown): value is AppLang {
  return (
    typeof value === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(value)
  );
}

/**
 * Map an arbitrary BCP-47 tag (e.g. `ru-RU`, `en-GB`, `fr`) to a supported
 * UI language. The base subtag is matched case-insensitively; anything that is
 * not `ru`/`en` returns the EN fallback.
 */
export function normalizeLang(tag: string | null | undefined): AppLang {
  if (typeof tag !== 'string') {
    return FALLBACK_LANG;
  }
  const base = tag.trim().toLowerCase().split('-')[0];
  return isAppLang(base) ? base : FALLBACK_LANG;
}

/**
 * Read the persisted language, falling back to the system language and then
 * to EN for any missing / empty / invalid / unreadable value (never throws).
 */
export function readStoredLang(): AppLang {
  try {
    const raw = localStorage.getItem(LANG_STORAGE_KEY);
    if (isAppLang(raw)) {
      return raw;
    }
  } catch {
    /* unreadable storage falls through to the system default */
  }
  return detectSystemLang();
}

/** Resolve the system language (`navigator.language`) to a supported UI language. */
export function detectSystemLang(): AppLang {
  const nav = typeof navigator !== 'undefined' ? navigator.language : undefined;
  return normalizeLang(nav);
}

/** Persist the chosen language (best-effort; ignores quota/private-mode failures). */
export function persistLang(lang: AppLang): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* persistence is best-effort */
  }
}

/**
 * Initialize i18next with the resolved (persisted → system → EN) language.
 * Call once at startup, before rendering. Returns the i18n instance.
 */
export function initI18n(): typeof i18n {
  if (i18n.isInitialized) {
    return i18n;
  }
  void i18n.use(initReactI18next).init({
    resources,
    lng: readStoredLang(),
    fallbackLng: FALLBACK_LANG,
    supportedLngs: SUPPORTED_LANGS as readonly string[] as string[],
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return i18n;
}

/** Change the active language and persist it. */
export function setLang(lang: AppLang): void {
  persistLang(lang);
  void i18n.changeLanguage(lang);
}

export default i18n;
