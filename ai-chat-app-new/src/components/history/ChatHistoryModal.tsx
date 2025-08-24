'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Calendar, Filter, Trash2, Download } from 'lucide-react';
import { useAppStore } from '@/store';
import { UnifiedChatSession, HistoryStatistics } from '@/types';

export const ChatHistoryModal: React.FC = () => {
  const { 
    showHistoryModal, 
    setShowHistoryModal,
    active_session_id,
    getSessionHistory,
    searchConversationHistory,
    getSessionStatistics,
    // getHistoryStatistics
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [sessions, setSessions] = useState<UnifiedChatSession[]>([]);
  const [statistics, setStatistics] = useState<HistoryStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // const [isLoadingStats, setIsLoadingStats] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!active_session_id) return;
    setIsLoading(true);
    const history = await getSessionHistory();
    setSessions(history);
    setIsLoading(false);
  }, [active_session_id, getSessionHistory]);

  const loadStatistics = useCallback(async () => {
    if (!active_session_id) return;
    // setIsLoadingStats(true);
    const stats = await getSessionStatistics(active_session_id);
    setStatistics(stats);
    // setIsLoadingStats(false);
  }, [active_session_id, getSessionStatistics]);

  useEffect(() => {
    if (showHistoryModal) {
      loadHistory();
      loadStatistics();
    }
  }, [showHistoryModal, loadHistory, loadStatistics]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadHistory();
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchConversationHistory(searchQuery);
      setSessions(results.sessions);
    } catch (error) {
      console.error('検索に失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-800 rounded-lg border border-white/10 p-6 max-w-5xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              チャット履歴
            </h2>
            <button
              onClick={() => setShowHistoryModal(false)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Statistics */}
          {statistics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-400">{statistics.total_sessions}</div>
                <div className="text-sm text-white/60">総セッション数</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-400">{statistics.total_messages}</div>
                <div className="text-sm text-white/60">総メッセージ数</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-400">{statistics.average_session_length}</div>
                <div className="text-sm text-white/60">平均セッション時間</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-yellow-400">{statistics.total_conversation_hours}</div>
                <div className="text-sm text-white/60">総会話時間</div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="flex gap-2 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="セッションを検索..."
                className="w-full bg-slate-700 border border-white/10 rounded-lg pl-10 pr-3 py-2 text-white placeholder-white/50"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
            >
              検索
            </button>
            <button className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>

          {/* Sessions List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2" />
                <div className="text-white/60">履歴を読み込み中...</div>
              </div>
            ) : sessions.length > 0 ? (
              sessions.map((session, index) => (
                <motion.div
                  key={session.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-white font-medium">セッション {index + 1}</h3>
                      <p className="text-white/60 text-sm mt-1">
                        {session.message_count || 0} メッセージ • {new Date().toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-white/70 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-white/30 mx-auto mb-3" />
                <div className="text-white/60">履歴がありません</div>
                <div className="text-white/40 text-sm mt-1">
                  {searchQuery ? '検索結果が見つかりませんでした' : 'チャットを開始すると履歴が表示されます'}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/10">
            <div className="text-sm text-white/50">
              {sessions.length > 0 && `${sessions.length} 件の履歴`}
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors">
                エクスポート
              </button>
              <button className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg text-red-400 transition-colors">
                全履歴削除
              </button>
            </div>
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};