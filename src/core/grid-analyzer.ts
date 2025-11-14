/**
 * カレンダーグリッド解析
 *
 * Google Calendarのグリッド構造を解析し、時間スロットの座標計算を行います。
 * デバッグログは CONFIG.DEBUG_MODE によって制御されます。
 */

import type { GridCache, GridColumn, TimeCoordinate } from '@/types';
import { CONFIG } from '@/config';
import { snapToGrid, clampHour, clampMinute } from '@/utils/time';
import { Debug } from '@/utils/debug';

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
   * 【重要な改善】
   * - 時間グリッド本体のみを厳格に特定（高さ > 1000px）
   * - hourHeightの正確な計算（時間マーカー要素から測定）
   * - フォールバック機構の実装
   *
   * @returns {boolean} 解析に成功した場合true
   */
  analyze(): boolean {
    try {
      Debug.log('GRID', '🔍 ========== ANALYZING CALENDAR GRID ==========');

      // ステップ1: data-datekey属性を持つ要素をすべて取得
      const allDateKeyElements = document.querySelectorAll<HTMLElement>('[data-datekey]');
      Debug.log('GRID', `📋 Found ${allDateKeyElements.length} elements with [data-datekey]`);

      if (allDateKeyElements.length === 0) {
        Debug.error('GRID', '❌ No elements with [data-datekey] found');
        return false;
      }

      // ステップ2: 時間グリッド本体のみをフィルタリング
      // Google Calendarの週表示では、時間グリッド本体は通常1000px以上の高さを持つ
      const timeGrids = Array.from(allDateKeyElements).filter(el => {
        const height = el.offsetHeight;
        const hasValidDimensions = height > CONFIG.MIN_GRID_HEIGHT_PX && el.offsetWidth > 0;

        if (height > 0) {
          Debug.log('GRID', `  📊 Element height: ${height}px, width: ${el.offsetWidth}px, dateKey: ${el.getAttribute('data-datekey')} ${hasValidDimensions ? '✅' : '❌'}`);
        }

        return hasValidDimensions;
      });

      Debug.log('GRID', `✅ Filtered to ${timeGrids.length} valid time grid elements (height > ${CONFIG.MIN_GRID_HEIGHT_PX}px)`);

      if (timeGrids.length === 0) {
        Debug.error('GRID', '❌ No valid time grid elements found. Are you in week view?');
        return false;
      }

      // デバッグ: 最初のグリッド要素の詳細を表示
      const firstGrid = timeGrids[0];
      Debug.log('GRID', '📝 First grid details:', {
        tagName: firstGrid.tagName,
        className: firstGrid.className,
        offsetHeight: firstGrid.offsetHeight,
        offsetWidth: firstGrid.offsetWidth,
        dateKey: firstGrid.getAttribute('data-datekey'),
        ariaLabel: firstGrid.getAttribute('aria-label')
      });

      // ステップ3: グリッド列情報を構築
      this.gridCache.columns = [];

      timeGrids.forEach((grid, index) => {
        const dateKey = grid.getAttribute('data-datekey');
        if (!dateKey) {
          Debug.warn('GRID', `⚠️  Grid ${index} missing data-datekey attribute`);
          return;
        }

        const rect = grid.getBoundingClientRect();

        // 画面外の要素をスキップ
        if (rect.width === 0 || rect.height === 0) {
          return;
        }

        // data-datekeyから日付を解析
        const date = this.parseDateKey(dateKey, grid);

        if (!date || isNaN(date.getTime())) {
          Debug.warn('GRID', `⚠️  Invalid date for dateKey: ${dateKey}`);
          return;
        }

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

      if (this.gridCache.columns.length === 0) {
        Debug.error('GRID', '❌ No valid columns created');
        return false;
      }

      // 左から順にソート
      this.gridCache.columns.sort((a, b) => a.left - b.left);
      Debug.log('GRID', `📊 Created ${this.gridCache.columns.length} grid columns`);

      // ステップ4: 1時間あたりの高さを計算
      this.gridCache.hourHeight = this.calculateHourHeight(this.gridCache.columns[0].element);

      if (this.gridCache.hourHeight <= 0) {
        Debug.error('GRID', '❌ Failed to calculate valid hour height');
        return false;
      }

      this.gridCache.gridTop = this.gridCache.columns[0].top + window.scrollY;

      Debug.log('GRID', '✅ Grid analysis complete:', {
        columns: this.gridCache.columns.length,
        hourHeight: this.gridCache.hourHeight,
        gridTop: this.gridCache.gridTop
      });
      Debug.log('GRID', '🔍 ==========================================');

      return true;
    } catch (error) {
      Debug.error('GRID', '❌ Failed to analyze calendar grid:', error);
      return false;
    }
  }

  /**
   * 1時間あたりのピクセル高さを計算
   *
   * 【改善された計算方法】
   * 1. 時間マーカー要素から直接測定（最も正確）
   * 2. グリッド全体の高さから計算（フォールバック1）
   * 3. デフォルト値48pxを使用（フォールバック2）
   *
   * @param gridElement - 時間グリッド要素
   * @returns 1時間あたりのピクセル高さ
   */
  private calculateHourHeight(gridElement: HTMLElement): number {
    Debug.log('GRID', '📏 Calculating hour height...');

    // 方法1: 時間マーカー要素から測定
    // Google Calendarでは、時間を示す要素（0:00, 1:00など）が存在する
    // これらの間隔を測定することで正確なhourHeightを得られる
    const hourHeight = this.measureHourHeightFromTimeMarkers(gridElement);
    if (hourHeight > 0) {
      Debug.log('GRID', `✅ Hour height from time markers: ${hourHeight}px`);
      return hourHeight;
    }

    // 方法2: グリッド全体の高さから計算
    const totalHeight = gridElement.offsetHeight;
    Debug.log('GRID', `📊 Grid total height: ${totalHeight}px`);

    // 高さが妥当な範囲内かチェック（24時間 × 30〜100px/時 = 720〜2400px）
    const MIN_TOTAL_HEIGHT = CONFIG.HOURS_IN_DAY * CONFIG.MIN_HOUR_HEIGHT_PX;
    const MAX_TOTAL_HEIGHT = CONFIG.HOURS_IN_DAY * CONFIG.MAX_HOUR_HEIGHT_PX;

    if (totalHeight >= MIN_TOTAL_HEIGHT && totalHeight <= MAX_TOTAL_HEIGHT) {
      const calculatedHeight = totalHeight / CONFIG.HOURS_IN_DAY;
      Debug.log('GRID', `✅ Hour height from grid height: ${calculatedHeight}px (${totalHeight}px / 24)`);
      return calculatedHeight;
    }

    // 方法3: デフォルト値を使用（最後の手段）
    Debug.warn('GRID', `⚠️  Grid height ${totalHeight}px is outside expected range, using default: ${CONFIG.GCAL_HOUR_HEIGHT_PX}px`);
    return CONFIG.GCAL_HOUR_HEIGHT_PX;
  }

  /**
   * 時間マーカー要素から1時間の高さを測定
   *
   * Google Calendarには時間を示す要素が存在するため、
   * それらの位置を測定することで正確なhourHeightを得られる
   *
   * @param gridElement - 時間グリッド要素
   * @returns 測定された1時間の高さ、測定失敗時は0
   */
  private measureHourHeightFromTimeMarkers(gridElement: HTMLElement): number {
    try {
      // Google Calendarの時間マーカーを探す
      // 一般的なパターン: aria-labelに時間情報を持つ要素
      const container = gridElement.parentElement?.parentElement;
      if (!container) {
        return 0;
      }

      // 時間ラベルを含む要素を探す（例: "0:00", "1:00"など）
      const timeElements = Array.from(container.querySelectorAll('[aria-label*="時"], [aria-label*=":00"]'))
        .filter((el): el is HTMLElement => el instanceof HTMLElement);

      if (timeElements.length < 2) {
        Debug.log('GRID', '⚠️  Not enough time marker elements found');
        return 0;
      }

      // 連続する2つの時間マーカー間の距離を測定
      const measurements: number[] = [];
      for (let i = 0; i < Math.min(timeElements.length - 1, 5); i++) {
        const current = timeElements[i].getBoundingClientRect();
        const next = timeElements[i + 1].getBoundingClientRect();
        const distance = next.top - current.top;

        // 妥当な値のみを採用
        if (distance >= CONFIG.MIN_HOUR_HEIGHT_PX && distance <= CONFIG.MAX_HOUR_HEIGHT_PX) {
          measurements.push(distance);
        }
      }

      if (measurements.length === 0) {
        return 0;
      }

      // 測定値の中央値を返す（外れ値の影響を減らす）
      measurements.sort((a, b) => a - b);
      const median = measurements[Math.floor(measurements.length / 2)];

      Debug.log('GRID', `📏 Time marker measurements: [${measurements.join(', ')}]px, median: ${median}px`);

      return median;
    } catch (error) {
      Debug.warn('GRID', '⚠️  Failed to measure hour height from time markers:', error);
      return 0;
    }
  }

  /**
   * Y座標から時刻を計算（15分単位にスナップ）
   *
   * @param {number} y - ビューポート内のY座標（clientY）
   * @param {HTMLElement} columnElement - 対象の日付列要素
   * @returns {TimeCoordinate} 時刻オブジェクト（hour, minute）
   *
   * Note: getBoundingClientRect()とclientYは両方ともビューポート相対座標なので
   * scrollYの調整は不要（以前はscrollYを追加していたが、これがNaNバグの原因だった）
   */
  getTimeFromY(y: number, columnElement: HTMLElement): TimeCoordinate {
    // 入力値のバリデーション
    if (!Number.isFinite(y)) {
      Debug.error('GRID', 'Invalid Y coordinate', { y });
      return { hour: 0, minute: 0 };
    }

    if (!columnElement) {
      Debug.error('GRID', 'Column element is null or undefined');
      return { hour: 0, minute: 0 };
    }

    try {
      const rect = columnElement.getBoundingClientRect();
      const relativeY = y - rect.top;

      // 時間の高さが有効かチェック
      if (this.gridCache.hourHeight <= 0) {
        Debug.error('GRID', 'Invalid hour height', { hourHeight: this.gridCache.hourHeight });
        return { hour: 0, minute: 0 };
      }

      // 総分数に変換
      const totalMinutes = (relativeY / this.gridCache.hourHeight) * 60;

      // NaN チェック
      if (!Number.isFinite(totalMinutes)) {
        Debug.error('GRID', 'Calculated totalMinutes is not finite', { relativeY, hourHeight: this.gridCache.hourHeight });
        return { hour: 0, minute: 0 };
      }

      // 15分単位にスナップ
      const snappedMinutes = snapToGrid(totalMinutes);

      // 時と分に分解
      const hour = Math.floor(snappedMinutes / 60);
      const minute = snappedMinutes % 60;

      return {
        hour: clampHour(hour),
        minute: clampMinute(minute),
      };
    } catch (error) {
      Debug.error('GRID', 'Error calculating time from Y coordinate:', error);
      return { hour: 0, minute: 0 };
    }
  }

  /**
   * X座標から該当する日付列を取得
   *
   * 列は left プロパティでソート済みなので、バイナリサーチを使用して効率的に検索します。
   * ただし、通常の週表示では列数が7以下なので、線形探索でも十分高速です。
   *
   * @param {number} x - ページ内のX座標
   * @returns {GridColumn | null} 日付列オブジェクト、見つからない場合null
   */
  getColumnFromX(x: number): GridColumn | null {
    // 入力値のバリデーション
    if (!Number.isFinite(x)) {
      Debug.error('GRID', 'Invalid X coordinate', { x });
      return null;
    }

    try {
      const columns = this.gridCache.columns;

      // 列数が少ない場合は線形探索の方が速い
      if (columns.length <= 10) {
        for (const column of columns) {
          if (x >= column.left && x <= column.right) {
            return column;
          }
        }
        return null;
      }

      // 列数が多い場合はバイナリサーチ（実際にはほぼ使われない）
      let left = 0;
      let right = columns.length - 1;

      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const column = columns[mid];

        if (x >= column.left && x <= column.right) {
          return column;
        } else if (x < column.left) {
          right = mid - 1;
        } else {
          left = mid + 1;
        }
      }

      return null;
    } catch (error) {
      Debug.error('GRID', 'Error finding column from X coordinate:', error);
      return null;
    }
  }

  /**
   * 1時間あたりのピクセル高さを取得
   *
   * Google Calendarのグリッドにおける1時間分の高さ（ピクセル）を返します。
   * この値は選択範囲の位置計算に使用されます。
   *
   * @returns 1時間あたりのピクセル高さ
   *
   * @example
   * ```typescript
   * const hourHeight = gridAnalyzer.getHourHeight(); // 48
   * const pixelsFor30Min = hourHeight / 2; // 24
   * ```
   */
  getHourHeight(): number {
    return this.gridCache.hourHeight;
  }

  /**
   * カレンダーグリッドの全日付列を取得
   *
   * 週表示または日表示のカレンダーグリッドにおける、
   * 全ての日付列（カラム）の情報を配列で返します。
   * 各列には日付、位置、幅などの情報が含まれます。
   *
   * @returns 日付列の配列
   *
   * @example
   * ```typescript
   * const columns = gridAnalyzer.getColumns();
   * columns.forEach(col => {
   *   Debug.log('GRID', `Date: ${col.date}, Width: ${col.width}px`);
   * });
   * ```
   */
  getColumns(): GridColumn[] {
    return this.gridCache.columns;
  }

  /**
   * 現在表示されているカレンダーの日付範囲を取得
   *
   * @returns {minDate: Date, maxDate: Date} 最小日付と最大日付、列がない場合はnull
   */
  getDateRange(): { minDate: Date; maxDate: Date } | null {
    const columns = this.gridCache.columns;
    if (columns.length === 0) {
      return null;
    }

    // 最初と最後の列の日付を返す（columnsは既にソート済み）
    return {
      minDate: columns[0].date,
      maxDate: columns[columns.length - 1].date,
    };
  }

  /**
   * 現在表示されている日付のdatekeyセットを取得
   *
   * @returns 現在表示されている日付のdatekeyのSet
   */
  getVisibleDateKeys(): Set<string> {
    return new Set(this.gridCache.columns.map(col => col.dateKey));
  }

  /**
   * data-datekey属性から日付オブジェクトを生成
   *
   * Google Calendarのdata-datekeyは通し番号なので、
   * 同じdatekeyを持つヘッダー要素から日付情報を取得する
   *
   * @param dateKey - data-datekey属性の値（通し番号）
   * @param element - グリッド要素（他の属性から日付を抽出するため）
   * @returns 解析された日付オブジェクト、解析失敗時はnull
   */
  private parseDateKey(dateKey: string, element: HTMLElement): Date | null {
    try {
      Debug.log('GRID', `🔍 Parsing dateKey: "${dateKey}"`);

      // YYYYMMDD形式（8桁）の場合
      if (/^\d{8}$/.test(dateKey)) {
        const year = parseInt(dateKey.substring(0, 4), 10);
        const month = parseInt(dateKey.substring(4, 6), 10) - 1;
        const day = parseInt(dateKey.substring(6, 8), 10);
        Debug.log('GRID', `  ✅ Parsed as YYYYMMDD: ${year}-${month + 1}-${day}`);
        return new Date(year, month, day);
      }

      // YYYY-MM-DD形式の場合
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        const parts = dateKey.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        Debug.log('GRID', `  ✅ Parsed as YYYY-MM-DD: ${year}-${month + 1}-${day}`);
        return new Date(year, month, day);
      }

      // 新戦略: 同じdatekeyを持つすべての要素から日付情報を探す
      Debug.log('GRID', `  🔍 data-datekey is a serial number (${dateKey}), searching for date info...`);

      // 同じdatekeyを持つすべての要素を取得
      const allElementsWithSameDateKey = document.querySelectorAll(`[data-datekey="${dateKey}"]`);
      Debug.log('GRID', `  📊 Found ${allElementsWithSameDateKey.length} elements with datekey="${dateKey}"`);

      // それぞれの要素をチェック
      for (const el of Array.from(allElementsWithSameDateKey)) {
        const htmlEl = el as HTMLElement;

        // aria-labelをチェック
        const ariaLabel = htmlEl.getAttribute('aria-label');
        if (ariaLabel) {
          Debug.log('GRID', `  🔍 Checking aria-label: "${ariaLabel}"`);
          const dateFromAria = this.extractDateFromAriaLabel(ariaLabel);
          if (dateFromAria) {
            Debug.log('GRID', `  ✅ Extracted date from aria-label:`, dateFromAria);
            return dateFromAria;
          }
        }

        // textContentをチェック
        const text = htmlEl.textContent?.trim();
        if (text) {
          Debug.log('GRID', `  🔍 Checking textContent: "${text.substring(0, 100)}"`);
          const dateFromText = this.extractDateFromText(text);
          if (dateFromText) {
            Debug.log('GRID', `  ✅ Extracted date from textContent:`, dateFromText);
            return dateFromText;
          }
        }
      }

      // 親要素や子要素から日付情報を探す
      Debug.log('GRID', `  🔍 Searching in parent/child elements...`);
      const dateFromDOM = this.searchDateInDOM(element);
      if (dateFromDOM) {
        Debug.log('GRID', `  ✅ Found date in DOM:`, dateFromDOM);
        return dateFromDOM;
      }

      // すべて失敗した場合
      Debug.error('GRID', `  ❌ Failed to parse date from dateKey: "${dateKey}"`);
      return null;

    } catch (error) {
      Debug.error('GRID', 'Error parsing date key:', { dateKey, error });
      return null;
    }
  }

  /**
   * aria-labelから日付を抽出
   */
  private extractDateFromAriaLabel(ariaLabel: string): Date | null {
    try {
      Debug.log('GRID', `  🔍 Extracting date from aria-label: "${ariaLabel}"`);

      // 日本語形式1: "2025年1月19日"（年あり）
      const jaMatchWithYear = ariaLabel.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
      if (jaMatchWithYear) {
        const year = parseInt(jaMatchWithYear[1], 10);
        const month = parseInt(jaMatchWithYear[2], 10) - 1;
        const day = parseInt(jaMatchWithYear[3], 10);
        Debug.log('GRID', `  ✅ Matched Japanese format with year: ${year}-${month + 1}-${day}`);
        return new Date(year, month, day);
      }

      // 日本語形式2: "11月 16日" または "11月16日"（年なし）
      const jaMatchNoYear = ariaLabel.match(/(\d{1,2})月\s*(\d{1,2})日/);
      if (jaMatchNoYear) {
        const month = parseInt(jaMatchNoYear[1], 10) - 1;
        const day = parseInt(jaMatchNoYear[2], 10);
        // 現在の年を使用
        const currentYear = new Date().getFullYear();
        Debug.log('GRID', `  ✅ Matched Japanese format without year: ${currentYear}-${month + 1}-${day} (using current year)`);
        return new Date(currentYear, month, day);
      }

      // 英語形式1: "January 19, 2025" or "19 January 2025"（年あり）
      const enMatchWithYear = ariaLabel.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
      if (enMatchWithYear) {
        const monthStr = enMatchWithYear[1];
        const day = parseInt(enMatchWithYear[2], 10);
        const year = parseInt(enMatchWithYear[3], 10);
        const monthIndex = new Date(`${monthStr} 1, 2000`).getMonth();
        Debug.log('GRID', `  ✅ Matched English format with year: ${year}-${monthIndex + 1}-${day}`);
        return new Date(year, monthIndex, day);
      }

      // 英語形式2: "January 19" or "19 January"（年なし）
      const enMatchNoYear = ariaLabel.match(/(\w+)\s+(\d{1,2})|(\d{1,2})\s+(\w+)/);
      if (enMatchNoYear) {
        const monthStr = enMatchNoYear[1] || enMatchNoYear[4];
        const day = parseInt(enMatchNoYear[2] || enMatchNoYear[3], 10);
        const currentYear = new Date().getFullYear();
        const monthIndex = new Date(`${monthStr} 1, 2000`).getMonth();
        Debug.log('GRID', `  ✅ Matched English format without year: ${currentYear}-${monthIndex + 1}-${day} (using current year)`);
        return new Date(currentYear, monthIndex, day);
      }

      Debug.log('GRID', `  ❌ No date pattern matched in aria-label`);
      return null;
    } catch (error) {
      Debug.error('GRID', `  ❌ Error extracting date:`, error);
      return null;
    }
  }

  /**
   * DOM要素内から日付情報を探す
   */
  private searchDateInDOM(element: HTMLElement): Date | null {
    // data-date, data-day などの属性をチェック
    const dataDate = element.getAttribute('data-date');
    if (dataDate && /^\d{4}-\d{2}-\d{2}$/.test(dataDate)) {
      const parts = dataDate.split('-');
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }

    // テキストコンテンツから日付を探す
    const textContent = element.textContent || '';
    return this.extractDateFromText(textContent);
  }

  /**
   * テキストから日付を抽出
   */
  private extractDateFromText(text: string): Date | null {
    if (!text) return null;

    // YYYY-MM-DD または YYYY/MM/DD 形式
    const isoMatch = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    }

    // 日本語形式: "1月15日" または "1月 15日"
    const jaMatch = text.match(/(\d{1,2})月\s*(\d{1,2})日/);
    if (jaMatch) {
      const month = parseInt(jaMatch[1]) - 1;
      const day = parseInt(jaMatch[2]);
      const currentYear = new Date().getFullYear();
      return new Date(currentYear, month, day);
    }

    // 英語形式: "Jan 15" または "January 15"
    const enMatch = text.match(/(\w{3,})\s+(\d{1,2})/);
    if (enMatch) {
      const monthStr = enMatch[1];
      const day = parseInt(enMatch[2]);
      const currentYear = new Date().getFullYear();

      // 月名を数値に変換
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                         'july', 'august', 'september', 'october', 'november', 'december'];
      const monthIndex = monthNames.findIndex(m => m.startsWith(monthStr.toLowerCase()));

      if (monthIndex >= 0) {
        return new Date(currentYear, monthIndex, day);
      }
    }

    return null;
  }
}
