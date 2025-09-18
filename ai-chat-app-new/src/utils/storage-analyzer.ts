/**
 * LocalStorage分析ツール
 * 何が容量を圧迫しているかを詳細に分析
 */

export class StorageAnalyzer {
  /**
   * LocalStorageの詳細分析
   */
  static analyzeStorage(): {
    totalSize: number;
    details: Array<{ key: string; size: number; percentage: number }>;
    breakdown: {
      sessions: number;
      groupSessions: number;
      characters: number;
      memoryCards: number;
      settings: number;
      other: number;
    };
  } {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { totalSize: 0, details: [], breakdown: { sessions: 0, groupSessions: 0, characters: 0, memoryCards: 0, settings: 0, other: 0 } };
    }
    
    const details: Array<{ key: string; size: number; percentage: number }> = [];
    let totalSize = 0;
    
    // 各キーのサイズを計算
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage[key];
        const size = value.length + key.length;
        totalSize += size;
        details.push({ key, size, percentage: 0 });
      }
    }
    
    // パーセンテージを計算
    details.forEach(item => {
      item.percentage = (item.size / totalSize) * 100;
    });
    
    // サイズでソート
    details.sort((a, b) => b.size - a.size);
    
    // メインストレージの内訳を分析
    const breakdown = {
      sessions: 0,
      groupSessions: 0,
      characters: 0,
      memoryCards: 0,
      settings: 0,
      other: 0
    };
    
    const mainKey = 'ai-chat-v3-storage';
    const mainData = localStorage.getItem(mainKey);
    if (mainData) {
      try {
        const parsed = JSON.parse(mainData);
        
        // セッションデータのサイズ
        if (parsed?.state?.sessions) {
          breakdown.sessions = JSON.stringify(parsed.state.sessions).length;
        }
        
        // グループセッションのサイズ
        if (parsed?.state?.groupSessions) {
          breakdown.groupSessions = JSON.stringify(parsed.state.groupSessions).length;
        }
        
        // キャラクターデータのサイズ
        if (parsed?.state?.characters) {
          breakdown.characters = JSON.stringify(parsed.state.characters).length;
        }
        
        // メモリカードのサイズ
        if (parsed?.state?.memoryCards || parsed?.state?.memories) {
          const memoryData = {
            cards: parsed.state.memoryCards || [],
            memories: parsed.state.memories || {}
          };
          breakdown.memoryCards = JSON.stringify(memoryData).length;
        }
        
        // 設定のサイズ
        const settings = {
          apiConfig: parsed.state?.apiConfig,
          systemPrompts: parsed.state?.systemPrompts,
          voice: parsed.state?.voice,
          effectSettings: parsed.state?.effectSettings
        };
        breakdown.settings = JSON.stringify(settings).length;
        
        // その他
        breakdown.other = mainData.length - breakdown.sessions - breakdown.groupSessions - breakdown.characters - breakdown.memoryCards - breakdown.settings;
      } catch (error) {
        console.error('Failed to analyze main storage:', error);
      }
    }
    
    return { totalSize, details, breakdown };
  }
  
  /**
   * 分析結果をコンソールに表示
   */
  static printAnalysis(): void {
    const analysis = this.analyzeStorage();
    const totalMB = analysis.totalSize / (1024 * 1024);
    
    console.log('📊 === LocalStorage Analysis ===');
    console.log(`📦 Total Size: ${totalMB.toFixed(2)}MB (${analysis.totalSize.toLocaleString()} bytes)`);
    
    console.log('\n🔍 Top Storage Users:');
    analysis.details.slice(0, 10).forEach((item, index) => {
      const sizeMB = item.size / (1024 * 1024);
      console.log(`  ${index + 1}. ${item.key}: ${sizeMB.toFixed(3)}MB (${item.percentage.toFixed(1)}%)`);
    });
    
    console.log('\n📋 Breakdown of ai-chat-v3-storage:');
    Object.entries(analysis.breakdown).forEach(([key, size]) => {
      const sizeMB = size / (1024 * 1024);
      const percentage = (size / analysis.totalSize) * 100;
      if (size > 0) {
        console.log(`  - ${key}: ${sizeMB.toFixed(3)}MB (${percentage.toFixed(1)}%)`);
      }
    });
    
    // 推奨事項
    console.log('\n💡 Recommendations:');
    const breakdownMB = {
      sessions: analysis.breakdown.sessions / (1024 * 1024),
      groupSessions: analysis.breakdown.groupSessions / (1024 * 1024),
      memoryCards: analysis.breakdown.memoryCards / (1024 * 1024),
      characters: analysis.breakdown.characters / (1024 * 1024)
    };
    
    if (breakdownMB.sessions > 1) {
      console.log('  ⚠️ Sessions are using too much space. Consider reducing session history.');
    }
    if (breakdownMB.groupSessions > 0.5) {
      console.log('  ⚠️ Group sessions are large. Consider limiting group chat history.');
    }
    if (breakdownMB.memoryCards > 0.5) {
      console.log('  ⚠️ Memory cards are accumulating. Consider reducing memory card limit.');
    }
    if (breakdownMB.characters > 0.5) {
      console.log('  ⚠️ Character data is large. Consider limiting character count or details.');
    }
    
    if (totalMB > 2) {
      console.log('  🚨 Total storage exceeds 2MB. Immediate cleanup recommended!');
    }
  }
  
  /**
   * セッション内のメッセージ数を分析
   */
  static analyzeMessages(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    const mainData = localStorage.getItem('ai-chat-v3-storage');
    if (!mainData) return;
    
    try {
      const parsed = JSON.parse(mainData);
      
      console.log('\n📬 === Message Analysis ===');
      
      // 通常セッション
      if (parsed?.state?.sessions) {
        const sessions = parsed.state.sessions;
        if (sessions._type === 'map' && sessions.value) {
          console.log(`\n📂 Regular Sessions: ${sessions.value.length}`);
          sessions.value.forEach((entry: [string, unknown], index: number) => {
            const session = entry[1] as { messages?: unknown[]; [key: string]: unknown };
            if (session?.messages) {
              const messageCount = Array.isArray(session.messages) ? session.messages.length : 0;
              const sizeMB = JSON.stringify(session.messages).length / (1024 * 1024);
              console.log(`  ${index + 1}. Session: ${messageCount} messages (${sizeMB.toFixed(3)}MB)`);
            }
          });
        }
      }
      
      // グループセッション
      if (parsed?.state?.groupSessions) {
        const groupSessions = parsed.state.groupSessions;
        if (groupSessions._type === 'map' && groupSessions.value) {
          console.log(`\n👥 Group Sessions: ${groupSessions.value.length}`);
          groupSessions.value.forEach((entry: [string, unknown], index: number) => {
            const session = entry[1] as { messages?: unknown[]; [key: string]: unknown };
            if (session?.messages) {
              const messageCount = Array.isArray(session.messages) ? session.messages.length : 0;
              const sizeMB = JSON.stringify(session.messages).length / (1024 * 1024);
              console.log(`  ${index + 1}. Group: ${messageCount} messages (${sizeMB.toFixed(3)}MB)`);
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to analyze messages:', error);
    }
  }
}

// グローバルに公開（デバッグ用）
if (typeof window !== 'undefined') {
  (window as Window & { StorageAnalyzer?: typeof StorageAnalyzer }).StorageAnalyzer = StorageAnalyzer;
  console.log('💾 Storage Analyzer loaded. Use StorageAnalyzer.printAnalysis() to analyze storage.');
}