/**
 * 通知UI
 */

import { CONFIG, COLORS, Z_INDEX } from '@/config';

/**
 * エラー通知を表示
 */
export function showErrorNotification(message: string): void {
  const notification = document.createElement('div');
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

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, CONFIG.ERROR_NOTIFICATION_DISPLAY_MS);
}
