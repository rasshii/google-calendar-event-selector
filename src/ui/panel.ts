/**
 * パネルUI管理
 *
 * 選択された時間スロットを表示し、ユーザー操作を処理するUIパネルを管理します。
 */

import type { TimeSlot, PanelDragState } from '@/types';
import { CSS_CLASSES, SELECTORS, CONFIG } from '@/config';
import { getMessage } from '@/utils/locale';
import { formatSlot } from '@/utils/formatter';
import { SlotManager } from '@/core/slot-manager';
import { SelectionModeManager } from '@/core/selection-mode-manager';
import { showErrorNotification } from './notification';
import { Debug } from '@/utils/debug';

/**
 * パネルのクリーンアップ関数型
 */
export type PanelCleanup = () => void;

/**
 * UIパネルを作成
 *
 * @returns パネル要素とクリーンアップ関数のタプル
 */
export function createUIPanel(
  panelDragState: PanelDragState,
  selectionModeManager: SelectionModeManager
): [HTMLElement, PanelCleanup] {
  const panel = document.createElement('div');
  panel.id = SELECTORS.PANEL.substring(1);
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'gcal-selector-title');
  panel.setAttribute('aria-modal', 'false');

  const header = createPanelHeader();
  panel.appendChild(header);

  const content = createPanelContent();
  panel.appendChild(content);

  document.body.appendChild(panel);

  const cleanup = setupPanelListeners(panel, panelDragState, selectionModeManager);

  return [panel, cleanup];
}

/**
 * パネルヘッダーを作成
 */
function createPanelHeader(): HTMLElement {
  const header = document.createElement('div');
  header.className = CSS_CLASSES.HEADER;
  header.setAttribute('role', 'banner');

  const title = document.createElement('h3');
  title.textContent = getMessage('panelTitle');
  title.id = 'gcal-selector-title';
  header.appendChild(title);

  const minimizeBtn = document.createElement('button');
  minimizeBtn.id = SELECTORS.MINIMIZE_BTN.substring(1);
  minimizeBtn.className = CSS_CLASSES.BTN_ICON;
  minimizeBtn.textContent = '−';
  minimizeBtn.setAttribute('aria-label', 'Minimize panel');
  minimizeBtn.setAttribute('aria-expanded', 'true');
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
  eventList.setAttribute('role', 'list');
  eventList.setAttribute('aria-live', 'polite');
  eventList.setAttribute('aria-label', 'Selected time slots');

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

  // 選択モードトグルボタン
  const selectionModeBtn = document.createElement('button');
  selectionModeBtn.id = SELECTORS.SELECTION_MODE_BTN.substring(1);
  selectionModeBtn.className = `${CSS_CLASSES.BTN} ${CSS_CLASSES.SELECTION_MODE_BTN}`;
  selectionModeBtn.textContent = getMessage('selectionModeOff');
  selectionModeBtn.style.width = '100%';
  selectionModeBtn.style.marginBottom = `${CONFIG.PANEL_BUTTON_MARGIN_BOTTOM}px`;
  selectionModeBtn.setAttribute('aria-label', 'Toggle selection mode');
  selectionModeBtn.setAttribute('aria-pressed', 'false');
  actions.appendChild(selectionModeBtn);

  // ボタングループコンテナ
  const buttonGroup = document.createElement('div');
  buttonGroup.style.display = 'flex';
  buttonGroup.style.gap = `${CONFIG.PANEL_DEFAULT_GAP}px`;
  buttonGroup.setAttribute('role', 'group');
  buttonGroup.setAttribute('aria-label', 'Slot actions');

  const copyBtn = document.createElement('button');
  copyBtn.id = SELECTORS.COPY_BTN.substring(1);
  copyBtn.className = `${CSS_CLASSES.BTN} ${CSS_CLASSES.BTN_PRIMARY}`;
  copyBtn.disabled = true;
  copyBtn.textContent = getMessage('copyButton');
  copyBtn.setAttribute('aria-label', 'Copy selected time slots to clipboard');
  buttonGroup.appendChild(copyBtn);

  const clearBtn = document.createElement('button');
  clearBtn.id = SELECTORS.CLEAR_BTN.substring(1);
  clearBtn.className = `${CSS_CLASSES.BTN} ${CSS_CLASSES.BTN_SECONDARY}`;
  clearBtn.disabled = true;
  clearBtn.textContent = getMessage('clearButton');
  clearBtn.setAttribute('aria-label', 'Clear all selected time slots');
  buttonGroup.appendChild(clearBtn);

  actions.appendChild(buttonGroup);

  return actions;
}

/**
 * パネルのイベントリスナーを設定
 *
 * @returns クリーンアップ関数
 */
function setupPanelListeners(
  panel: HTMLElement,
  panelDragState: PanelDragState,
  selectionModeManager: SelectionModeManager
): PanelCleanup {
  const header = panel.querySelector(SELECTORS.PANEL_HEADER) as HTMLElement;
  const minimizeBtn = panel.querySelector(SELECTORS.MINIMIZE_BTN) as HTMLElement;
  const content = panel.querySelector(SELECTORS.PANEL_CONTENT) as HTMLElement;
  const selectionModeBtn = panel.querySelector(SELECTORS.SELECTION_MODE_BTN) as HTMLElement;
  const copyBtn = panel.querySelector(SELECTORS.COPY_BTN) as HTMLElement;
  const clearBtn = panel.querySelector(SELECTORS.CLEAR_BTN) as HTMLElement;

  // 最小化/最大化
  const handleMinimize = (e: Event): void => {
    e.stopPropagation();
    const isMinimized = content.style.display === 'none';
    content.style.display = isMinimized ? 'block' : 'none';
    minimizeBtn.textContent = isMinimized ? '−' : '+';
    minimizeBtn.setAttribute('aria-expanded', isMinimized ? 'true' : 'false');
    minimizeBtn.setAttribute('aria-label', isMinimized ? 'Minimize panel' : 'Expand panel');
  };
  minimizeBtn.addEventListener('click', handleMinimize);

  // ドラッグ機能
  const dragCleanup = setupPanelDragFunctionality(panel, header, minimizeBtn, panelDragState);

  // 選択モードトグル
  const modeCleanup = setupSelectionModeButton(selectionModeBtn, selectionModeManager);

  // コピー・クリアボタン
  const handleClear = (): void => {
    const slotManager = window.__slotManager;
    if (slotManager) {
      slotManager.clearAll();
    }
  };
  copyBtn.addEventListener('click', copySelectedSlots);
  clearBtn.addEventListener('click', handleClear);

  // クリーンアップ関数を返す
  return () => {
    minimizeBtn.removeEventListener('click', handleMinimize);
    copyBtn.removeEventListener('click', copySelectedSlots);
    clearBtn.removeEventListener('click', handleClear);
    dragCleanup();
    modeCleanup();
  };
}

/**
 * パネルのドラッグ機能を設定
 *
 * @returns クリーンアップ関数
 */
function setupPanelDragFunctionality(
  panel: HTMLElement,
  header: HTMLElement,
  excludeElement: HTMLElement,
  panelDragState: PanelDragState
): () => void {
  const handleMouseDown = (e: MouseEvent): void => {
    if (e.target === excludeElement) return;

    panelDragState.isDragging = true;
    const rect = panel.getBoundingClientRect();
    panelDragState.offsetX = e.clientX - rect.left;
    panelDragState.offsetY = e.clientY - rect.top;
    header.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: MouseEvent): void => {
    if (!panelDragState.isDragging) return;

    const x = e.clientX - panelDragState.offsetX;
    const y = e.clientY - panelDragState.offsetY;

    const maxX = window.innerWidth - panel.offsetWidth;
    const maxY = window.innerHeight - panel.offsetHeight;

    panel.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
    panel.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
    panel.style.right = 'auto';
  };

  const handleMouseUp = (): void => {
    if (panelDragState.isDragging) {
      panelDragState.isDragging = false;
      header.style.cursor = 'move';
    }
  };

  header.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);

  // クリーンアップ関数を返す
  return () => {
    header.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
}

/**
 * 選択モードボタンの動作を設定
 *
 * @returns クリーンアップ関数
 */
function setupSelectionModeButton(
  button: HTMLElement,
  selectionModeManager: SelectionModeManager
): () => void {
  const handleClick = (): void => {
    selectionModeManager.toggle();
  };

  const handleModeChange = (isActive: boolean): void => {
    if (isActive) {
      button.textContent = getMessage('selectionModeOn');
      button.classList.add(CSS_CLASSES.SELECTION_MODE_ACTIVE);
      button.setAttribute('aria-pressed', 'true');
    } else {
      button.textContent = getMessage('selectionModeOff');
      button.classList.remove(CSS_CLASSES.SELECTION_MODE_ACTIVE);
      button.setAttribute('aria-pressed', 'false');
    }
  };

  button.addEventListener('click', handleClick);
  selectionModeManager.addListener(handleModeChange);

  // クリーンアップ関数を返す
  return () => {
    button.removeEventListener('click', handleClick);
    selectionModeManager.removeListener(handleModeChange);
  };
}

/**
 * 選択されたスロットリストUIを更新
 *
 * DOM要素の差分更新を行うことで、不要な再描画を削減します。
 */
export function updateSlotList(slots: TimeSlot[], slotManager: SlotManager): void {
  const eventListContainer = document.querySelector(SELECTORS.EVENT_LIST);
  const copyBtn = document.querySelector(SELECTORS.COPY_BTN) as HTMLButtonElement;
  const clearBtn = document.querySelector(SELECTORS.CLEAR_BTN) as HTMLButtonElement;

  if (!eventListContainer || !copyBtn || !clearBtn) {
    Debug.error('APP', 'UI要素が見つかりません:', {
      eventListContainer: !!eventListContainer,
      copyBtn: !!copyBtn,
      clearBtn: !!clearBtn
    });
    return;
  }

  // ボタンの状態更新
  const hasSlots = slots.length > 0;
  copyBtn.disabled = !hasSlots;
  clearBtn.disabled = !hasSlots;

  // スロットがない場合
  if (!hasSlots) {
    const existingMessage = eventListContainer.querySelector(`.${CSS_CLASSES.EMPTY_MESSAGE}`);
    if (!existingMessage) {
      // 既存の内容をクリア
      while (eventListContainer.firstChild) {
        eventListContainer.removeChild(eventListContainer.firstChild);
      }

      const emptyMessage = document.createElement('p');
      emptyMessage.className = CSS_CLASSES.EMPTY_MESSAGE;
      emptyMessage.textContent = getMessage('emptyMessage');
      eventListContainer.appendChild(emptyMessage);
    }
    return;
  }

  // 空メッセージが存在する場合は削除
  const existingMessage = eventListContainer.querySelector(`.${CSS_CLASSES.EMPTY_MESSAGE}`);
  if (existingMessage) {
    existingMessage.remove();
  }

  // 既存のスロットアイテムを取得
  const existingItems = Array.from(
    eventListContainer.querySelectorAll<HTMLElement>(`.${CSS_CLASSES.EVENT_ITEM}`)
  );

  // スロット数が変わった場合は全再構築
  if (existingItems.length !== slots.length) {
    while (eventListContainer.firstChild) {
      eventListContainer.removeChild(eventListContainer.firstChild);
    }

    slots.forEach((slot, index) => {
      const slotItem = createSlotItem(slot, index + 1, slotManager);
      eventListContainer.appendChild(slotItem);
    });
    return;
  }

  // 各スロットアイテムのテキストを更新（番号とテキストが一致するかチェック）
  slots.forEach((slot, index) => {
    const existingItem = existingItems[index];
    const textSpan = existingItem?.querySelector(`.${CSS_CLASSES.EVENT_TEXT}`);

    if (textSpan) {
      const expectedText = formatSlot(slot);
      if (textSpan.textContent !== expectedText) {
        textSpan.textContent = expectedText;
      }

      // 番号の更新
      const numberSpan = existingItem.querySelector(`.${CSS_CLASSES.EVENT_NUMBER}`);
      if (numberSpan) {
        const expectedNumber = `${index + 1}.`;
        if (numberSpan.textContent !== expectedNumber) {
          numberSpan.textContent = expectedNumber;
        }
      }
    }
  });
}

/**
 * スロットアイテムのDOM要素を作成
 */
function createSlotItem(slot: TimeSlot, index: number, slotManager: SlotManager): HTMLElement {
  const slotItem = document.createElement('div');
  slotItem.className = CSS_CLASSES.EVENT_ITEM;
  slotItem.setAttribute('role', 'listitem');

  const numberSpan = document.createElement('span');
  numberSpan.className = CSS_CLASSES.EVENT_NUMBER;
  numberSpan.textContent = `${index}.`;
  numberSpan.setAttribute('aria-label', `Slot ${index}`);
  slotItem.appendChild(numberSpan);

  const textSpan = document.createElement('span');
  textSpan.className = CSS_CLASSES.EVENT_TEXT;
  textSpan.textContent = formatSlot(slot);
  slotItem.appendChild(textSpan);

  const removeBtn = document.createElement('button');
  removeBtn.className = CSS_CLASSES.REMOVE_BTN;
  removeBtn.textContent = '×';
  removeBtn.setAttribute('aria-label', `Remove time slot ${formatSlot(slot)}`);
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
  const slotManager = window.__slotManager;
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
  }).catch((err: Error) => {
    Debug.error('APP', 'コピーに失敗:', err.message, err.stack);
    showErrorNotification(getMessage('errorCopyFailed'));
  });
}
