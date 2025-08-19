'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Upload, ArrowDownUp, Grid, List } from 'lucide-react';
import { Character } from '@/types';
import { CharacterCard } from './CharacterCard';
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

interface CharacterGalleryProps {
  characters: Character[];
  onSelectCharacter: (character: Character) => void;
  onCreateCharacter: () => void;
  onImportCharacter: (characterData: Record<string, unknown>) => void;
  selectedCharacterId?: string;
}

type SortField = 'last_used' | 'name' | 'created_at' | 'usage_count';
type SortOption = `${SortField}_${'asc' | 'desc'}`;

export const CharacterGallery: React.FC<CharacterGalleryProps> = ({
  characters,
  onSelectCharacter,
  onCreateCharacter,
  onImportCharacter,
  selectedCharacterId,
}) => {
  const { startEditingCharacter } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('last_used_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredAndSortedCharacters = useFilterAndSort({
    data: characters,
    searchTerm,
    searchKeys: ['name', 'tags'],
    sortOption,
    sortKeys: {
      last_used: (c) => c.statistics?.last_used ? new Date(c.statistics.last_used).getTime() : 0,
      usage_count: (c) => c.statistics?.usage_count ?? 0,
      created_at: (c) => c.created_at ? new Date(c.created_at).getTime() : 0,
      name: (c) => c.name || '',
    },
  });
  
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'last_used_desc', label: '最終使用 (新しい順)' },
    { value: 'last_used_asc', label: '最終使用 (古い順)' },
    { value: 'name_asc', label: '名前 (昇順)' },
    { value: 'name_desc', label: '名前 (降順)' },
    { value: 'created_at_desc', label: '作成日 (新しい順)' },
    { value: 'created_at_asc', label: '作成日 (古い順)' },
    { value: 'usage_count_desc', label: '使用回数 (多い順)' },
    { value: 'usage_count_asc', label: '使用回数 (少ない順)' },
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

  return (
    <div className="h-full flex flex-col">
      {/* 操作エリア */}
      <div className="flex-shrink-0 p-4 border-b border-white/10 flex items-center gap-2">
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

        <div className="h-5 w-px bg-white/10 mx-1"></div>

        <Button asChild variant="ghost" className="h-9 px-3">
          <label htmlFor="json-upload" className="cursor-pointer">
            <Upload className="w-4 h-4" title="JSON読込" />
            <input id="json-upload" type="file" className="hidden" accept=".json" onChange={handleJsonUpload} />
          </label>
        </Button>
        <Button variant="ghost" onClick={onCreateCharacter} className="h-9 px-3">
          <Plus className="w-4 h-4" title="新規作成" />
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
                <CharacterCard
                  key={character.id}
                  character={character}
                  onSelect={onSelectCharacter}
                  onEdit={() => startEditingCharacter(character)}
                  isSelected={character.id === selectedCharacterId}
                />
              ))
            ) : (
              <div className="col-span-full flex items-center justify-center h-full text-slate-500 py-10">
                <p>該当するキャラクターが見つかりません。</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
