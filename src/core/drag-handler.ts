/**
 * ドラッグハンドリング
 *
 * グリッドオーバーレイ上でのドラッグ操作を処理し、時間選択を管理します。
 * Approach A実装の核心部分で、オーバーレイベースのイベントハンドリングを実現します。
 * デバッグログは CONFIG.DEBUG_MODE によって制御されます。
 */

import type { DragState, TimeSlot } from '@/types';
import { CONFIG } from '@/config';
import { GridAnalyzer } from './grid-analyzer';
import { SlotManager } from './slot-manager';
import { updateTempOverlay, removeTempOverlay, createSelectionOverlay } from '@/ui/overlay';
import { Debug } from '@/utils/debug';

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
    Debug.log('DRAG', '🎯 Setting grid overlay');
    Debug.log('DRAG', '  📊 Overlay info:', {
      tagName: overlay.tagName,
      className: overlay.className,
      id: overlay.id,
      isConnected: overlay.isConnected
    });
    this.gridOverlay = overlay;
    Debug.log('DRAG', '  ✅ Grid overlay set successfully');
  }

  /**
   * ドラッグリスナーをアタッチ
   *
   * Approach A実装: グリッドオーバーレイにリスナーをアタッチします。
   * オーバーレイは選択モードON時のみpointer-events: autoになるため、
   * 選択モードOFF時はイベントが発火しません。
   */
  attachListeners(): void {
    Debug.log('DRAG', '🔗 Attaching event listeners...');

    if (!this.gridOverlay) {
      Debug.error('DRAG', '  ❌ Grid overlay not set. Call setGridOverlay() first.');
      return;
    }

    Debug.log('DRAG', '  📊 Overlay state:', {
      isConnected: this.gridOverlay.isConnected,
      parentElement: this.gridOverlay.parentElement?.tagName,
      className: this.gridOverlay.className
    });

    try {
      this.gridOverlay.addEventListener('mousedown', this.handleMouseDown);
      Debug.log('DRAG', '  ✅ mousedown listener attached');

      this.gridOverlay.addEventListener('mousemove', this.handleMouseMove);
      Debug.log('DRAG', '  ✅ mousemove listener attached');

      this.gridOverlay.addEventListener('mouseup', this.handleMouseUp);
      Debug.log('DRAG', '  ✅ mouseup listener attached');

      Debug.log('DRAG', '  ✅ All event listeners attached successfully');
    } catch (error) {
      Debug.error('DRAG', '  ❌ Failed to attach listeners:', error);
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
    Debug.log('DRAG', '🖱️  ========== MouseDown Event ==========');
    Debug.log('DRAG', '  📍 Mouse position:', { clientX: e.clientX, clientY: e.clientY });
    Debug.log('DRAG', '  🎯 Target:', {
      tagName: (e.target as HTMLElement)?.tagName,
      className: (e.target as HTMLElement)?.className
    });

    // グリッド列位置を取得（座標ベースの判定）
    Debug.log('DRAG', '  🔍 Finding column at X:', e.clientX);
    const column = this.gridAnalyzer.getColumnFromX(e.clientX);

    if (!column) {
      Debug.warn('DRAG', '  ❌ No column found at X:', e.clientX);
      const allColumns = this.gridAnalyzer.getColumns();
      Debug.warn('DRAG', '  Available columns:', allColumns.map(c => ({
        dateKey: c.dateKey,
        left: c.left,
        right: c.right
      })));
      return;
    }

    Debug.log('DRAG', '  ✅ Column found:', {
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

    Debug.log('DRAG', '  ✅ Drag state initialized:', {
      isDragging: true,
      startPos: { x: e.clientX, y: e.clientY }
    });

    e.preventDefault();
    Debug.log('DRAG', '🖱️  ======================================');
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
      Debug.log('DRAG', 'ℹ️  MouseUp ignored: not in dragging state');
      return;
    }

    Debug.log('DRAG', '🖱️  ========== MouseUp Event ==========');
    Debug.log('DRAG', '  📍 Mouse position:', {
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
      Debug.log('DRAG', '  ⚠️  Drag distance too small:', deltaY, '< minimum:', CONFIG.MIN_DRAG_DISTANCE_PX);
      removeTempOverlay(this.dragState.tempOverlay);
      this.dragState.tempOverlay = null;
      Debug.log('DRAG', '  🗑️  Temp overlay removed, no slot created');
      return;
    }

    // 時刻を計算
    const minY = Math.min(this.dragState.startY, this.dragState.currentY);
    const maxY = Math.max(this.dragState.startY, this.dragState.currentY);

    Debug.log('DRAG', '  📏 Calculating time from Y coordinates:', {
      minY,
      maxY,
      columnTop: this.dragState.dateColumn.element.getBoundingClientRect().top,
      columnHeight: this.dragState.dateColumn.element.getBoundingClientRect().height
    });

    const startTime = this.gridAnalyzer.getTimeFromY(minY, this.dragState.dateColumn.element);
    const endTime = this.gridAnalyzer.getTimeFromY(maxY, this.dragState.dateColumn.element);

    Debug.log('DRAG', '  ⏰ Calculated times:', {
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

    Debug.log('DRAG', '  📅 Created time slot:', {
      date: slot.date.toISOString().split('T')[0],
      time: `${slot.startHour}:${String(slot.startMin).padStart(2, '0')} - ${slot.endHour}:${String(slot.endMin).padStart(2, '0')}`,
      dateKey: slot.column.dateKey
    });

    // 重複チェックして追加
    const isDuplicate = this.slotManager.isDuplicate(slot);
    Debug.log('DRAG', '  🔍 Duplicate check:', isDuplicate ? 'YES (will not add)' : 'NO (will add)');

    if (!isDuplicate) {
      Debug.log('DRAG', '  🎨 Creating selection overlay...');
      slot.overlay = createSelectionOverlay(slot, this.dragState.dateColumn, this.gridAnalyzer);

      Debug.log('DRAG', '  ➕ Adding slot to manager...');
      this.slotManager.addSlot(slot);
      Debug.log('DRAG', '  ✅ Slot added successfully');
    } else {
      Debug.log('DRAG', '  ⚠️  Duplicate slot, not added');
    }

    Debug.log('DRAG', '  🗑️  Removing temp overlay...');
    removeTempOverlay(this.dragState.tempOverlay);
    this.dragState.tempOverlay = null;

    e.preventDefault();
    Debug.log('DRAG', '🖱️  ======================================');
  };
}
