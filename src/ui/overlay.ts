/**
 * オーバーレイ管理
 */

import type { TimeSlot, GridColumn } from '@/types';
import { CSS_CLASSES, COLORS, Z_INDEX } from '@/config';
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
      background: ${COLORS.OVERLAY.TEMP_BG};
      border: 2px solid ${COLORS.OVERLAY.BORDER};
      pointer-events: none;
      z-index: ${Z_INDEX.TEMP_OVERLAY};
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
    background: ${COLORS.OVERLAY.SELECTION_BG};
    border: 2px solid ${COLORS.OVERLAY.BORDER};
    pointer-events: none;
    z-index: ${Z_INDEX.SELECTION_OVERLAY};
    border-radius: 4px;
    box-sizing: border-box;
  `;

  column.element.appendChild(overlay);
  return overlay;
}

/**
 * NOTE: Full-screen calendar overlay has been removed to allow normal calendar interactions.
 * Event blocking is now handled by DragHandler's intelligent filtering which only blocks
 * clicks on empty grid spaces, while allowing:
 * - Scrolling
 * - Clicking existing events
 * - Calendar navigation
 * - Other Google Calendar UI interactions
 *
 * This approach provides better UX while still preventing unwanted event creation.
 */
