import { ko, type I18nKey } from './ko.js';
import { en } from './en.js';
import { zh } from './zh.js';

export type Locale = 'ko' | 'en' | 'zh';

const bundles: Record<Locale, Record<I18nKey, string>> = { ko, en, zh };

function detectLocale(): Locale {
  const override = process.env.FESTATUSLINE_LOCALE;
  if (override === 'ko' || override === 'en' || override === 'zh') return override;

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

export { type I18nKey };
