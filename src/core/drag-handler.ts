/**
 * ドラッグハンドリング
 */

import type { DragState, TimeSlot } from '@/types';
import { CONFIG } from '@/config';
import { GridAnalyzer } from './grid-analyzer';
import { SlotManager } from './slot-manager';
import { SelectionModeManager } from './selection-mode-manager';
import { updateTempOverlay, removeTempOverlay, createSelectionOverlay } from '@/ui/overlay';
import { isEventTargetInPanel } from '@/utils/dom';

export class DragHandler {
  private dragState: DragState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    dateColumn: null,
    tempOverlay: null,
  };

  private panelDragState = {
    isDragging: false,
    offsetX: 0,
    offsetY: 0,
  };

  constructor(
    private gridAnalyzer: GridAnalyzer,
    private slotManager: SlotManager,
    private selectionModeManager: SelectionModeManager
  ) {}

  /**
   * ドラッグリスナーをアタッチ
   * キャプチャフェーズで登録してGoogle Calendarのハンドラーより先に実行
   */
  attachListeners(): void {
    document.addEventListener('mousedown', this.handleMouseDown, { capture: true });
    document.addEventListener('mousemove', this.handleMouseMove, { capture: true });
    document.addEventListener('mouseup', this.handleMouseUp, { capture: true });
  }

  /**
   * ドラッグリスナーをデタッチ
   */
  detachListeners(): void {
    document.removeEventListener('mousedown', this.handleMouseDown, { capture: true });
    document.removeEventListener('mousemove', this.handleMouseMove, { capture: true });
    document.removeEventListener('mouseup', this.handleMouseUp, { capture: true });
  }

  /**
   * パネルドラッグ状態を取得
   */
  getPanelDragState() {
    return this.panelDragState;
  }

  /**
   * マウスダウンハンドラー
   */
  private handleMouseDown = (e: MouseEvent): void => {
    // 選択モードがOFFの場合は何もしない
    if (!this.selectionModeManager.isSelectionModeActive()) return;

    // パネル内のクリックは無視（ボタン操作を許可）
    if (isEventTargetInPanel(e.target)) return;

    // パネルドラッグ中は無視
    if (this.panelDragState.isDragging) return;

    const column = this.gridAnalyzer.getColumnFromX(e.clientX);
    if (!column) return;

    // Google Calendarのイベントハンドラーを完全にブロック
    e.stopImmediatePropagation();
    e.preventDefault();

    // ドラッグ開始
    this.dragState.isDragging = true;
    this.dragState.startX = e.clientX;
    this.dragState.startY = e.clientY;
    this.dragState.currentX = e.clientX;
    this.dragState.currentY = e.clientY;
    this.dragState.dateColumn = column;
  };

  /**
   * マウスムーブハンドラー
   */
  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.dragState.isDragging || !this.dragState.dateColumn) return;

    this.dragState.currentX = e.clientX;
    this.dragState.currentY = e.clientY;

    // 同じ日付列内でのみドラッグを許可
    const currentColumn = this.gridAnalyzer.getColumnFromX(e.clientX);
    if (!currentColumn || currentColumn.dateKey !== this.dragState.dateColumn.dateKey) {
      this.dragState.currentX = this.dragState.startX;
    }

    // 一時的なオーバーレイを更新
    this.dragState.tempOverlay = updateTempOverlay(
      this.dragState.dateColumn,
      this.dragState.startY,
      this.dragState.currentY,
      this.dragState.tempOverlay
    );

    e.preventDefault();
  };

  /**
   * マウスアップハンドラー
   */
  private handleMouseUp = (e: MouseEvent): void => {
    if (!this.dragState.isDragging || !this.dragState.dateColumn) return;

    this.dragState.isDragging = false;

    // 最小限のドラッグ距離をチェック（誤クリックを防ぐ）
    const deltaY = Math.abs(this.dragState.currentY - this.dragState.startY);
    if (deltaY < CONFIG.MIN_DRAG_DISTANCE_PX) {
      removeTempOverlay(this.dragState.tempOverlay);
      this.dragState.tempOverlay = null;
      return;
    }

    // 時刻を計算
    const startTime = this.gridAnalyzer.getTimeFromY(
      Math.min(this.dragState.startY, this.dragState.currentY),
      this.dragState.dateColumn.element
    );
    const endTime = this.gridAnalyzer.getTimeFromY(
      Math.max(this.dragState.startY, this.dragState.currentY),
      this.dragState.dateColumn.element
    );

    // 選択範囲を作成
    const slot: TimeSlot = {
      date: new Date(this.dragState.dateColumn.date),
      startHour: startTime.hour,
      startMin: startTime.minute,
      endHour: endTime.hour,
      endMin: endTime.minute,
      overlay: null,
      column: this.dragState.dateColumn,
    };

    // 重複チェックして追加
    if (!this.slotManager.isDuplicate(slot)) {
      slot.overlay = createSelectionOverlay(slot, this.dragState.dateColumn, this.gridAnalyzer);
      this.slotManager.addSlot(slot);
    }

    removeTempOverlay(this.dragState.tempOverlay);
    this.dragState.tempOverlay = null;

    e.preventDefault();
  };
}
