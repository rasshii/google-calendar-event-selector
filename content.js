// Google Calendar Event Selector Extension
// 複数の予定を選択して日時範囲をコピー

(function() {
  'use strict';

  // 選択されたイベントを保存する配列
  let selectedEvents = [];

  // MutationObserverのインスタンスを保持
  let eventObserver = null;

  // パネルドラッグ用の状態
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  // 曜日マッピング（多言語対応）
  const weekdaysMap = {
    ja: ['日', '月', '火', '水', '木', '金', '土'],
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  };

  // 現在のロケールを検出
  let currentLocale = 'ja';

  // Debounce関数
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

  // ロケールを検出
  function detectLocale() {
    const htmlLang = document.documentElement.lang;
    if (htmlLang.startsWith('ja')) {
      return 'ja';
    } else if (htmlLang.startsWith('en')) {
      return 'en';
    }
    // デフォルトは日本語
    return 'ja';
  }

  // UIパネルを作成（セキュリティ向上のためcreateElementを使用）
  function createUIPanel() {
    const panel = document.createElement('div');
    panel.id = 'gcal-event-selector-panel';

    // ヘッダー
    const header = document.createElement('div');
    header.className = 'gcal-selector-header';

    const title = document.createElement('h3');
    title.textContent = currentLocale === 'ja' ? '📅 予定選択' : '📅 Event Selector';
    header.appendChild(title);

    const minimizeBtn = document.createElement('button');
    minimizeBtn.id = 'gcal-selector-minimize';
    minimizeBtn.className = 'gcal-btn-icon';
    minimizeBtn.textContent = '−';
    header.appendChild(minimizeBtn);

    panel.appendChild(header);

    // コンテンツ
    const content = document.createElement('div');
    content.className = 'gcal-selector-content';

    // イベントリスト
    const eventList = document.createElement('div');
    eventList.id = 'gcal-selected-events';
    eventList.className = 'gcal-event-list';

    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'gcal-empty-message';
    emptyMessage.textContent = currentLocale === 'ja'
      ? 'カレンダー上の予定をクリックして選択してください'
      : 'Click events on the calendar to select them';
    eventList.appendChild(emptyMessage);

    content.appendChild(eventList);

    // アクションボタン
    const actions = document.createElement('div');
    actions.className = 'gcal-selector-actions';

    const copyBtn = document.createElement('button');
    copyBtn.id = 'gcal-copy-btn';
    copyBtn.className = 'gcal-btn gcal-btn-primary';
    copyBtn.disabled = true;
    copyBtn.textContent = currentLocale === 'ja' ? '📋 コピー' : '📋 Copy';
    actions.appendChild(copyBtn);

    const clearBtn = document.createElement('button');
    clearBtn.id = 'gcal-clear-btn';
    clearBtn.className = 'gcal-btn gcal-btn-secondary';
    clearBtn.disabled = true;
    clearBtn.textContent = currentLocale === 'ja' ? '🗑️ クリア' : '🗑️ Clear';
    actions.appendChild(clearBtn);

    content.appendChild(actions);
    panel.appendChild(content);

    document.body.appendChild(panel);

    // イベントリスナーを設定
    setupPanelListeners(panel);

    return panel;
  }

  // パネルのイベントリスナーを設定
  function setupPanelListeners(panel) {
    const header = panel.querySelector('.gcal-selector-header');
    const minimizeBtn = panel.querySelector('#gcal-selector-minimize');
    const content = panel.querySelector('.gcal-selector-content');

    // 最小化/最大化ボタン
    minimizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isMinimized = content.style.display === 'none';
      content.style.display = isMinimized ? 'block' : 'none';
      minimizeBtn.textContent = isMinimized ? '−' : '+';
    });

    // ドラッグ機能
    header.addEventListener('mousedown', (e) => {
      // 最小化ボタンのクリックは除外
      if (e.target === minimizeBtn) return;

      isDragging = true;
      const rect = panel.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      header.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const x = e.clientX - dragOffsetX;
      const y = e.clientY - dragOffsetY;

      // 画面外に出ないように制限
      const maxX = window.innerWidth - panel.offsetWidth;
      const maxY = window.innerHeight - panel.offsetHeight;

      panel.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
      panel.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
      panel.style.right = 'auto'; // right指定を解除
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        header.style.cursor = 'move';
      }
    });

    // コピーボタン
    const copyBtn = panel.querySelector('#gcal-copy-btn');
    copyBtn.addEventListener('click', copySelectedEvents);

    // クリアボタン
    const clearBtn = panel.querySelector('#gcal-clear-btn');
    clearBtn.addEventListener('click', clearSelectedEvents);
  }

  // 年を正確に取得する（カレンダーの表示年を考慮）
  function getYearFromCalendar(month, day) {
    try {
      // カレンダーのヘッダーから現在表示中の年月を取得
      const headerElement = document.querySelector('[data-date-label], [data-datekey]');
      if (headerElement) {
        const dateKey = headerElement.getAttribute('data-datekey') || headerElement.getAttribute('data-date-label');
        if (dateKey) {
          const match = dateKey.match(/(\d{4})/);
          if (match) {
            return parseInt(match[1]);
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

    // 現在月より前の月なら翌年の可能性
    // ただし11月→12月の場合は同年
    if (month < currentMonth && currentMonth >= 11 && month <= 2) {
      return currentYear + 1;
    } else if (month > currentMonth && month >= 11 && currentMonth <= 2) {
      return currentYear - 1;
    }

    return currentYear;
  }

  // イベント情報を抽出（多言語対応・終日イベント対応）
  function extractEventInfo(eventElement) {
    try {
      // Google Calendarのイベント要素から情報を取得
      const eventId = eventElement.getAttribute('data-draggable-id') ||
                     eventElement.getAttribute('data-eventid') ||
                     eventElement.getAttribute('jslog')?.match(/\d+/)?.[0] ||
                     Math.random().toString(36).substr(2, 9);

      // aria-label から情報を取得
      const ariaLabel = eventElement.getAttribute('aria-label') || '';

      let date, month, day, weekday, startHour, startMin, endHour, endMin;
      let isAllDay = false;

      // 日本語パターン
      // パターン1: "イベント名, 11月20日 18時00分～19時00分"
      const jaPattern1 = /(\d+)月(\d+)日.*?(\d+)時(\d+)分[～~〜](\d+)時(\d+)分/;
      // パターン2: "イベント名, 11月20日 18:00~19:00"
      const jaPattern2 = /(\d+)月(\d+)日.*?(\d+):(\d+)[～~〜](\d+):(\d+)/;
      // パターン3: "イベント名, 11月20日" (終日)
      const jaPattern3 = /(\d+)月(\d+)日/;

      // 英語パターン
      // パターン4: "Event, November 20, 2024, 6:00 PM to 7:00 PM"
      const enPattern1 = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d+),?\s+(\d{4})?,?\s*(\d+):(\d+)\s*(AM|PM)?\s*(?:to|-|–)\s*(\d+):(\d+)\s*(AM|PM)?/i;
      // パターン5: "Event, Nov 20" (終日)
      const enPattern2 = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d+)(?:,?\s+(\d{4}))?/i;

      const monthNames = {
        'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
        'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7,
        'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
      };

      let matched = false;

      // 日本語パターン1
      const jaMatch1 = ariaLabel.match(jaPattern1);
      if (jaMatch1) {
        month = parseInt(jaMatch1[1]);
        day = parseInt(jaMatch1[2]);
        startHour = parseInt(jaMatch1[3]);
        startMin = parseInt(jaMatch1[4]);
        endHour = parseInt(jaMatch1[5]);
        endMin = parseInt(jaMatch1[6]);
        matched = true;
      }

      // 日本語パターン2
      if (!matched) {
        const jaMatch2 = ariaLabel.match(jaPattern2);
        if (jaMatch2) {
          month = parseInt(jaMatch2[1]);
          day = parseInt(jaMatch2[2]);
          startHour = parseInt(jaMatch2[3]);
          startMin = parseInt(jaMatch2[4]);
          endHour = parseInt(jaMatch2[5]);
          endMin = parseInt(jaMatch2[6]);
          matched = true;
        }
      }

      // 英語パターン1
      if (!matched) {
        const enMatch1 = ariaLabel.match(enPattern1);
        if (enMatch1) {
          month = monthNames[enMatch1[1].toLowerCase()];
          day = parseInt(enMatch1[2]);
          let year = enMatch1[3] ? parseInt(enMatch1[3]) : null;

          startHour = parseInt(enMatch1[4]);
          startMin = parseInt(enMatch1[5]);
          const startPeriod = enMatch1[6];

          endHour = parseInt(enMatch1[7]);
          endMin = parseInt(enMatch1[8]);
          const endPeriod = enMatch1[9];

          // AM/PM変換
          if (startPeriod) {
            if (startPeriod.toUpperCase() === 'PM' && startHour !== 12) startHour += 12;
            if (startPeriod.toUpperCase() === 'AM' && startHour === 12) startHour = 0;
          }
          if (endPeriod) {
            if (endPeriod.toUpperCase() === 'PM' && endHour !== 12) endHour += 12;
            if (endPeriod.toUpperCase() === 'AM' && endHour === 12) endHour = 0;
          }

          if (!year) {
            year = getYearFromCalendar(month, day);
          }
          date = new Date(year, month - 1, day);
          matched = true;
        }
      }

      // 日本語終日パターン
      if (!matched) {
        const jaMatch3 = ariaLabel.match(jaPattern3);
        if (jaMatch3) {
          month = parseInt(jaMatch3[1]);
          day = parseInt(jaMatch3[2]);
          isAllDay = true;
          matched = true;
        }
      }

      // 英語終日パターン
      if (!matched) {
        const enMatch2 = ariaLabel.match(enPattern2);
        if (enMatch2) {
          month = monthNames[enMatch2[1].toLowerCase()];
          day = parseInt(enMatch2[2]);
          const year = enMatch2[3] ? parseInt(enMatch2[3]) : getYearFromCalendar(month, day);
          date = new Date(year, month - 1, day);
          isAllDay = true;
          matched = true;
        }
      }

      // フォールバック
      if (!matched) {
        const dateElement = eventElement.closest('[data-datekey]');
        const dateStr = dateElement ? dateElement.getAttribute('data-datekey') : null;

        if (dateStr) {
          date = new Date(dateStr);
          month = date.getMonth() + 1;
          day = date.getDate();
        } else {
          throw new Error('日付情報を取得できませんでした');
        }

        // 位置から時間を推測
        const top = parseFloat(eventElement.style.top) || 0;
        const height = parseFloat(eventElement.style.height) || 60;
        const hourHeight = 42;
        const startMinutes = (top / hourHeight) * 60;
        const durationMinutes = (height / hourHeight) * 60;

        startHour = Math.floor(startMinutes / 60);
        startMin = Math.floor(startMinutes % 60);
        endHour = Math.floor((startMinutes + durationMinutes) / 60);
        endMin = Math.floor((startMinutes + durationMinutes) % 60);
      }

      // 年が設定されていない場合
      if (!date) {
        const year = getYearFromCalendar(month, day);
        date = new Date(year, month - 1, day);
      }

      const weekdays = weekdaysMap[currentLocale];
      weekday = weekdays[date.getDay()];

      return {
        id: eventId,
        date: date,
        month: month,
        day: day,
        weekday: weekday,
        startHour: startHour,
        startMin: startMin,
        endHour: endHour,
        endMin: endMin,
        isAllDay: isAllDay,
        element: eventElement
      };
    } catch (error) {
      console.error('イベント情報の抽出に失敗:', error, eventElement);
      showErrorNotification(currentLocale === 'ja'
        ? 'イベント情報の取得に失敗しました'
        : 'Failed to extract event information');
      return null;
    }
  }

  // エラー通知を表示
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
    }, 3000);
  }

  // フォーマットされた日時文字列を生成（多言語・終日対応）
  function formatEventTime(event) {
    if (currentLocale === 'ja') {
      // 日本語フォーマット
      const formatTime = (hour, min) => {
        if (min === 0) {
          return `${hour}時`;
        }
        return `${hour}時${String(min).padStart(2, '0')}分`;
      };

      if (event.isAllDay) {
        return `${event.month}月${event.day}日(${event.weekday}) 終日`;
      }

      const startTime = formatTime(event.startHour, event.startMin);
      const endTime = formatTime(event.endHour, event.endMin);
      return `${event.month}月${event.day}日(${event.weekday}) ${startTime}~${endTime}`;
    } else {
      // 英語フォーマット
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthNames[event.month - 1];

      if (event.isAllDay) {
        return `${monthName} ${event.day} (${event.weekday}) All day`;
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
  }

  // イベントをトグル（選択/解除）
  function toggleEventSelection(eventElement) {
    const eventInfo = extractEventInfo(eventElement);
    if (!eventInfo) return;

    // 既に選択されているかチェック
    const existingIndex = selectedEvents.findIndex(e => e.id === eventInfo.id);

    if (existingIndex >= 0) {
      // 選択を解除
      selectedEvents.splice(existingIndex, 1);
      eventElement.classList.remove('gcal-selected-event');
    } else {
      // 選択に追加
      selectedEvents.push(eventInfo);
      eventElement.classList.add('gcal-selected-event');
    }

    updateEventList();
  }

  // 選択されたイベントリストを更新（セキュリティ向上版）
  function updateEventList() {
    const eventListContainer = document.getElementById('gcal-selected-events');
    const copyBtn = document.getElementById('gcal-copy-btn');
    const clearBtn = document.getElementById('gcal-clear-btn');

    // 既存の内容をクリア
    while (eventListContainer.firstChild) {
      eventListContainer.removeChild(eventListContainer.firstChild);
    }

    if (selectedEvents.length === 0) {
      const emptyMessage = document.createElement('p');
      emptyMessage.className = 'gcal-empty-message';
      emptyMessage.textContent = currentLocale === 'ja'
        ? 'カレンダー上の予定をクリックして選択してください'
        : 'Click events on the calendar to select them';
      eventListContainer.appendChild(emptyMessage);

      copyBtn.disabled = true;
      clearBtn.disabled = true;
    } else {
      // イベントを日時順にソート
      selectedEvents.sort((a, b) => a.date - b.date);

      selectedEvents.forEach((event, index) => {
        const eventItem = document.createElement('div');
        eventItem.className = 'gcal-event-item';

        const numberSpan = document.createElement('span');
        numberSpan.className = 'gcal-event-number';
        numberSpan.textContent = `${index + 1}.`;
        eventItem.appendChild(numberSpan);

        const textSpan = document.createElement('span');
        textSpan.className = 'gcal-event-text';
        textSpan.textContent = formatEventTime(event);
        eventItem.appendChild(textSpan);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'gcal-remove-btn';
        removeBtn.textContent = '×';
        removeBtn.setAttribute('data-event-id', event.id);
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          removeEventById(event.id);
        });
        eventItem.appendChild(removeBtn);

        eventListContainer.appendChild(eventItem);
      });

      copyBtn.disabled = false;
      clearBtn.disabled = false;
    }
  }

  // IDでイベントを削除
  function removeEventById(eventId) {
    const event = selectedEvents.find(e => e.id === eventId);
    if (event && event.element) {
      event.element.classList.remove('gcal-selected-event');
    }
    selectedEvents = selectedEvents.filter(e => e.id !== eventId);
    updateEventList();
  }

  // 選択されたイベントをコピー（エラーハンドリング強化）
  function copySelectedEvents() {
    if (selectedEvents.length === 0) return;

    const text = selectedEvents.map(event => formatEventTime(event)).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      // コピー成功のフィードバック
      const copyBtn = document.getElementById('gcal-copy-btn');
      const originalText = copyBtn.textContent;
      const successText = currentLocale === 'ja' ? '✓ コピーしました！' : '✓ Copied!';

      copyBtn.textContent = successText;
      copyBtn.style.backgroundColor = '#34A853';

      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.backgroundColor = '';
      }, 2000);
    }).catch(err => {
      console.error('コピーに失敗:', err);
      const errorMessage = currentLocale === 'ja'
        ? 'クリップボードへのコピーに失敗しました'
        : 'Failed to copy to clipboard';
      showErrorNotification(errorMessage);
    });
  }

  // 選択をクリア
  function clearSelectedEvents() {
    selectedEvents.forEach(event => {
      if (event.element) {
        event.element.classList.remove('gcal-selected-event');
      }
    });
    selectedEvents = [];
    updateEventList();
  }

  // カレンダーイベント要素にクリックリスナーを追加（パフォーマンス最適化・クリーンアップ対応）
  function attachEventListeners() {
    // 既存のObserverをクリーンアップ
    if (eventObserver) {
      eventObserver.disconnect();
      eventObserver = null;
    }

    // イベント処理をdebounce
    const processEvents = debounce(() => {
      const eventElements = document.querySelectorAll('[data-draggable-id], [role="button"][data-eventid]');

      eventElements.forEach(eventEl => {
        if (!eventEl.hasAttribute('data-gcal-selector-attached')) {
          eventEl.setAttribute('data-gcal-selector-attached', 'true');

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
      });
    }, 100); // 100msのdebounce

    // MutationObserverでDOMの変更を監視
    eventObserver = new MutationObserver((mutations) => {
      processEvents();
    });

    // カレンダーのメインコンテナを監視
    const calendarContainer = document.querySelector('[role="main"]') || document.body;
    eventObserver.observe(calendarContainer, {
      childList: true,
      subtree: true
    });

    // 初回実行
    processEvents();
  }

  // クリーンアップ処理
  function cleanup() {
    if (eventObserver) {
      eventObserver.disconnect();
      eventObserver = null;
    }

    // 選択状態をクリア
    clearSelectedEvents();

    // パネルを削除
    const panel = document.getElementById('gcal-event-selector-panel');
    if (panel) {
      panel.remove();
    }

    console.log('Google Calendar Event Selector cleaned up');
  }

  // ページ遷移時のクリーンアップ（SPA対応）
  window.addEventListener('beforeunload', cleanup);

  // 初期化
  function init() {
    // ロケールを検出
    currentLocale = detectLocale();
    console.log('Detected locale:', currentLocale);

    // Googleカレンダーのページが完全に読み込まれるまで待機
    const checkInterval = setInterval(() => {
      const calendarContainer = document.querySelector('[role="main"]');

      if (calendarContainer) {
        clearInterval(checkInterval);

        try {
          // UIパネルを作成
          createUIPanel();

          // イベントリスナーをアタッチ
          attachEventListeners();

          const initMessage = currentLocale === 'ja'
            ? 'Google Calendar Event Selector が初期化されました\nCtrl/Cmd + クリック で予定を選択できます'
            : 'Google Calendar Event Selector initialized\nCtrl/Cmd + Click to select events';

          console.log(initMessage);
        } catch (error) {
          console.error('初期化に失敗しました:', error);
          showErrorNotification(currentLocale === 'ja'
            ? '拡張機能の初期化に失敗しました'
            : 'Failed to initialize extension');
        }
      }
    }, 500);

    // 10秒後にタイムアウト
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!document.getElementById('gcal-event-selector-panel')) {
        console.warn('Google Calendar Event Selector: カレンダーが見つかりませんでした');
      }
    }, 10000);
  }

  // ページ読み込み完了後に初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
