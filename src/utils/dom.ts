/**
 * DOM操作関連のユーティリティ関数
 */

import { SELECTORS } from '@/config';

/**
 * イベントターゲットが拡張機能のパネル内の要素かどうかをチェック
 *
 * @param target - チェックするイベントターゲット
 * @returns パネル内の要素である場合true、それ以外はfalse
 *
 * @example
 * ```typescript
 * document.addEventListener('click', (e) => {
 *   if (isEventTargetInPanel(e.target)) {
 *     console.log('Panel clicked');
 *   }
 * });
 * ```
 */
export function isEventTargetInPanel(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Node)) return false;

  const panel = document.querySelector(SELECTORS.PANEL);
  return panel ? panel.contains(target) : false;
}

/**
 * イベントターゲットがGoogle Calendarの既存イベント要素かどうかをチェック
 *
 * Google Calendarの既存イベント（予定）要素を検出します。
 * これらの要素はクリック可能で、選択モードON時でもブロックすべきではありません。
 *
 * @param target - チェックするイベントターゲット
 * @returns 既存のカレンダーイベント要素である場合true、それ以外はfalse
 *
 * @example
 * ```typescript
 * if (isCalendarEvent(e.target)) {
 *   // Allow interaction with existing event
 *   return;
 * }
 * ```
 */
export function isCalendarEvent(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;

  // Google Calendarのイベントは以下の属性を持つ要素、またはその子要素
  // - data-eventid: イベントID
  // - data-eventchip: イベントチップ（短い表示形式）
  // - data-draggable-id: ドラッグ可能なイベント
  return !!(
    target.closest('[data-eventid]') ||
    target.closest('[data-eventchip]') ||
    target.closest('[data-draggable-id]') ||
    target.closest('[role="button"][data-draggable-id]')
  );
}

/**
 * イベントターゲットがカレンダーグリッド列内の要素かどうかをチェック
 *
 * @param target - チェックするイベントターゲット
 * @returns グリッド列内の要素である場合true、それ以外はfalse
 */
export function isWithinGridColumn(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;
  return !!target.closest(SELECTORS.TIME_GRID);
}

/**
 * イベントターゲットが空のグリッドスペース（イベント作成可能な領域）かどうかをチェック
 *
 * 空のグリッドスペースとは：
 * - カレンダーグリッド列内にあり、かつ
 * - 既存のカレンダーイベントではなく、かつ
 * - その他のUI要素（時間ラベル、ナビゲーションなど）でもない領域
 *
 * この関数がtrueを返す場合のみ、選択モードでドラッグ選択を開始します。
 *
 * @param target - チェックするイベントターゲット
 * @returns 空のグリッドスペースである場合true、それ以外はfalse
 *
 * @example
 * ```typescript
 * if (isEmptyGridSpace(e.target)) {
 *   // Start drag selection
 *   startDragSelection(e);
 * }
 * ```
 */
export function isEmptyGridSpace(target: EventTarget | null): boolean {
  // グリッド列内にあり、既存イベントでない場合のみtrue
  return isWithinGridColumn(target) && !isCalendarEvent(target);
}

/**
 * 必須のDOM要素を取得し、存在しない場合はエラーをログ出力
 *
 * @param selector - CSSセレクター
 * @param elementName - 要素名（エラーメッセージ用）
 * @returns 要素またはnull
 *
 * @example
 * ```typescript
 * const button = getRequiredElement<HTMLButtonElement>('#my-button', 'My Button');
 * if (button) {
 *   button.addEventListener('click', handleClick);
 * }
 * ```
 */
export function getRequiredElement<T extends HTMLElement>(
  selector: string,
  elementName?: string
): T | null {
  const element = document.querySelector<T>(selector);

  if (!element) {
    console.error(
      `Required element not found: ${elementName || selector}`
    );
  }

  return element;
}
