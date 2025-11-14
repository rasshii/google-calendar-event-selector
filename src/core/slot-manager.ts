/**
 * タイムスロット管理
 */

import type { TimeSlot } from '@/types';
import { updateSlotList } from '@/ui/panel';

export class SlotManager {
  private slots: TimeSlot[] = [];

  /**
   * スロットを追加
   */
  addSlot(slot: TimeSlot): void {
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
   * 重複チェック
   */
  isDuplicate(newSlot: TimeSlot): boolean {
    return this.slots.some(
      s =>
        s.date.getTime() === newSlot.date.getTime() &&
        s.startHour === newSlot.startHour &&
        s.startMin === newSlot.startMin &&
        s.endHour === newSlot.endHour &&
        s.endMin === newSlot.endMin
    );
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
