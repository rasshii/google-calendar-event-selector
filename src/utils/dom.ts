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
