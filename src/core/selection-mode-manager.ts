/**
 * 選択モード管理
 *
 * 選択モードのON/OFF状態を管理し、状態変更を監視するリスナーに通知します。
 * デバッグログは CONFIG.DEBUG_MODE によって制御されます。
 */

import { Debug } from '@/utils/debug';

export class SelectionModeManager {
  private isActive = false;
  private listeners: Set<(isActive: boolean) => void> = new Set();

  /**
   * 選択モードを切り替え
   */
  toggle(): void {
    const previousState = this.isActive;
    this.isActive = !this.isActive;
    Debug.log('SELECTION', `🔄 Toggled: ${previousState} → ${this.isActive}`);
    this.notifyListeners();
  }

  /**
   * 選択モードをONに設定
   */
  activate(): void {
    if (!this.isActive) {
      Debug.log('SELECTION', '🟢 Activating selection mode');
      this.isActive = true;
      this.notifyListeners();
    } else {
      Debug.log('SELECTION', 'ℹ️ Already active, no change');
    }
  }

  /**
   * 選択モードをOFFに設定
   */
  deactivate(): void {
    if (this.isActive) {
      Debug.log('SELECTION', '🔴 Deactivating selection mode');
      this.isActive = false;
      this.notifyListeners();
    } else {
      Debug.log('SELECTION', 'ℹ️ Already inactive, no change');
    }
  }

  /**
   * 選択モードの状態を取得
   */
  isSelectionModeActive(): boolean {
    return this.isActive;
  }

  /**
   * 状態変更リスナーを登録
   */
  addListener(listener: (isActive: boolean) => void): void {
    this.listeners.add(listener);
  }

  /**
   * リスナーを削除
   */
  removeListener(listener: (isActive: boolean) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * すべてのリスナーに通知
   */
  private notifyListeners(): void {
    Debug.log('SELECTION', `📢 Notifying ${this.listeners.size} listener(s): isActive=${this.isActive}`);
    let listenerIndex = 0;
    this.listeners.forEach(listener => {
      try {
        Debug.log('SELECTION', `  ├─ Calling listener #${++listenerIndex}`);
        listener(this.isActive);
        Debug.log('SELECTION', `  └─ Listener #${listenerIndex} completed`);
      } catch (error) {
        Debug.error('SELECTION', `  └─ ❌ Listener #${listenerIndex} failed:`, error);
      }
    });
  }
}
