/**
 * オーバーレイ管理
 */

import type { TimeSlot, GridColumn } from '@/types';
import { CSS_CLASSES } from '@/config';
import { GridAnalyzer } from '@/core/grid-analyzer';

/**
 * 一時的な選択オーバーレイを作成・更新
 */
export function updateTempOverlay(
  column: GridColumn,
  startY: number,
  endY: number,
  existingOverlay: HTMLElement | null
): HTMLElement {
  const rect = column.element.getBoundingClientRect();

  const top = Math.min(startY, endY);
  const bottom = Math.max(startY, endY);
  const height = bottom - top;

  let overlay = existingOverlay;

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = CSS_CLASSES.TEMP_OVERLAY;
    overlay.style.cssText = `
      position: absolute;
      background: rgba(102, 126, 234, 0.3);
      border: 2px solid #667eea;
      pointer-events: none;
      z-index: 1000;
      border-radius: 4px;
    `;
    column.element.appendChild(overlay);
  }

  overlay.style.left = '0';
  overlay.style.top = `${top - rect.top}px`;
  overlay.style.width = '100%';
  overlay.style.height = `${height}px`;

  return overlay;
}

/**
 * 一時的なオーバーレイを削除
 */
export function removeTempOverlay(overlay: HTMLElement | null): void {
  if (overlay) {
    overlay.remove();
  }
}

/**
 * 確定した選択範囲のオーバーレイを作成
 */
export function createSelectionOverlay(
  slot: TimeSlot,
  column: GridColumn,
  gridAnalyzer: GridAnalyzer
): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = CSS_CLASSES.SELECTION_OVERLAY;

  // 開始・終了時刻から位置を計算
  const startMinutes = slot.startHour * 60 + slot.startMin;
  const endMinutes = slot.endHour * 60 + slot.endMin;

  const hourHeight = gridAnalyzer.getHourHeight();
  const top = (startMinutes / 60) * hourHeight;
  const height = ((endMinutes - startMinutes) / 60) * hourHeight;

  overlay.style.cssText = `
    position: absolute;
    left: 0;
    top: ${top}px;
    width: 100%;
    height: ${height}px;
    background: rgba(102, 126, 234, 0.25);
    border: 2px solid #667eea;
    pointer-events: none;
    z-index: 999;
    border-radius: 4px;
    box-sizing: border-box;
  `;

  column.element.appendChild(overlay);
  return overlay;
}

/**
 * カレンダー全体のオーバーレイを作成（選択モード表示用）
 * 選択モードON時にGoogle Calendarのデフォルト動作を完全にブロックする
 */
export function createCalendarOverlay(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = CSS_CLASSES.CALENDAR_OVERLAY;

  // イベントをインターセプトする関数
  // オーバーレイがactiveクラスを持つ場合、全てのイベントを停止
  const interceptEvent = (e: Event) => {
    if (overlay.classList.contains('active')) {
      e.stopPropagation();
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  };

  // 複数のイベントタイプをインターセプト（キャプチャフェーズで最優先実行）
  overlay.addEventListener('mousedown', interceptEvent, { capture: true });
  overlay.addEventListener('click', interceptEvent, { capture: true });
  overlay.addEventListener('pointerdown', interceptEvent, { capture: true });
  overlay.addEventListener('touchstart', interceptEvent, { capture: true });

  document.body.appendChild(overlay);
  return overlay;
}

/**
 * カレンダーオーバーレイの表示/非表示を切り替え
 */
export function toggleCalendarOverlay(overlay: HTMLElement, isActive: boolean): void {
  if (isActive) {
    overlay.classList.add('active');
  } else {
    overlay.classList.remove('active');
  }
}
