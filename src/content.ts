/**
 * Google Calendar Time Slot Selector Extension
 * エントリーポイント
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
import { createUIPanel } from './ui/panel';
import { showErrorNotification } from './ui/notification';

/**
 * アプリケーションクラス
 */
class TimeSlotSelectorApp {
  private gridAnalyzer: GridAnalyzer;
  private slotManager: SlotManager;
  private dragHandler: DragHandler;
  private panel: HTMLElement | null = null;

  constructor() {
    this.gridAnalyzer = new GridAnalyzer();
    this.slotManager = new SlotManager();
    this.dragHandler = new DragHandler(this.gridAnalyzer, this.slotManager);

    // グローバルアクセス用（パネルから参照）
    (window as any).__slotManager = this.slotManager;
  }

  /**
   * 初期化
   */
  async init(): Promise<void> {
    // ロケールを検出
    const locale = detectLocale();
    setLocale(locale);
    console.log('Detected locale:', locale);

    // カレンダーが読み込まれるまで待機
    const initialized = await this.waitForCalendar();

    if (!initialized) {
      console.warn(getMessage('calendarNotFound'));
      return;
    }

    try {
      // グリッド解析
      const gridAnalyzed = this.gridAnalyzer.analyze();
      if (!gridAnalyzed) {
        throw new Error('Failed to analyze calendar grid');
      }

      // UIパネルを作成
      this.panel = createUIPanel(this.dragHandler.getPanelDragState());

      // ドラッグリスナーをアタッチ
      this.dragHandler.attachListeners();

      console.log(getMessage('initSuccess'));
    } catch (error) {
      console.error('初期化に失敗しました:', error);
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
