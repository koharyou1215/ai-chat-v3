'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { CharacterGallery } from './CharacterGallery';
import { useAppStore } from '@/store';
import { Character } from '@/types/core/character.types';
import { generateCharacterId } from '@/utils/uuid';

export interface CharacterGalleryModalProps {
  isGroupEditingMode?: boolean;
  isGroupCreationMode?: boolean; // 新規作成モード
  activeGroupMembers?: Character[];
  onUpdateGroupMembers?: (updatedCharacters: Character[]) => void;
  onCreateGroup?: (newMembers: Character[]) => void; // 新規作成用
  onClose?: () => void; // onCloseをオプションにする
}

export const CharacterGalleryModal: React.FC<CharacterGalleryModalProps> = ({
  isGroupEditingMode = false,
  isGroupCreationMode = false, // 新規作成モード
  activeGroupMembers,
  onUpdateGroupMembers,
  onCreateGroup, // 新規作成用
  onClose,
}) => {
  const { 
    showCharacterGallery, 
    setShowCharacterGallery, 
    characters, 
    selectCharacter,
    addCharacter,
    startEditingCharacter, // startEditingCharacterを追加
  } = useAppStore();

  const isOpen = isGroupEditingMode || isGroupCreationMode || showCharacterGallery;
  const handleClose = onClose || (() => setShowCharacterGallery(false));

  if (!isOpen) return null;

  // Convert Map to array for CharacterGallery component
  const charactersArray = Array.from(characters.values());

  const handleSelectCharacter = (character: Character) => {
    console.log('Character selected:', character);
    selectCharacter(character.id);
    handleClose();
  };

  const handleImportCharacter = (characterData: Record<string, unknown>) => {
    try {
      // Generate unique ID if not present or if it already exists
      let characterId = characterData.id as string;
      if (!characterId || characters.has(characterId)) {
        characterId = generateCharacterId();
        console.log('Generated new unique ID for character:', characterId);
      }
      
      // Convert JSON data to Character format
      const character = {
        id: characterId,
        ...characterData,
        created_at: characterData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        statistics: characterData.statistics || {
          usage_count: 0,
          last_used: new Date().toISOString(),
          favorite_count: 0,
          average_session_length: 0
        }
      };
      
      addCharacter(character as Character);
      console.log('Character imported successfully:', character);
    } catch (error) {
      console.error('Failed to import character:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-5xl h-[80vh] bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col"
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-xl font-bold">{isGroupCreationMode ? "新規グループ作成" : isGroupEditingMode ? "グループメンバーを編集" : "キャラクター選択"}</h2>
              <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

              {/* Character Gallery */}
              <CharacterGallery
                characters={charactersArray}
                onSelectCharacter={handleSelectCharacter}
                onCreateCharacter={() => startEditingCharacter(null)} // 新規作成にも対応
                onImportCharacter={handleImportCharacter}
                // グループ編集モード用のプロパティを渡す
                isGroupEditingMode={isGroupEditingMode}
                isGroupCreationMode={isGroupCreationMode}
                activeGroupMembers={activeGroupMembers}
                onUpdateGroupMembers={onUpdateGroupMembers}
                onCreateGroup={onCreateGroup}
                onClose={handleClose}
              />
            </motion.div>
          </div>
      )}
    </AnimatePresence>
  );
};