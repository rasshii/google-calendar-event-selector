/**
 * Google Calendar Time Slot Selector Extension
 * エントリーポイント
 *
 * ## Approach A: シンプルなオーバーレイ戦略
 *
 * この拡張機能は「Approach A」アーキテクチャを採用しています。
 * Google Calendarのイベントシステムと拡張機能のイベントシステムを
 * 物理的に分離することで、イベント競合を完全に回避します。
 *
 * ### アーキテクチャの概要:
 *
 * 1. **グリッドオーバーレイの作成**
 *    - カレンダーグリッド全体を透明なオーバーレイで覆います
 *    - `createGridOverlay()`で作成（overlay.ts）
 *
 * 2. **選択モードON時**
 *    - オーバーレイを表示し、pointer-events: autoに設定
 *    - Google Calendarグリッドをpointer-events: noneで無効化
 *    - オーバーレイがすべてのマウスイベントをキャプチャ
 *    - `showGridOverlay()`で制御（overlay.ts）
 *
 * 3. **選択モードOFF時**
 *    - オーバーレイを非表示にし、pointer-events: noneに設定
 *    - Google Calendarグリッドを再度有効化
 *    - 通常のGoogle Calendar操作が可能
 *    - `hideGridOverlay()`で制御（overlay.ts）
 *
 * ### 利点:
 * - 複雑なイベント判定ロジック不要
 * - Google Calendarのイベントハンドラーとの競合なし
 * - 選択モードOFF時は完全に通常動作
 * - ドラッグ選択の安定性が向上
 *
 * @author rasshii
 * @version 2.0.0
 * @license MIT
 */

import { CONFIG, SELECTORS } from './config';
import { detectLocale, setLocale, getMessage } from './utils/locale';
import { GridAnalyzer } from './core/grid-analyzer';
import { DragHandler } from './core/drag-handler';
import { SlotManager } from './core/slot-manager';
import { SelectionModeManager } from './core/selection-mode-manager';
import { createUIPanel } from './ui/panel';
import { showErrorNotification } from './ui/notification';
import { createGridOverlay, showGridOverlay, hideGridOverlay } from './ui/overlay';

/**
 * アプリケーションクラス
 */
class TimeSlotSelectorApp {
  private gridAnalyzer: GridAnalyzer;
  private slotManager: SlotManager;
  private selectionModeManager: SelectionModeManager;
  private dragHandler: DragHandler;
  private panel: HTMLElement | null = null;
  private gridOverlay: HTMLElement | null = null;

  constructor() {
    this.gridAnalyzer = new GridAnalyzer();
    this.slotManager = new SlotManager();
    this.selectionModeManager = new SelectionModeManager();
    this.dragHandler = new DragHandler(this.gridAnalyzer, this.slotManager);

    // Global access for panel reference
    window.__slotManager = this.slotManager;
  }

  /**
   * 拡張機能の初期化
   *
   * Approach A実装の初期化フロー:
   * 1. ロケール検出と設定
   * 2. Google Calendarの読み込み待機
   * 3. グリッド解析（日付列、高さなどの情報取得）
   * 4. UIパネル作成
   * 5. グリッドオーバーレイ作成（Approach Aの核心）
   * 6. ドラッグハンドラーにオーバーレイを設定
   * 7. イベントリスナーをオーバーレイにアタッチ
   * 8. 選択モード変更時のオーバーレイ表示/非表示を設定
   */
  async init(): Promise<void> {
    // ロケール検出
    const locale = detectLocale();
    setLocale(locale);
    console.log('Detected locale:', locale);

    // カレンダーの読み込み待機
    const initialized = await this.waitForCalendar();

    if (!initialized) {
      console.warn(getMessage('calendarNotFound'));
      return;
    }

    try {
      // グリッド解析: カレンダーの構造を解析
      const gridAnalyzed = this.gridAnalyzer.analyze();
      if (!gridAnalyzed) {
        throw new Error('Failed to analyze calendar grid');
      }

      // UIパネル作成: 右側に表示される操作パネル
      this.panel = createUIPanel(this.dragHandler.getPanelDragState(), this.selectionModeManager);

      // グリッドオーバーレイ作成（Approach A）
      // Google Calendarグリッド全体を覆う透明なオーバーレイを作成
      this.gridOverlay = createGridOverlay(this.gridAnalyzer);

      // ドラッグハンドラーにオーバーレイを設定
      // ドラッグイベントはこのオーバーレイ上でのみ処理される
      this.dragHandler.setGridOverlay(this.gridOverlay);

      // イベントリスナーをアタッチ
      // オーバーレイにmousedown/move/upリスナーを登録
      this.dragHandler.attachListeners();

      // 選択モード変更時のオーバーレイ表示/非表示を設定
      // ON: オーバーレイ表示、Google Calendar無効化
      // OFF: オーバーレイ非表示、Google Calendar有効化
      this.selectionModeManager.addListener((isActive) => {
        if (!this.gridOverlay) return;

        if (isActive) {
          showGridOverlay(this.gridOverlay, this.gridAnalyzer);
        } else {
          hideGridOverlay(this.gridOverlay, this.gridAnalyzer);
        }
      });

      console.log(getMessage('initSuccess'));
    } catch (error) {
      console.error('Extension initialization failed:', error);
      showErrorNotification(getMessage('errorInitFailed'));
    }
  }

  /**
   * カレンダーが読み込まれるまで待機
   */
  private waitForCalendar(): Promise<boolean> {
    return new Promise((resolve) => {
      let elapsed = 0;

      const checkInterval = setInterval(() => {
        const calendarContainer = document.querySelector(SELECTORS.CALENDAR_MAIN);

        if (calendarContainer) {
          clearInterval(checkInterval);
          resolve(true);
          return;
        }

        elapsed += CONFIG.INIT_CHECK_INTERVAL_MS;
        if (elapsed >= CONFIG.INIT_TIMEOUT_MS) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, CONFIG.INIT_CHECK_INTERVAL_MS);
    });
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.slotManager.clearAll();
    this.dragHandler.detachListeners();

    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }

    if (this.gridOverlay) {
      this.gridOverlay.remove();
      this.gridOverlay = null;
    }

    console.log('Google Calendar Time Slot Selector cleaned up');
  }
}

// アプリケーションインスタンス
let app: TimeSlotSelectorApp | null = null;

/**
 * アプリケーション起動
 */
function startApp(): void {
  if (app) {
    app.cleanup();
  }

  app = new TimeSlotSelectorApp();
  app.init();
}

// ページ読み込み完了後に起動
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

// ページ遷移時のクリーンアップ
window.addEventListener('beforeunload', () => {
  if (app) {
    app.cleanup();
  }
});
