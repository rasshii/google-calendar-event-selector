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
 * グリッド全体を覆うインタラクティブオーバーレイを作成（アプローチA）
 *
 * このオーバーレイは選択モードON時にグリッド領域全体を物理的にカバーし、
 * 全てのマウスイベントをキャプチャします。これによりGoogle Calendarと
 * Extensionのイベント競合を完全に回避します。
 *
 * @param gridAnalyzer - グリッド解析インスタンス
 * @returns 作成されたオーバーレイ要素
 */
export function createGridOverlay(gridAnalyzer: GridAnalyzer): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'gcal-grid-overlay';
  overlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: transparent;
    pointer-events: none;
    z-index: ${Z_INDEX.TEMP_OVERLAY};
    display: none;
  `;

  // グリッドコンテナを見つけて配置
  const columns = gridAnalyzer.getColumns();
  if (columns.length > 0) {
    const firstColumn = columns[0].element;
    const parent = firstColumn.parentElement;
    if (parent) {
      parent.style.position = 'relative'; // 親を相対位置に
      parent.appendChild(overlay);
    }
  }

  return overlay;
}

/**
 * グリッドオーバーレイを表示（選択モードON）
 *
 * オーバーレイを表示し、pointer-eventsを有効化してイベントをキャプチャします。
 * 同時にGoogle Calendarのグリッド要素をpointer-events: noneにして無効化します。
 *
 * @param overlay - グリッドオーバーレイ要素
 * @param gridAnalyzer - グリッド解析インスタンス
 */
export function showGridOverlay(overlay: HTMLElement, gridAnalyzer: GridAnalyzer): void {
  overlay.style.display = 'block';
  overlay.style.pointerEvents = 'auto';

  // Google Calendarのグリッド要素を無効化
  const columns = gridAnalyzer.getColumns();
  columns.forEach(column => {
    column.element.style.pointerEvents = 'none';
  });
}

/**
 * グリッドオーバーレイを非表示（選択モードOFF）
 *
 * オーバーレイを非表示にし、Google Calendarのグリッド要素を再度有効化します。
 *
 * @param overlay - グリッドオーバーレイ要素
 * @param gridAnalyzer - グリッド解析インスタンス
 */
export function hideGridOverlay(overlay: HTMLElement, gridAnalyzer: GridAnalyzer): void {
  overlay.style.display = 'none';
  overlay.style.pointerEvents = 'none';

  // Google Calendarのグリッド要素を再度有効化
  const columns = gridAnalyzer.getColumns();
  columns.forEach(column => {
    column.element.style.pointerEvents = '';
  });
}
