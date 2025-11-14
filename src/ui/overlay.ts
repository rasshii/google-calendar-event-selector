/**
 * オーバーレイ管理
 */

import type { TimeSlot, GridColumn } from '@/types';
import { CSS_CLASSES, COLORS, Z_INDEX } from '@/config';
import { GridAnalyzer } from '@/core/grid-analyzer';
import { isEventTargetInPanel } from '@/utils/dom';

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
 * カレンダー全体のオーバーレイを作成（選択モード表示用）
 *
 * 選択モードON時にGoogle Calendarのデフォルト動作を完全にブロックする
 * フルスクリーンのオーバーレイを作成し、以下の機能を提供：
 *
 * - **イベントインターセプション**: mousedown, click, pointerdown, touchstartイベントを
 *   キャプチャフェーズで捕捉し、Google Calendarのイベントハンドラーより先に実行
 * - **パネル操作の保護**: 拡張機能のパネル内のクリックは許可し、カレンダーエリアのみブロック
 * - **z-index制御**: activeクラス時にz-index: 100000でGoogle Calendarの要素より前面に配置
 *
 * @returns 作成されたオーバーレイ要素
 *
 * @example
 * ```typescript
 * const overlay = createCalendarOverlay();
 * toggleCalendarOverlay(overlay, true); // 選択モードON
 * ```
 *
 * @see {@link toggleCalendarOverlay} オーバーレイの表示/非表示を切り替える
 */
export function createCalendarOverlay(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = CSS_CLASSES.CALENDAR_OVERLAY;

  /**
   * イベントをインターセプトする関数
   * パネル内のクリックは許可し、カレンダーエリアのみブロック
   */
  const interceptEvent = (e: Event) => {
    // オーバーレイが非アクティブなら何もしない
    if (!overlay.classList.contains('active')) return;

    // パネル内のクリックは許可（トグルボタンなどの操作を可能にする）
    if (isEventTargetInPanel(e.target)) return;

    // カレンダーエリアのイベントは完全にブロック
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.preventDefault();
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
