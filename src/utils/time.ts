/**
 * 時間計算ユーティリティ
 */

import { CONFIG } from '@/config';

/**
 * 指定した間隔で分数を丸める
 *
 * @param {number} minutes - 丸める対象の分数
 * @param {number} interval - 丸める間隔（分）
 * @returns {number} 丸められた分数
 * @example roundToInterval(23, 15) // => 15
 */
export function roundToInterval(minutes: number, interval: number): number {
  return Math.round(minutes / interval) * interval;
}

/**
 * 設定されたスナップ間隔（15分）に分数を丸める
 *
 * @param {number} minutes - 丸める対象の分数
 * @returns {number} 15分単位に丸められた分数
 * @example snapToGrid(23) // => 15
 */
export function snapToGrid(minutes: number): number {
  return roundToInterval(minutes, CONFIG.SNAP_MINUTES);
}

/**
 * 時の値を0-23の範囲にクランプ
 *
 * @param {number} hour - クランプする時の値
 * @returns {number} 0-23の範囲にクランプされた値
 */
export function clampHour(hour: number): number {
  return Math.max(0, Math.min(23, hour));
}

/**
 * 分の値を0-59の範囲にクランプ
 *
 * @param {number} minute - クランプする分の値
 * @returns {number} 0-59の範囲にクランプされた値
 */
export function clampMinute(minute: number): number {
  return Math.max(0, Math.min(59, minute));
}
