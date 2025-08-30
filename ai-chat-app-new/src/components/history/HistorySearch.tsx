'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  MessageSquare, 
  Clock,
  History,
  Target
} from 'lucide-react';
import { UnifiedMessage } from '@/types';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

interface HistorySearchProps {
  session_id: string;
  className?: string;
}

interface HistoryStats {
  total_messages: number;
  total_duration_hours: number;
  avg_messages_per_session: number;
}

interface TopicData {
  name: string;
  count: number;
}

import type { HistoryStatistics, TopicAnalysis } from '@/store/slices/history.slice';

export const HistorySearch: React.FC<HistorySearchProps> = ({ 
  session_id,
  className 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [searchType, setSearchType] = useState<'keyword' | 'vector' | 'pattern'>('keyword');
  const [searchResults, setSearchResults] = useState<UnifiedMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // const [selectedMessage, setSelectedMessage] = useState<UnifiedMessage | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  const { 
    searchConversationHistory,
    // getConversationHistory,
    generateConversationSummary,
    analyzeConversationPatterns,
    vectorSearch,
    getHistoryStatistics,
    getPopularTopics,
    getConversationTrends
  } = useAppStore();
  
  // 検索実行
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      let results: UnifiedMessage[] = [];
      
      switch (searchType) {
        case 'keyword':
          const keywordResults = await searchConversationHistory(searchQuery, session_id);
          results = keywordResults.messages || [];
          break;
        case 'vector':
          const vectorResults = await vectorSearch(searchQuery, 10);
          results = vectorResults.map(result => result.memory_item).filter((item): item is UnifiedMessage => 'role' in item) || [];
          break;
        case 'pattern':
          // パターン検索は別途実装
          const patternResults = await searchConversationHistory(searchQuery, session_id);
          results = patternResults.messages || [];
          break;
      }
      
      setSearchResults(results);
    } catch (error: unknown) {
      console.error('検索エラー:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // 会話サマリー生成
  const handleGenerateSummary = async () => {
    try {
      const summary = await generateConversationSummary(session_id);
      console.log('会話サマリー:', summary);
      // サマリー表示の実装（モーダルなど）
    } catch (error) {
      console.error('サマリー生成エラー:', error);
    }
  };
  
  // パターン分析
  const handleAnalyzePatterns = async () => {
    try {
      const patterns = await analyzeConversationPatterns(session_id);
      console.log('会話パターン:', patterns);
      setShowAnalysis(true);
    } catch (error) {
      console.error('パターン分析エラー:', error);
    }
  };
  
  // 履歴統計取得
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [topics, setTopics] = useState<TopicData[]>([]);
  // const [trends, setTrends] = useState<Record<string, unknown>[]>([]);
  
  useEffect(() => {
    const loadHistoryData = async () => {
      try {
        const [historyStats, popularTopics] = await Promise.all([
          getHistoryStatistics(),
          getPopularTopics(),
          getConversationTrends()
        ]);
        
        // Convert HistoryStatistics to HistoryStats
        const statsData: HistoryStats = {
          total_messages: (historyStats as HistoryStatistics).total_messages,
          total_duration_hours: (historyStats as HistoryStatistics).total_conversation_hours,
          avg_messages_per_session: (historyStats as HistoryStatistics).average_messages_per_session
        };
        setStats(statsData);
        
        // Convert TopicAnalysis[] to TopicData[]
        const topicsData: TopicData[] = (popularTopics as TopicAnalysis[]).map(topic => ({
          name: topic.topic,
          count: topic.frequency
        }));
        setTopics(topicsData);
        // setTrends(conversationTrends);
      } catch (error) {
        console.error('履歴データ読み込みエラー:', error);
      }
    };
    
    loadHistoryData();
  }, [session_id, getHistoryStatistics, getPopularTopics, getConversationTrends]);
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ja-JP');
  };
  
  const getMessagePreview = (content: string, maxLength: number = 100) => {
    return content.length > maxLength ? `${content.substring(0, maxLength)}...` : content;
  };
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-green-400" />
          <h3 className="text-white font-medium">履歴検索</h3>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleGenerateSummary}
            className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs hover:bg-green-500/30 transition-colors"
          >
            サマリー生成
          </button>
          <button
            onClick={handleAnalyzePatterns}
            className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs hover:bg-blue-500/30 transition-colors"
          >
            パターン分析
          </button>
        </div>
      </div>
      
      {/* 検索フォーム */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="キーワードを入力..."
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500/50"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? '検索中...' : '検索'}
          </button>
        </div>
        
        <div className="flex gap-3">
          {/* 検索タイプ */}
          <div className="flex bg-white/10 rounded-lg p-1">
            {[
              { key: 'keyword', label: 'キーワード', icon: Search },
              { key: 'vector', label: 'ベクトル', icon: Target },
              { key: 'pattern', label: 'パターン', icon: Search }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSearchType(key as 'keyword' | 'vector' | 'pattern')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  searchType === key
                    ? 'bg-green-500/20 text-green-400'
                    : 'text-white/50 hover:text-white/70'
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
          
          {/* 日付範囲 */}
          <div className="flex bg-white/10 rounded-lg p-1">
            {[
              { key: 'all', label: 'すべて' },
              { key: 'today', label: '今日' },
              { key: 'week', label: '1週間' },
              { key: 'month', label: '1ヶ月' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setDateRange(key as 'all' | 'today' | 'week' | 'month')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  dateRange === key
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-white/50 hover:text-white/70'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* 統計情報 */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-3 text-center">
            <MessageSquare className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.total_messages}</div>
            <div className="text-xs text-white/60">総メッセージ数</div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-3 text-center">
            <Clock className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.total_duration_hours}</div>
            <div className="text-xs text-white/60">総会話時間</div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-3 text-center">
            <Search className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.avg_messages_per_session}</div>
            <div className="text-xs text-white/60">平均メッセージ数</div>
          </div>
        </motion.div>
      )}
      
      {/* 人気トピック */}
      {topics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4"
        >
          <h4 className="text-white font-medium text-sm mb-3">人気トピック</h4>
          <div className="flex flex-wrap gap-2">
            {topics.slice(0, 8).map((topic, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/70 border border-white/20"
              >
                {topic.name} ({topic.count})
              </span>
            ))}
          </div>
        </motion.div>
      )}
      
      {/* 検索結果 */}
      {searchResults && (
        <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="font-semibold text-white mb-2">検索結果</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {searchResults.map((result: UnifiedMessage) => (
              <div key={result.id} className="p-2 bg-white/5 rounded-lg">
                <p className="text-xs text-white/50">{formatDate(new Date(result.created_at).getTime())}</p>
                <p className="text-sm text-white">{getMessagePreview(result.content)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 検索結果なし */}
      {searchQuery && searchResults.length === 0 && !isSearching && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8 text-white/50"
        >
          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">検索結果が見つかりませんでした</p>
          <p className="text-xs text-white/30">別のキーワードや条件を試してみてください</p>
        </motion.div>
      )}
      
      {/* 会話パターン分析 */}
      <AnimatePresence>
        {showAnalysis && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium text-sm">会話パターン分析</h4>
              <button
                onClick={() => setShowAnalysis(false)}
                className="text-white/50 hover:text-white/70"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/60">会話の流れ:</span>
                  <span className="text-white/80">自然</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">感情の変化:</span>
                  <span className="text-white/80">安定</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/60">トピック数:</span>
                  <span className="text-white/80">5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">深さ:</span>
                  <span className="text-white/80">中程度</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
