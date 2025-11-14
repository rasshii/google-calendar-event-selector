/**
 * ロケール関連ユーティリティ
 */

import type { Locale, Messages } from '@/types';
import { CONFIG, MESSAGES } from '@/config';

let currentLocale: Locale = CONFIG.DEFAULT_LOCALE;

export function detectLocale(): Locale {
  const htmlLang = document.documentElement.lang;
  if (htmlLang.startsWith('ja')) {
    return 'ja';
  } else if (htmlLang.startsWith('en')) {
    return 'en';
  }
  return CONFIG.DEFAULT_LOCALE;
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function getMessage(key: keyof Messages): string {
  return MESSAGES[currentLocale]?.[key] || MESSAGES[CONFIG.DEFAULT_LOCALE][key] || '';
}
