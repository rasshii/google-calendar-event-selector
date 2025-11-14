/**
 * オーバーレイ管理
 *
 * 選択範囲の視覚的フィードバックとグリッドオーバーレイ（Approach A）を管理します。
 * デバッグログは CONFIG.DEBUG_MODE によって制御されます。
 */

import type { TimeSlot, GridColumn } from '@/types';
import { CSS_CLASSES, COLORS, Z_INDEX, CONFIG } from '@/config';
import { GridAnalyzer } from '@/core/grid-analyzer';
import { Debug } from '@/utils/debug';

/**
 * 一時的な選択オーバーレイを作成・更新
 *
 * 【改善されたロジック】
 * - 座標の妥当性を厳格にチェック
 * - グリッド境界内に収まるように制限
 * - より詳細なデバッグ情報
 */
export function updateTempOverlay(
  column: GridColumn,
  startY: number,
  endY: number,
  existingOverlay: HTMLElement | null
): HTMLElement {
  try {
    // パラメータの厳格な検証
    if (!column || !column.element) {
      throw new Error('Invalid column parameter');
    }

    if (!Number.isFinite(startY) || !Number.isFinite(endY)) {
      throw new Error(`Invalid Y coordinates: startY=${startY}, endY=${endY}`);
    }

    // グリッド要素の境界を取得
    const rect = column.element.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
      throw new Error(`Grid element has zero dimensions: width=${rect.width}, height=${rect.height}`);
    }

    // オーバーレイの上端と下端を計算（viewport座標）
    const top = Math.min(startY, endY);
    const bottom = Math.max(startY, endY);
    const height = bottom - top;

    // 高さの妥当性チェック
    if (height < 0) {
      throw new Error(`Negative height calculated: ${height}px`);
    }

    if (height === 0) {
      // 高さ0の場合は最小限の高さを設定（視覚的フィードバックのため）
      Debug.warn('OVERLAY', '⚠️  Overlay height is 0, setting minimum height');
    }

    // グリッド要素の境界内に収まるように制限
    const relativeTop = Math.max(0, top - rect.top);
    const maxHeight = rect.height - relativeTop;
    const clampedHeight = Math.min(height, maxHeight);

    if (clampedHeight !== height) {
      Debug.warn('OVERLAY', `⚠️  Overlay height clamped: ${height}px -> ${clampedHeight}px`);
    }

    // オーバーレイ要素の取得または作成
    let overlay = existingOverlay;

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = CSS_CLASSES.TEMP_OVERLAY;
      overlay.style.cssText = `
        position: absolute;
        background: ${COLORS.OVERLAY.TEMP_BG};
        border: 2px solid ${COLORS.OVERLAY.BORDER};
        pointer-events: none;
        z-index: ${Z_INDEX.TEMP_OVERLAY};
        border-radius: 4px;
      `;
      column.element.appendChild(overlay);
    }

    // オーバーレイの位置とサイズを更新
    overlay.style.left = '0';
    overlay.style.top = `${relativeTop}px`;
    overlay.style.width = '100%';
    overlay.style.height = `${clampedHeight}px`;

    return overlay;
  } catch (error) {
    Debug.error('OVERLAY', '❌ Error updating temp overlay:', error, {
      column: column ? {
        dateKey: column.dateKey,
        elementHeight: column.element?.offsetHeight,
        elementTag: column.element?.tagName
      } : null,
      startY,
      endY
    });

    // エラーの場合、既存のオーバーレイを返すか、ダミー要素を返す
    if (existingOverlay) {
      return existingOverlay;
    }

    // フォールバック: 最小限のオーバーレイを作成
    const fallbackOverlay = document.createElement('div');
    fallbackOverlay.style.display = 'none';
    return fallbackOverlay;
  }
}

/**
 * 一時的なオーバーレイを削除
 */
export function removeTempOverlay(overlay: HTMLElement | null): void {
  if (overlay) {
    overlay.remove();
  }
}

/**
 * 確定した選択範囲のオーバーレイを作成
 *
 * 【改善されたロジック】
 * - hourHeightの妥当性を厳格にチェック
 * - グリッド要素の高さを検証
 * - デバッグ情報を充実させる
 */
export function createSelectionOverlay(
  slot: TimeSlot,
  column: GridColumn,
  gridAnalyzer: GridAnalyzer
): HTMLElement {
  try {
    // パラメータの厳格な検証
    if (!slot || !column || !column.element || !gridAnalyzer) {
      throw new Error('Invalid parameters for createSelectionOverlay');
    }

    // 開始・終了時刻の妥当性チェック
    const startMinutes = slot.startHour * 60 + slot.startMin;
    const endMinutes = slot.endHour * 60 + slot.endMin;

    if (startMinutes < 0 || endMinutes < 0 || startMinutes >= endMinutes) {
      throw new Error(`Invalid time slot range: ${startMinutes} to ${endMinutes} minutes`);
    }

    // hourHeightの取得と検証
    const hourHeight = gridAnalyzer.getHourHeight();

    if (hourHeight <= 0 || !Number.isFinite(hourHeight)) {
      throw new Error(`Invalid hour height: ${hourHeight}px`);
    }

    // hourHeightの妥当性を追加チェック
    if (hourHeight < CONFIG.MIN_HOUR_HEIGHT_PX || hourHeight > CONFIG.MAX_HOUR_HEIGHT_PX) {
      Debug.warn('OVERLAY', `⚠️  Hour height ${hourHeight}px is outside expected range (${CONFIG.MIN_HOUR_HEIGHT_PX}-${CONFIG.MAX_HOUR_HEIGHT_PX}px)`);
    }

    // グリッド要素の高さを検証
    const gridHeight = column.element.offsetHeight;
    const expectedMinHeight = CONFIG.HOURS_IN_DAY * CONFIG.MIN_HOUR_HEIGHT_PX;

    if (gridHeight < expectedMinHeight) {
      Debug.warn('OVERLAY', `⚠️  Grid element height ${gridHeight}px seems too small (expected >= ${expectedMinHeight}px)`);
      Debug.warn('OVERLAY', '    This may indicate that the wrong element was selected as the time grid');
    }

    // オーバーレイの位置とサイズを計算
    const top = (startMinutes / 60) * hourHeight;
    const height = ((endMinutes - startMinutes) / 60) * hourHeight;

    // 計算結果の検証
    if (!Number.isFinite(top) || !Number.isFinite(height)) {
      throw new Error(`Invalid overlay dimensions: top=${top}, height=${height}`);
    }

    if (height < 0) {
      throw new Error(`Negative overlay height: ${height}px`);
    }

    if (top < 0 || top + height > gridHeight) {
      Debug.warn('OVERLAY', `⚠️  Overlay extends beyond grid bounds: top=${top}, height=${height}, gridHeight=${gridHeight}`);
    }

    // デバッグ情報を出力
    Debug.log('OVERLAY', '📍 Creating selection overlay:', {
      time: `${slot.startHour}:${String(slot.startMin).padStart(2, '0')} - ${slot.endHour}:${String(slot.endMin).padStart(2, '0')}`,
      hourHeight: `${hourHeight}px`,
      gridHeight: `${gridHeight}px`,
      overlay: { top: `${top}px`, height: `${height}px` }
    });

    // オーバーレイ要素を作成
    const overlay = document.createElement('div');
    overlay.className = CSS_CLASSES.SELECTION_OVERLAY;
    overlay.style.cssText = `
      position: absolute;
      left: 0;
      top: ${top}px;
      width: 100%;
      height: ${height}px;
      background: ${COLORS.OVERLAY.SELECTION_BG};
      border: 2px solid ${COLORS.OVERLAY.BORDER};
      pointer-events: none;
      z-index: ${Z_INDEX.SELECTION_OVERLAY};
      border-radius: 4px;
      box-sizing: border-box;
    `;

    column.element.appendChild(overlay);
    return overlay;
  } catch (error) {
    Debug.error('OVERLAY', '❌ Error creating selection overlay:', error, {
      slot,
      column: column ? {
        dateKey: column.dateKey,
        elementHeight: column.element?.offsetHeight,
        elementTag: column.element?.tagName
      } : null
    });

    // エラー時はダミー要素を返す（画面に表示されないがクラッシュは防ぐ）
    const fallbackOverlay = document.createElement('div');
    fallbackOverlay.style.display = 'none';
    return fallbackOverlay;
  }
}

/**
 * グリッド全体を覆うインタラクティブオーバーレイを作成（Approach A - Refactored）
 *
 * 【重要な変更】position: fixed を使用することで、親要素の変更に影響されない
 * 堅牢なオーバーレイを実現します。
 *
 * このオーバーレイは選択モードON時にグリッド領域全体を物理的にカバーし、
 * 全てのマウスイベントをキャプチャします。これによりGoogle Calendarと
 * Extensionのイベント競合を完全に回避します。
 *
 * @param gridAnalyzer - グリッド解析インスタンス
 * @returns 作成されたオーバーレイ要素
 */
export function createGridOverlay(gridAnalyzer: GridAnalyzer): HTMLElement {
  Debug.log('OVERLAY', '🎨 ========== Creating Grid Overlay ==========');

  const overlay = document.createElement('div');
  overlay.className = CSS_CLASSES.GRID_OVERLAY;
  overlay.setAttribute('data-gcal-overlay', 'true');
  Debug.log('OVERLAY', '  ✅ Created overlay element with class:', CSS_CLASSES.GRID_OVERLAY);

  // グリッド列を取得
  const columns = gridAnalyzer.getColumns();
  Debug.log('OVERLAY', `  📊 Retrieved ${columns.length} grid columns`);

  if (columns.length === 0) {
    Debug.error('OVERLAY', '  ❌ No grid columns found for overlay creation');
    overlay.style.display = 'none';
    document.body.appendChild(overlay);
    Debug.warn('OVERLAY', '  ⚠️  Added hidden overlay to body as fallback');
    return overlay;
  }

  // グリッド領域全体の境界を計算
  const firstColumn = columns[0];
  const lastColumn = columns[columns.length - 1];

  const gridBounds = {
    top: firstColumn.top,
    left: firstColumn.left,
    right: lastColumn.right,
    width: lastColumn.right - firstColumn.left,
    height: firstColumn.element.offsetHeight
  };

  Debug.log('OVERLAY', '  📐 Calculated grid bounds:', {
    top: `${gridBounds.top}px`,
    left: `${gridBounds.left}px`,
    right: `${gridBounds.right}px`,
    width: `${gridBounds.width}px`,
    height: `${gridBounds.height}px`,
    dateRange: `${firstColumn.dateKey} to ${lastColumn.dateKey}`
  });

  // position: fixed を使用して viewport 座標で配置
  // これにより親要素の変更に影響されない
  overlay.style.cssText = `
    position: fixed;
    top: ${gridBounds.top}px;
    left: ${gridBounds.left}px;
    width: ${gridBounds.width}px;
    height: ${gridBounds.height}px;
    background: transparent;
    pointer-events: none;
    z-index: ${Z_INDEX.CALENDAR_OVERLAY_ACTIVE};
    opacity: 0;
    box-sizing: border-box;
  `;

  Debug.log('OVERLAY', '  🎨 Applied styles:', {
    position: 'fixed',
    zIndex: Z_INDEX.CALENDAR_OVERLAY_ACTIVE,
    pointerEvents: 'none (initially)',
    opacity: '0 (initially hidden)'
  });

  // bodyに直接追加（親要素に依存しない）
  document.body.appendChild(overlay);
  Debug.log('OVERLAY', '  ✅ Appended overlay to document.body');

  // 追加後の検証
  const addedOverlay = document.querySelector(`.${CSS_CLASSES.GRID_OVERLAY}`);
  if (addedOverlay) {
    const rect = addedOverlay.getBoundingClientRect();
    Debug.log('OVERLAY', '  ✅ Overlay verified in DOM:', {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left
    });
  } else {
    Debug.error('OVERLAY', '  ❌ Overlay not found in DOM after appending!');
  }

  Debug.log('OVERLAY', '🎨 ========================================');
  return overlay;
}

/**
 * グリッドオーバーレイを表示（選択モードON）
 *
 * オーバーレイを表示し、pointer-eventsを有効化してイベントをキャプチャします。
 * 同時にGoogle Calendarのグリッド要素をpointer-events: noneにして無効化します。
 *
 * position: fixed を使用しているため、DOM削除の心配はありません。
 *
 * @param overlay - グリッドオーバーレイ要素
 * @param gridAnalyzer - グリッド解析インスタンス
 */
export function showGridOverlay(overlay: HTMLElement, gridAnalyzer: GridAnalyzer): void {
  Debug.log('OVERLAY', '🟢 ========== Showing Grid Overlay ==========');

  // 現在の状態を記録
  Debug.log('OVERLAY', '  📊 Before change:', {
    opacity: overlay.style.opacity,
    pointerEvents: overlay.style.pointerEvents,
    background: overlay.style.background,
    display: overlay.style.display,
    zIndex: overlay.style.zIndex
  });

  // オーバーレイを表示
  overlay.style.opacity = '1';
  overlay.style.pointerEvents = 'auto';
  overlay.style.background = COLORS.OVERLAY.CALENDAR_BG;
  overlay.style.cursor = 'crosshair';

  Debug.log('OVERLAY', '  ✅ Overlay styles updated:', {
    opacity: '1',
    pointerEvents: 'auto',
    background: COLORS.OVERLAY.CALENDAR_BG,
    cursor: 'crosshair'
  });

  // 実際に適用されたスタイルを検証
  const computedStyle = window.getComputedStyle(overlay);
  Debug.log('OVERLAY', '  🔍 Computed styles:', {
    opacity: computedStyle.opacity,
    pointerEvents: computedStyle.pointerEvents,
    display: computedStyle.display,
    width: computedStyle.width,
    height: computedStyle.height,
    zIndex: computedStyle.zIndex
  });

  // Google Calendarのグリッド要素を無効化
  const columns = gridAnalyzer.getColumns();
  Debug.log('OVERLAY', `  🔒 Disabling ${columns.length} Google Calendar grid columns...`);

  columns.forEach((column, index) => {
    const prevPointerEvents = column.element.style.pointerEvents;
    column.element.style.pointerEvents = 'none';
    Debug.log('OVERLAY', `    ├─ Column ${index + 1} (${column.dateKey}): "${prevPointerEvents}" → "none"`);
  });

  Debug.log('OVERLAY', '  ✅ Selection mode ON: overlay visible, grid columns disabled');
  Debug.log('OVERLAY', '🟢 ==========================================');
}

/**
 * グリッドオーバーレイを非表示（選択モードOFF）
 *
 * オーバーレイを非表示にし、Google Calendarのグリッド要素を再度有効化します。
 *
 * @param overlay - グリッドオーバーレイ要素
 * @param gridAnalyzer - グリッド解析インスタンス
 */
export function hideGridOverlay(overlay: HTMLElement, gridAnalyzer: GridAnalyzer): void {
  Debug.log('OVERLAY', '🔴 ========== Hiding Grid Overlay ==========');

  // 現在の状態を記録
  Debug.log('OVERLAY', '  📊 Before change:', {
    opacity: overlay.style.opacity,
    pointerEvents: overlay.style.pointerEvents,
    background: overlay.style.background
  });

  // オーバーレイを非表示
  overlay.style.opacity = '0';
  overlay.style.pointerEvents = 'none';
  overlay.style.background = 'transparent';
  overlay.style.cursor = '';

  Debug.log('OVERLAY', '  ✅ Overlay styles updated:', {
    opacity: '0',
    pointerEvents: 'none',
    background: 'transparent',
    cursor: '(removed)'
  });

  // Google Calendarのグリッド要素を再度有効化
  const columns = gridAnalyzer.getColumns();
  Debug.log('OVERLAY', `  🔓 Re-enabling ${columns.length} Google Calendar grid columns...`);

  columns.forEach((column, index) => {
    const prevPointerEvents = column.element.style.pointerEvents;
    column.element.style.pointerEvents = '';
    Debug.log('OVERLAY', `    ├─ Column ${index + 1} (${column.dateKey}): "${prevPointerEvents}" → "" (default)`);
  });

  Debug.log('OVERLAY', '  ✅ Selection mode OFF: overlay hidden, grid columns re-enabled');
  Debug.log('OVERLAY', '🔴 ==========================================');
}
