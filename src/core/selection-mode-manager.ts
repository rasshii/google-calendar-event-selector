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
    this.isActive = !this.isActive;
    this.notifyListeners();
  }

  /**
   * 選択モードをONに設定
   */
  activate(): void {
    if (!this.isActive) {
      this.isActive = true;
      this.notifyListeners();
    }
  }

  /**
   * 選択モードをOFFに設定
   */
  deactivate(): void {
    if (this.isActive) {
      this.isActive = false;
      this.notifyListeners();
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
    this.listeners.forEach(listener => listener(this.isActive));
  }
}
