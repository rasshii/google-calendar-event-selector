/**
 * カレンダーグリッド解析
 */

import type { GridCache, GridColumn, TimeCoordinate } from '@/types';
import { CONFIG, SELECTORS } from '@/config';
import { snapToGrid, clampHour, clampMinute } from '@/utils/time';

export class GridAnalyzer {
  private gridCache: GridCache = {
    hourHeight: CONFIG.GCAL_HOUR_HEIGHT_PX,
    startHour: CONFIG.GCAL_START_HOUR,
    gridTop: 0,
    columns: [],
  };

  /**
   * カレンダーグリッドを解析してキャッシュに保存
   *
   * @returns {boolean} 解析に成功した場合true
   */
  analyze(): boolean {
    const timeGrids = document.querySelectorAll<HTMLElement>(SELECTORS.TIME_GRID);

    if (timeGrids.length === 0) {
      console.warn('Time grids not found');
      return false;
    }

    this.gridCache.columns = [];

    timeGrids.forEach(grid => {
      const dateKey = grid.getAttribute('data-datekey');
      if (!dateKey) return;

      const rect = grid.getBoundingClientRect();
      const date = new Date(dateKey);

      this.gridCache.columns.push({
        element: grid,
        date: date,
        dateKey: dateKey,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        top: rect.top,
      });
    });

    // 左から順にソート
    this.gridCache.columns.sort((a, b) => a.left - b.left);

    // 1時間あたりの高さを計算
    if (this.gridCache.columns.length > 0) {
      const firstColumn = this.gridCache.columns[0].element;
      const height = firstColumn.offsetHeight;
      // 24時間分の高さと仮定
      this.gridCache.hourHeight = height / 24;
      this.gridCache.gridTop = this.gridCache.columns[0].top + window.scrollY;
    }

    console.log('Grid analyzed:', this.gridCache);
    return this.gridCache.columns.length > 0;
  }

  /**
   * Y座標から時刻を計算（15分単位にスナップ）
   *
   * @param {number} y - ページ内のY座標
   * @param {HTMLElement} columnElement - 対象の日付列要素
   * @returns {TimeCoordinate} 時刻オブジェクト（hour, minute）
   */
  getTimeFromY(y: number, columnElement: HTMLElement): TimeCoordinate {
    const rect = columnElement.getBoundingClientRect();
    const relativeY = y - (rect.top + window.scrollY);

    // 総分数に変換
    const totalMinutes = (relativeY / this.gridCache.hourHeight) * 60;

    // 15分単位にスナップ
    const snappedMinutes = snapToGrid(totalMinutes);

    // 時と分に分解
    const hour = Math.floor(snappedMinutes / 60);
    const minute = snappedMinutes % 60;

    return {
      hour: clampHour(hour),
      minute: clampMinute(minute),
    };
  }

  /**
   * X座標から該当する日付列を取得
   *
   * @param {number} x - ページ内のX座標
   * @returns {GridColumn | null} 日付列オブジェクト、見つからない場合null
   */
  getColumnFromX(x: number): GridColumn | null {
    for (const column of this.gridCache.columns) {
      if (x >= column.left && x <= column.right) {
        return column;
      }
    }
    return null;
  }

  getHourHeight(): number {
    return this.gridCache.hourHeight;
  }

  getColumns(): GridColumn[] {
    return this.gridCache.columns;
  }
}
