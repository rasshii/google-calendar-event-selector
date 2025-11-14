/**
 * タイムスロット管理
 *
 * 選択された時間スロットを管理し、UIとの連携を行います。
 * デバッグログは CONFIG.DEBUG_MODE によって制御されます。
 */

import type { TimeSlot } from '@/types';
import { updateSlotList } from '@/ui/panel';
import { Debug } from '@/utils/debug';

export class SlotManager {
  private slots: TimeSlot[] = [];

  /**
   * スロットを追加
   */
  addSlot(slot: TimeSlot): void {
    Debug.log('SLOT', '➕ Adding slot:', {
      date: slot.date.toISOString().split('T')[0],
      dateKey: slot.column.dateKey,
      time: `${slot.startHour}:${String(slot.startMin).padStart(2, '0')}-${slot.endHour}:${String(slot.endMin).padStart(2, '0')}`
    });
    this.slots.push(slot);
    this.sortSlots();
    updateSlotList(this.slots, this);
  }

  /**
   * スロットを削除
   */
  removeSlot(slot: TimeSlot): void {
    if (slot.overlay) {
      slot.overlay.remove();
    }
    this.slots = this.slots.filter(s => s !== slot);
    updateSlotList(this.slots, this);
  }

  /**
   * すべてのスロットをクリア
   */
  clearAll(): void {
    this.slots.forEach(slot => {
      if (slot.overlay) {
        slot.overlay.remove();
      }
    });
    this.slots = [];
    updateSlotList(this.slots, this);
  }

  /**
   * スロット配列を取得
   */
  getSlots(): TimeSlot[] {
    return this.slots;
  }

  /**
   * 表示範囲外のスロットを除外
   *
   * @param visibleDateKeys - 現在表示されている日付のdatekeyのセット
   */
  filterByVisibleDates(visibleDateKeys: Set<string>): void {
    const initialCount = this.slots.length;

    Debug.log('SLOT', '🔍 Filtering slots:', {
      totalSlots: initialCount,
      visibleDateKeys: Array.from(visibleDateKeys),
      slotDateKeys: this.slots.map(s => s.column.dateKey)
    });

    // 表示範囲外のスロットを削除
    const slotsToRemove = this.slots.filter(slot => {
      const dateKey = slot.column.dateKey;
      const shouldRemove = !visibleDateKeys.has(dateKey);
      if (shouldRemove) {
        Debug.log('SLOT', `  ❌ Removing slot with dateKey: ${dateKey} (not in visible range)`);
      }
      return shouldRemove;
    });

    slotsToRemove.forEach(slot => {
      if (slot.overlay) {
        slot.overlay.remove();
      }
    });

    this.slots = this.slots.filter(slot => visibleDateKeys.has(slot.column.dateKey));

    // 変更があった場合のみUIを更新
    if (initialCount !== this.slots.length) {
      Debug.log('SLOT', `✅ Removed ${initialCount - this.slots.length} out-of-view selections`);
      updateSlotList(this.slots, this);
    } else {
      Debug.log('SLOT', 'ℹ️ No slots removed (all are in visible range)');
    }
  }

  /**
   * 重複チェック
   * 既存のスロットと同じ日付・時刻範囲のスロットが存在するかをチェック
   *
   * @param {TimeSlot} newSlot - チェック対象の新しいスロット
   * @returns {boolean} 重複がある場合true、ない場合false
   */
  isDuplicate(newSlot: TimeSlot): boolean {
    try {
      if (!newSlot || !newSlot.date) {
        Debug.error('SLOT', 'Invalid slot for duplicate check');
        return true; // エラー時は重複扱いにして追加を防ぐ
      }

      // 日付が有効かチェック
      if (isNaN(newSlot.date.getTime())) {
        Debug.error('SLOT', 'Invalid date in slot');
        return true;
      }

      return this.slots.some(
        s =>
          s.date.getTime() === newSlot.date.getTime() &&
          s.startHour === newSlot.startHour &&
          s.startMin === newSlot.startMin &&
          s.endHour === newSlot.endHour &&
          s.endMin === newSlot.endMin
      );
    } catch (error) {
      Debug.error('SLOT', 'Error checking for duplicate slot:', error);
      return true; // エラー時は重複扱いにして追加を防ぐ
    }
  }

  /**
   * スロットを日時順にソート
   */
  private sortSlots(): void {
    this.slots.sort((a, b) => {
      if (a.date.getTime() !== b.date.getTime()) {
        return a.date.getTime() - b.date.getTime();
      }
      const aStart = a.startHour * 60 + a.startMin;
      const bStart = b.startHour * 60 + b.startMin;
      return aStart - bStart;
    });
  }
}
