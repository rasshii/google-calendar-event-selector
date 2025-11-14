/**
 * オーバーレイ診断スクリプト
 *
 * 選択モードON時にオーバーレイが表示されない問題を診断します
 */
(function() {
  console.log('='.repeat(60));
  console.log('🔍 グリッドオーバーレイ診断');
  console.log('='.repeat(60));

  const results = {
    success: [],
    warnings: [],
    errors: []
  };

  // 1. オーバーレイ要素の存在確認
  console.log('\n1️⃣ オーバーレイ要素の確認...');
  const overlay = document.querySelector('.gcal-grid-overlay');

  if (overlay) {
    results.success.push('✅ オーバーレイ要素が見つかりました');
    console.log('  ✅ オーバーレイ要素が見つかりました');

    // スタイル情報
    const styles = window.getComputedStyle(overlay);
    console.log('  📊 オーバーレイのスタイル情報:');
    console.log('    display:', overlay.style.display, '(computed:', styles.display + ')');
    console.log('    pointer-events:', overlay.style.pointer Events, '(computed:', styles.pointerEvents + ')');
    console.log('    z-index:', overlay.style.zIndex, '(computed:', styles.zIndex + ')');
    console.log('    background:', overlay.style.background, '(computed:', styles.background + ')');
    console.log('    cursor:', overlay.style.cursor, '(computed:', styles.cursor + ')');
    console.log('    position:', overlay.style.position, '(computed:', styles.position + ')');

    // 位置・サイズ情報
    const rect = overlay.getBoundingClientRect();
    console.log('  📐 オーバーレイの位置・サイズ:');
    console.log('    top:', rect.top);
    console.log('    left:', rect.left);
    console.log('    width:', rect.width);
    console.log('    height:', rect.height);
    console.log('    right:', rect.right);
    console.log('    bottom:', rect.bottom);

    if (rect.width === 0 || rect.height === 0) {
      results.errors.push('❌ オーバーレイのサイズが0です');
      console.error('  ❌ オーバーレイのサイズが0です（表示されません）');
    } else {
      results.success.push('✅ オーバーレイのサイズは正常です');
      console.log('  ✅ オーバーレイのサイズは正常です');
    }

    // 親要素の確認
    console.log('  👪 親要素の情報:');
    const parent = overlay.parentElement;
    if (parent) {
      console.log('    タグ名:', parent.tagName);
      console.log('    クラス:', parent.className);
      const parentStyles = window.getComputedStyle(parent);
      console.log('    position:', parentStyles.position);
      const parentRect = parent.getBoundingClientRect();
      console.log('    サイズ:', parentRect.width, 'x', parentRect.height);

      if (parentRect.width === 0 || parentRect.height === 0) {
        results.errors.push('❌ 親要素のサイズが0です');
        console.error('  ❌ 親要素のサイズが0です');
      }
    } else {
      results.errors.push('❌ オーバーレイに親要素がありません');
      console.error('  ❌ オーバーレイに親要素がありません');
    }

    // display状態のチェック
    if (styles.display === 'none') {
      results.warnings.push('⚠️  オーバーレイがdisplay: noneです（選択モードOFFの可能性）');
      console.warn('  ⚠️  オーバーレイがdisplay: noneです');
      console.warn('  💡 選択モードボタンをクリックしてONにしてください');
    } else if (styles.display === 'block') {
      results.success.push('✅ オーバーレイはdisplay: blockです');
      console.log('  ✅ オーバーレイはdisplay: blockです');
    }

  } else {
    results.errors.push('❌ オーバーレイ要素が見つかりません');
    console.error('  ❌ オーバーレイ要素(.gcal-grid-overlay)が見つかりません');
    console.error('  💡 拡張機能が正しく初期化されていない可能性があります');
  }

  // 2. カレンダーグリッドの確認
  console.log('\n2️⃣ カレンダーグリッドの確認...');
  const grids = document.querySelectorAll('[data-datekey]');

  if (grids.length > 0) {
    results.success.push(`✅ ${grids.length}個のグリッドが見つかりました`);
    console.log(`  ✅ ${grids.length}個のグリッドが見つかりました`);

    grids.forEach((grid, i) => {
      const gridRect = grid.getBoundingClientRect();
      const gridStyles = window.getComputedStyle(grid);
      console.log(`  📅 グリッド${i + 1}:`, grid.getAttribute('data-datekey'));
      console.log(`    位置: (${gridRect.left}, ${gridRect.top})`);
      console.log(`    サイズ: ${gridRect.width}x${gridRect.height}`);
      console.log(`    pointer-events: ${gridStyles.pointerEvents}`);
    });

    // 最初のグリッドの親要素を確認
    const firstGrid = grids[0];
    const gridParent = firstGrid.parentElement;
    if (gridParent) {
      console.log('  👪 グリッドの親要素:');
      console.log('    タグ名:', gridParent.tagName);
      console.log('    クラス:', gridParent.className);
      const parentRect = gridParent.getBoundingClientRect();
      console.log('    位置: (' + parentRect.left + ', ' + parentRect.top + ')');
      console.log('    サイズ: ' + parentRect.width + 'x' + parentRect.height);

      // オーバーレイと親要素の比較
      if (overlay && gridParent.contains(overlay)) {
        results.success.push('✅ オーバーレイはグリッドの親要素内にあります');
        console.log('  ✅ オーバーレイはグリッドの親要素内にあります');
      } else if (overlay) {
        results.warnings.push('⚠️  オーバーレイがグリッドの親要素内にありません');
        console.warn('  ⚠️  オーバーレイがグリッドの親要素内にありません');
      }
    }
  } else {
    results.errors.push('❌ カレンダーグリッドが見つかりません');
    console.error('  ❌ カレンダーグリッドが見つかりません');
    console.error('  💡 週表示になっていますか？');
  }

  // 3. 選択モードの状態確認
  console.log('\n3️⃣ 選択モードの状態確認...');
  const modeBtn = document.querySelector('#gcal-selection-mode-btn');

  if (modeBtn) {
    const isActive = modeBtn.getAttribute('aria-pressed') === 'true';
    console.log('  選択モード:', isActive ? 'ON' : 'OFF');
    console.log('  ボタンテキスト:', modeBtn.textContent);

    if (!isActive) {
      results.warnings.push('⚠️  選択モードがOFFです');
      console.warn('  ⚠️  選択モードがOFFです');
      console.warn('  💡 ボタンをクリックしてONにしてください');
    } else {
      results.success.push('✅ 選択モードはONです');
      console.log('  ✅ 選択モードはONです');
    }
  }

  // 4. Z-index競合のチェック
  console.log('\n4️⃣ Z-index競合のチェック...');
  if (overlay) {
    const overlayZIndex = parseInt(window.getComputedStyle(overlay).zIndex) || 0;
    console.log('  オーバーレイのz-index:', overlayZIndex);

    // カレンダー要素のz-indexをチェック
    let maxCalendarZIndex = 0;
    grids.forEach(grid => {
      const zIndex = parseInt(window.getComputedStyle(grid).zIndex) || 0;
      if (zIndex > maxCalendarZIndex) {
        maxCalendarZIndex = zIndex;
      }
    });

    console.log('  カレンダー要素の最大z-index:', maxCalendarZIndex);

    if (overlayZIndex <= maxCalendarZIndex) {
      results.errors.push('❌ オーバーレイのz-indexが不足しています');
      console.error('  ❌ オーバーレイのz-indexがカレンダー要素より低いです');
      console.error('  💡 オーバーレイが背面に隠れている可能性があります');
    } else {
      results.success.push('✅ Z-indexは適切です');
      console.log('  ✅ Z-indexは適切です');
    }
  }

  // 結果サマリー
  console.log('\n' + '='.repeat(60));
  console.log('📋 診断結果サマリー');
  console.log('='.repeat(60));

  if (results.success.length > 0) {
    console.log('\n✅ 成功:');
    results.success.forEach(msg => console.log('  ' + msg));
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️  警告:');
    results.warnings.forEach(msg => console.warn('  ' + msg));
  }

  if (results.errors.length > 0) {
    console.log('\n❌ エラー:');
    results.errors.forEach(msg => console.error('  ' + msg));
  }

  // 推奨アクション
  console.log('\n' + '='.repeat(60));
  console.log('💡 推奨アクション');
  console.log('='.repeat(60));

  if (results.errors.some(e => e.includes('サイズが0'))) {
    console.log('\n👉 オーバーレイまたは親要素のサイズが0です');
    console.log('   原因: オーバーレイの配置ロジックに問題があります');
    console.log('   対応: 開発者に診断結果を共有してください');
  } else if (results.errors.some(e => e.includes('z-index'))) {
    console.log('\n👉 Z-indexの問題があります');
    console.log('   原因: オーバーレイがカレンダー要素の背面に隠れています');
    console.log('   対応: 開発者に診断結果を共有してください');
  } else if (results.warnings.some(w => w.includes('選択モードがOFF'))) {
    console.log('\n👉 選択モードをONにしてください');
    console.log('   ボタンをクリックすると、オーバーレイが表示されます');
  } else if (results.success.length > 5) {
    console.log('\n✨ すべての診断項目が正常です！');
    console.log('   オーバーレイは正しく動作しているはずです');
    console.log('   カレンダー上でドラッグしてみてください');
  }

  console.log('\n' + '='.repeat(60));

  return {
    success: results.success.length,
    warnings: results.warnings.length,
    errors: results.errors.length,
    details: results,
    overlay: overlay,
    grids: grids
  };
})();
