/**
 * DOM Inspector for Google Calendar Grid Elements
 *
 * このスクリプトをChromeデベロッパーツールのコンソールで実行して、
 * data-datekey要素の構造を詳しく調査します
 */
(function() {
  console.log('='.repeat(80));
  console.log('🔍 DOM INSPECTOR: Analyzing [data-datekey] elements');
  console.log('='.repeat(80));

  const elements = document.querySelectorAll('[data-datekey]');
  console.log(`\nFound ${elements.length} elements with [data-datekey]\n`);

  // 1000px以上の高さを持つ要素（時間グリッド本体）のみをフィルタ
  const largeElements = Array.from(elements).filter(el => el.offsetHeight > 1000);
  console.log(`Filtered to ${largeElements.length} large elements (height > 1000px)\n`);

  if (largeElements.length === 0) {
    console.error('No large grid elements found!');
    return;
  }

  // 最初の要素を詳しく調査
  const firstEl = largeElements[0];
  console.log('━'.repeat(80));
  console.log('📊 Analyzing first grid element in detail:');
  console.log('━'.repeat(80));

  console.log('\n1️⃣ Basic Info:');
  console.log('  tagName:', firstEl.tagName);
  console.log('  className:', firstEl.className);
  console.log('  id:', firstEl.id);
  console.log('  offsetHeight:', firstEl.offsetHeight);
  console.log('  offsetWidth:', firstEl.offsetWidth);

  console.log('\n2️⃣ data-* Attributes:');
  Array.from(firstEl.attributes).forEach(attr => {
    if (attr.name.startsWith('data-')) {
      console.log(`  ${attr.name}: "${attr.value}"`);
    }
  });

  console.log('\n3️⃣ aria-* Attributes:');
  Array.from(firstEl.attributes).forEach(attr => {
    if (attr.name.startsWith('aria-')) {
      console.log(`  ${attr.name}: "${attr.value}"`);
    }
  });

  console.log('\n4️⃣ All Attributes:');
  Array.from(firstEl.attributes).forEach(attr => {
    console.log(`  ${attr.name}: "${attr.value}"`);
  });

  console.log('\n5️⃣ Parent Element:');
  const parent = firstEl.parentElement;
  if (parent) {
    console.log('  tagName:', parent.tagName);
    console.log('  className:', parent.className);
    console.log('  Attributes:');
    Array.from(parent.attributes).forEach(attr => {
      console.log(`    ${attr.name}: "${attr.value}"`);
    });
  }

  console.log('\n6️⃣ Grandparent Element:');
  const grandparent = parent?.parentElement;
  if (grandparent) {
    console.log('  tagName:', grandparent.tagName);
    console.log('  className:', grandparent.className);
    console.log('  Attributes:');
    Array.from(grandparent.attributes).forEach(attr => {
      console.log(`    ${attr.name}: "${attr.value}"`);
    });
  }

  console.log('\n7️⃣ Child Elements (first 5):');
  Array.from(firstEl.children).slice(0, 5).forEach((child, i) => {
    console.log(`  Child ${i + 1}:`);
    console.log(`    tagName: ${child.tagName}`);
    console.log(`    className: ${child.className}`);
    console.log(`    textContent (first 50 chars): "${child.textContent?.substring(0, 50)}"`);

    // 子要素の属性
    const childAttrs = Array.from(child.attributes);
    if (childAttrs.length > 0) {
      console.log(`    Attributes:`);
      childAttrs.forEach(attr => {
        console.log(`      ${attr.name}: "${attr.value}"`);
      });
    }
  });

  console.log('\n8️⃣ Searching for date-related content in nearby elements:');

  // 親要素のツリーを上に遡って日付情報を探す
  let currentEl = firstEl;
  let level = 0;
  while (currentEl && level < 5) {
    console.log(`\n  Level ${level} (${currentEl.tagName}.${currentEl.className}):`);

    // この要素とその兄弟要素で日付らしき情報を探す
    const siblings = currentEl.parentElement?.children || [];
    Array.from(siblings).forEach((sibling, idx) => {
      const text = sibling.textContent?.trim();

      // 日付パターンをチェック
      const hasDate = text && (
        /\d{4}年\d{1,2}月\d{1,2}日/.test(text) ||
        /\d{1,2}月\d{1,2}日/.test(text) ||
        /\d{1,2}\/\d{1,2}/.test(text) ||
        /\w+ \d{1,2}/.test(text)
      );

      if (hasDate) {
        console.log(`    Sibling ${idx} contains date: "${text?.substring(0, 100)}"`);
      }
    });

    currentEl = currentEl.parentElement;
    level++;
  }

  console.log('\n9️⃣ Checking header elements for date info:');
  // カレンダーのヘッダー要素を探す
  const headers = document.querySelectorAll('[data-datekey]');
  const smallHeaders = Array.from(headers).filter(el => el.offsetHeight < 100 && el.offsetHeight > 0);

  console.log(`  Found ${smallHeaders.length} small elements (potential headers)`);
  smallHeaders.forEach((header, idx) => {
    if (idx < 7) { // 最初の7つだけ表示（週の7日分）
      console.log(`\n  Header ${idx + 1}:`);
      console.log(`    data-datekey: ${header.getAttribute('data-datekey')}`);
      console.log(`    aria-label: ${header.getAttribute('aria-label')}`);
      console.log(`    textContent: "${header.textContent?.trim().substring(0, 100)}"`);
      console.log(`    className: ${header.className}`);
    }
  });

  console.log('\n🔟 Testing Date Extraction Strategies:');

  // Strategy 1: Check siblings of the grid element
  console.log('\n  Strategy 1: Sibling elements');
  if (parent) {
    Array.from(parent.children).forEach((sibling, idx) => {
      const datekey = sibling.getAttribute('data-datekey');
      if (datekey) {
        const ariaLabel = sibling.getAttribute('aria-label');
        const text = sibling.textContent?.trim().substring(0, 100);
        console.log(`    Sibling ${idx}: datekey="${datekey}", aria-label="${ariaLabel}", text="${text}"`);
      }
    });
  }

  // Strategy 2: Look for date in data attributes
  console.log('\n  Strategy 2: Data attributes in element tree');
  currentEl = firstEl;
  level = 0;
  while (currentEl && level < 3) {
    const dataAttrs = Array.from(currentEl.attributes).filter(attr => attr.name.startsWith('data-'));
    if (dataAttrs.length > 0) {
      console.log(`    Level ${level}:`, dataAttrs.map(a => `${a.name}="${a.value}"`).join(', '));
    }
    currentEl = currentEl.parentElement;
    level++;
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Analysis complete! Check the output above.');
  console.log('='.repeat(80));

  return {
    totalElements: elements.length,
    largeElements: largeElements.length,
    firstElement: firstEl,
    allLargeElements: largeElements
  };
})();
