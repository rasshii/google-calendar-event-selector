/**
 * 型定義
 */

export type Locale = 'ja' | 'en';

export interface TimeSlot {
  date: Date;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  overlay: HTMLElement | null;
  column: GridColumn;
}

export interface GridColumn {
  element: HTMLElement;
  date: Date;
  dateKey: string;
  left: number;
  right: number;
  width: number;
  top: number;
}

export interface GridCache {
  hourHeight: number;
  startHour: number;
  gridTop: number;
  columns: GridColumn[];
}

export interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  dateColumn: GridColumn | null;
  tempOverlay: HTMLElement | null;
}

export interface PanelDragState {
  isDragging: boolean;
  offsetX: number;
  offsetY: number;
}

export interface TimeCoordinate {
  hour: number;
  minute: number;
}

export interface Messages {
  panelTitle: string;
  emptyMessage: string;
  copyButton: string;
  clearButton: string;
  copiedSuccess: string;
  selectionModeOn: string;
  selectionModeOff: string;
  errorCopyFailed: string;
  errorInitFailed: string;
  initSuccess: string;
  calendarNotFound: string;
}

export type MessagesMap = Record<Locale, Messages>;
