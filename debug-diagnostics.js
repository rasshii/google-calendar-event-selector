/**
 * Google Calendar Time Slot Selector - 診断スクリプト
 *
 * このスクリプトをChromeデベロッパーツールのコンソールで実行してください
 */
(function() {
  console.log('='.repeat(60));
  console.log('📊 Google Calendar Time Slot Selector 診断');
  console.log('='.repeat(60));

  const results = {
    success: [],
    warnings: [],
    errors: []
  };

  // 1. パネルの存在確認
  console.log('\n1️⃣ パネルの存在確認...');
  const panel = document.querySelector('#gcal-event-selector-panel');
  if (panel) {
    results.success.push('✅ パネルが見つかりました');
    console.log('  ✅ パネルが見つかりました');
    console.log('  位置:', panel.getBoundingClientRect());
    console.log('  表示:', window.getComputedStyle(panel).display);
  } else {
    results.errors.push('❌ パネルが見つかりません');
    console.error('  ❌ パネルが見つかりません');
  }

  // 2. 選択モードボタンの確認
  console.log('\n2️⃣ 選択モードボタンの確認...');
  const modeBtn = document.querySelector('#gcal-selection-mode-btn');
  if (modeBtn) {
    results.success.push('✅ 選択モードボタンが見つかりました');
    console.log('  ✅ 選択モードボタンが見つかりました');
    console.log('  テキスト:', modeBtn.textContent);
    console.log('  aria-pressed:', modeBtn.getAttribute('aria-pressed'));
    console.log('  クラス:', modeBtn.className);

    if (modeBtn.getAttribute('aria-pressed') === 'true') {
      results.success.push('✅ 選択モードがONです');
      console.log('  ✅ 選択モードがONです');
    } else {
      results.warnings.push('⚠️  選択モードがOFFです（これが原因の可能性が高い）');
      console.warn('  ⚠️  選択モードがOFFです');
      console.warn('  💡 ボタンをクリックしてONにしてください');
    }
  } else {
    results.errors.push('❌ 選択モードボタンが見つかりません');
    console.error('  ❌ 選択モードボタンが見つかりません');
  }

  // 3. グリッドオーバーレイの確認
  console.log('\n3️⃣ グリッドオーバーレイの確認...');
  const overlay = document.querySelector('.gcal-grid-overlay');
  if (overlay) {
    results.success.push('✅ グリッドオーバーレイが見つかりました');
    console.log('  ✅ グリッドオーバーレイが見つかりました');
    console.log('  display:', overlay.style.display);
    console.log('  pointer-events:', overlay.style.pointerEvents);
    console.log('  位置:', overlay.getBoundingClientRect());

    if (overlay.style.display === 'block' && overlay.style.pointerEvents === 'auto') {
      results.success.push('✅ オーバーレイがアクティブです');
      console.log('  ✅ オーバーレイがアクティブです');
    } else {
      results.warnings.push('⚠️  オーバーレイが非アクティブです');
      console.warn('  ⚠️  オーバーレイが非アクティブです（選択モードOFFのため）');
    }
  } else {
    results.errors.push('❌ グリッドオーバーレイが見つかりません');
    console.error('  ❌ グリッドオーバーレイが見つかりません');
  }

  // 4. カレンダーグリッドの確認
  console.log('\n4️⃣ カレンダーグリッドの確認...');
  const grids = document.querySelectorAll('[data-datekey]');
  if (grids.length > 0) {
    results.success.push(`✅ ${grids.length}個のグリッドが見つかりました`);
    console.log(`  ✅ ${grids.length}個のグリッドが見つかりました`);
    grids.forEach((grid, i) => {
      console.log(`  グリッド${i + 1}:`, grid.getAttribute('data-datekey'));
    });
  } else {
    results.errors.push('❌ カレンダーグリッドが見つかりません');
    console.error('  ❌ カレンダーグリッドが見つかりません');
    console.error('  週表示になっていますか？');
  }

  // 5. グローバルオブジェクトの確認
  console.log('\n5️⃣ グローバルオブジェクトの確認...');
  if (window.__slotManager) {
    results.success.push('✅ SlotManagerが見つかりました');
    console.log('  ✅ SlotManagerが見つかりました');
    const slots = window.__slotManager.getSlots();
    console.log('  選択中のスロット数:', slots.length);
  } else {
    results.errors.push('❌ SlotManagerが見つかりません（拡張機能が初期化されていない）');
    console.error('  ❌ SlotManagerが見つかりません');
  }

  // 6. コンソールエラーの確認
  console.log('\n6️⃣ 初期化メッセージの確認...');
  console.log('  💡 上のログに「Google Calendar Time Slot Selector が初期化されました」');
  console.log('     というメッセージがあれば、拡張機能は正常に起動しています');

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

  if (results.errors.length === 0 && results.warnings.some(w => w.includes('選択モードがOFF'))) {
    console.log('\n👉 選択モードボタンをクリックしてONにしてください');
    console.log('   ボタンの場所: パネル内の「⏸️ 選択モード OFF」ボタン');
    console.log('   ONにすると: 「🎯 選択モード ON」に変わります');
  } else if (results.errors.length > 0) {
    console.log('\n👉 拡張機能が正しく初期化されていません');
    console.log('   1. chrome://extensions/ で拡張機能を再読み込み');
    console.log('   2. Google Calendarページをリロード');
    console.log('   3. 週表示になっているか確認');
  }

  console.log('\n' + '='.repeat(60));

  return {
    success: results.success.length,
    warnings: results.warnings.length,
    errors: results.errors.length,
    details: results
  };
})();
