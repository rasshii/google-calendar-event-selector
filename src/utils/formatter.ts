/**
 * フォーマッターユーティリティ
 *
 * 日付や時刻を人間が読みやすい形式にフォーマットします。
 * ロケール（日本語/英語）に応じて適切な形式で出力します。
 *
 * フォーマット例：
 * - 日本語: "11月20日(水) 14:00~15:30"
 * - 英語: "Nov 20 (Wed) 2PM-3:30PM"
 */

import type { TimeSlot, Locale } from '@/types';
import { WEEKDAYS_MAP, MONTH_NAMES } from '@/config';
import { getLocale } from './locale';

/**
 * 日付から曜日文字列を取得
 *
 * 現在のロケール設定に応じて、日付の曜日を適切な言語で返します。
 *
 * @param date - 対象の日付
 * @returns 曜日文字列（日本語: "月"、英語: "Mon"）
 *
 * @example
 * ```typescript
 * const date = new Date(2025, 0, 20);  // 2025年1月20日（月曜日）
 * const weekday = getWeekday(date);
 * // 日本語の場合: "月"
 * // 英語の場合: "Mon"
 * ```
 */
function getWeekday(date: Date): string {
  const locale = getLocale();
  const weekdays = WEEKDAYS_MAP[locale];
  return weekdays[date.getDay()];
}

/**
 * 時刻をフォーマット
 *
 * ロケールに応じて時刻を適切な形式でフォーマットします。
 * - 日本語: 24時間制（例: "14:30"、"9:00"）
 * - 英語: 12時間制 + AM/PM（例: "2:30PM"、"9AM"）
 *
 * @param hour - 時（0-23）
 * @param min - 分（0-59）
 * @param locale - ロケール（'ja' または 'en'）
 * @returns フォーマットされた時刻文字列
 *
 * @example
 * ```typescript
 * formatTime(14, 30, 'ja');  // "14:30"
 * formatTime(14, 30, 'en');  // "2:30PM"
 * formatTime(9, 0, 'ja');    // "9:00"
 * formatTime(9, 0, 'en');    // "9AM"
 * ```
 */
function formatTime(hour: number, min: number, locale: Locale): string {
  if (locale === 'ja') {
    // 日本語: 24時間制
    if (min === 0) {
      return `${hour}:00`;
    }
    return `${hour}:${String(min).padStart(2, '0')}`;
  } else {
    // 英語: 12時間制 + AM/PM
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    if (min === 0) {
      return `${hour12}${period}`;
    }
    return `${hour12}:${String(min).padStart(2, '0')}${period}`;
  }
}

/**
 * タイムスロットをフォーマットして文字列に変換
 *
 * 現在のロケール設定に応じて、タイムスロットを人間が読みやすい形式で
 * フォーマットします。UIパネルでの表示やクリップボードへのコピー時に使用されます。
 *
 * @param slot - フォーマット対象のタイムスロット
 * @returns フォーマットされた文字列
 *
 * @example
 * ```typescript
 * const slot: TimeSlot = {
 *   date: new Date(2025, 10, 20),  // 2025年11月20日
 *   startHour: 14,
 *   startMin: 0,
 *   endHour: 15,
 *   endMin: 30,
 *   // ... その他のプロパティ
 * };
 *
 * formatSlot(slot);
 * // 日本語: "11月20日(水) 14:00~15:30"
 * // 英語: "Nov 20 (Wed) 2PM-3:30PM"
 * ```
 */
export function formatSlot(slot: TimeSlot): string {
  const locale = getLocale();

  if (locale === 'ja') {
    return formatSlotJapanese(slot);
  } else {
    return formatSlotEnglish(slot);
  }
}

/**
 * タイムスロットを日本語形式でフォーマット
 *
 * 形式: "月日(曜) 時:分~時:分"
 * 例: "11月20日(水) 14:00~15:30"
 *
 * @param slot - フォーマット対象のタイムスロット
 * @returns 日本語形式の文字列
 */
function formatSlotJapanese(slot: TimeSlot): string {
  const month = slot.date.getMonth() + 1;
  const day = slot.date.getDate();
  const weekday = getWeekday(slot.date);

  const startTime = formatTime(slot.startHour, slot.startMin, 'ja');
  const endTime = formatTime(slot.endHour, slot.endMin, 'ja');

  return `${month}月${day}日(${weekday}) ${startTime}~${endTime}`;
}

/**
 * タイムスロットを英語形式でフォーマット
 *
 * 形式: "Mon DD (Day) 時AM/PM-時AM/PM"
 * 例: "Nov 20 (Wed) 2PM-3:30PM"
 *
 * @param slot - フォーマット対象のタイムスロット
 * @returns 英語形式の文字列
 */
function formatSlotEnglish(slot: TimeSlot): string {
  const monthName = MONTH_NAMES.short[slot.date.getMonth()];
  const day = slot.date.getDate();
  const weekday = getWeekday(slot.date);

  const startTime = formatTime(slot.startHour, slot.startMin, 'en');
  const endTime = formatTime(slot.endHour, slot.endMin, 'en');

  return `${monthName} ${day} (${weekday}) ${startTime}-${endTime}`;
}
