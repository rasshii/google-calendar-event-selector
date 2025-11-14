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
import { SelectionModeManager } from './core/selection-mode-manager';
import { createUIPanel } from './ui/panel';
import { showErrorNotification } from './ui/notification';
import { createCalendarOverlay, toggleCalendarOverlay } from './ui/overlay';

/**
 * アプリケーションクラス
 */
class TimeSlotSelectorApp {
  private gridAnalyzer: GridAnalyzer;
  private slotManager: SlotManager;
  private selectionModeManager: SelectionModeManager;
  private dragHandler: DragHandler;
  private panel: HTMLElement | null = null;
  private calendarOverlay: HTMLElement | null = null;

  constructor() {
    this.gridAnalyzer = new GridAnalyzer();
    this.slotManager = new SlotManager();
    this.selectionModeManager = new SelectionModeManager();
    this.dragHandler = new DragHandler(this.gridAnalyzer, this.slotManager, this.selectionModeManager);

    // Global access for panel reference
    window.__slotManager = this.slotManager;
  }

  /**
   * Initialize the extension
   */
  async init(): Promise<void> {
    // Detect locale
    const locale = detectLocale();
    setLocale(locale);
    console.log('Detected locale:', locale);

    // Wait for calendar to load
    const initialized = await this.waitForCalendar();

    if (!initialized) {
      console.warn(getMessage('calendarNotFound'));
      return;
    }

    try {
      // Analyze grid
      const gridAnalyzed = this.gridAnalyzer.analyze();
      if (!gridAnalyzed) {
        throw new Error('Failed to analyze calendar grid');
      }

      // Create UI panel
      this.panel = createUIPanel(this.dragHandler.getPanelDragState(), this.selectionModeManager);

      // Create calendar overlay
      this.calendarOverlay = createCalendarOverlay();

      // Listen to selection mode changes and toggle overlay
      this.selectionModeManager.addListener((isActive) => {
        if (this.calendarOverlay) {
          toggleCalendarOverlay(this.calendarOverlay, isActive);
        }
      });

      // Attach drag listeners
      this.dragHandler.attachListeners();

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

    if (this.calendarOverlay) {
      this.calendarOverlay.remove();
      this.calendarOverlay = null;
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
