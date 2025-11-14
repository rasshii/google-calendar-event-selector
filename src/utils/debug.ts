/**
 * デバッグユーティリティ
 *
 * 開発時のデバッグログを管理します。
 * CONFIG.DEBUG_MODE が false の場合、ログは出力されません。
 */

import { CONFIG } from '@/config';

/**
 * デバッグログのプレフィックス
 */
const LOG_PREFIX = {
  APP: '[App]',
  GRID: '[GridAnalyzer]',
  DRAG: '[DragHandler]',
  OVERLAY: '[Overlay]',
  SELECTION: '[SelectionMode]',
  SLOT: '[SlotManager]',
} as const;

/**
 * デバッグログ出力クラス
 *
 * CONFIG.DEBUG_MODE が true の場合のみログを出力します。
 * 本番環境ではすべてのログが無効化され、パフォーマンスへの影響を最小限にします。
 */
export class Debug {
  /**
   * 通常のログを出力
   */
  static log(prefix: keyof typeof LOG_PREFIX, ...args: unknown[]): void {
    if (CONFIG.DEBUG_MODE) {
      console.log(LOG_PREFIX[prefix], ...args);
    }
  }

  /**
   * 警告ログを出力
   */
  static warn(prefix: keyof typeof LOG_PREFIX, ...args: unknown[]): void {
    if (CONFIG.DEBUG_MODE) {
      console.warn(LOG_PREFIX[prefix], ...args);
    }
  }

  /**
   * エラーログを出力（DEBUG_MODEに関係なく常に出力）
   */
  static error(prefix: keyof typeof LOG_PREFIX, ...args: unknown[]): void {
    console.error(LOG_PREFIX[prefix], ...args);
  }

  /**
   * グループ化されたログの開始
   */
  static group(prefix: keyof typeof LOG_PREFIX, title: string): void {
    if (CONFIG.DEBUG_MODE) {
      console.group(LOG_PREFIX[prefix], title);
    }
  }

  /**
   * グループ化されたログの終了
   */
  static groupEnd(): void {
    if (CONFIG.DEBUG_MODE) {
      console.groupEnd();
    }
  }

  /**
   * セパレーターログを出力
   */
  static separator(title: string, char = '='): void {
    if (CONFIG.DEBUG_MODE) {
      const line = char.repeat(60);
      console.log(`${line}\n${title}\n${line}`);
    }
  }
}
