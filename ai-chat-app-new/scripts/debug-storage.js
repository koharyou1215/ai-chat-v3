// 設定永続化の詳細診断スクリプト
console.log('🔍 AI Chat V3 設定永続化診断開始');

// 1. LocalStorage全体の確認
console.log('\n=== LocalStorage全体 ===');
if (typeof window !== 'undefined' && window.localStorage) {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('ai-chat-v3')) {
      const value = localStorage.getItem(key);
      const size = value ? (value.length / 1024).toFixed(2) : '0';
      console.log(`${key}: ${size}KB`);
    }
  }
} else {
  console.log('❌ localStorage不可');
}

// 2. メインストレージの詳細解析
console.log('\n=== ai-chat-v3-storage詳細 ===');
try {
  const mainStorage = localStorage.getItem('ai-chat-v3-storage');
  if (mainStorage) {
    const parsed = JSON.parse(mainStorage);
    console.log('State keys:', Object.keys(parsed.state || {}));
    
    // 設定関連のキー確認
    const state = parsed.state || {};
    console.log('\n🎯 設定値確認:');
    console.log('- autoTrackerUpdate:', state.effectSettings?.autoTrackerUpdate);
    console.log('- emotional_memory_enabled:', state.emotionalIntelligenceFlags?.emotional_memory_enabled);
    console.log('- enableSystemPrompt:', state.enableSystemPrompt);
    console.log('- enableJailbreakPrompt:', state.enableJailbreakPrompt);
    
    // システムプロンプト確認
    if (state.systemPrompts) {
      console.log('\n📝 システムプロンプト:');
      console.log('- system:', state.systemPrompts.system ? 'Set' : 'Empty');
      console.log('- jailbreak:', state.systemPrompts.jailbreak ? 'Set' : 'Empty');
      console.log('- replySuggestion:', state.systemPrompts.replySuggestion ? 'Set' : 'Empty');
      console.log('- textEnhancement:', state.systemPrompts.textEnhancement ? 'Set' : 'Empty');
    }
    
    // バージョン確認
    console.log('\n📱 ストレージ情報:');
    console.log('- version:', parsed.version);
    console.log('- size:', (mainStorage.length / 1024).toFixed(2) + 'KB');
    
  } else {
    console.log('❌ ai-chat-v3-storageが存在しない');
  }
} catch (error) {
  console.error('❌ ai-chat-v3-storage解析失敗:', error);
}

console.log('\n🔍 診断完了');