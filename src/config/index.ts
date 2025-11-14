/**
 * 設定定数
 */

import type { MessagesMap } from '@/types';

export const CONFIG = {
  // タイミング設定
  INIT_CHECK_INTERVAL_MS: 500,
  INIT_TIMEOUT_MS: 10000,
  COPY_SUCCESS_DISPLAY_MS: 2000,
  ERROR_NOTIFICATION_DISPLAY_MS: 3000,

  // Google Calendar固有の値
  GCAL_HOUR_HEIGHT_PX: 48,
  GCAL_START_HOUR: 0,
  HOURS_IN_DAY: 24,  // 1日の時間数

  // スナップ設定
  SNAP_MINUTES: 15,

  // ドラッグ設定
  MIN_DRAG_DISTANCE_PX: 5,  // 最小ドラッグ距離（ピクセル）

  // UI スペーシング（ピクセル単位）
  PANEL_DEFAULT_GAP: 10,
  PANEL_BUTTON_MARGIN_BOTTOM: 10,

  // デフォルト値
  DEFAULT_LOCALE: 'ja' as const,
} as const;

export const SELECTORS = {
  CALENDAR_MAIN: '[role="main"]',
  WEEK_VIEW_CONTAINER: '[data-view-heading]',
  TIME_GRID: '[data-datekey]',

  PANEL: '#gcal-event-selector-panel',
  PANEL_HEADER: '.gcal-selector-header',
  PANEL_CONTENT: '.gcal-selector-content',
  EVENT_LIST: '#gcal-selected-events',
  MINIMIZE_BTN: '#gcal-selector-minimize',
  SELECTION_MODE_BTN: '#gcal-selection-mode-btn',
  COPY_BTN: '#gcal-copy-btn',
  CLEAR_BTN: '#gcal-clear-btn',
} as const;

export const CSS_CLASSES = {
  PANEL: 'gcal-event-selector-panel',
  HEADER: 'gcal-selector-header',
  CONTENT: 'gcal-selector-content',
  EVENT_LIST: 'gcal-event-list',
  EVENT_ITEM: 'gcal-event-item',
  EVENT_NUMBER: 'gcal-event-number',
  EVENT_TEXT: 'gcal-event-text',
  EMPTY_MESSAGE: 'gcal-empty-message',
  REMOVE_BTN: 'gcal-remove-btn',
  BTN_ICON: 'gcal-btn-icon',
  BTN: 'gcal-btn',
  BTN_PRIMARY: 'gcal-btn-primary',
  BTN_SECONDARY: 'gcal-btn-secondary',
  ACTIONS: 'gcal-selector-actions',
  SELECTION_MODE_BTN: 'gcal-selection-mode-btn',
  SELECTION_MODE_ACTIVE: 'gcal-selection-mode-active',
  SELECTION_OVERLAY: 'gcal-selection-overlay',
  TEMP_OVERLAY: 'gcal-temp-overlay',
  CALENDAR_OVERLAY: 'gcal-calendar-overlay',
  GRID_OVERLAY: 'gcal-grid-overlay',
} as const;

/**
 * UI要素の色定数
 */
export const COLORS = {
  /** 拡張機能のプライマリカラー */
  PRIMARY: '#667eea',
  /** 拡張機能のセカンダリカラー */
  SECONDARY: '#764ba2',

  /** オーバーレイ関連の色 */
  OVERLAY: {
    /** 一時的な選択範囲の背景色 */
    TEMP_BG: 'rgba(102, 126, 234, 0.3)',
    /** 確定した選択範囲の背景色 */
    SELECTION_BG: 'rgba(102, 126, 234, 0.25)',
    /** カレンダーオーバーレイの背景色（選択モードON時） */
    CALENDAR_BG: 'rgba(102, 126, 234, 0.08)',
    /** オーバーレイのボーダー色 */
    BORDER: '#667eea',
  },

  /** 通知関連の色 */
  NOTIFICATION: {
    /** エラー通知の背景色 */
    ERROR_BG: '#f44336',
    /** 成功通知の背景色 */
    SUCCESS_BG: '#34A853',
    /** 通知のシャドウ色 */
    SHADOW: 'rgba(0,0,0,0.3)',
  },
} as const;

/**
 * z-index階層定数
 * より大きい値ほど前面に表示される
 */
export const Z_INDEX = {
  /** 確定した選択範囲のオーバーレイ */
  SELECTION_OVERLAY: 999,
  /** ドラッグ中の一時的なオーバーレイ */
  TEMP_OVERLAY: 1000,
  /** カレンダーオーバーレイ（選択モードON時） - Google Calendarの要素より前面 */
  CALENDAR_OVERLAY_ACTIVE: 100000,
  /** パネルUI - オーバーレイより前面に配置して常にクリック可能にする */
  PANEL: 200000,
  /** 通知 - 最前面 */
  NOTIFICATION: 200001,
} as const;

export const MESSAGES: MessagesMap = {
  ja: {
    panelTitle: '📅 時間選択',
    emptyMessage: '選択モードをONにして、カレンダー上をドラッグしてください',
    copyButton: '📋 コピー',
    clearButton: '🗑️ クリア',
    copiedSuccess: '✓ コピーしました！',
    selectionModeOn: '🎯 選択モード ON',
    selectionModeOff: '⏸️ 選択モード OFF',
    errorCopyFailed: 'クリップボードへのコピーに失敗しました',
    errorInitFailed: '拡張機能の初期化に失敗しました',
    initSuccess: 'Google Calendar Time Slot Selector が初期化されました\n選択モードをONにしてドラッグで時間を選択できます',
    calendarNotFound: 'Google Calendar Time Slot Selector: カレンダーが見つかりませんでした',
  },
  en: {
    panelTitle: '📅 Time Selector',
    emptyMessage: 'Turn ON selection mode and drag on the calendar',
    copyButton: '📋 Copy',
    clearButton: '🗑️ Clear',
    copiedSuccess: '✓ Copied!',
    selectionModeOn: '🎯 Selection Mode ON',
    selectionModeOff: '⏸️ Selection Mode OFF',
    errorCopyFailed: 'Failed to copy to clipboard',
    errorInitFailed: 'Failed to initialize extension',
    initSuccess: 'Google Calendar Time Slot Selector initialized\nTurn ON selection mode and drag to select time slots',
    calendarNotFound: 'Google Calendar Time Slot Selector: Calendar not found',
  },
};

export const WEEKDAYS_MAP: Record<'ja' | 'en', string[]> = {
  ja: ['日', '月', '火', '水', '木', '金', '土'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

export const MONTH_NAMES = {
  short: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
} as const;
