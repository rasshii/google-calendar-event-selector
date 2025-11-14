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
