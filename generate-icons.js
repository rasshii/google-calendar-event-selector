/**
 * アイコン生成スクリプト
 *
 * Chrome拡張機能で使用するアイコン画像を生成します。
 * SVGファイルから複数のサイズのPNG画像を生成し、public/ディレクトリに出力します。
 *
 * 生成されるアイコン：
 * - icon16.png (16x16) - ツールバーアイコン（小）
 * - icon48.png (48x48) - 拡張機能管理画面
 * - icon128.png (128x128) - Chromeウェブストア
 *
 * 実行方法：
 * ```bash
 * node generate-icons.js
 * ```
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESモジュールで__dirnameを取得するための設定
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 入力SVGファイルのパス
const svgPath = path.join(__dirname, 'public', 'icon.svg');

// 出力先ディレクトリ
const outputDir = path.join(__dirname, 'public');

/**
 * 生成するアイコンのサイズと名前の定義
 * Chrome拡張機能で必要な標準サイズ
 */
const sizes = [
  { size: 16, name: 'icon16.png' },   // ツールバー用（小）
  { size: 48, name: 'icon48.png' },   // 拡張機能管理画面用
  { size: 128, name: 'icon128.png' }  // Chromeウェブストア用
];

/**
 * SVGからPNGアイコンを生成する非同期関数
 *
 * sharpライブラリを使用してSVGを各サイズのPNGに変換します。
 * 各アイコンはpublic/ディレクトリに出力されます。
 */
async function generateIcons() {
  // SVGファイルを読み込み
  const svgBuffer = fs.readFileSync(svgPath);

  // 各サイズのアイコンを生成
  for (const { size, name } of sizes) {
    const outputPath = path.join(outputDir, name);

    // sharpでSVGをリサイズしてPNGに変換
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`Generated ${name} (${size}x${size})`);
  }

  console.log('All icons generated successfully!');
}

// アイコン生成を実行（エラーが発生した場合はコンソールに出力）
generateIcons().catch(console.error);
