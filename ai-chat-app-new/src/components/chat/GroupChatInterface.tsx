'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store';
import { UnifiedCharacter } from '@/types/core/character.types';
import { GroupChatMode } from '@/types/core/group-chat.types';
import { Users, Plus, Settings, Play, Shuffle, Zap, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GroupChatInterfaceProps {
  onStartGroupChat: (
    name: string,
    characterIds: string[],
    mode: GroupChatMode
  ) => void;
}

export const GroupChatInterface: React.FC<GroupChatInterfaceProps> = ({
  onStartGroupChat
}) => {
  const { 
    characters,
    getSelectedPersona,
    groupSessions,
    active_group_session_id,
    is_group_mode,
    setGroupMode,
    createGroupSession,
    setActiveGroupSession
  } = useAppStore();
  
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('新しいグループチャット');
  const [chatMode, setChatMode] = useState<GroupChatMode>('sequential');
  const [showSetup, setShowSetup] = useState(false);
  
  const persona = getSelectedPersona();
  const activeGroupSession = active_group_session_id ? groupSessions.get(active_group_session_id) : null;
  
  const availableCharacters = characters.filter(char => char.is_active);
  
  const toggleCharacterSelection = (characterId: string) => {
    setSelectedCharacterIds(prev => {
      if (prev.includes(characterId)) {
        return prev.filter(id => id !== characterId);
      } else if (prev.length < 5) { // 最大5人まで
        return [...prev, characterId];
      }
      return prev;
    });
  };
  
  const handleStartGroupChat = () => {
    if (selectedCharacterIds.length >= 2 && persona) {
      const selectedCharacters = characters.filter(char => 
        selectedCharacterIds.includes(char.id)
      );
      
      createGroupSession(
        groupName,
        selectedCharacterIds,
        selectedCharacters,
        persona,
        chatMode
      );
      
      setShowSetup(false);
    }
  };
  
  const chatModeOptions = [
    {
      mode: 'sequential' as GroupChatMode,
      icon: Play,
      label: '順次応答',
      description: 'キャラクターが順番に応答します'
    },
    {
      mode: 'simultaneous' as GroupChatMode,
      icon: Zap,
      label: '同時応答',
      description: '全キャラクターが同時に応答します'
    },
    {
      mode: 'random' as GroupChatMode,
      icon: Shuffle,
      label: 'ランダム',
      description: 'ランダムなキャラクターが応答します'
    },
    {
      mode: 'smart' as GroupChatMode,
      icon: Brain,
      label: 'スマート',
      description: 'AIが最適なキャラクターを選択します'
    }
  ];
  
  if (is_group_mode && activeGroupSession) {
    return (
      <div className="p-4 bg-slate-800/50 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-white font-semibold">{activeGroupSession.name}</h3>
              <p className="text-white/50 text-sm">
                {activeGroupSession.active_character_ids.size}人のキャラクターが参加中
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60 bg-slate-700 px-2 py-1 rounded">
              {activeGroupSession.chat_mode}
            </span>
            <button
              onClick={() => setGroupMode(false)}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white/80 text-sm rounded transition-colors"
            >
              通常チャットに戻る
            </button>
          </div>
        </div>
        
        {/* アクティブキャラクター表示 */}
        <div className="mt-3 flex flex-wrap gap-2">
          {activeGroupSession.characters.map(character => (
            <div
              key={character.id}
              className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-full text-sm border",
                activeGroupSession.active_character_ids.has(character.id)
                  ? "bg-purple-500/20 border-purple-400/30 text-purple-300"
                  : "bg-slate-700/50 border-white/10 text-white/60"
              )}
            >
              {character.avatar_url ? (
                <img 
                  src={character.avatar_url} 
                  alt={character.name}
                  className="w-4 h-4 rounded-full object-cover"
                />
              ) : (
                <div className="w-4 h-4 rounded-full bg-slate-600" />
              )}
              <span>{character.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      {!showSetup ? (
        <div className="text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Users className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">グループチャット</h2>
              <p className="text-white/60 mb-4">
                複数のキャラクターと同時に会話できます
              </p>
            </div>
            
            {availableCharacters.length >= 2 ? (
              <button
                onClick={() => setShowSetup(true)}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                グループチャットを開始
              </button>
            ) : (
              <div className="text-center text-white/50">
                <p>グループチャットには2人以上のキャラクターが必要です</p>
                <p className="text-sm">キャラクターギャラリーから追加してください</p>
              </div>
            )}
            
            {/* 既存のグループセッション一覧 */}
            {groupSessions.size > 0 && (
              <div className="w-full mt-6">
                <h3 className="text-white font-semibold mb-3">過去のグループチャット</h3>
                <div className="space-y-2">
                  {Array.from(groupSessions.values()).map(session => (
                    <motion.div
                      key={session.id}
                      whileHover={{ scale: 1.02 }}
                      className="p-3 bg-slate-800/50 border border-white/10 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors"
                      onClick={() => setActiveGroupSession(session.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium">{session.name}</h4>
                          <p className="text-white/50 text-sm">
                            {session.characters.length}人 • {session.message_count}メッセージ
                          </p>
                        </div>
                        <div className="flex -space-x-2">
                          {session.characters.slice(0, 3).map(char => (
                            <div key={char.id} className="w-8 h-8 rounded-full border-2 border-slate-900">
                              {char.avatar_url ? (
                                <img 
                                  src={char.avatar_url} 
                                  alt={char.name}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full rounded-full bg-slate-600" />
                              )}
                            </div>
                          ))}
                          {session.characters.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-slate-600 border-2 border-slate-900 flex items-center justify-center">
                              <span className="text-xs text-white">+{session.characters.length - 3}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setShowSetup(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              ←
            </button>
            <h2 className="text-xl font-bold text-white">グループチャット設定</h2>
          </div>
          
          {/* グループ名設定 */}
          <div className="mb-6">
            <label className="block text-white/80 font-medium mb-2">グループ名</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
              placeholder="グループチャット名を入力"
            />
          </div>
          
          {/* キャラクター選択 */}
          <div className="mb-6">
            <label className="block text-white/80 font-medium mb-2">
              参加キャラクター (2-5人)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {availableCharacters.map(character => (
                <motion.div
                  key={character.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all",
                    selectedCharacterIds.includes(character.id)
                      ? "bg-purple-500/20 border-purple-400 text-purple-300"
                      : "bg-slate-800/50 border-white/10 text-white/80 hover:bg-slate-700/50"
                  )}
                  onClick={() => toggleCharacterSelection(character.id)}
                >
                  <div className="flex items-center gap-3">
                    {character.avatar_url ? (
                      <img 
                        src={character.avatar_url} 
                        alt={character.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-600" />
                    )}
                    <div>
                      <h4 className="font-medium">{character.name}</h4>
                      <p className="text-sm opacity-60">{character.description?.slice(0, 40)}...</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <p className="text-white/50 text-sm mt-2">
              選択中: {selectedCharacterIds.length}/5
            </p>
          </div>
          
          {/* チャットモード選択 */}
          <div className="mb-6">
            <label className="block text-white/80 font-medium mb-2">チャットモード</label>
            <div className="grid grid-cols-2 gap-3">
              {chatModeOptions.map(option => (
                <motion.div
                  key={option.mode}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "p-4 rounded-lg border cursor-pointer transition-all",
                    chatMode === option.mode
                      ? "bg-purple-500/20 border-purple-400 text-purple-300"
                      : "bg-slate-800/50 border-white/10 text-white/80 hover:bg-slate-700/50"
                  )}
                  onClick={() => setChatMode(option.mode)}
                >
                  <div className="flex items-start gap-3">
                    <option.icon className="w-5 h-5 mt-0.5" />
                    <div>
                      <h4 className="font-medium mb-1">{option.label}</h4>
                      <p className="text-sm opacity-60">{option.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* 開始ボタン */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowSetup(false)}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleStartGroupChat}
              disabled={selectedCharacterIds.length < 2 || !persona}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              グループチャット開始
            </button>
          </div>
        </div>
      )}
    </div>
  );
};