/**
 * 通知UI
 *
 * ユーザーへの通知メッセージを画面右上に表示する機能を提供します。
 * エラーメッセージや成功メッセージなどを一時的に表示し、
 * 自動的にフェードアウトして消えます。
 */

import { CONFIG, COLORS, Z_INDEX } from '@/config';

/**
 * エラー通知を表示
 *
 * 画面右上に赤い背景のエラー通知を表示します。
 * 通知は設定された時間（CONFIG.ERROR_NOTIFICATION_DISPLAY_MS）後に
 * フェードアウトして自動的に削除されます。
 *
 * 表示スタイル：
 * - 位置: 画面右上（top: 20px, right: 20px）
 * - 背景色: 赤色（COLORS.NOTIFICATION.ERROR_BG）
 * - z-index: 最前面（Z_INDEX.NOTIFICATION）
 * - アニメーション: スライドインで表示、フェードアウトで消える
 *
 * @param message - 表示するエラーメッセージ
 *
 * @example
 * ```typescript
 * showErrorNotification('カレンダーグリッドの読み込みに失敗しました');
 * ```
 */
export function showErrorNotification(message: string): void {
  // 通知要素を作成
  const notification = document.createElement('div');

  // インラインスタイルを設定（Google Calendarのスタイルと独立させるため）
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${COLORS.NOTIFICATION.ERROR_BG};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px ${COLORS.NOTIFICATION.SHADOW};
    z-index: ${Z_INDEX.NOTIFICATION};
    font-family: 'Roboto', sans-serif;
    font-size: 14px;
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  // 指定時間後にフェードアウトして削除
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, CONFIG.ERROR_NOTIFICATION_DISPLAY_MS);
}
