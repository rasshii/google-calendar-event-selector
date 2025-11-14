/**
 * 型定義
 *
 * このファイルはアプリケーション全体で使用される型定義を提供します。
 * - TimeSlot: 選択された時間枠の情報
 * - GridColumn: カレンダーグリッドの列（日付列）の情報
 * - GridCache: グリッド解析結果のキャッシュ
 * - DragState: ドラッグ操作の状態管理
 * - Messages: 多言語対応のメッセージ定義
 */

import type { SlotManager } from '@/core/slot-manager';

/**
 * ロケール識別子
 * - 'ja': 日本語
 * - 'en': 英語
 */
export type Locale = 'ja' | 'en';

/**
 * 選択された時間枠を表すインターフェース
 *
 * ユーザーがカレンダー上でドラッグして選択した時間枠の情報を保持します。
 * 各スロットは特定の日付の特定の時間帯（開始時刻〜終了時刻）を表します。
 */
export interface TimeSlot {
  /** スロットが属する日付 */
  date: Date;
  /** 開始時刻（時） 0-23 */
  startHour: number;
  /** 開始時刻（分） 0, 15, 30, 45のいずれか（15分単位） */
  startMin: number;
  /** 終了時刻（時） 0-23 */
  endHour: number;
  /** 終了時刻（分） 0, 15, 30, 45のいずれか（15分単位） */
  endMin: number;
  /** カレンダーグリッド上に表示される選択範囲の視覚的オーバーレイ要素 */
  overlay: HTMLElement | null;
  /** このスロットが属する日付列の情報 */
  column: GridColumn;
}

/**
 * カレンダーグリッドの1つの日付列を表すインターフェース
 *
 * Google Calendarの週表示では、各日付が1つの列として表示されます。
 * このインターフェースは、その列のDOM要素と位置情報を保持します。
 */
export interface GridColumn {
  /** 日付列のDOM要素（Google Calendarが生成したdiv要素） */
  element: HTMLElement;
  /** この列が表す日付 */
  date: Date;
  /** 日付を一意に識別するキー（YYYY-MM-DD形式の文字列） */
  dateKey: string;
  /** 列の左端のX座標（ピクセル単位、ページ全体の座標系） */
  left: number;
  /** 列の右端のX座標（ピクセル単位、ページ全体の座標系） */
  right: number;
  /** 列の幅（ピクセル単位） */
  width: number;
  /** 列の上端のY座標（ピクセル単位、ページ全体の座標系） */
  top: number;
}

/**
 * グリッド解析結果のキャッシュ
 *
 * GridAnalyzerがGoogle Calendarのグリッドを解析した結果を保持します。
 * これらの情報は、マウス座標から時刻や日付を計算する際に使用されます。
 */
export interface GridCache {
  /** 1時間分の高さ（ピクセル単位）カレンダーのズームレベルによって変動 */
  hourHeight: number;
  /** カレンダーグリッドの開始時刻（通常は0時だが、設定で変更可能） */
  startHour: number;
  /** カレンダーグリッドの上端のY座標（ページ全体の座標系） */
  gridTop: number;
  /** すべての日付列の配列（左から右へ、古い日付から新しい日付の順） */
  columns: GridColumn[];
}

/**
 * ドラッグ操作の状態を管理するインターフェース
 *
 * ユーザーがカレンダー上でマウスをドラッグして時間枠を選択する際の
 * 状態情報を保持します。
 */
export interface DragState {
  /** 現在ドラッグ中かどうか */
  isDragging: boolean;
  /** ドラッグ開始時のX座標（ページ全体の座標系） */
  startX: number;
  /** ドラッグ開始時のY座標（ページ全体の座標系） */
  startY: number;
  /** 現在のマウスのX座標（ページ全体の座標系） */
  currentX: number;
  /** 現在のマウスのY座標（ページ全体の座標系） */
  currentY: number;
  /** ドラッグが行われている日付列（nullの場合はグリッド外） */
  dateColumn: GridColumn | null;
  /** ドラッグ中に表示される一時的な選択範囲オーバーレイ */
  tempOverlay: HTMLElement | null;
}

/**
 * UIパネルのドラッグ状態を管理するインターフェース
 *
 * 右側に表示される操作パネルをユーザーがドラッグして移動させる際の
 * 状態情報を保持します。
 */
export interface PanelDragState {
  /** 現在パネルをドラッグ中かどうか */
  isDragging: boolean;
  /** マウスカーソルとパネル左上の角との水平オフセット */
  offsetX: number;
  /** マウスカーソルとパネル左上の角との垂直オフセット */
  offsetY: number;
}

/**
 * 時刻座標を表すインターフェース
 *
 * マウスのY座標から計算された時刻を時・分の形式で保持します。
 */
export interface TimeCoordinate {
  /** 時（0-23） */
  hour: number;
  /** 分（0, 15, 30, 45のいずれか、15分単位でスナップ） */
  minute: number;
}

/**
 * UI表示用のメッセージ定義
 *
 * 多言語対応のため、表示されるすべてのテキストをこのインターフェースで定義します。
 * 実際のメッセージ文字列はutils/locale.tsで言語ごとに定義されています。
 */
export interface Messages {
  /** パネルのタイトル */
  panelTitle: string;
  /** 選択がない場合のメッセージ */
  emptyMessage: string;
  /** コピーボタンのラベル */
  copyButton: string;
  /** クリアボタンのラベル */
  clearButton: string;
  /** コピー成功時の通知メッセージ */
  copiedSuccess: string;
  /** 選択モードON時の通知メッセージ */
  selectionModeOn: string;
  /** 選択モードOFF時の通知メッセージ */
  selectionModeOff: string;
  /** コピー失敗時のエラーメッセージ */
  errorCopyFailed: string;
  /** 初期化失敗時のエラーメッセージ */
  errorInitFailed: string;
  /** 初期化成功時のメッセージ */
  initSuccess: string;
  /** カレンダーが見つからない場合のエラーメッセージ */
  calendarNotFound: string;
}

/**
 * ロケールごとのメッセージマップ
 * Record<Locale, Messages>型で、各ロケールに対応するメッセージセットを保持
 */
export type MessagesMap = Record<Locale, Messages>;

/**
 * Windowオブジェクトの型拡張
 * 拡張機能が使用するグローバルプロパティの型定義
 */
declare global {
  interface Window {
    /**
     * SlotManagerのグローバルインスタンス
     * UIパネルとコアロジック間の通信に使用
     * @internal
     */
    __slotManager?: SlotManager;
  }
}
