'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, AlertTriangle, Check } from 'lucide-react';
import { useAppStore } from '@/store';
import { Character } from '@/types/core/character.types';
import { GroupChatSession } from '@/types/core/group-chat.types';
import { cn } from '@/lib/utils';

interface CharacterReselectionModalProps {
  session: GroupChatSession | null;
  isOpen: boolean;
  onClose: () => void;
}

interface CharacterChangePreview {
  added: Character[];
  removed: Character[];
  kept: Character[];
  affectedMessages: number;
  canProceed: boolean;
  warnings: string[];
}

export const CharacterReselectionModal: React.FC<CharacterReselectionModalProps> = ({
  session,
  isOpen,
  onClose
}) => {
  const { 
    characters, 
    updateSessionCharacters, 
    groupSessions 
  } = useAppStore();

  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>(
    session?.character_ids || []
  );

  // セッションが変更された時に選択状態を同期
  useEffect(() => {
    if (session) {
      setSelectedCharacterIds(session.character_ids);
    }
  }, [session]);
  
  const availableCharacters = useMemo(() => 
    Array.from(characters.values()).filter(char => char.is_active),
    [characters]
  );

  // 変更プレビューの計算
  const changePreview = useMemo((): CharacterChangePreview => {
    if (!session) {
      return {
        added: [],
        removed: [],
        kept: [],
        affectedMessages: 0,
        canProceed: false,
        warnings: []
      };
    }

    const currentIds = new Set(session.character_ids);
    const newIds = new Set(selectedCharacterIds);
    
    const added = availableCharacters.filter(char => 
      newIds.has(char.id) && !currentIds.has(char.id)
    );
    const removed = session.characters.filter(char => 
      !newIds.has(char.id)
    );
    const kept = session.characters.filter(char => 
      newIds.has(char.id)
    );

    // 削除されるキャラクターのメッセージ数を計算
    const removedCharacterIds = new Set(removed.map(c => c.id));
    const affectedMessages = session.messages.filter(msg => 
      msg.character_id && removedCharacterIds.has(msg.character_id)
    ).length;

    const warnings: string[] = [];
    if (selectedCharacterIds.length < 2) {
      warnings.push('グループチャットには最低2人のキャラクターが必要です');
    }
    if (removed.length > 0) {
      warnings.push(`${removed.length}人のキャラクターが削除され、${affectedMessages}件のメッセージが影響を受けます`);
    }

    return {
      added,
      removed,
      kept,
      affectedMessages,
      canProceed: selectedCharacterIds.length >= 2,
      warnings
    };
  }, [session, selectedCharacterIds, availableCharacters]);

  const toggleCharacterSelection = (characterId: string) => {
    setSelectedCharacterIds(prev => {
      if (prev.includes(characterId)) {
        return prev.filter(id => id !== characterId);
      } else if (prev.length < 5) {
        return [...prev, characterId];
      }
      return prev;
    });
  };

  const handleSave = () => {
    if (!session || !changePreview.canProceed) return;

    const newCharacters = availableCharacters.filter(char => 
      selectedCharacterIds.includes(char.id)
    );

    // セッションを更新
    (updateSessionCharacters as any)(session.id, newCharacters);
    
    // 変更通知メッセージを追加
    if (changePreview.added.length > 0 || changePreview.removed.length > 0) {
      const changeMessage = [];
      if (changePreview.added.length > 0) {
        changeMessage.push(`${changePreview.added.map(c => c.name).join('、')}が参加しました`);
      }
      if (changePreview.removed.length > 0) {
        changeMessage.push(`${changePreview.removed.map(c => c.name).join('、')}が退出しました`);
      }
      
      // システムメッセージとしてチャットに通知を送信
      console.log('Character change notification:', changeMessage.join('。'));
    }

    onClose();
  };

  const resetToOriginal = () => {
    if (session) {
      setSelectedCharacterIds(session.character_ids);
    }
  };

  if (!isOpen || !session) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-800 border border-purple-400/30 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-6 border-b border-purple-400/30">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-purple-400" />
              <div>
                <h2 className="text-xl font-semibold text-white">キャラクター選択を変更</h2>
                <p className="text-sm text-white/60">
                  {session.name} のメンバーを編集
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="flex-1 flex min-h-0">
            {/* 左側: キャラクター選択 */}
            <div className="flex-1 flex flex-col">
              <div className="p-6 pb-4 flex-shrink-0">
                <h3 className="text-lg font-medium text-white mb-4">
                  利用可能なキャラクター ({selectedCharacterIds.length}人選択中)
                </h3>
              </div>
              <div className="px-6 pb-6 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-400/20 scrollbar-track-slate-800">
              
              <div className="grid grid-cols-1 gap-3">
                {availableCharacters.map(character => {
                  const isSelected = selectedCharacterIds.includes(character.id);
                  const wasOriginalMember = session.character_ids.includes(character.id);
                  
                  return (
                    <motion.div
                      key={character.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "p-4 rounded-lg border cursor-pointer transition-all",
                        isSelected
                          ? "bg-purple-500/20 border-purple-400 text-purple-300"
                          : "bg-slate-800/50 border-purple-400/20 text-white/80 hover:bg-slate-700/50"
                      )}
                      onClick={() => toggleCharacterSelection(character.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center">
                          <span className="text-lg font-bold">
                            {character.name[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{character.name}</h4>
                            {wasOriginalMember && (
                              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                                元メンバー
                              </span>
                            )}
                            {isSelected && (
                              <Check className="w-4 h-4 text-green-400" />
                            )}
                          </div>
                          <p className="text-sm opacity-60 line-clamp-2">
                            {character.description?.slice(0, 80)}
                            {character.description && character.description.length > 80 && '...'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              </div>
            </div>

            {/* 右側: 変更プレビュー */}
            <div className="w-80 border-l border-purple-400/30 bg-slate-900/50 flex flex-col">
              <div className="p-6 pb-4 flex-shrink-0">
                <h3 className="text-lg font-medium text-white mb-4">変更プレビュー</h3>
              </div>
              <div className="px-6 pb-6 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-400/20 scrollbar-track-slate-800">
              
              {/* 追加されるキャラクター */}
              {changePreview.added.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-green-400 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    追加 ({changePreview.added.length})
                  </h4>
                  <div className="space-y-2">
                    {changePreview.added.map(char => (
                      <div key={char.id} className="flex items-center gap-2 text-sm text-white/80">
                        <div className="relative w-6 h-6">
                          <Image 
                            src={'/images/default-avatar.png'} 
                            alt={char.name}
                            width={24}
                            height={24}
                            className="rounded-full object-cover"
                            unoptimized
                          />
                        </div>
                        {char.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 削除されるキャラクター */}
              {changePreview.removed.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                    削除 ({changePreview.removed.length})
                  </h4>
                  <div className="space-y-2">
                    {changePreview.removed.map(char => (
                      <div key={char.id} className="flex items-center gap-2 text-sm text-white/80">
                        <div className="relative w-6 h-6">
                          <Image 
                            src={'/default-avatar.png'} 
                            alt={char.name}
                            width={24}
                            height={24}
                            className="rounded-full object-cover opacity-50"
                            unoptimized
                          />
                        </div>
                        {char.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 継続するキャラクター */}
              {changePreview.kept.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                    継続 ({changePreview.kept.length})
                  </h4>
                  <div className="space-y-2">
                    {changePreview.kept.map(char => (
                      <div key={char.id} className="flex items-center gap-2 text-sm text-white/80">
                        <div className="relative w-6 h-6">
                          <Image 
                            src={'/images/default-avatar.png'} 
                            alt={char.name}
                            width={24}
                            height={24}
                            className="rounded-full object-cover"
                            unoptimized
                          />
                        </div>
                        {char.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 警告とメッセージ */}
              {changePreview.warnings.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div>
                      <h5 className="text-sm font-medium text-yellow-300 mb-1">注意事項</h5>
                      <div className="space-y-1">
                        {changePreview.warnings.map((warning, index) => (
                          <p key={index} className="text-xs text-yellow-200">{warning}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 影響を受けるメッセージ数 */}
              {changePreview.affectedMessages > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-300">
                    {changePreview.affectedMessages}件のメッセージが削除されるキャラクターによるものです。
                    これらのメッセージは履歴に残りますが、キャラクター情報は更新されません。
                  </p>
                </div>
              )}
              </div>
            </div>
          </div>

          {/* フッター */}
          <div className="flex items-center justify-between p-6 border-t border-purple-400/30">
            <button
              onClick={resetToOriginal}
              className="px-4 py-2 text-white/70 hover:text-white transition-colors"
            >
              元に戻す
            </button>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={!changePreview.canProceed}
                className={cn(
                  "px-6 py-2 rounded-lg font-medium transition-colors",
                  changePreview.canProceed
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "bg-slate-600 text-white/50 cursor-not-allowed"
                )}
              >
                変更を適用
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};