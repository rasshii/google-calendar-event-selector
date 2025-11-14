/**
 * タイムスロット管理
 *
 * 選択された時間スロットを管理し、UIとの連携を行います。
 * 主な責務：
 * - スロットの追加・削除・取得
 * - スロットの重複チェック
 * - 日時順のソート
 * - 表示範囲外のスロットのフィルタリング
 * - UI更新の管理
 *
 * デバッグログは CONFIG.DEBUG_MODE によって制御されます。
 */

import type { TimeSlot } from '@/types';
import { updateSlotList } from '@/ui/panel';
import { Debug } from '@/utils/debug';

export class SlotManager {
  /** 選択された時間スロットの配列（日時順にソートされている） */
  private slots: TimeSlot[] = [];

  /**
   * スロットを追加
   *
   * 新しい時間スロットをリストに追加し、日時順にソートした後、UIを更新します。
   * 重複チェックは呼び出し側（DragHandler）で行われることを想定しています。
   *
   * @param slot - 追加する時間スロット
   *
   * @example
   * ```typescript
   * const newSlot: TimeSlot = {
   *   date: new Date(2025, 0, 15),
   *   startHour: 10,
   *   startMin: 0,
   *   endHour: 11,
   *   endMin: 0,
   *   overlay: overlayElement,
   *   column: gridColumn
   * };
   * slotManager.addSlot(newSlot);
   * ```
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
   *
   * 指定された時間スロットをリストから削除し、UIを更新します。
   * スロットに関連付けられたオーバーレイ要素もDOMから削除されます。
   *
   * @param slot - 削除する時間スロット
   *
   * @example
   * ```typescript
   * // ユーザーがUIパネルの削除ボタンをクリックした場合
   * slotManager.removeSlot(targetSlot);
   * ```
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
   *
   * 選択されているすべての時間スロットを削除し、UIをリセットします。
   * 各スロットに関連付けられたオーバーレイ要素もDOMから削除されます。
   * クリアボタンがクリックされた時や、拡張機能のクリーンアップ時に呼ばれます。
   *
   * @example
   * ```typescript
   * // ユーザーがクリアボタンをクリックした場合
   * slotManager.clearAll();
   * ```
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
   *
   * 現在選択されているすべての時間スロットを日時順のソート済み配列で返します。
   * この配列はコピー不可の参照なので、変更する場合は他のメソッドを使用してください。
   *
   * @returns 時間スロットの配列（日時順にソート済み）
   *
   * @example
   * ```typescript
   * const slots = slotManager.getSlots();
   * Debug.log('SLOT', `Total slots: ${slots.length}`);
   * ```
   */
  getSlots(): TimeSlot[] {
    return this.slots;
  }

  /**
   * 表示範囲外のスロットを除外
   *
   * カレンダーの表示日付が変更された場合（週の移動など）、
   * 表示範囲外の日付に関連するスロットを自動的に削除します。
   * これにより、ユーザーが見えない日付の選択がリストに残り続けることを防ぎます。
   *
   * 処理フロー：
   * 1. 現在のスロット数を記録
   * 2. 表示範囲外のスロットを特定
   * 3. それらのスロットのオーバーレイをDOMから削除
   * 4. スロットリストから除外
   * 5. 変更があればUIを更新
   *
   * @param visibleDateKeys - 現在表示されている日付のdatekeyのセット
   *
   * @example
   * ```typescript
   * // カレンダーが次の週に移動した場合
   * const visibleDateKeys = gridAnalyzer.getVisibleDateKeys();
   * slotManager.filterByVisibleDates(visibleDateKeys);
   * ```
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
   *
   * 既存のスロットと同じ日付・時刻範囲のスロットが存在するかをチェックします。
   * 重複は以下の条件がすべて一致する場合に判定されます：
   * - 日付が同じ
   * - 開始時刻（時・分）が同じ
   * - 終了時刻（時・分）が同じ
   *
   * エラーハンドリング：
   * - スロットが無効な場合は重複扱いにして追加を防ぎます
   * - 日付が無効な場合も重複扱いにします
   *
   * @param newSlot - チェック対象の新しいスロット
   * @returns 重複がある場合true、ない場合false
   *
   * @example
   * ```typescript
   * if (!slotManager.isDuplicate(newSlot)) {
   *   slotManager.addSlot(newSlot);
   * } else {
   *   Debug.log('SLOT', 'Duplicate slot detected, skipping');
   * }
   * ```
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
   *
   * スロット配列を以下の優先順位でソートします：
   * 1. 日付の昇順（古い日付が先）
   * 2. 同じ日付内では開始時刻の昇順（早い時刻が先）
   *
   * このメソッドはaddSlot()内で自動的に呼ばれるため、
   * 外部から直接呼ぶ必要はありません。
   *
   * ソート後、UIパネルには日付と時刻順に整列されたリストが表示されます。
   *
   * @private
   */
  private sortSlots(): void {
    this.slots.sort((a, b) => {
      // まず日付で比較
      if (a.date.getTime() !== b.date.getTime()) {
        return a.date.getTime() - b.date.getTime();
      }
      // 同じ日付の場合は開始時刻で比較（分単位に変換）
      const aStart = a.startHour * 60 + a.startMin;
      const bStart = b.startHour * 60 + b.startMin;
      return aStart - bStart;
    });
  }
}
