/**
 * ドラッグハンドリング
 */

import type { DragState, TimeSlot } from '@/types';
import { CONFIG } from '@/config';
import { GridAnalyzer } from './grid-analyzer';
import { SlotManager } from './slot-manager';
import { updateTempOverlay, removeTempOverlay, createSelectionOverlay } from '@/ui/overlay';

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

  private gridOverlay: HTMLElement | null = null;

  constructor(
    private gridAnalyzer: GridAnalyzer,
    private slotManager: SlotManager
  ) {}

  /**
   * グリッドオーバーレイを設定
   *
   * Approach Aの実装において、グリッドオーバーレイにイベントリスナーを
   * アタッチするために使用します。これにより、選択モードON時のみ
   * オーバーレイがイベントをキャプチャします。
   *
   * @param overlay - グリッドオーバーレイ要素
   */
  setGridOverlay(overlay: HTMLElement): void {
    this.gridOverlay = overlay;
  }

  /**
   * ドラッグリスナーをアタッチ
   *
   * Approach A実装: グリッドオーバーレイにリスナーをアタッチします。
   * オーバーレイは選択モードON時のみpointer-events: autoになるため、
   * 選択モードOFF時はイベントが発火しません。
   */
  attachListeners(): void {
    if (!this.gridOverlay) {
      console.warn('Grid overlay not set. Call setGridOverlay() first.');
      return;
    }

    this.gridOverlay.addEventListener('mousedown', this.handleMouseDown);
    this.gridOverlay.addEventListener('mousemove', this.handleMouseMove);
    this.gridOverlay.addEventListener('mouseup', this.handleMouseUp);
  }

  /**
   * ドラッグリスナーをデタッチ
   */
  detachListeners(): void {
    if (this.gridOverlay) {
      this.gridOverlay.removeEventListener('mousedown', this.handleMouseDown);
      this.gridOverlay.removeEventListener('mousemove', this.handleMouseMove);
      this.gridOverlay.removeEventListener('mouseup', this.handleMouseUp);
    }
  }

  /**
   * パネルドラッグ状態を取得
   */
  getPanelDragState() {
    return this.panelDragState;
  }

  /**
   * グリッドオーバーレイ上のマウスダウンハンドラー（Approach A）
   *
   * グリッドオーバーレイにアタッチされているため、このハンドラーは
   * 選択モードON時のみ発火します。複雑なイベント判定は不要です。
   *
   * 座標ベースでグリッド列を判定し、ドラッグ選択を開始します。
   */
  private handleMouseDown = (e: MouseEvent): void => {
    // グリッド列位置を取得（座標ベースの判定）
    const column = this.gridAnalyzer.getColumnFromX(e.clientX);
    if (!column) return;

    // ドラッグ開始
    this.dragState.isDragging = true;
    this.dragState.startX = e.clientX;
    this.dragState.startY = e.clientY;
    this.dragState.currentX = e.clientX;
    this.dragState.currentY = e.clientY;
    this.dragState.dateColumn = column;

    e.preventDefault();
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
