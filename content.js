// Google Calendar Event Selector Extension
// 複数の予定を選択して日時範囲をコピー

(function() {
  'use strict';

  // 選択されたイベントを保存する配列
  let selectedEvents = [];

  // 日本語の曜日マッピング
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  // UIパネルを作成
  function createUIPanel() {
    const panel = document.createElement('div');
    panel.id = 'gcal-event-selector-panel';
    panel.innerHTML = `
      <div class="gcal-selector-header">
        <h3>📅 予定選択</h3>
        <button id="gcal-selector-minimize" class="gcal-btn-icon">−</button>
      </div>
      <div class="gcal-selector-content">
        <div id="gcal-selected-events" class="gcal-event-list">
          <p class="gcal-empty-message">カレンダー上の予定をクリックして選択してください</p>
        </div>
        <div class="gcal-selector-actions">
          <button id="gcal-copy-btn" class="gcal-btn gcal-btn-primary" disabled>
            📋 コピー
          </button>
          <button id="gcal-clear-btn" class="gcal-btn gcal-btn-secondary" disabled>
            🗑️ クリア
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // イベントリスナーを設定
    setupPanelListeners(panel);

    return panel;
  }

  // パネルのイベントリスナーを設定
  function setupPanelListeners(panel) {
    // 最小化/最大化ボタン
    const minimizeBtn = panel.querySelector('#gcal-selector-minimize');
    const content = panel.querySelector('.gcal-selector-content');

    minimizeBtn.addEventListener('click', () => {
      const isMinimized = content.style.display === 'none';
      content.style.display = isMinimized ? 'block' : 'none';
      minimizeBtn.textContent = isMinimized ? '−' : '+';
    });

    // コピーボタン
    const copyBtn = panel.querySelector('#gcal-copy-btn');
    copyBtn.addEventListener('click', copySelectedEvents);

    // クリアボタン
    const clearBtn = panel.querySelector('#gcal-clear-btn');
    clearBtn.addEventListener('click', clearSelectedEvents);
  }

  // イベント情報を抽出
  function extractEventInfo(eventElement) {
    try {
      // Google Calendarのイベント要素から情報を取得
      // data-draggable-id 属性からイベントIDを取得
      const eventId = eventElement.getAttribute('data-draggable-id') ||
                     eventElement.getAttribute('data-eventid') ||
                     eventElement.getAttribute('jslog')?.match(/\d+/)?.[0] ||
                     Math.random().toString(36).substr(2, 9);

      // aria-label から情報を取得（最も正確）
      const ariaLabel = eventElement.getAttribute('aria-label') || '';

      let date, month, day, weekday, startHour, startMin, endHour, endMin;

      // aria-labelから時刻情報を抽出
      // パターン1: "イベント名, 11月20日 18時00分～19時00分" 形式
      const pattern1 = /(\d+)月(\d+)日.*?(\d+)時(\d+)分[～~〜](\d+)時(\d+)分/;
      const match1 = ariaLabel.match(pattern1);

      if (match1) {
        month = parseInt(match1[1]);
        day = parseInt(match1[2]);
        startHour = parseInt(match1[3]);
        startMin = parseInt(match1[4]);
        endHour = parseInt(match1[5]);
        endMin = parseInt(match1[6]);

        // 年を取得（現在年または翌年を推測）
        const now = new Date();
        let year = now.getFullYear();
        if (month < now.getMonth() + 1) {
          year += 1; // 来年の日付の可能性
        }
        date = new Date(year, month - 1, day);
      } else {
        // パターン2: "イベント名, 11月20日 18:00~19:00" 形式
        const pattern2 = /(\d+)月(\d+)日.*?(\d+):(\d+)[～~〜](\d+):(\d+)/;
        const match2 = ariaLabel.match(pattern2);

        if (match2) {
          month = parseInt(match2[1]);
          day = parseInt(match2[2]);
          startHour = parseInt(match2[3]);
          startMin = parseInt(match2[4]);
          endHour = parseInt(match2[5]);
          endMin = parseInt(match2[6]);

          const now = new Date();
          let year = now.getFullYear();
          if (month < now.getMonth() + 1) {
            year += 1;
          }
          date = new Date(year, month - 1, day);
        } else {
          // フォールバック: data-datekey と位置から推測
          let dateElement = eventElement.closest('[data-datekey]');
          let dateStr = dateElement ? dateElement.getAttribute('data-datekey') : null;

          if (!dateStr) {
            const today = new Date();
            dateStr = today.toISOString().split('T')[0];
          }

          date = new Date(dateStr);
          month = date.getMonth() + 1;
          day = date.getDate();

          // イベントの位置とサイズから時間を推測（フォールバック）
          const top = parseFloat(eventElement.style.top) || 0;
          const height = parseFloat(eventElement.style.height) || 60;

          // Googleカレンダーの1時間あたりの高さを取得
          const hourHeight = 42; // デフォルト値
          const startMinutes = (top / hourHeight) * 60;
          const durationMinutes = (height / hourHeight) * 60;

          startHour = Math.floor(startMinutes / 60);
          startMin = Math.floor(startMinutes % 60);
          endHour = Math.floor((startMinutes + durationMinutes) / 60);
          endMin = Math.floor((startMinutes + durationMinutes) % 60);
        }
      }

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
        element: eventElement
      };
    } catch (error) {
      console.error('イベント情報の抽出に失敗:', error);
      return null;
    }
  }

  // フォーマットされた日時文字列を生成
  function formatEventTime(event) {
    // 時刻フォーマット: "18時00分" or "18時" (分が0の場合)
    const formatTime = (hour, min) => {
      if (min === 0) {
        return `${hour}時`;
      }
      return `${hour}時${String(min).padStart(2, '0')}分`;
    };

    const startTime = formatTime(event.startHour, event.startMin);
    const endTime = formatTime(event.endHour, event.endMin);

    return `${event.month}月${event.day}日(${event.weekday}) ${startTime}~${endTime}`;
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

  // 選択されたイベントリストを更新
  function updateEventList() {
    const eventListContainer = document.getElementById('gcal-selected-events');
    const copyBtn = document.getElementById('gcal-copy-btn');
    const clearBtn = document.getElementById('gcal-clear-btn');

    if (selectedEvents.length === 0) {
      eventListContainer.innerHTML = '<p class="gcal-empty-message">カレンダー上の予定をクリックして選択してください</p>';
      copyBtn.disabled = true;
      clearBtn.disabled = true;
    } else {
      // イベントを日時順にソート
      selectedEvents.sort((a, b) => a.date - b.date);

      eventListContainer.innerHTML = selectedEvents.map((event, index) => `
        <div class="gcal-event-item">
          <span class="gcal-event-number">${index + 1}.</span>
          <span class="gcal-event-text">${formatEventTime(event)}</span>
          <button class="gcal-remove-btn" data-event-id="${event.id}">×</button>
        </div>
      `).join('');

      // 削除ボタンのイベントリスナー
      eventListContainer.querySelectorAll('.gcal-remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const eventId = btn.getAttribute('data-event-id');
          removeEventById(eventId);
        });
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

  // 選択されたイベントをコピー
  function copySelectedEvents() {
    if (selectedEvents.length === 0) return;

    const text = selectedEvents.map(event => formatEventTime(event)).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      // コピー成功のフィードバック
      const copyBtn = document.getElementById('gcal-copy-btn');
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✓ コピーしました！';
      copyBtn.style.backgroundColor = '#34A853';

      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.backgroundColor = '';
      }, 2000);
    }).catch(err => {
      console.error('コピーに失敗:', err);
      alert('クリップボードへのコピーに失敗しました');
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

  // カレンダーイベント要素にクリックリスナーを追加
  function attachEventListeners() {
    // MutationObserverでDOMの変更を監視
    const observer = new MutationObserver((mutations) => {
      // イベント要素を検出
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
    });

    // カレンダーのメインコンテナを監視
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // 初期化
  function init() {
    // Googleカレンダーのページが完全に読み込まれるまで待機
    const checkInterval = setInterval(() => {
      const calendarContainer = document.querySelector('[role="main"]');

      if (calendarContainer) {
        clearInterval(checkInterval);

        // UIパネルを作成
        createUIPanel();

        // イベントリスナーをアタッチ
        attachEventListeners();

        console.log('Google Calendar Event Selector が初期化されました');
        console.log('Ctrl/Cmd + クリック で予定を選択できます');
      }
    }, 500);

    // 10秒後にタイムアウト
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 10000);
  }

  // ページ読み込み完了後に初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
