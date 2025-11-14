/**
 * ロケール関連ユーティリティ
 *
 * アプリケーションの多言語対応を管理します。
 * ブラウザの言語設定を検出し、適切な言語でメッセージを表示します。
 *
 * 対応言語：
 * - 日本語（ja）
 * - 英語（en）
 */

import type { Locale, Messages } from '@/types';
import { CONFIG, MESSAGES } from '@/config';

/** 現在のロケール設定（デフォルトは日本語） */
let currentLocale: Locale = CONFIG.DEFAULT_LOCALE;

/**
 * ブラウザの言語設定からロケールを自動検出
 *
 * HTMLのlang属性（document.documentElement.lang）を確認し、
 * 対応する言語を返します。対応していない言語の場合は
 * デフォルトロケール（日本語）を返します。
 *
 * @returns 検出されたロケール（'ja' または 'en'）
 *
 * @example
 * ```typescript
 * const locale = detectLocale();
 * Debug.log('LOCALE', `Detected locale: ${locale}`);
 * ```
 */
export function detectLocale(): Locale {
  const htmlLang = document.documentElement.lang;
  if (htmlLang.startsWith('ja')) {
    return 'ja';
  } else if (htmlLang.startsWith('en')) {
    return 'en';
  }
  return CONFIG.DEFAULT_LOCALE;
}

/**
 * 現在のロケールを設定
 *
 * アプリケーション全体で使用される言語を設定します。
 * 設定後、getMessage()は指定された言語のメッセージを返すようになります。
 *
 * @param locale - 設定するロケール
 *
 * @example
 * ```typescript
 * setLocale('en');  // 英語に切り替え
 * ```
 */
export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

/**
 * 現在のロケールを取得
 *
 * 現在設定されている言語を返します。
 *
 * @returns 現在のロケール
 *
 * @example
 * ```typescript
 * const locale = getLocale();
 * Debug.log('LOCALE', `Current locale: ${locale}`);
 * ```
 */
export function getLocale(): Locale {
  return currentLocale;
}

/**
 * ロケールに応じたメッセージを取得
 *
 * 現在のロケール設定に基づいて、指定されたキーに対応するメッセージを返します。
 * 現在のロケールでメッセージが見つからない場合は、デフォルトロケールの
 * メッセージを返します。それも見つからない場合は空文字列を返します。
 *
 * @param key - メッセージのキー（Messages型で定義されたキー）
 * @returns ロケールに応じたメッセージ文字列
 *
 * @example
 * ```typescript
 * const title = getMessage('panelTitle');
 * Debug.log('LOCALE', `Panel title: ${title}`);  // 日本語: "📅 時間選択"
 * ```
 */
export function getMessage(key: keyof Messages): string {
  return MESSAGES[currentLocale]?.[key] || MESSAGES[CONFIG.DEFAULT_LOCALE][key] || '';
}
