'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Brain,
  Plus,
  SortAsc,
  SortDesc,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAppStore } from '@/store';
import { MemoryCardComponent } from './MemoryCard';
import { MemoryCategory } from '@/types';
import { cn } from '@/lib/utils';

interface MemoryGalleryProps {
  session_id?: string;
  character_id?: string;
}

type SortBy = 'created_at' | 'importance' | 'last_accessed';
type FilterBy = 'all' | 'pinned' | 'hidden' | MemoryCategory;

export const MemoryGallery: React.FC<MemoryGalleryProps> = ({ 
  session_id, 
  character_id 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBy, setFilterBy] = useState<FilterBy>('all');
  const [showHidden, setShowHidden] = useState(false);

  const { getCurrentSessionMemoryCards, createMemoryCard, getActiveSession, ensureTrackerManagerExists, initializeMemoryCards, togglePinMemory } = useAppStore();

  // Lazy initialize memory cards on mount
  useEffect(() => {
    initializeMemoryCards();
  }, [initializeMemoryCards]);

  // メモリーカードのフィルタリングとソート
  const filteredAndSortedMemories = useMemo(() => {
    // 現在のセッションの記憶カードを取得
    const currentSessionCards = getCurrentSessionMemoryCards ? getCurrentSessionMemoryCards() : new Map();
    if (!currentSessionCards || currentSessionCards.size === 0) return [];
    let filtered = Array.from(currentSessionCards.values());

    // セッション・キャラクターフィルタ
    if (session_id || character_id) {
      filtered = filtered.filter(memory => 
        (!session_id || memory.session_id === session_id) &&
        (!character_id || memory.character_id === character_id)
      );
    }

    // 検索フィルタ
    if (searchTerm) {
      filtered = filtered.filter(memory =>
        memory.original_content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        memory.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        memory.keywords.some((keyword: string) => keyword.toLowerCase().includes(searchTerm.toLowerCase())) ||
        memory.auto_tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // カテゴリ・状態フィルタ
    switch (filterBy) {
      case 'pinned':
        filtered = filtered.filter(memory => memory.is_pinned);
        break;
      case 'hidden':
        filtered = filtered.filter(memory => memory.is_hidden);
        break;
      case 'all':
        if (!showHidden) {
          filtered = filtered.filter(memory => !memory.is_hidden);
        }
        break;
      default:
        filtered = filtered.filter(memory => memory.category === filterBy);
        if (!showHidden) {
          filtered = filtered.filter(memory => !memory.is_hidden);
        }
        break;
    }

    // ソート
    filtered.sort((a, b) => {
      let aValue: string | number | Date, bValue: string | number | Date;
      
      switch (sortBy) {
        case 'importance':
          aValue = a.importance.score;
          bValue = b.importance.score;
          break;
        case 'last_accessed':
          // Since last_accessed doesn't exist in MemoryCard, use updated_at as a proxy
          aValue = new Date(a.updated_at);
          bValue = new Date(b.updated_at);
          break;
        default:
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
      }

      return sortOrder === 'asc' ? 
        (aValue > bValue ? 1 : -1) : 
        (aValue < bValue ? 1 : -1);
    });

    return filtered;
  }, [getCurrentSessionMemoryCards, searchTerm, sortBy, sortOrder, filterBy, showHidden, session_id, character_id]);

  const handleCreateMemory = async () => {
    try {
      const activeSession = getActiveSession();
      if (!activeSession) {
        alert('アクティブなセッションがありません');
        return;
      }

      // 最新の5つのメッセージからメモリーカードを作成
      const recentMessages = activeSession.messages.slice(-5);
      const messageIds = recentMessages.map(msg => msg.id);
      
      if (messageIds.length === 0) {
        alert('メモリーカードを作成するためのメッセージがありません');
        return;
      }

      const character = activeSession.participants.characters[0];
      if (!character) {
        alert('キャラクターが見つかりません');
        return;
      }

      // トラッカーマネージャーの存在を確保
      ensureTrackerManagerExists(character);
      
      const memoryCard = await createMemoryCard(messageIds, activeSession.id, character.id);
      console.log('Memory card created successfully:', memoryCard);
      alert('メモリーカードを作成しました！');
    } catch (error) {
      console.error('Failed to create memory card:', error);
      alert('メモリーカードの作成に失敗しました');
    }
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div 
      className="h-full flex flex-col"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}>
      {/* ヘッダー */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            記憶アーカイブ
          </h2>
          <button
            onClick={handleCreateMemory}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            新規作成
          </button>
        </div>

        {/* 検索バー */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="記憶を検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50"
          />
        </div>

        {/* フィルター・ソートコントロール */}
        <div className="flex items-center gap-2 text-sm">
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as FilterBy)}
            className="px-3 py-1 bg-white/5 border border-white/10 rounded text-white text-xs focus:outline-none focus:border-purple-500/50"
          >
            <option value="all">全て</option>
            <option value="pinned">ピン留め</option>
            <option value="hidden">非表示</option>
            <option value="personal_info">個人情報</option>
            <option value="preference">好み・嗜好</option>
            <option value="event">出来事</option>
            <option value="relationship">関係性</option>
            <option value="promise">約束</option>
            <option value="important_date">重要な日付</option>
            <option value="emotion">感情的な内容</option>
            <option value="decision">決定事項</option>
            <option value="question">質問</option>
            <option value="other">その他</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-1 bg-white/5 border border-white/10 rounded text-white text-xs focus:outline-none focus:border-purple-500/50"
          >
            <option value="created_at">作成日時</option>
            <option value="importance">重要度</option>
            <option value="last_accessed">最終アクセス</option>
          </select>

          <button
            onClick={toggleSort}
            className="p-1 text-white/60 hover:text-white transition-colors"
            title={`並び順: ${sortOrder === 'asc' ? '昇順' : '降順'}`}
          >
            {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowHidden(!showHidden)}
            className={cn(
              "p-1 transition-colors",
              showHidden ? "text-purple-400" : "text-white/60 hover:text-white"
            )}
            title={`非表示項目: ${showHidden ? '表示中' : '非表示中'}`}
          >
            {showHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* メモリーカード一覧 */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredAndSortedMemories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/50">
            <Brain className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium mb-2">記憶がありません</p>
            <p className="text-sm text-center">
              {searchTerm ? '検索条件に一致する記憶が見つかりませんでした' : '会話を始めると記憶が自動的に蓄積されます'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="wait">
              {filteredAndSortedMemories.map((memory) => (
                <MemoryCardComponent
                  key={memory.id}
                  memory={memory}
                  className="w-full"
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* フッター統計 */}
      <div className="p-4 border-t border-white/10 text-xs text-white/50">
        <div className="flex justify-between">
          <span>
            {filteredAndSortedMemories.length} / {getCurrentSessionMemoryCards ? getCurrentSessionMemoryCards().size : 0} 件の記憶を表示
          </span>
          <span>
            ピン留め: {filteredAndSortedMemories.filter(m => m.is_pinned).length} 件
          </span>
        </div>
      </div>
    </div>
  );
};
