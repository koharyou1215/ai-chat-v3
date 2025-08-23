'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store';
import { Character } from '@/types';
import { GroupChatMode, GroupChatScenario, ScenarioTemplate } from '@/types/core/group-chat.types';
import { Users, Plus, Settings, Play, Shuffle, Zap, Brain, ArrowRight, ArrowLeft } from 'lucide-react';
import { ScenarioSelector } from './ScenarioSelector';
import { cn } from '@/lib/utils';

interface GroupChatInterfaceProps {
  onStartGroupChat: (
    name: string,
    characterIds: string[],
    mode: GroupChatMode,
    scenario?: GroupChatScenario
  ) => void;
}

export const GroupChatInterface: React.FC<GroupChatInterfaceProps> = ({
  onStartGroupChat
}) => {
  // 全てのフックを必ず最初に呼び出す（条件付きではない）
  const { 
    characters,
    getSelectedPersona,
    groupSessions,
    active_group_session_id,
    is_group_mode,
    setGroupMode,
    createGroupSession,
    setActiveGroupSession,
    updateCharacter
  } = useAppStore();
  
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('新しいグループチャット');
  const [chatMode, setChatMode] = useState<GroupChatMode>('sequential');
  const [showSetup, setShowSetup] = useState(false);
  const [currentStep, setCurrentStep] = useState<'characters' | 'scenario' | 'settings'>('characters');
  const [selectedScenario, setSelectedScenario] = useState<GroupChatScenario | null>(null);
  
  // 値の計算（フックではないのでどこでも可能）
  const persona = getSelectedPersona();
  const activeGroupSession = active_group_session_id ? groupSessions.get(active_group_session_id) : null;
  const availableCharacters = Array.from(characters.values()).filter(char => char.is_active);
  
  
  const toggleCharacterSelection = (characterId: string) => {
    setSelectedCharacterIds(prev => {
      const character = Array.from(characters.values()).find(c => c.id === characterId);
      const characterName = character?.name || 'Unknown';
      
      if (prev.includes(characterId)) {
        // キャラクターを削除
        console.log(`Removing ${characterName} from selection`);
        return prev.filter(id => id !== characterId);
      } else if (prev.length < 5) { // 最大5人まで
        // キャラクターを追加
        console.log(`Adding ${characterName} to selection`);
        return [...prev, characterId];
      } else {
        // 最大数に達している
        console.log(`Cannot add ${characterName} - maximum 5 characters reached`);
        return prev;
      }
    });
  };
  
  const handleStartGroupChat = () => {
    if (selectedCharacterIds.length >= 2 && persona) {
      const selectedCharacters = Array.from(characters.values()).filter(char => 
        selectedCharacterIds.includes(char.id)
      );
      
      createGroupSession(
        selectedCharacters,
        persona,
        chatMode,
        groupName,
        selectedScenario || undefined
      );
      
      setShowSetup(false);
      resetState();
    }
  };

  const resetState = () => {
    setCurrentStep('characters');
    setSelectedScenario(null);
  };

  const handleScenarioSelect = (scenario: GroupChatScenario) => {
    setSelectedScenario(scenario);
    setGroupName(scenario.title);
    setCurrentStep('settings');
  };

  const handleSkipScenario = () => {
    setCurrentStep('settings');
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
                {activeGroupSession.active_character_ids.size}人のキャラクターが参加中 • 
                <span className="text-purple-300 ml-1">
                  {activeGroupSession.chat_mode === 'sequential' && '📋 順次応答モード'}
                  {activeGroupSession.chat_mode === 'simultaneous' && '⚡ 同時応答モード'}
                  {activeGroupSession.chat_mode === 'random' && '🎲 ランダムモード'}
                  {activeGroupSession.chat_mode === 'smart' && '🧠 スマートモード'}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* チャットモード切り替えドロップダウン */}
            <div className="relative">
              <select
                value={activeGroupSession.chat_mode}
                onChange={(e) => {
                  const newMode = e.target.value as GroupChatMode;
                  // グループセッションのモードを更新
                  const updatedSession = {
                    ...activeGroupSession,
                    chat_mode: newMode
                  };
                  
                  // ストアを更新（安全な方法で）
                  const store = useAppStore.getState();
                  const updatedGroupSessions = new Map(store.groupSessions);
                  updatedGroupSessions.set(activeGroupSession.id, updatedSession);
                  useAppStore.setState({ groupSessions: updatedGroupSessions });
                }}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-white/80 px-2 py-1 rounded border border-white/10 focus:border-purple-400 focus:outline-none cursor-pointer"
              >
                <option value="sequential">📋 順次応答</option>
                <option value="simultaneous">⚡ 同時応答</option>
                <option value="random">🎲 ランダム</option>
                <option value="smart">🧠 スマート</option>
              </select>
            </div>
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
              <div className="text-center text-white/50 space-y-4">
                <p>グループチャットには2人以上のキャラクターが必要です</p>
                
                {/* デバッグ情報表示 */}
                <div className="bg-slate-800/50 p-4 rounded-lg text-left text-sm space-y-2">
                  <p className="text-white/70 font-medium">📊 デバッグ情報:</p>
                  <p>全キャラクター数: {Array.from(characters.values()).length}</p>
                  <p>アクティブキャラクター数: {availableCharacters.length}</p>
                  
                  {Array.from(characters.values()).length > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-white/70">全キャラクター一覧:</p>
                        <button
                          onClick={() => {
                            // Zustandストアに直接アクセスして全キャラクターをアクティブ化
                            const allCharacters = Array.from(characters.values());
                            const inactiveCount = allCharacters.filter(char => !char.is_active).length;
                            
                            // ストアの状態を安全に更新
                            const store = useAppStore.getState();
                            const updatedCharacters = new Map(store.characters);
                            
                            // 全キャラクターのis_activeをtrueに設定
                            updatedCharacters.forEach((char, id) => {
                              if (!char.is_active) {
                                updatedCharacters.set(id, { ...char, is_active: true });
                              }
                            });
                            
                            useAppStore.setState({ characters: updatedCharacters });
                            
                            console.log(`Activated ${inactiveCount} characters`);
                            alert(`${inactiveCount}人のキャラクターをアクティブ化しました！`);
                          }}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                        >
                          🔄 全てアクティブ化
                        </button>
                      </div>
                      
                      <div className="max-h-32 overflow-y-auto">
                        {Array.from(characters.values()).slice(0, 10).map(char => (
                          <div key={char.id} className="flex justify-between items-center py-1 px-2 bg-slate-700/30 rounded mb-1">
                            <span className={char.is_active ? "text-green-400" : "text-red-400"} title={char.name}>
                              {char.name?.slice(0, 20) || 'Unnamed'}
                              {char.name?.length > 20 && '...'}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${char.is_active ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                              {char.is_active ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </div>
                        ))}
                        {Array.from(characters.values()).length > 10 && (
                          <p className="text-xs text-white/50 text-center mt-2">
                            ... 他 {Array.from(characters.values()).length - 10} 人
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-white/70">キャラクター作成手順：</p>
                  <ol className="text-sm text-left max-w-md mx-auto space-y-1">
                    <li>1. 右上の🆘キャラクターボタンをクリック</li>
                    <li>2. 「新規作成」でキャラクターを作成</li>
                    <li>3. 名前、説明、アバターを設定</li>
                    <li>4. <strong className="text-yellow-300">is_activeをON</strong>に設定（重要！）</li>
                    <li>5. 保存後、2人目も同様に作成</li>
                  </ol>
                </div>
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
          
          {/* ステップ表示 */}
          {currentStep === 'characters' && (
            <>
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
            <div className="mt-2">
              <p className="text-white/50 text-sm">
                選択中: {selectedCharacterIds.length}/5
              </p>
              {selectedCharacterIds.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedCharacterIds.map(id => {
                    const char = Array.from(characters.values()).find(c => c.id === id);
                    return (
                      <span key={id} className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">
                        {char?.name || id.slice(0, 8)}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
            </>
          )}

          {/* シナリオ選択ステップ */}
          {currentStep === 'scenario' && selectedCharacterIds.length >= 2 && persona && (
            <ScenarioSelector
              characters={Array.from(characters.values()).filter(char => 
                selectedCharacterIds.includes(char.id)
              )}
              persona={persona}
              onScenarioSelect={handleScenarioSelect}
              onSkip={handleSkipScenario}
            />
          )}

          {/* 設定ステップ */}
          {currentStep === 'settings' && (
            <>
              {/* 選択済みシナリオ表示 */}
              {selectedScenario && (
                <div className="mb-6 p-4 bg-purple-500/10 border border-purple-400/30 rounded-lg">
                  <h4 className="text-white font-medium mb-2">選択済みシナリオ</h4>
                  <div className="text-purple-300 font-medium">{selectedScenario.title}</div>
                  <div className="text-white/60 text-sm mt-1">{selectedScenario.setting}</div>
                </div>
              )}
              
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
            </>
          )}
          
          {/* ナビゲーションボタン */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowSetup(false)}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              キャンセル
            </button>
            
            {currentStep === 'characters' && (
              <button
                onClick={() => setCurrentStep('scenario')}
                disabled={selectedCharacterIds.length < 2}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                シナリオ選択 <ArrowRight className="w-4 h-4" />
              </button>
            )}
            
            {currentStep === 'scenario' && (
              <button
                onClick={() => setCurrentStep('characters')}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> キャラクター選択
              </button>
            )}
            
            {currentStep === 'settings' && (
              <>
                <button
                  onClick={() => setCurrentStep('scenario')}
                  className="py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> 戻る
                </button>
                <button
                  onClick={handleStartGroupChat}
                  disabled={selectedCharacterIds.length < 2 || !persona}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  グループチャット開始
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};