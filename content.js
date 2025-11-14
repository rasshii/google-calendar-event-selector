/**
 * Google Calendar Event Selector Extension
 *
 * Googleカレンダー上で複数の予定を選択して、日時範囲をコピーできるChrome拡張機能
 *
 * @author rasshii
 * @version 1.1.0
 * @license MIT
 */

(function() {
  'use strict';

  // =============================================================================
  // 定数定義
  // =============================================================================

  /**
   * アプリケーション設定定数
   * @constant {Object}
   */
  const CONFIG = {
    // タイミング設定
    DEBOUNCE_DELAY_MS: 100,              // MutationObserver debounce遅延
    INIT_CHECK_INTERVAL_MS: 500,         // 初期化チェック間隔
    INIT_TIMEOUT_MS: 10000,              // 初期化タイムアウト
    COPY_SUCCESS_DISPLAY_MS: 2000,       // コピー成功表示時間
    ERROR_NOTIFICATION_DISPLAY_MS: 3000, // エラー通知表示時間

    // Google Calendar固有の値
    GCAL_HOUR_HEIGHT_PX: 42,             // 1時間あたりの高さ（ピクセル）

    // デフォルト値
    DEFAULT_LOCALE: 'ja',                // デフォルトロケール
  };

  /**
   * DOMセレクタ定数
   * @constant {Object}
   */
  const SELECTORS = {
    // Google Calendar要素
    CALENDAR_MAIN: '[role="main"]',
    CALENDAR_EVENT: '[data-draggable-id], [role="button"][data-eventid]',
    DATE_CONTAINER: '[data-datekey]',
    HEADER_DATE: '[data-date-label], [data-datekey]',

    // 拡張機能のUI要素
    PANEL: '#gcal-event-selector-panel',
    PANEL_HEADER: '.gcal-selector-header',
    PANEL_CONTENT: '.gcal-selector-content',
    EVENT_LIST: '#gcal-selected-events',
    MINIMIZE_BTN: '#gcal-selector-minimize',
    COPY_BTN: '#gcal-copy-btn',
    CLEAR_BTN: '#gcal-clear-btn',
  };

  /**
   * CSSクラス名定数
   * @constant {Object}
   */
  const CSS_CLASSES = {
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
    SELECTED_EVENT: 'gcal-selected-event',
  };

  /**
   * イベント要素の属性名
   * @constant {Object}
   */
  const ATTRIBUTES = {
    EVENT_ID: 'data-draggable-id',
    EVENT_ID_ALT: 'data-eventid',
    JSLOG: 'jslog',
    ARIA_LABEL: 'aria-label',
    DATE_KEY: 'data-datekey',
    ATTACHED_FLAG: 'data-gcal-selector-attached',
  };

  /**
   * 多言語対応テキスト
   * @constant {Object}
   */
  const MESSAGES = {
    ja: {
      panelTitle: '📅 予定選択',
      emptyMessage: 'カレンダー上の予定をクリックして選択してください',
      copyButton: '📋 コピー',
      clearButton: '🗑️ クリア',
      copiedSuccess: '✓ コピーしました！',
      allDay: '終日',
      errorExtractFailed: 'イベント情報の取得に失敗しました',
      errorCopyFailed: 'クリップボードへのコピーに失敗しました',
      errorInitFailed: '拡張機能の初期化に失敗しました',
      initSuccess: 'Google Calendar Event Selector が初期化されました\nCtrl/Cmd + クリック で予定を選択できます',
      calendarNotFound: 'Google Calendar Event Selector: カレンダーが見つかりませんでした',
    },
    en: {
      panelTitle: '📅 Event Selector',
      emptyMessage: 'Click events on the calendar to select them',
      copyButton: '📋 Copy',
      clearButton: '🗑️ Clear',
      copiedSuccess: '✓ Copied!',
      allDay: 'All day',
      errorExtractFailed: 'Failed to extract event information',
      errorCopyFailed: 'Failed to copy to clipboard',
      errorInitFailed: 'Failed to initialize extension',
      initSuccess: 'Google Calendar Event Selector initialized\nCtrl/Cmd + Click to select events',
      calendarNotFound: 'Google Calendar Event Selector: Calendar not found',
    },
  };

  /**
   * 曜日マッピング
   * @constant {Object}
   */
  const WEEKDAYS_MAP = {
    ja: ['日', '月', '火', '水', '木', '金', '土'],
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  };

  /**
   * 月名マッピング（英語）
   * @constant {Object}
   */
  const MONTH_NAMES = {
    full: ['January', 'February', 'March', 'April', 'May', 'June',
           'July', 'August', 'September', 'October', 'November', 'December'],
    short: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    mapping: {
      'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
      'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
      'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7,
      'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
    },
  };

  /**
   * 正規表現パターン（日本語）
   * @constant {Object}
   */
  const JA_PATTERNS = {
    // "11月20日 18時00分～19時00分"
    timeWithMinutes: /(\d+)月(\d+)日.*?(\d+)時(\d+)分[～~〜](\d+)時(\d+)分/,
    // "11月20日 18:00~19:00"
    timeWithColon: /(\d+)月(\d+)日.*?(\d+):(\d+)[～~〜](\d+):(\d+)/,
    // "11月20日" (終日)
    dateOnly: /(\d+)月(\d+)日/,
  };

  /**
   * 正規表現パターン（英語）
   * @constant {Object}
   */
  const EN_PATTERNS = {
    // "November 20, 2024, 6:00 PM to 7:00 PM"
    fullDateTime: /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d+),?\s+(\d{4})?,?\s*(\d+):(\d+)\s*(AM|PM)?\s*(?:to|-|–)\s*(\d+):(\d+)\s*(AM|PM)?/i,
    // "Nov 20" (終日)
    dateOnly: /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d+)(?:,?\s+(\d{4}))?/i,
  };

  // =============================================================================
  // 状態管理
  // =============================================================================

  /**
   * 選択されたイベントを保存する配列
   * @type {Array<Object>}
   */
  let selectedEvents = [];

  /**
   * MutationObserverのインスタンス
   * @type {MutationObserver|null}
   */
  let eventObserver = null;

  /**
   * パネルドラッグ状態
   * @type {Object}
   */
  const dragState = {
    isDragging: false,
    offsetX: 0,
    offsetY: 0,
  };

  /**
   * 現在のロケール
   * @type {string}
   */
  let currentLocale = CONFIG.DEFAULT_LOCALE;

  // =============================================================================
  // ユーティリティ関数
  // =============================================================================

  /**
   * 関数の実行を遅延させるdebounce関数
   *
   * @param {Function} func - 実行する関数
   * @param {number} wait - 遅延時間（ミリ秒）
   * @returns {Function} debounce処理された関数
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * ページのロケールを検出
   *
   * @returns {string} ロケールコード ('ja' または 'en')
   */
  function detectLocale() {
    const htmlLang = document.documentElement.lang;
    if (htmlLang.startsWith('ja')) {
      return 'ja';
    } else if (htmlLang.startsWith('en')) {
      return 'en';
    }
    return CONFIG.DEFAULT_LOCALE;
  }

  /**
   * 現在のロケールに対応するメッセージを取得
   *
   * @param {string} key - メッセージキー
   * @returns {string} ローカライズされたメッセージ
   */
  function getMessage(key) {
    return MESSAGES[currentLocale]?.[key] || MESSAGES[CONFIG.DEFAULT_LOCALE][key] || '';
  }

  // =============================================================================
  // UI構築関数
  // =============================================================================

  /**
   * UIパネルを作成
   * セキュリティのため、すべてcreateElementを使用してDOM要素を生成
   *
   * @returns {HTMLElement} 作成されたパネル要素
   */
  function createUIPanel() {
    const panel = document.createElement('div');
    panel.id = SELECTORS.PANEL.substring(1); // '#'を除去

    // ヘッダー部分を作成
    const header = createPanelHeader();
    panel.appendChild(header);

    // コンテンツ部分を作成
    const content = createPanelContent();
    panel.appendChild(content);

    document.body.appendChild(panel);

    // イベントリスナーを設定
    setupPanelListeners(panel);

    return panel;
  }

  /**
   * パネルヘッダーを作成
   *
   * @returns {HTMLElement} ヘッダー要素
   */
  function createPanelHeader() {
    const header = document.createElement('div');
    header.className = CSS_CLASSES.HEADER;

    const title = document.createElement('h3');
    title.textContent = getMessage('panelTitle');
    header.appendChild(title);

    const minimizeBtn = document.createElement('button');
    minimizeBtn.id = SELECTORS.MINIMIZE_BTN.substring(1);
    minimizeBtn.className = CSS_CLASSES.BTN_ICON;
    minimizeBtn.textContent = '−';
    header.appendChild(minimizeBtn);

    return header;
  }

  /**
   * パネルコンテンツを作成
   *
   * @returns {HTMLElement} コンテンツ要素
   */
  function createPanelContent() {
    const content = document.createElement('div');
    content.className = CSS_CLASSES.CONTENT;

    // イベントリストエリア
    const eventList = createEventListArea();
    content.appendChild(eventList);

    // アクションボタン
    const actions = createActionButtons();
    content.appendChild(actions);

    return content;
  }

  /**
   * イベントリストエリアを作成
   *
   * @returns {HTMLElement} イベントリスト要素
   */
  function createEventListArea() {
    const eventList = document.createElement('div');
    eventList.id = SELECTORS.EVENT_LIST.substring(1);
    eventList.className = CSS_CLASSES.EVENT_LIST;

    const emptyMessage = document.createElement('p');
    emptyMessage.className = CSS_CLASSES.EMPTY_MESSAGE;
    emptyMessage.textContent = getMessage('emptyMessage');
    eventList.appendChild(emptyMessage);

    return eventList;
  }

  /**
   * アクションボタンを作成
   *
   * @returns {HTMLElement} アクションボタンコンテナ
   */
  function createActionButtons() {
    const actions = document.createElement('div');
    actions.className = CSS_CLASSES.ACTIONS;

    // コピーボタン
    const copyBtn = document.createElement('button');
    copyBtn.id = SELECTORS.COPY_BTN.substring(1);
    copyBtn.className = `${CSS_CLASSES.BTN} ${CSS_CLASSES.BTN_PRIMARY}`;
    copyBtn.disabled = true;
    copyBtn.textContent = getMessage('copyButton');
    actions.appendChild(copyBtn);

    // クリアボタン
    const clearBtn = document.createElement('button');
    clearBtn.id = SELECTORS.CLEAR_BTN.substring(1);
    clearBtn.className = `${CSS_CLASSES.BTN} ${CSS_CLASSES.BTN_SECONDARY}`;
    clearBtn.disabled = true;
    clearBtn.textContent = getMessage('clearButton');
    actions.appendChild(clearBtn);

    return actions;
  }

  /**
   * エラー通知を表示
   *
   * @param {string} message - 表示するメッセージ
   */
  function showErrorNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10001;
      font-family: 'Roboto', sans-serif;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s';
      setTimeout(() => notification.remove(), 300);
    }, CONFIG.ERROR_NOTIFICATION_DISPLAY_MS);
  }

  // =============================================================================
  // イベントハンドラー
  // =============================================================================

  /**
   * パネルのイベントリスナーを設定
   *
   * @param {HTMLElement} panel - パネル要素
   */
  function setupPanelListeners(panel) {
    const header = panel.querySelector(SELECTORS.PANEL_HEADER);
    const minimizeBtn = panel.querySelector(SELECTORS.MINIMIZE_BTN);
    const content = panel.querySelector(SELECTORS.PANEL_CONTENT);
    const copyBtn = panel.querySelector(SELECTORS.COPY_BTN);
    const clearBtn = panel.querySelector(SELECTORS.CLEAR_BTN);

    // 最小化/最大化
    minimizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isMinimized = content.style.display === 'none';
      content.style.display = isMinimized ? 'block' : 'none';
      minimizeBtn.textContent = isMinimized ? '−' : '+';
    });

    // ドラッグ機能
    setupDragFunctionality(panel, header, minimizeBtn);

    // コピー・クリアボタン
    copyBtn.addEventListener('click', copySelectedEvents);
    clearBtn.addEventListener('click', clearSelectedEvents);
  }

  /**
   * パネルのドラッグ機能を設定
   *
   * @param {HTMLElement} panel - パネル要素
   * @param {HTMLElement} header - ヘッダー要素
   * @param {HTMLElement} excludeElement - ドラッグから除外する要素
   */
  function setupDragFunctionality(panel, header, excludeElement) {
    header.addEventListener('mousedown', (e) => {
      if (e.target === excludeElement) return;

      dragState.isDragging = true;
      const rect = panel.getBoundingClientRect();
      dragState.offsetX = e.clientX - rect.left;
      dragState.offsetY = e.clientY - rect.top;
      header.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragState.isDragging) return;

      const x = e.clientX - dragState.offsetX;
      const y = e.clientY - dragState.offsetY;

      // 画面外に出ないように制限
      const maxX = window.innerWidth - panel.offsetWidth;
      const maxY = window.innerHeight - panel.offsetHeight;

      panel.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
      panel.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
      panel.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (dragState.isDragging) {
        dragState.isDragging = false;
        header.style.cursor = 'move';
      }
    });
  }

  // =============================================================================
  // イベント情報抽出
  // =============================================================================

  /**
   * カレンダーから表示中の年を取得
   *
   * @param {number} month - 月（1-12）
   * @param {number} day - 日
   * @returns {number} 年
   */
  function getYearFromCalendar(month, day) {
    try {
      // カレンダーのヘッダーから現在表示中の年月を取得
      const headerElement = document.querySelector(SELECTORS.HEADER_DATE);
      if (headerElement) {
        const dateKey = headerElement.getAttribute(ATTRIBUTES.DATE_KEY) ||
                       headerElement.getAttribute('data-date-label');
        if (dateKey) {
          const match = dateKey.match(/(\d{4})/);
          if (match) {
            return parseInt(match[1], 10);
          }
        }
      }
    } catch (error) {
      console.warn('カレンダーからの年取得に失敗:', error);
    }

    // フォールバック: 現在の日付から推測
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // 年またぎの処理
    if (month < currentMonth && currentMonth >= 11 && month <= 2) {
      return currentYear + 1;
    } else if (month > currentMonth && month >= 11 && currentMonth <= 2) {
      return currentYear - 1;
    }

    return currentYear;
  }

  /**
   * イベント要素から情報を抽出
   *
   * @param {HTMLElement} eventElement - イベント要素
   * @returns {Object|null} イベント情報オブジェクト、失敗時はnull
   * @property {string} id - イベントID
   * @property {Date} date - イベント日付
   * @property {number} month - 月（1-12）
   * @property {number} day - 日
   * @property {string} weekday - 曜日
   * @property {number} startHour - 開始時
   * @property {number} startMin - 開始分
   * @property {number} endHour - 終了時
   * @property {number} endMin - 終了分
   * @property {boolean} isAllDay - 終日イベントかどうか
   * @property {HTMLElement} element - DOM要素への参照
   */
  function extractEventInfo(eventElement) {
    try {
      const eventId = getEventId(eventElement);
      const ariaLabel = eventElement.getAttribute(ATTRIBUTES.ARIA_LABEL) || '';

      let eventInfo = extractFromJapanesePattern(ariaLabel) ||
                     extractFromEnglishPattern(ariaLabel) ||
                     extractFromFallback(eventElement);

      if (!eventInfo) {
        throw new Error('イベント情報を抽出できませんでした');
      }

      // 年が設定されていない場合
      if (!eventInfo.date) {
        const year = getYearFromCalendar(eventInfo.month, eventInfo.day);
        eventInfo.date = new Date(year, eventInfo.month - 1, eventInfo.day);
      }

      // 曜日を設定
      const weekdays = WEEKDAYS_MAP[currentLocale];
      eventInfo.weekday = weekdays[eventInfo.date.getDay()];

      // イベントIDと要素を追加
      eventInfo.id = eventId;
      eventInfo.element = eventElement;

      return eventInfo;

    } catch (error) {
      console.error('イベント情報の抽出に失敗:', error, eventElement);
      showErrorNotification(getMessage('errorExtractFailed'));
      return null;
    }
  }

  /**
   * イベント要素からイベントIDを取得
   *
   * @param {HTMLElement} element - イベント要素
   * @returns {string} イベントID
   */
  function getEventId(element) {
    return element.getAttribute(ATTRIBUTES.EVENT_ID) ||
           element.getAttribute(ATTRIBUTES.EVENT_ID_ALT) ||
           element.getAttribute(ATTRIBUTES.JSLOG)?.match(/\d+/)?.[0] ||
           `temp-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 日本語パターンからイベント情報を抽出
   *
   * @param {string} ariaLabel - aria-label属性の値
   * @returns {Object|null} イベント情報、マッチしない場合はnull
   */
  function extractFromJapanesePattern(ariaLabel) {
    // パターン1: 時分形式
    let match = ariaLabel.match(JA_PATTERNS.timeWithMinutes);
    if (match) {
      return {
        month: parseInt(match[1], 10),
        day: parseInt(match[2], 10),
        startHour: parseInt(match[3], 10),
        startMin: parseInt(match[4], 10),
        endHour: parseInt(match[5], 10),
        endMin: parseInt(match[6], 10),
        isAllDay: false,
        date: null,
      };
    }

    // パターン2: コロン形式
    match = ariaLabel.match(JA_PATTERNS.timeWithColon);
    if (match) {
      return {
        month: parseInt(match[1], 10),
        day: parseInt(match[2], 10),
        startHour: parseInt(match[3], 10),
        startMin: parseInt(match[4], 10),
        endHour: parseInt(match[5], 10),
        endMin: parseInt(match[6], 10),
        isAllDay: false,
        date: null,
      };
    }

    // パターン3: 終日
    match = ariaLabel.match(JA_PATTERNS.dateOnly);
    if (match) {
      return {
        month: parseInt(match[1], 10),
        day: parseInt(match[2], 10),
        startHour: 0,
        startMin: 0,
        endHour: 0,
        endMin: 0,
        isAllDay: true,
        date: null,
      };
    }

    return null;
  }

  /**
   * 英語パターンからイベント情報を抽出
   *
   * @param {string} ariaLabel - aria-label属性の値
   * @returns {Object|null} イベント情報、マッチしない場合はnull
   */
  function extractFromEnglishPattern(ariaLabel) {
    // パターン1: 完全な日時形式
    let match = ariaLabel.match(EN_PATTERNS.fullDateTime);
    if (match) {
      const month = MONTH_NAMES.mapping[match[1].toLowerCase()];
      const day = parseInt(match[2], 10);
      const year = match[3] ? parseInt(match[3], 10) : null;

      let startHour = parseInt(match[4], 10);
      const startMin = parseInt(match[5], 10);
      const startPeriod = match[6];

      let endHour = parseInt(match[7], 10);
      const endMin = parseInt(match[8], 10);
      const endPeriod = match[9];

      // AM/PM変換
      if (startPeriod) {
        startHour = convertTo24Hour(startHour, startPeriod);
      }
      if (endPeriod) {
        endHour = convertTo24Hour(endHour, endPeriod);
      }

      const eventYear = year || getYearFromCalendar(month, day);

      return {
        month: month,
        day: day,
        startHour: startHour,
        startMin: startMin,
        endHour: endHour,
        endMin: endMin,
        isAllDay: false,
        date: new Date(eventYear, month - 1, day),
      };
    }

    // パターン2: 終日
    match = ariaLabel.match(EN_PATTERNS.dateOnly);
    if (match) {
      const month = MONTH_NAMES.mapping[match[1].toLowerCase()];
      const day = parseInt(match[2], 10);
      const year = match[3] ? parseInt(match[3], 10) : getYearFromCalendar(month, day);

      return {
        month: month,
        day: day,
        startHour: 0,
        startMin: 0,
        endHour: 0,
        endMin: 0,
        isAllDay: true,
        date: new Date(year, month - 1, day),
      };
    }

    return null;
  }

  /**
   * 12時間形式を24時間形式に変換
   *
   * @param {number} hour - 時（1-12）
   * @param {string} period - "AM" または "PM"
   * @returns {number} 24時間形式の時（0-23）
   */
  function convertTo24Hour(hour, period) {
    const upperPeriod = period.toUpperCase();
    if (upperPeriod === 'PM' && hour !== 12) {
      return hour + 12;
    }
    if (upperPeriod === 'AM' && hour === 12) {
      return 0;
    }
    return hour;
  }

  /**
   * フォールバック: DOMから直接情報を抽出
   *
   * @param {HTMLElement} eventElement - イベント要素
   * @returns {Object|null} イベント情報
   */
  function extractFromFallback(eventElement) {
    const dateElement = eventElement.closest(SELECTORS.DATE_CONTAINER);
    const dateStr = dateElement?.getAttribute(ATTRIBUTES.DATE_KEY);

    if (!dateStr) {
      return null;
    }

    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // 位置から時間を推測
    const top = parseFloat(eventElement.style.top) || 0;
    const height = parseFloat(eventElement.style.height) || 60;

    const startMinutes = (top / CONFIG.GCAL_HOUR_HEIGHT_PX) * 60;
    const durationMinutes = (height / CONFIG.GCAL_HOUR_HEIGHT_PX) * 60;

    return {
      month: month,
      day: day,
      startHour: Math.floor(startMinutes / 60),
      startMin: Math.floor(startMinutes % 60),
      endHour: Math.floor((startMinutes + durationMinutes) / 60),
      endMin: Math.floor((startMinutes + durationMinutes) % 60),
      isAllDay: false,
      date: date,
    };
  }

  // =============================================================================
  // イベントフォーマット
  // =============================================================================

  /**
   * イベント情報をフォーマットされた文字列に変換
   *
   * @param {Object} event - イベント情報
   * @returns {string} フォーマットされた日時文字列
   */
  function formatEventTime(event) {
    if (currentLocale === 'ja') {
      return formatEventTimeJapanese(event);
    } else {
      return formatEventTimeEnglish(event);
    }
  }

  /**
   * 日本語形式でイベント時刻をフォーマット
   *
   * @param {Object} event - イベント情報
   * @returns {string} フォーマットされた文字列
   */
  function formatEventTimeJapanese(event) {
    const formatTime = (hour, min) => {
      if (min === 0) {
        return `${hour}時`;
      }
      return `${hour}時${String(min).padStart(2, '0')}分`;
    };

    if (event.isAllDay) {
      return `${event.month}月${event.day}日(${event.weekday}) ${getMessage('allDay')}`;
    }

    const startTime = formatTime(event.startHour, event.startMin);
    const endTime = formatTime(event.endHour, event.endMin);
    return `${event.month}月${event.day}日(${event.weekday}) ${startTime}~${endTime}`;
  }

  /**
   * 英語形式でイベント時刻をフォーマット
   *
   * @param {Object} event - イベント情報
   * @returns {string} フォーマットされた文字列
   */
  function formatEventTimeEnglish(event) {
    const monthName = MONTH_NAMES.short[event.month - 1];

    if (event.isAllDay) {
      return `${monthName} ${event.day} (${event.weekday}) ${getMessage('allDay')}`;
    }

    const formatTime = (hour, min) => {
      const period = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      if (min === 0) {
        return `${hour12}${period}`;
      }
      return `${hour12}:${String(min).padStart(2, '0')}${period}`;
    };

    const startTime = formatTime(event.startHour, event.startMin);
    const endTime = formatTime(event.endHour, event.endMin);
    return `${monthName} ${event.day} (${event.weekday}) ${startTime}-${endTime}`;
  }

  // =============================================================================
  // イベント選択管理
  // =============================================================================

  /**
   * イベントの選択/選択解除をトグル
   *
   * @param {HTMLElement} eventElement - イベント要素
   */
  function toggleEventSelection(eventElement) {
    const eventInfo = extractEventInfo(eventElement);
    if (!eventInfo) return;

    const existingIndex = selectedEvents.findIndex(e => e.id === eventInfo.id);

    if (existingIndex >= 0) {
      // 選択を解除
      selectedEvents.splice(existingIndex, 1);
      eventElement.classList.remove(CSS_CLASSES.SELECTED_EVENT);
    } else {
      // 選択に追加
      selectedEvents.push(eventInfo);
      eventElement.classList.add(CSS_CLASSES.SELECTED_EVENT);
    }

    updateEventList();
  }

  /**
   * 選択されたイベントリストUIを更新
   */
  function updateEventList() {
    const eventListContainer = document.querySelector(SELECTORS.EVENT_LIST);
    const copyBtn = document.querySelector(SELECTORS.COPY_BTN);
    const clearBtn = document.querySelector(SELECTORS.CLEAR_BTN);

    if (!eventListContainer || !copyBtn || !clearBtn) {
      console.error('UI要素が見つかりません');
      return;
    }

    // 既存の内容をクリア
    while (eventListContainer.firstChild) {
      eventListContainer.removeChild(eventListContainer.firstChild);
    }

    if (selectedEvents.length === 0) {
      // 空の状態
      const emptyMessage = document.createElement('p');
      emptyMessage.className = CSS_CLASSES.EMPTY_MESSAGE;
      emptyMessage.textContent = getMessage('emptyMessage');
      eventListContainer.appendChild(emptyMessage);

      copyBtn.disabled = true;
      clearBtn.disabled = true;
    } else {
      // イベントを日時順にソート
      selectedEvents.sort((a, b) => a.date - b.date);

      // イベントアイテムを作成
      selectedEvents.forEach((event, index) => {
        const eventItem = createEventItem(event, index + 1);
        eventListContainer.appendChild(eventItem);
      });

      copyBtn.disabled = false;
      clearBtn.disabled = false;
    }
  }

  /**
   * イベントアイテムのDOM要素を作成
   *
   * @param {Object} event - イベント情報
   * @param {number} index - 表示番号
   * @returns {HTMLElement} イベントアイテム要素
   */
  function createEventItem(event, index) {
    const eventItem = document.createElement('div');
    eventItem.className = CSS_CLASSES.EVENT_ITEM;

    const numberSpan = document.createElement('span');
    numberSpan.className = CSS_CLASSES.EVENT_NUMBER;
    numberSpan.textContent = `${index}.`;
    eventItem.appendChild(numberSpan);

    const textSpan = document.createElement('span');
    textSpan.className = CSS_CLASSES.EVENT_TEXT;
    textSpan.textContent = formatEventTime(event);
    eventItem.appendChild(textSpan);

    const removeBtn = document.createElement('button');
    removeBtn.className = CSS_CLASSES.REMOVE_BTN;
    removeBtn.textContent = '×';
    removeBtn.setAttribute('data-event-id', event.id);
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeEventById(event.id);
    });
    eventItem.appendChild(removeBtn);

    return eventItem;
  }

  /**
   * IDでイベントを削除
   *
   * @param {string} eventId - イベントID
   */
  function removeEventById(eventId) {
    const event = selectedEvents.find(e => e.id === eventId);
    if (event?.element) {
      event.element.classList.remove(CSS_CLASSES.SELECTED_EVENT);
    }
    selectedEvents = selectedEvents.filter(e => e.id !== eventId);
    updateEventList();
  }

  /**
   * 選択されたイベントをクリップボードにコピー
   */
  function copySelectedEvents() {
    if (selectedEvents.length === 0) return;

    const text = selectedEvents.map(event => formatEventTime(event)).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      // コピー成功のフィードバック
      const copyBtn = document.querySelector(SELECTORS.COPY_BTN);
      if (!copyBtn) return;

      const originalText = copyBtn.textContent;
      copyBtn.textContent = getMessage('copiedSuccess');
      copyBtn.style.backgroundColor = '#34A853';

      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.backgroundColor = '';
      }, CONFIG.COPY_SUCCESS_DISPLAY_MS);
    }).catch(err => {
      console.error('コピーに失敗:', err);
      showErrorNotification(getMessage('errorCopyFailed'));
    });
  }

  /**
   * すべての選択をクリア
   */
  function clearSelectedEvents() {
    selectedEvents.forEach(event => {
      if (event.element) {
        event.element.classList.remove(CSS_CLASSES.SELECTED_EVENT);
      }
    });
    selectedEvents = [];
    updateEventList();
  }

  // =============================================================================
  // イベントリスナー管理
  // =============================================================================

  /**
   * カレンダーイベント要素にクリックリスナーを追加
   */
  function attachEventListeners() {
    // 既存のObserverをクリーンアップ
    if (eventObserver) {
      eventObserver.disconnect();
      eventObserver = null;
    }

    // イベント処理をdebounce
    const processEvents = debounce(() => {
      const eventElements = document.querySelectorAll(SELECTORS.CALENDAR_EVENT);

      eventElements.forEach(eventEl => {
        if (!eventEl.hasAttribute(ATTRIBUTES.ATTACHED_FLAG)) {
          eventEl.setAttribute(ATTRIBUTES.ATTACHED_FLAG, 'true');
          attachEventElementListeners(eventEl);
        }
      });
    }, CONFIG.DEBOUNCE_DELAY_MS);

    // MutationObserverでDOMの変更を監視
    eventObserver = new MutationObserver(() => {
      processEvents();
    });

    // カレンダーのメインコンテナを監視
    const calendarContainer = document.querySelector(SELECTORS.CALENDAR_MAIN) || document.body;
    eventObserver.observe(calendarContainer, {
      childList: true,
      subtree: true,
    });

    // 初回実行
    processEvents();
  }

  /**
   * 個別のイベント要素にリスナーをアタッチ
   *
   * @param {HTMLElement} eventEl - イベント要素
   */
  function attachEventElementListeners(eventEl) {
    eventEl.addEventListener('click', (e) => {
      // Ctrlキー（Mac: Cmd）が押されている場合のみ選択モード
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        toggleEventSelection(eventEl);
      }
    });

    // ホバー時のビジュアルフィードバック
    eventEl.addEventListener('mouseenter', (e) => {
      if (e.ctrlKey || e.metaKey) {
        eventEl.style.cursor = 'pointer';
        eventEl.style.opacity = '0.8';
      }
    });

    eventEl.addEventListener('mouseleave', () => {
      eventEl.style.cursor = '';
      eventEl.style.opacity = '';
    });
  }

  // =============================================================================
  // クリーンアップ
  // =============================================================================

  /**
   * リソースをクリーンアップ
   */
  function cleanup() {
    if (eventObserver) {
      eventObserver.disconnect();
      eventObserver = null;
    }

    clearSelectedEvents();

    const panel = document.querySelector(SELECTORS.PANEL);
    if (panel) {
      panel.remove();
    }

    console.log('Google Calendar Event Selector cleaned up');
  }

  // ページ遷移時のクリーンアップ（SPA対応）
  window.addEventListener('beforeunload', cleanup);

  // =============================================================================
  // 初期化
  // =============================================================================

  /**
   * 拡張機能を初期化
   */
  function init() {
    // ロケールを検出
    currentLocale = detectLocale();
    console.log('Detected locale:', currentLocale);

    // Googleカレンダーのページが完全に読み込まれるまで待機
    const checkInterval = setInterval(() => {
      const calendarContainer = document.querySelector(SELECTORS.CALENDAR_MAIN);

      if (calendarContainer) {
        clearInterval(checkInterval);

        try {
          // UIパネルを作成
          createUIPanel();

          // イベントリスナーをアタッチ
          attachEventListeners();

          console.log(getMessage('initSuccess'));
        } catch (error) {
          console.error('初期化に失敗しました:', error);
          showErrorNotification(getMessage('errorInitFailed'));
        }
      }
    }, CONFIG.INIT_CHECK_INTERVAL_MS);

    // タイムアウト
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!document.querySelector(SELECTORS.PANEL)) {
        console.warn(getMessage('calendarNotFound'));
      }
    }, CONFIG.INIT_TIMEOUT_MS);
  }

  // ページ読み込み完了後に初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
