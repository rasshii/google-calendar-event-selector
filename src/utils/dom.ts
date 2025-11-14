/**
 * DOM操作関連のユーティリティ関数
 *
 * Approach A実装により、複雑なイベント判定ロジックは不要になりました。
 * グリッドオーバーレイが選択モードON時のみイベントをキャプチャするため、
 * イベントターゲットの詳細な判定が不要です。
 */

import { SELECTORS } from '@/config';

/**
 * イベントターゲットが拡張機能のパネル内の要素かどうかをチェック
 *
 * パネル内のクリックとグリッドクリックを区別するために使用します。
 * ただし、Approach A実装では、グリッドオーバーレイとパネルが
 * 物理的に分離されているため、この関数の使用頻度は低下しています。
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
