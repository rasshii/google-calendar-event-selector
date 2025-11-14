/**
 * フォーマッターユーティリティ
 */

import type { TimeSlot, Locale } from '@/types';
import { WEEKDAYS_MAP, MONTH_NAMES } from '@/config';
import { getLocale } from './locale';

function getWeekday(date: Date): string {
  const locale = getLocale();
  const weekdays = WEEKDAYS_MAP[locale];
  return weekdays[date.getDay()];
}

function formatTime(hour: number, min: number, locale: Locale): string {
  if (locale === 'ja') {
    if (min === 0) {
      return `${hour}:00`;
    }
    return `${hour}:${String(min).padStart(2, '0')}`;
  } else {
    // English
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    if (min === 0) {
      return `${hour12}${period}`;
    }
    return `${hour12}:${String(min).padStart(2, '0')}${period}`;
  }
}

export function formatSlot(slot: TimeSlot): string {
  const locale = getLocale();

  if (locale === 'ja') {
    return formatSlotJapanese(slot);
  } else {
    return formatSlotEnglish(slot);
  }
}

function formatSlotJapanese(slot: TimeSlot): string {
  const month = slot.date.getMonth() + 1;
  const day = slot.date.getDate();
  const weekday = getWeekday(slot.date);

  const startTime = formatTime(slot.startHour, slot.startMin, 'ja');
  const endTime = formatTime(slot.endHour, slot.endMin, 'ja');

  return `${month}月${day}日(${weekday}) ${startTime}~${endTime}`;
}

function formatSlotEnglish(slot: TimeSlot): string {
  const monthName = MONTH_NAMES.short[slot.date.getMonth()];
  const day = slot.date.getDate();
  const weekday = getWeekday(slot.date);

  const startTime = formatTime(slot.startHour, slot.startMin, 'en');
  const endTime = formatTime(slot.endHour, slot.endMin, 'en');

  return `${monthName} ${day} (${weekday}) ${startTime}-${endTime}`;
}
