// チャット履歴保存の診断スクリプト
console.log('🔍 チャット履歴保存診断開始');

// 1. LocalStorage確認
function checkLocalStorage() {
  console.log('\n=== LocalStorage確認 ===');
  
  const mainKey = 'ai-chat-v3-storage';
  const data = localStorage.getItem(mainKey);
  
  if (!data) {
    console.error('❌ メインストレージが見つかりません');
    return null;
  }
  
  try {
    const parsed = JSON.parse(data);
    console.log('✅ メインストレージが存在します');
    console.log('データサイズ:', (data.length / 1024).toFixed(2), 'KB');
    
    // セッション確認
    if (parsed.state?.sessions) {
      let sessionCount = 0;
      if (parsed.state.sessions._type === 'map' && parsed.state.sessions.value) {
        sessionCount = parsed.state.sessions.value.length;
      } else if (parsed.state.sessions instanceof Map) {
        sessionCount = parsed.state.sessions.size;
      }
      console.log('セッション数:', sessionCount);
    } else {
      console.warn('⚠️ セッションデータが見つかりません');
    }
    
    return parsed;
  } catch (error) {
    console.error('❌ データの解析に失敗:', error);
    return null;
  }
}

// 2. Zustandストア確認
function checkZustandStore() {
  console.log('\n=== Zustandストア確認 ===');
  
  if (typeof window === 'undefined' || !window.useAppStore) {
    console.warn('⚠️ useAppStoreが利用できません');
    return;
  }
  
  try {
    const store = window.useAppStore.getState();
    console.log('✅ Zustandストアにアクセス可能');
    
    if (store.sessions) {
      console.log('セッション数 (Zustand):', store.sessions.size || 0);
      console.log('アクティブセッションID:', store.active_session_id);
    } else {
      console.warn('⚠️ セッションがZustandストアに存在しません');
    }
  } catch (error) {
    console.error('❌ Zustandストアの確認に失敗:', error);
  }
}

// 3. セッション保存テスト
function testSessionSaving() {
  console.log('\n=== セッション保存テスト ===');
  
  // LocalStorageサイズ確認
  let totalSize = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      totalSize += localStorage[key].length;
    }
  }
  
  console.log('LocalStorage総使用量:', (totalSize / 1024).toFixed(2), 'KB');
  console.log('推定制限値: 5-10MB');
  
  if (totalSize > 5 * 1024 * 1024) {
    console.warn('⚠️ ストレージ使用量が制限に近づいています');
  }
}

// 4. 実行
function runDiagnostics() {
  console.clear();
  console.log('🔍 チャット履歴保存診断開始');
  
  const storageData = checkLocalStorage();
  checkZustandStore();
  testSessionSaving();
  
  console.log('\n=== 診断完了 ===');
  console.log('💡 チャットメッセージを送信してから再度実行してください');
  
  return storageData;
}

// グローバルに公開
if (typeof window !== 'undefined') {
  window.debugChatHistory = runDiagnostics;
  window.checkStorage = checkLocalStorage;
}

// 自動実行
runDiagnostics();