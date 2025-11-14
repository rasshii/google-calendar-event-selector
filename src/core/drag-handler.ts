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
    console.log('🎯 [DragHandler] Setting grid overlay');
    console.log('  📊 Overlay info:', {
      tagName: overlay.tagName,
      className: overlay.className,
      id: overlay.id,
      isConnected: overlay.isConnected
    });
    this.gridOverlay = overlay;
    console.log('  ✅ Grid overlay set successfully');
  }

  /**
   * ドラッグリスナーをアタッチ
   *
   * Approach A実装: グリッドオーバーレイにリスナーをアタッチします。
   * オーバーレイは選択モードON時のみpointer-events: autoになるため、
   * 選択モードOFF時はイベントが発火しません。
   */
  attachListeners(): void {
    console.log('🔗 [DragHandler] Attaching event listeners...');

    if (!this.gridOverlay) {
      console.error('  ❌ Grid overlay not set. Call setGridOverlay() first.');
      return;
    }

    console.log('  📊 Overlay state:', {
      isConnected: this.gridOverlay.isConnected,
      parentElement: this.gridOverlay.parentElement?.tagName,
      className: this.gridOverlay.className
    });

    try {
      this.gridOverlay.addEventListener('mousedown', this.handleMouseDown);
      console.log('  ✅ mousedown listener attached');

      this.gridOverlay.addEventListener('mousemove', this.handleMouseMove);
      console.log('  ✅ mousemove listener attached');

      this.gridOverlay.addEventListener('mouseup', this.handleMouseUp);
      console.log('  ✅ mouseup listener attached');

      console.log('  ✅ All event listeners attached successfully');
    } catch (error) {
      console.error('  ❌ Failed to attach listeners:', error);
    }
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
    console.log('🖱️  [DragHandler] ========== MouseDown Event ==========');
    console.log('  📍 Mouse position:', { clientX: e.clientX, clientY: e.clientY });
    console.log('  🎯 Target:', {
      tagName: (e.target as HTMLElement)?.tagName,
      className: (e.target as HTMLElement)?.className
    });

    // グリッド列位置を取得（座標ベースの判定）
    console.log('  🔍 Finding column at X:', e.clientX);
    const column = this.gridAnalyzer.getColumnFromX(e.clientX);

    if (!column) {
      console.warn('  ❌ No column found at X:', e.clientX);
      const allColumns = this.gridAnalyzer.getColumns();
      console.warn('  Available columns:', allColumns.map(c => ({
        dateKey: c.dateKey,
        left: c.left,
        right: c.right
      })));
      return;
    }

    console.log('  ✅ Column found:', {
      dateKey: column.dateKey,
      date: column.date.toISOString().split('T')[0],
      bounds: { left: column.left, right: column.right, top: column.top },
      elementInfo: {
        tagName: column.element.tagName,
        offsetHeight: column.element.offsetHeight,
        rect: column.element.getBoundingClientRect()
      }
    });

    // ドラッグ開始
    this.dragState.isDragging = true;
    this.dragState.startX = e.clientX;
    this.dragState.startY = e.clientY;
    this.dragState.currentX = e.clientX;
    this.dragState.currentY = e.clientY;
    this.dragState.dateColumn = column;

    console.log('  ✅ Drag state initialized:', {
      isDragging: true,
      startPos: { x: e.clientX, y: e.clientY }
    });

    e.preventDefault();
    console.log('🖱️  [DragHandler] ======================================');
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
      // X座標を制限
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
    if (!this.dragState.isDragging || !this.dragState.dateColumn) {
      console.log('ℹ️  [DragHandler] MouseUp ignored: not in dragging state');
      return;
    }

    console.log('🖱️  [DragHandler] ========== MouseUp Event ==========');
    console.log('  📍 Mouse position:', {
      clientX: e.clientX,
      clientY: e.clientY,
      startY: this.dragState.startY,
      currentY: this.dragState.currentY,
      deltaY: Math.abs(this.dragState.currentY - this.dragState.startY)
    });

    this.dragState.isDragging = false;

    // 最小限のドラッグ距離をチェック（誤クリックを防ぐ）
    const deltaY = Math.abs(this.dragState.currentY - this.dragState.startY);
    if (deltaY < CONFIG.MIN_DRAG_DISTANCE_PX) {
      console.log('  ⚠️  Drag distance too small:', deltaY, '< minimum:', CONFIG.MIN_DRAG_DISTANCE_PX);
      removeTempOverlay(this.dragState.tempOverlay);
      this.dragState.tempOverlay = null;
      console.log('  🗑️  Temp overlay removed, no slot created');
      return;
    }

    // 時刻を計算
    const minY = Math.min(this.dragState.startY, this.dragState.currentY);
    const maxY = Math.max(this.dragState.startY, this.dragState.currentY);

    console.log('  📏 Calculating time from Y coordinates:', {
      minY,
      maxY,
      columnTop: this.dragState.dateColumn.element.getBoundingClientRect().top,
      columnHeight: this.dragState.dateColumn.element.getBoundingClientRect().height
    });

    const startTime = this.gridAnalyzer.getTimeFromY(minY, this.dragState.dateColumn.element);
    const endTime = this.gridAnalyzer.getTimeFromY(maxY, this.dragState.dateColumn.element);

    console.log('  ⏰ Calculated times:', {
      startTime: `${startTime.hour}:${String(startTime.minute).padStart(2, '0')}`,
      endTime: `${endTime.hour}:${String(endTime.minute).padStart(2, '0')}`
    });

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

    console.log('  📅 Created time slot:', {
      date: slot.date.toISOString().split('T')[0],
      time: `${slot.startHour}:${String(slot.startMin).padStart(2, '0')} - ${slot.endHour}:${String(slot.endMin).padStart(2, '0')}`,
      dateKey: slot.column.dateKey
    });

    // 重複チェックして追加
    const isDuplicate = this.slotManager.isDuplicate(slot);
    console.log('  🔍 Duplicate check:', isDuplicate ? 'YES (will not add)' : 'NO (will add)');

    if (!isDuplicate) {
      console.log('  🎨 Creating selection overlay...');
      slot.overlay = createSelectionOverlay(slot, this.dragState.dateColumn, this.gridAnalyzer);

      console.log('  ➕ Adding slot to manager...');
      this.slotManager.addSlot(slot);
      console.log('  ✅ Slot added successfully');
    } else {
      console.log('  ⚠️  Duplicate slot, not added');
    }

    console.log('  🗑️  Removing temp overlay...');
    removeTempOverlay(this.dragState.tempOverlay);
    this.dragState.tempOverlay = null;

    e.preventDefault();
    console.log('🖱️  [DragHandler] ======================================');
  };
}
