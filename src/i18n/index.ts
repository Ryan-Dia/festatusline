import { ko, type I18nKey } from './ko.js';
import { en } from './en.js';
import { zh } from './zh.js';

export type Locale = 'ko' | 'en' | 'zh';

const bundles: Record<Locale, Record<I18nKey, string>> = { ko, en, zh };

/** `FESTATUSLINE_LOCALE` when it names a supported locale — it outranks the settings file. */
export function envLocale(): Locale | null {
  const override = process.env.FESTATUSLINE_LOCALE;
  return override === 'ko' || override === 'en' || override === 'zh' ? override : null;
}

function detectLocale(): Locale {
  const override = envLocale();
  if (override) return override;

  const lang = (process.env.LANG ?? '').toLowerCase();
  if (lang.startsWith('ko')) return 'ko';
  if (lang.startsWith('zh')) return 'zh';
  return 'en';
}

let currentLocale: Locale = detectLocale();

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: I18nKey): string {
  return bundles[currentLocale][key] ?? bundles.en[key] ?? key;
}

export function createTranslator(locale: Locale): (key: I18nKey) => string {
  return (key) => bundles[locale][key] ?? bundles.en[key] ?? key;
}

export { type I18nKey };
