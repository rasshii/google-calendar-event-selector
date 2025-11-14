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
import { Debug } from './utils/debug';

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
  private panelCleanup: (() => void) | null = null;
  private calendarObserver: MutationObserver | null = null;

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
    Debug.log('APP', '🚀 ========== INITIALIZATION START ==========');

    // ロケール検出
    const locale = detectLocale();
    setLocale(locale);
    Debug.log('APP', '  🌐 Locale detected:', locale);

    // カレンダーの読み込み待機
    Debug.log('APP', '  ⏳ Waiting for Google Calendar to load...');
    const initialized = await this.waitForCalendar();

    if (!initialized) {
      Debug.error('APP', '  ❌ Calendar not found after timeout');
      Debug.warn('APP', getMessage('calendarNotFound'));
      return;
    }
    Debug.log('APP', '  ✅ Google Calendar found and ready');

    try {
      // グリッド解析: カレンダーの構造を解析
      Debug.log('APP', '  📊 Step 1/7: Analyzing calendar grid...');
      const gridAnalyzed = this.gridAnalyzer.analyze();
      if (!gridAnalyzed) {
        throw new Error('Failed to analyze calendar grid');
      }
      Debug.log('APP', '  ✅ Grid analysis completed');

      // UIパネル作成: 右側に表示される操作パネル
      Debug.log('APP', '  🎨 Step 2/7: Creating UI panel...');
      [this.panel, this.panelCleanup] = createUIPanel(
        this.dragHandler.getPanelDragState(),
        this.selectionModeManager
      );
      Debug.log('APP', '  ✅ UI panel created:', {
        id: this.panel.id,
        isConnected: this.panel.isConnected
      });

      // グリッドオーバーレイ作成（Approach A）
      // Google Calendarグリッド全体を覆う透明なオーバーレイを作成
      Debug.log('APP', '  🎨 Step 3/7: Creating grid overlay (Approach A)...');
      this.gridOverlay = createGridOverlay(this.gridAnalyzer);

      if (!this.gridOverlay) {
        throw new Error('Failed to create grid overlay');
      }
      Debug.log('APP', '  ✅ Grid overlay created');

      // ドラッグハンドラーにオーバーレイを設定
      // ドラッグイベントはこのオーバーレイ上でのみ処理される
      Debug.log('APP', '  🎯 Step 4/7: Setting grid overlay for drag handler...');
      this.dragHandler.setGridOverlay(this.gridOverlay);

      // イベントリスナーをアタッチ
      // オーバーレイにmousedown/move/upリスナーを登録
      Debug.log('APP', '  🔗 Step 5/7: Attaching event listeners...');
      this.dragHandler.attachListeners();

      // 選択モード変更時のオーバーレイ表示/非表示を設定
      // ON: オーバーレイ表示、Google Calendar無効化
      // OFF: オーバーレイ非表示、Google Calendar有効化
      Debug.log('APP', '  📢 Step 6/7: Registering selection mode listener...');
      this.selectionModeManager.addListener((isActive) => {
        Debug.log('APP', `  Selection mode changed: ${isActive ? 'ON' : 'OFF'}`);

        if (!this.gridOverlay) {
          Debug.error('APP', '  ❌ Grid overlay is null in selection mode listener');
          return;
        }

        if (isActive) {
          showGridOverlay(this.gridOverlay, this.gridAnalyzer);
        } else {
          hideGridOverlay(this.gridOverlay, this.gridAnalyzer);
        }
      });
      Debug.log('APP', '  ✅ Selection mode listener registered');

      // スクロール・リサイズ時にグリッドを再解析
      Debug.log('APP', '  🔄 Step 7/7: Setting up scroll/resize handlers...');
      this.setupScrollResizeHandlers();

      // カレンダーの日付変更を監視
      Debug.log('APP', '  👁️  Setting up calendar observer...');
      this.setupCalendarObserver();

      // 初期化時に表示範囲外の選択を除外
      Debug.log('APP', '  🔄 Performing initial slot filtering...');
      const initialVisibleDateKeys = this.gridAnalyzer.getVisibleDateKeys();
      Debug.log('APP', '  📅 Currently visible date keys:', Array.from(initialVisibleDateKeys));
      Debug.log('APP', '  📝 Current slots before filtering:', this.slotManager.getSlots().length);
      this.slotManager.filterByVisibleDates(initialVisibleDateKeys);

      Debug.log('APP', '✅ ========== INITIALIZATION SUCCESS ==========');
      Debug.log('APP', getMessage('initSuccess'));
    } catch (error) {
      Debug.error('APP', '❌ ========== INITIALIZATION FAILED ==========');
      Debug.error('APP', 'Extension initialization failed:', error);
      showErrorNotification(getMessage('errorInitFailed'));
    }
  }

  /**
   * カレンダーの日付変更を監視して、表示範囲外の選択を除外
   */
  private setupCalendarObserver(): void {
    const calendarContainer = document.querySelector(SELECTORS.CALENDAR_MAIN);
    if (!calendarContainer) {
      Debug.warn('APP', 'Calendar container not found for observer');
      return;
    }

    let updateTimeout: number | null = null;
    let previousDateKeys: Set<string> = new Set();

    // 初期状態を保存
    const initialDateKeys = this.gridAnalyzer.getVisibleDateKeys();
    previousDateKeys = new Set(initialDateKeys);

    // グリッドの変更を監視（デバウンス付き）
    this.calendarObserver = new MutationObserver(() => {
      // 連続した変更をまとめて処理
      if (updateTimeout !== null) {
        clearTimeout(updateTimeout);
      }

      updateTimeout = window.setTimeout(() => {
        // グリッドを再解析
        const analyzed = this.gridAnalyzer.analyze();
        if (!analyzed) {
          return;
        }

        // 現在表示されている日付のセットを取得
        const visibleDateKeys = this.gridAnalyzer.getVisibleDateKeys();

        // 日付が実際に変更されたかチェック
        const dateKeysChanged =
          previousDateKeys.size !== visibleDateKeys.size ||
          ![...previousDateKeys].every(key => visibleDateKeys.has(key));

        if (dateKeysChanged) {
          Debug.log('APP', 'Calendar date changed, updating selections');

          // 表示範囲外の選択を除外
          this.slotManager.filterByVisibleDates(visibleDateKeys);

          // オーバーレイの位置を更新（選択モードがONの場合）
          if (this.selectionModeManager.isSelectionModeActive() && this.gridOverlay) {
            this.updateGridOverlayPosition();
          }

          // 現在の日付を保存
          previousDateKeys = new Set(visibleDateKeys);
        }

        updateTimeout = null;
      }, CONFIG.CALENDAR_CHANGE_DEBOUNCE_MS);
    });

    // カレンダーコンテナのchildListのみを監視（attributes監視を削除）
    this.calendarObserver.observe(calendarContainer, {
      childList: true,
      subtree: true,
    });

    Debug.log('APP', 'Calendar observer started');
  }

  /**
   * スクロール・リサイズハンドラーを設定
   * グリッドの座標をリアルタイムで更新します
   */
  private setupScrollResizeHandlers(): void {
    let updateTimeout: number | null = null;

    const handleUpdate = () => {
      // デバウンス処理
      if (updateTimeout !== null) {
        clearTimeout(updateTimeout);
      }

      updateTimeout = window.setTimeout(() => {
        // 選択モードがONの時のみ更新
        if (!this.selectionModeManager.isSelectionModeActive()) {
          updateTimeout = null;
          return;
        }

        // グリッドを再解析して最新の座標を取得
        this.gridAnalyzer.analyze();

        // オーバーレイの位置を更新
        if (this.gridOverlay) {
          this.updateGridOverlayPosition();
        }

        updateTimeout = null;
      }, CONFIG.SCROLL_RESIZE_DEBOUNCE_MS);
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    Debug.log('APP', 'Scroll/resize handlers attached');
  }

  /**
   * グリッドオーバーレイの位置を更新
   */
  private updateGridOverlayPosition(): void {
    if (!this.gridOverlay) {
      return;
    }

    const columns = this.gridAnalyzer.getColumns();
    if (columns.length === 0) {
      return;
    }

    const first = columns[0];
    const last = columns[columns.length - 1];

    const newTop = first.top;
    const newLeft = first.left;
    const newWidth = last.right - first.left;
    const newHeight = first.element.offsetHeight;

    this.gridOverlay.style.top = `${newTop}px`;
    this.gridOverlay.style.left = `${newLeft}px`;
    this.gridOverlay.style.width = `${newWidth}px`;
    this.gridOverlay.style.height = `${newHeight}px`;

    Debug.log('APP', '📐 Overlay position updated:', {
      top: newTop,
      left: newLeft,
      width: newWidth,
      height: newHeight,
      dateRange: `${first.dateKey} to ${last.dateKey}`
    });
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

    if (this.calendarObserver) {
      this.calendarObserver.disconnect();
      this.calendarObserver = null;
    }

    if (this.panelCleanup) {
      this.panelCleanup();
      this.panelCleanup = null;
    }

    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }

    if (this.gridOverlay) {
      this.gridOverlay.remove();
      this.gridOverlay = null;
    }

    Debug.log('APP', 'Google Calendar Time Slot Selector cleaned up');
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
