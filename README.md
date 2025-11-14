# Google Calendar Time Slot Selector

Googleカレンダー上で空白箇所をドラッグ選択して、日時範囲をまとめてコピーできるChrome拡張機能です。

## 機能

- **ドラッグ選択**: カレンダー上の空白箇所をドラッグして時間帯を選択
- **選択モード切り替え**: ON/OFFボタンで選択モードを制御
- **15分単位スナップ**: 選択範囲を15分単位に自動調整
- **複数選択**: 複数の時間帯を選択してまとめてコピー可能
- **自動ソート**: 選択した時間帯を日時順に自動整理
- **見やすいUI**: ドラッグ可能なフローティングパネルで選択中の時間を常に確認
- **視覚的フィードバック**: 選択範囲を半透明のオーバーレイで表示
- **表示範囲外の自動除外**: カレンダーの日付を変更すると、表示範囲外の選択が自動的に除外されます
- **多言語対応**: 日本語・英語のGoogleカレンダーに対応
- **型安全**: TypeScriptで実装された堅牢なコード
- **セキュア**: XSS対策済み（innerHTML不使用）

## スクリーンショット

<!-- TODO: スクリーンショットを追加 -->

## インストール方法

### 前提条件

- Node.js 18.x 以上
- npm または yarn

### ビルドとインストール

1. このリポジトリをクローン:
   ```bash
   git clone https://github.com/rasshii/google-calendar-event-selector.git
   cd google-calendar-event-selector
   ```

2. 依存関係をインストール:
   ```bash
   npm install
   ```

3. プロジェクトをビルド:
   ```bash
   npm run build
   ```

4. Chromeで拡張機能ページを開く:
   - `chrome://extensions/` にアクセス
   - または、メニュー > その他のツール > 拡張機能

5. 「デベロッパーモード」を有効化（右上のトグル）

6. 「パッケージ化されていない拡張機能を読み込む」をクリック

7. プロジェクトの `dist` フォルダを選択

8. Googleカレンダー（https://calendar.google.com）を開いて使用開始

## 使い方

### 基本的な使い方

1. Googleカレンダー（週表示）を開くと、右上にフローティングパネルが表示されます

2. **選択モードをON**:
   - 「⏸️ 選択モード OFF」ボタンをクリックして「🎯 選択モード ON」に切り替え
   - 選択モードがONの時のみドラッグ選択が可能です
   - 選択モードOFF時は通常のGoogle Calendar操作が可能です

3. **時間帯を選択**:
   - 選択モードON時に、カレンダー上をマウスでドラッグ
   - 選択範囲が紫色の半透明ボックスで表示されます
   - 自動的に15分単位に調整されます

4. **複数選択**:
   - 続けて別の時間帯をドラッグして追加選択
   - 選択した時間帯はパネルにリスト表示されます

5. **コピー**:
   - 「📋 コピー」ボタンをクリック
   - 選択した時間帯がクリップボードにコピーされます

6. **削除**:
   - 個別削除: 各時間帯の「×」ボタンをクリック
   - 全削除: 「🗑️ クリア」ボタンで全選択をクリア

### コピー形式

選択した時間帯は以下の形式でコピーされます:

**日本語カレンダー:**
```
11月20日(水) 14:00~15:30
11月21日(木) 9:00~10:00
```

**英語カレンダー:**
```
Nov 20 (Wed) 2PM-3:30PM
Nov 21 (Thu) 9AM-10AM
```

### パネル操作

- **ドラッグ**: ヘッダーをドラッグしてパネルを自由に移動
- **最小化**: ヘッダーの「−」ボタンで最小化/展開

## 技術仕様

### 対応ブラウザ
- Google Chrome (Manifest V3対応)
- その他のChromiumベースのブラウザ（Edge, Brave等）

### 対応ページ
- Googleカレンダー (https://calendar.google.com/*)
- 週表示に対応（日表示・月表示は非対応）
- 日本語・英語版に対応

### 使用技術
- **TypeScript**: 型安全な実装
- **Vite**: 高速ビルドツール
- **Manifest V3**: 最新のChrome拡張機能仕様
- **モジュラーアーキテクチャ**: 保守性の高いコード構造

## ファイル構成

```
google-calendar-event-selector/
├── src/                    # TypeScriptソースコード
│   ├── content.ts          # エントリーポイント（Approach A実装）
│   ├── types/              # 型定義
│   ├── config/             # 設定定数
│   │   └── index.ts            # 統合設定（DEBUG_MODE含む）
│   ├── core/               # コアロジック
│   │   ├── grid-analyzer.ts    # グリッド解析
│   │   ├── drag-handler.ts     # ドラッグハンドリング
│   │   ├── slot-manager.ts     # スロット管理
│   │   └── selection-mode-manager.ts  # 選択モード管理
│   ├── ui/                 # UI関連
│   │   ├── panel.ts            # パネルUI
│   │   ├── overlay.ts          # オーバーレイ管理（Approach A）
│   │   └── notification.ts     # 通知UI
│   └── utils/              # ユーティリティ
│       ├── locale.ts           # ロケール処理
│       ├── formatter.ts        # フォーマッター
│       ├── time.ts             # 時間計算
│       ├── debug.ts            # デバッグログ制御
│       └── dom.ts              # DOM操作ヘルパー
├── public/                 # 静的ファイル
│   ├── manifest.json       # 拡張機能設定
│   ├── styles.css          # スタイルシート
│   └── icon*.png          # アイコン
├── dist/                   # ビルド出力（gitignore）
├── package.json           # npm設定
├── tsconfig.json          # TypeScript設定
├── vite.config.ts         # Vite設定
└── README.md              # このファイル
```

## 開発

### ローカル開発

1. リポジトリをクローン
2. 依存関係をインストール: `npm install`
3. 開発モードでビルド: `npm run dev`
   - ファイル変更を監視して自動リビルド
4. Chrome拡張機能ページで「更新」ボタンをクリック
5. Googleカレンダーをリロードして動作確認

### ビルドコマンド

```bash
# 開発ビルド（ウォッチモード）
npm run dev

# プロダクションビルド
npm run build

# 型チェックのみ
npm run type-check

# ディレクトリクリーン
npm run clean
```

### デバッグ

#### デバッグモードの制御

デバッグログの出力は `src/config/index.ts` の `DEBUG_MODE` フラグで制御できます:

```typescript
export const CONFIG = {
  /** デバッグモード（本番環境では false に設定） */
  DEBUG_MODE: true,  // false にするとすべてのデバッグログが無効化されます
  // ...
} as const;
```

- `DEBUG_MODE: true` - すべてのデバッグログが出力されます（開発時推奨）
- `DEBUG_MODE: false` - デバッグログが無効化され、エラーログのみ出力されます（本番環境推奨）

#### デバッグログの確認

- Chromeデベロッパーツールでコンソールログを確認
- 初期化成功時: `🚀 [App] ========== INITIALIZATION START ==========` から `✅ [App] ========== INITIALIZATION SUCCESS ==========` までのログが表示されます
- ログプレフィックス:
  - `[App]` - アプリケーション全体の動作
  - `[GridAnalyzer]` - グリッド解析処理
  - `[DragHandler]` - ドラッグ操作処理
  - `[Overlay]` - オーバーレイ制御
  - `[SelectionMode]` - 選択モード切り替え
  - `[SlotManager]` - スロット管理
- ソースマップが有効なので、TypeScriptファイルでデバッグ可能

## アーキテクチャ

### Approach A: シンプルなオーバーレイ戦略

この拡張機能は**Approach A**アーキテクチャを採用しています。Google Calendarのイベントシステムと拡張機能のイベントシステムを物理的に分離することで、イベント競合を完全に回避します。

#### 概要

1. **グリッドオーバーレイの作成**
   - カレンダーグリッド全体を透明なオーバーレイ(`position: fixed`)で覆います
   - `createGridOverlay()` で作成（overlay.ts:244）

2. **選択モードON時**
   - オーバーレイを表示し、`pointer-events: auto` に設定
   - Google Calendarグリッドを `pointer-events: none` で無効化
   - オーバーレイがすべてのマウスイベントをキャプチャ
   - `showGridOverlay()` で制御（overlay.ts:342）

3. **選択モードOFF時**
   - オーバーレイを非表示にし、`pointer-events: none` に設定
   - Google Calendarグリッドを再度有効化
   - 通常のGoogle Calendar操作が可能
   - `hideGridOverlay()` で制御（overlay.ts:400）

#### 利点

- **複雑なイベント判定ロジック不要**: オーバーレイが物理的にイベントを分離
- **Google Calendarとの競合なし**: 選択モードOFF時は完全に通常動作
- **ドラッグ選択の安定性向上**: 座標ベースの判定で確実に動作
- **保守性の向上**: シンプルで理解しやすい構造

### セルフドキュメンティングコード

- **明確な命名**: 関数名・変数名が意図を明確に表現
- **型安全性**: TypeScriptによる静的型チェック
- **モジュール分割**: 単一責任の原則に基づく設計
- **JSDocコメント**: すべての主要関数に詳細な説明
- **設定の集約**: すべての定数が `CONFIG` に集約され、マジックナンバーを排除

### 主要クラス

- `GridAnalyzer`: カレンダーグリッドの解析とキャッシュ（座標計算の中核）
- `DragHandler`: マウスドラッグイベントの処理（Approach A実装の核心）
- `SlotManager`: 選択された時間スロットの管理
- `SelectionModeManager`: 選択モードのON/OFF状態管理
- `TimeSlotSelectorApp`: アプリケーション全体の制御とライフサイクル管理
- `Debug`: デバッグログの制御（DEBUG_MODEによる一元管理）

### 設定管理

すべての設定定数は `src/config/index.ts` で一元管理:

```typescript
export const CONFIG = {
  // デバッグ制御
  DEBUG_MODE: true,

  // タイミング設定
  INIT_CHECK_INTERVAL_MS: 500,
  CALENDAR_CHANGE_DEBOUNCE_MS: 500,
  SCROLL_RESIZE_DEBOUNCE_MS: 100,

  // グリッド解析の閾値
  MIN_GRID_HEIGHT_PX: 1000,
  MIN_HOUR_HEIGHT_PX: 30,
  MAX_HOUR_HEIGHT_PX: 100,

  // その他の設定...
} as const;
```

## 既知の問題

- 月表示・日表示では動作しません（週表示のみ対応）
- 複数日にまたがる選択はできません（同日内のみ）
- 終日イベントの選択には非対応

## 今後の改善予定

- [ ] 日表示・月表示への対応
- [ ] カスタマイズ可能なコピー形式（設定画面）
- [ ] ショートカットキーのサポート
- [ ] 選択範囲のプリセット保存機能
- [ ] Chrome Web Storeへの公開

## 変更履歴

### v2.1.0 (2025-01-15)
- **大規模リファクタリング**: セルフドキュメンテーション化とベストプラクティスの適用
- **デバッグシステムの改善**: `Debug` クラスによる一元管理、`DEBUG_MODE` フラグで制御
- **設定の集約**: すべての定数を `CONFIG` に集約、マジックナンバーを排除
- **日付解析の改善**: `aria-label` が null の場合に `textContent` から日付を抽出する多段階フォールバック機構を実装
- **z-index問題の修正**: パネルのz-indexを200000に設定し、選択モードOFF時のボタン動作を修正
- **コードの自己文書化**: すべての主要関数にJSDocコメントを追加

### v2.0.0 (2024-11-14)
- **Approach A実装**: オーバーレイベースのイベントハンドリング戦略を採用
- 機能を完全に刷新: 既存予定の選択 → 空白時間帯のドラッグ選択
- TypeScript + Viteベースのモジュラー構造に移行
- 15分単位スナップ機能を実装
- 視覚的フィードバックの改善（半透明オーバーレイ）
- 選択モード切り替え機能の追加

### v1.2.0
- コードレビューとリファクタリング
- セルフドキュメンテーションの改善

### v1.1.0
- 英語版Googleカレンダー対応
- 終日イベント対応
- パフォーマンス最適化

### v1.0.0
- 初回リリース

## ライセンス

MIT License

## 作者

rasshii

## 貢献

プルリクエストやイシューの報告を歓迎します！

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## サポート

問題や質問がある場合は、GitHubのIssuesページで報告してください。
