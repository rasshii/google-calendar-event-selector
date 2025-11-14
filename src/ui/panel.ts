/**
 * パネルUI管理
 */

import type { TimeSlot } from '@/types';
import { CSS_CLASSES, SELECTORS, CONFIG } from '@/config';
import { getMessage } from '@/utils/locale';
import { formatSlot } from '@/utils/formatter';
import { SlotManager } from '@/core/slot-manager';
import { showErrorNotification } from './notification';

/**
 * UIパネルを作成
 */
export function createUIPanel(panelDragState: { isDragging: boolean; offsetX: number; offsetY: number }): HTMLElement {
  const panel = document.createElement('div');
  panel.id = SELECTORS.PANEL.substring(1);

  const header = createPanelHeader();
  panel.appendChild(header);

  const content = createPanelContent();
  panel.appendChild(content);

  document.body.appendChild(panel);

  setupPanelListeners(panel, panelDragState);

  return panel;
}

/**
 * パネルヘッダーを作成
 */
function createPanelHeader(): HTMLElement {
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
 */
function createPanelContent(): HTMLElement {
  const content = document.createElement('div');
  content.className = CSS_CLASSES.CONTENT;

  const eventList = createEventListArea();
  content.appendChild(eventList);

  const actions = createActionButtons();
  content.appendChild(actions);

  return content;
}

/**
 * イベントリストエリアを作成
 */
function createEventListArea(): HTMLElement {
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
 */
function createActionButtons(): HTMLElement {
  const actions = document.createElement('div');
  actions.className = CSS_CLASSES.ACTIONS;

  const copyBtn = document.createElement('button');
  copyBtn.id = SELECTORS.COPY_BTN.substring(1);
  copyBtn.className = `${CSS_CLASSES.BTN} ${CSS_CLASSES.BTN_PRIMARY}`;
  copyBtn.disabled = true;
  copyBtn.textContent = getMessage('copyButton');
  actions.appendChild(copyBtn);

  const clearBtn = document.createElement('button');
  clearBtn.id = SELECTORS.CLEAR_BTN.substring(1);
  clearBtn.className = `${CSS_CLASSES.BTN} ${CSS_CLASSES.BTN_SECONDARY}`;
  clearBtn.disabled = true;
  clearBtn.textContent = getMessage('clearButton');
  actions.appendChild(clearBtn);

  return actions;
}

/**
 * パネルのイベントリスナーを設定
 */
function setupPanelListeners(
  panel: HTMLElement,
  panelDragState: { isDragging: boolean; offsetX: number; offsetY: number }
): void {
  const header = panel.querySelector(SELECTORS.PANEL_HEADER) as HTMLElement;
  const minimizeBtn = panel.querySelector(SELECTORS.MINIMIZE_BTN) as HTMLElement;
  const content = panel.querySelector(SELECTORS.PANEL_CONTENT) as HTMLElement;
  const copyBtn = panel.querySelector(SELECTORS.COPY_BTN) as HTMLElement;
  const clearBtn = panel.querySelector(SELECTORS.CLEAR_BTN) as HTMLElement;

  // 最小化/最大化
  minimizeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isMinimized = content.style.display === 'none';
    content.style.display = isMinimized ? 'block' : 'none';
    minimizeBtn.textContent = isMinimized ? '−' : '+';
  });

  // ドラッグ機能
  setupPanelDragFunctionality(panel, header, minimizeBtn, panelDragState);

  // コピー・クリアボタン（グローバルハンドラーで設定）
  copyBtn.addEventListener('click', copySelectedSlots);
  clearBtn.addEventListener('click', () => {
    const slotManager = (window as any).__slotManager as SlotManager;
    if (slotManager) {
      slotManager.clearAll();
    }
  });
}

/**
 * パネルのドラッグ機能を設定
 */
function setupPanelDragFunctionality(
  panel: HTMLElement,
  header: HTMLElement,
  excludeElement: HTMLElement,
  panelDragState: { isDragging: boolean; offsetX: number; offsetY: number }
): void {
  header.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.target === excludeElement) return;

    panelDragState.isDragging = true;
    const rect = panel.getBoundingClientRect();
    panelDragState.offsetX = e.clientX - rect.left;
    panelDragState.offsetY = e.clientY - rect.top;
    header.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!panelDragState.isDragging) return;

    const x = e.clientX - panelDragState.offsetX;
    const y = e.clientY - panelDragState.offsetY;

    const maxX = window.innerWidth - panel.offsetWidth;
    const maxY = window.innerHeight - panel.offsetHeight;

    panel.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
    panel.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
    panel.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => {
    if (panelDragState.isDragging) {
      panelDragState.isDragging = false;
      header.style.cursor = 'move';
    }
  });
}

/**
 * 選択されたスロットリストUIを更新
 */
export function updateSlotList(slots: TimeSlot[], slotManager: SlotManager): void {
  const eventListContainer = document.querySelector(SELECTORS.EVENT_LIST);
  const copyBtn = document.querySelector(SELECTORS.COPY_BTN) as HTMLButtonElement;
  const clearBtn = document.querySelector(SELECTORS.CLEAR_BTN) as HTMLButtonElement;

  if (!eventListContainer || !copyBtn || !clearBtn) {
    console.error('UI要素が見つかりません');
    return;
  }

  // 既存の内容をクリア
  while (eventListContainer.firstChild) {
    eventListContainer.removeChild(eventListContainer.firstChild);
  }

  if (slots.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = CSS_CLASSES.EMPTY_MESSAGE;
    emptyMessage.textContent = getMessage('emptyMessage');
    eventListContainer.appendChild(emptyMessage);

    copyBtn.disabled = true;
    clearBtn.disabled = true;
  } else {
    slots.forEach((slot, index) => {
      const slotItem = createSlotItem(slot, index + 1, slotManager);
      eventListContainer.appendChild(slotItem);
    });

    copyBtn.disabled = false;
    clearBtn.disabled = false;
  }
}

/**
 * スロットアイテムのDOM要素を作成
 */
function createSlotItem(slot: TimeSlot, index: number, slotManager: SlotManager): HTMLElement {
  const slotItem = document.createElement('div');
  slotItem.className = CSS_CLASSES.EVENT_ITEM;

  const numberSpan = document.createElement('span');
  numberSpan.className = CSS_CLASSES.EVENT_NUMBER;
  numberSpan.textContent = `${index}.`;
  slotItem.appendChild(numberSpan);

  const textSpan = document.createElement('span');
  textSpan.className = CSS_CLASSES.EVENT_TEXT;
  textSpan.textContent = formatSlot(slot);
  slotItem.appendChild(textSpan);

  const removeBtn = document.createElement('button');
  removeBtn.className = CSS_CLASSES.REMOVE_BTN;
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    slotManager.removeSlot(slot);
  });
  slotItem.appendChild(removeBtn);

  return slotItem;
}

/**
 * 選択されたスロットをクリップボードにコピー
 */
function copySelectedSlots(): void {
  const slotManager = (window as any).__slotManager as SlotManager;
  if (!slotManager) return;

  const slots = slotManager.getSlots();
  if (slots.length === 0) return;

  const text = slots.map(slot => formatSlot(slot)).join('\n');

  navigator.clipboard.writeText(text).then(() => {
    const copyBtn = document.querySelector(SELECTORS.COPY_BTN) as HTMLButtonElement;
    if (!copyBtn) return;

    const originalText = copyBtn.textContent || '';
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
