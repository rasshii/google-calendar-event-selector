/**
 * 時間計算ユーティリティ
 */

import { CONFIG } from '@/config';

export function roundToInterval(minutes: number, interval: number): number {
  return Math.round(minutes / interval) * interval;
}

export function snapToGrid(minutes: number): number {
  return roundToInterval(minutes, CONFIG.SNAP_MINUTES);
}

export function clampHour(hour: number): number {
  return Math.max(0, Math.min(23, hour));
}

export function clampMinute(minute: number): number {
  return Math.max(0, Math.min(59, minute));
}
