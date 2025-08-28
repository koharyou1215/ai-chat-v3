/**
 * ストレージ使用状況チェックユーティリティ
 */

export function checkStorageUsage(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    console.log('LocalStorage is not available');
    return;
  }

  console.log('📊 === LocalStorage Usage Report ===');
  
  let totalSize = 0;
  const items: { key: string; size: number; sizeKB: number; sizeMB: number }[] = [];
  
  // 各キーのサイズを計算
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key) || '';
      const size = new Blob([key + value]).size;
      totalSize += size;
      items.push({
        key,
        size,
        sizeKB: size / 1024,
        sizeMB: size / (1024 * 1024)
      });
    }
  }
  
  // サイズでソート（大きい順）
  items.sort((a, b) => b.size - a.size);
  
  // 総使用量
  console.log(`\n📦 Total Storage Used: ${(totalSize / (1024 * 1024)).toFixed(2)} MB (${(totalSize / 1024).toFixed(0)} KB)`);
  console.log(`📏 Estimated Limit: ~5-10 MB`);
  console.log(`📊 Usage: ${((totalSize / (5 * 1024 * 1024)) * 100).toFixed(1)}% of 5MB limit`);
  
  // 各アイテムのサイズ
  console.log('\n📋 Storage Items (sorted by size):');
  console.table(items.map(item => ({
    Key: item.key.substring(0, 30) + (item.key.length > 30 ? '...' : ''),
    'Size (KB)': item.sizeKB.toFixed(1),
    'Size (MB)': item.sizeMB.toFixed(3),
    'Percentage': ((item.size / totalSize) * 100).toFixed(1) + '%'
  })));
  
  // 大きなアイテムの詳細
  if (items.length > 0 && items[0].sizeMB > 1) {
    console.log('\n⚠️ Large Items Detected:');
    items.filter(item => item.sizeMB > 1).forEach(item => {
      console.log(`  - ${item.key}: ${item.sizeMB.toFixed(2)} MB`);
      
      // ai-chat-v3-storageの場合は内容を解析
      if (item.key === 'ai-chat-v3-storage') {
        try {
          const data = JSON.parse(localStorage.getItem(item.key) || '{}');
          if (data.state) {
            const analysis: Record<string, number> = {};
            
            // 各セクションのサイズを計算
            for (const [key, value] of Object.entries(data.state)) {
              const sectionSize = new Blob([JSON.stringify(value)]).size;
              analysis[key] = sectionSize / 1024; // KB
            }
            
            console.log('\n    📂 Content Analysis (KB):');
            Object.entries(analysis)
              .sort((a, b) => b[1] - a[1])
              .forEach(([key, sizeKB]) => {
                console.log(`      - ${key}: ${sizeKB.toFixed(1)} KB`);
              });
            
            // セッション数とキャラクター数
            if (data.state.sessions) {
              const sessionCount = Object.keys(data.state.sessions).length;
              console.log(`\n    📝 Sessions: ${sessionCount}`);
            }
            if (data.state.characters) {
              const charCount = Array.isArray(data.state.characters) 
                ? data.state.characters.length 
                : Object.keys(data.state.characters).length;
              console.log(`    👥 Characters: ${charCount}`);
            }
            if (data.state.memoryCards) {
              const memCount = Array.isArray(data.state.memoryCards)
                ? data.state.memoryCards.length
                : 0;
              console.log(`    🎴 Memory Cards: ${memCount}`);
            }
          }
        } catch (e) {
          console.error('    ❌ Failed to parse storage data:', e);
        }
      }
    });
  }
  
  // 推奨事項
  console.log('\n💡 Recommendations:');
  if (totalSize > 4 * 1024 * 1024) {
    console.log('  ⚠️ Storage usage is HIGH (>4MB). Consider:');
    console.log('    1. Delete unused characters');
    console.log('    2. Clear old chat sessions');
    console.log('    3. Remove memory cards');
  } else if (totalSize > 3 * 1024 * 1024) {
    console.log('  ⚠️ Storage usage is MODERATE (>3MB). Monitor closely.');
  } else {
    console.log('  ✅ Storage usage is healthy (<3MB).');
  }
  
  console.log('\n🛠️ Quick Actions:');
  console.log('  - Clear all: localStorage.clear()');
  console.log('  - Remove specific: localStorage.removeItem("key")');
  console.log('  - Run cleanup: StorageCleaner.cleanupLocalStorage()');
}

// グローバルに公開
if (typeof window !== 'undefined') {
  (window as any).checkStorage = checkStorageUsage;
  
  // ページ読み込み時に自動実行（開発環境のみ）
  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      console.log('💡 Tip: Run checkStorage() in console to see storage usage');
    }, 2000);
  }
}