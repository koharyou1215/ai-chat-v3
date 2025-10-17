'use client';

import React, { useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Upload, ArrowDownUp, Grid, List } from 'lucide-react';
import { Character } from '@/types/core/character.types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { useFilterAndSort } from '@/hooks/useFilterAndSort';

// Lazy import for CharacterCard to optimize initial bundle
const CharacterCard = React.lazy(() => 
  import('./CharacterCard').then(module => ({ default: module.CharacterCard }))
);

// Loading fallback for character cards
const CharacterCardLoadingFallback: React.FC = () => (
  <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4 animate-pulse">
    <div className="w-full h-32 bg-slate-700/50 rounded-lg mb-3" />
    <div className="h-4 bg-slate-700/50 rounded mb-2" />
    <div className="h-3 bg-slate-700/30 rounded w-3/4" />
  </div>
);

interface CharacterGalleryProps {
  characters: Character[];
  onSelectCharacter: (character: Character) => void;
  onCreateCharacter: () => void;
  onImportCharacter: (characterData: Record<string, unknown>) => void;
  selectedCharacterId?: string;
  
  // グループ編集モード用プロパティ
  isGroupEditingMode?: boolean;
  isGroupCreationMode?: boolean; // 新規作成モード
  activeGroupMembers?: Character[];
  onUpdateGroupMembers?: (updatedCharacters: Character[]) => void;
  onCreateGroup?: (newMembers: Character[]) => void; // 新規作成用
  onClose?: () => void;
}

type SortField = 'name' | 'tags' | 'created_at';
type SortOption = `${SortField}_${'asc' | 'desc'}`;

export const CharacterGallery: React.FC<CharacterGalleryProps> = ({
  characters,
  onSelectCharacter,
  onCreateCharacter,
  onImportCharacter,
  selectedCharacterId,
  // グループ編集モード用プロパティ
  isGroupEditingMode = false,
  isGroupCreationMode = false, // 新規作成モード
  activeGroupMembers = [],
  onUpdateGroupMembers,
  onCreateGroup, // 新規作成用
  onClose,
}) => {
  const { startEditingCharacter, deleteCharacter } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('name_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // グループ編集用の選択中メンバー
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(() => 
    new Set(activeGroupMembers.map(c => c.id))
  );

  const filteredAndSortedCharacters = useFilterAndSort({
    data: characters,
    searchTerm,
    searchKeys: ['name', 'tags'],
    sortOption,
    sortKeys: {
      name: (c: Character) => c.name || '',
      tags: (c: Character) => c.tags.join(', '),
      created_at: (c: Character) => c.created_at || '',
    },
  });
  
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'name_asc', label: '名前 (昇順)' },
    { value: 'name_desc', label: '名前 (降順)' },
    { value: 'tags_asc', label: 'タグ (昇順)' },
    { value: 'tags_desc', label: 'タグ (降順)' },
    { value: 'created_at_desc', label: '追加日 (新しい順)' },
    { value: 'created_at_asc', label: '追加日 (古い順)' },
  ];

  const handleJsonUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          onImportCharacter(json);
        } catch (error) {
          console.error("Failed to parse JSON file", error);
        }
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  // グループ編集モードでのキャラクター選択ハンドラ
  const handleMemberSelect = (character: Character) => {
    setSelectedMemberIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(character.id)) {
        newSet.delete(character.id);
      } else {
        newSet.add(character.id);
      }
      return newSet;
    });
  };

  // 更新ボタンのハンドラ
  const handleUpdateMembers = () => {
    if (selectedMemberIds.size < 2 && isGroupEditingMode) {
      alert('少なくとも2人のキャラクターを選択してください。');
      return;
    }
    const updatedMembers = characters.filter(c => selectedMemberIds.has(c.id));
    onUpdateGroupMembers?.(updatedMembers);
    onClose?.();
  };

  // 新規作成ボタンのハンドラ
  const handleCreateGroup = () => {
    if (selectedMemberIds.size < 2) {
      alert('グループチャットには少なくとも2人のキャラクターを選択してください。');
      return;
    }
    const newMembers = characters.filter(c => selectedMemberIds.has(c.id));
    onCreateGroup?.(newMembers);
    onClose?.();
  };

  const isGroupMode = isGroupEditingMode || isGroupCreationMode;

  return (
    <div className="h-full flex flex-col">
      {/* 操作エリア */}
      <div className="flex-shrink-0 p-4 border-b border-white/10 flex items-center gap-2">
        {isGroupMode ? (
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{isGroupCreationMode ? "新規グループ作成" : "グループメンバーを編集"}</h3>
            <p className="text-sm text-slate-400">{selectedMemberIds.size}人 選択中</p>
          </div>
        ) : (
          <>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="検索..."
                className="w-full pl-9 bg-slate-800/50 border-slate-700 focus:border-purple-500 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-9 min-w-[200px] justify-start text-white bg-transparent border border-slate-700 hover:bg-slate-700">
                  <ArrowDownUp className="w-4 h-4 mr-2" />
                  <span className="truncate">
                    {sortOptions.find(o => o.value === sortOption)?.label}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {sortOptions.map(opt => (
                  <DropdownMenuItem key={opt.value} onClick={() => setSortOption(opt.value)}>
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="h-9 px-3 bg-transparent border border-slate-700 hover:bg-slate-700 text-white" title={viewMode === 'grid' ? 'リスト表示に切替' : 'グリッド表示に切替'}>
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </Button>
          </>
        )}
        
        {/* アップロードと新規作成ボタンは常に表示 */}
        <div className="h-5 w-px bg-white/10 mx-1"></div>
        
        <Button asChild variant="ghost" className="h-9 px-3" title="JSONファイルをインポート">
          <label htmlFor="json-upload" className="cursor-pointer flex items-center">
            <Upload className="w-4 h-4" />
            <input id="json-upload" type="file" className="hidden" accept=".json" onChange={handleJsonUpload} />
          </label>
        </Button>
        
        <Button variant="ghost" onClick={onCreateCharacter} className="h-9 px-3" title="新規キャラクター作成">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* ギャラリーエリア */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence>
          <motion.div
            key={viewMode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              'gap-4',
              viewMode === 'grid' 
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'flex flex-col'
            )}
          >
            {filteredAndSortedCharacters.length > 0 ? (
              filteredAndSortedCharacters.map(character => (
                <Suspense 
                  key={character.id} 
                  fallback={<CharacterCardLoadingFallback />}
                >
                  <CharacterCard
                    character={character}
                    onSelect={isGroupMode ? handleMemberSelect : onSelectCharacter}
                    onEdit={() => startEditingCharacter(character)}
                    onDelete={deleteCharacter}
                    isSelected={isGroupMode ? selectedMemberIds.has(character.id) : character.id === selectedCharacterId}
                    isMultiSelectMode={isGroupMode}
                  />
                </Suspense>
              ))
            ) : (
              <div className="col-span-full flex items-center justify-center h-full text-slate-500 py-10">
                <p>該当するキャラクターが見つかりません。</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* グループモードのフッター */}
      {isGroupMode && (
        <div className="flex-shrink-0 p-4 border-t border-white/10 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={isGroupCreationMode ? handleCreateGroup : handleUpdateMembers}>
            {isGroupCreationMode ? "グループを作成" : "更新"}
          </Button>
        </div>
      )}
    </div>
  );
};