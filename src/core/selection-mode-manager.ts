/**
 * 選択モード管理
 */

export class SelectionModeManager {
  private isActive = false;
  private listeners: Set<(isActive: boolean) => void> = new Set();

  /**
   * 選択モードを切り替え
   */
  toggle(): void {
    const previousState = this.isActive;
    this.isActive = !this.isActive;
    console.log(`🔄 [SelectionMode] Toggled: ${previousState} → ${this.isActive}`);
    this.notifyListeners();
  }

  /**
   * 選択モードをONに設定
   */
  activate(): void {
    if (!this.isActive) {
      console.log('🟢 [SelectionMode] Activating selection mode');
      this.isActive = true;
      this.notifyListeners();
    } else {
      console.log('ℹ️ [SelectionMode] Already active, no change');
    }
  }

  /**
   * 選択モードをOFFに設定
   */
  deactivate(): void {
    if (this.isActive) {
      console.log('🔴 [SelectionMode] Deactivating selection mode');
      this.isActive = false;
      this.notifyListeners();
    } else {
      console.log('ℹ️ [SelectionMode] Already inactive, no change');
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
    console.log(`📢 [SelectionMode] Notifying ${this.listeners.size} listener(s): isActive=${this.isActive}`);
    let listenerIndex = 0;
    this.listeners.forEach(listener => {
      try {
        console.log(`  ├─ Calling listener #${++listenerIndex}`);
        listener(this.isActive);
        console.log(`  └─ Listener #${listenerIndex} completed`);
      } catch (error) {
        console.error(`  └─ ❌ Listener #${listenerIndex} failed:`, error);
      }
    });
  }
}
