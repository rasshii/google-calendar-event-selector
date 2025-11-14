/**
 * 選択モード管理
 *
 * 選択モードのON/OFF状態を管理し、状態変更を監視するリスナーに通知します。
 *
 * ## 責務
 * - 選択モード状態の保持と管理
 * - 状態変更時のリスナーへの通知
 * - オブザーバーパターンの実装
 *
 * ## 使用例
 * 選択モードがONのとき：
 * - グリッドオーバーレイが表示される
 * - Google Calendarのイベントが無効化される
 * - ドラッグ操作で時間枠を選択できる
 *
 * 選択モードがOFFのとき：
 * - グリッドオーバーレイが非表示になる
 * - Google Calendarの通常操作が可能
 * - ドラッグイベントは発火しない
 *
 * デバッグログは CONFIG.DEBUG_MODE によって制御されます。
 */

import { Debug } from '@/utils/debug';

export class SelectionModeManager {
  /** 選択モードの現在の状態（true=ON, false=OFF） */
  private isActive = false;

  /** 状態変更を監視するリスナー関数のセット */
  private listeners: Set<(isActive: boolean) => void> = new Set();

  /**
   * 選択モードを切り替え
   *
   * 現在の状態を反転（ON→OFF、OFF→ON）し、すべてのリスナーに通知します。
   * UIの選択モードボタンがクリックされた際に呼ばれます。
   *
   * @example
   * ```typescript
   * // ボタンクリック時
   * selectionModeManager.toggle();
   * ```
   */
  toggle(): void {
    const previousState = this.isActive;
    this.isActive = !this.isActive;
    Debug.log('SELECTION', `🔄 Toggled: ${previousState} → ${this.isActive}`);
    this.notifyListeners();
  }

  /**
   * 選択モードをONに設定
   *
   * 選択モードを強制的にON状態にします。
   * 既にONの場合は何もせず、デバッグログのみ出力します。
   *
   * @example
   * ```typescript
   * // プログラムから選択モードを有効化
   * selectionModeManager.activate();
   * ```
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
   *
   * 選択モードを強制的にOFF状態にします。
   * 既にOFFの場合は何もせず、デバッグログのみ出力します。
   *
   * @example
   * ```typescript
   * // プログラムから選択モードを無効化
   * selectionModeManager.deactivate();
   * ```
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
   *
   * 現在の選択モード状態を返します。
   *
   * @returns 選択モードがONの場合true、OFFの場合false
   *
   * @example
   * ```typescript
   * if (selectionModeManager.isSelectionModeActive()) {
   *   Debug.log('SELECTION', 'Selection mode is active');
   * }
   * ```
   */
  isSelectionModeActive(): boolean {
    return this.isActive;
  }

  /**
   * 状態変更リスナーを登録
   *
   * 選択モードの状態が変更されたときに呼び出されるコールバック関数を登録します。
   * リスナーは選択モード状態（boolean）を引数として受け取ります。
   *
   * 典型的な使用例：
   * - グリッドオーバーレイの表示/非表示切り替え
   * - Google Calendarグリッドの有効化/無効化
   * - UIボタンのスタイル変更
   *
   * @param listener - 状態変更時に呼ばれるコールバック関数
   *
   * @example
   * ```typescript
   * selectionModeManager.addListener((isActive) => {
   *   if (isActive) {
   *     showGridOverlay();
   *   } else {
   *     hideGridOverlay();
   *   }
   * });
   * ```
   */
  addListener(listener: (isActive: boolean) => void): void {
    this.listeners.add(listener);
  }

  /**
   * リスナーを削除
   *
   * 登録済みのリスナーを削除します。
   * クリーンアップ時やコンポーネントのアンマウント時に使用します。
   *
   * @param listener - 削除するリスナー関数
   *
   * @example
   * ```typescript
   * const myListener = (isActive) => { ... };
   * selectionModeManager.addListener(myListener);
   * // 後で削除
   * selectionModeManager.removeListener(myListener);
   * ```
   */
  removeListener(listener: (isActive: boolean) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * すべてのリスナーに通知
   *
   * 登録されているすべてのリスナー関数を呼び出し、現在の選択モード状態を通知します。
   * 各リスナーは個別にtry-catchで保護されており、1つのリスナーがエラーを起こしても
   * 他のリスナーへの通知は継続されます。
   *
   * @private
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
