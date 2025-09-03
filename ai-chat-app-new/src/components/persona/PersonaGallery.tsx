'use client';

import React, { useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Upload, ArrowDownUp, Grid, List } from 'lucide-react';
import { Persona } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useFilterAndSort } from '@/hooks/useFilterAndSort';

// Lazy import for PersonaCard to optimize initial bundle
const PersonaCard = React.lazy(() => 
  import('./PersonaCard').then(module => ({ default: module.PersonaCard }))
);

// Loading fallback for persona cards
const PersonaCardLoadingFallback: React.FC = () => (
  <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4 animate-pulse">
    <div className="w-full h-24 bg-slate-700/50 rounded-lg mb-3" />
    <div className="h-4 bg-slate-700/50 rounded mb-2" />
    <div className="h-3 bg-slate-700/30 rounded w-2/3" />
  </div>
);

interface PersonaGalleryProps {
  personas: Persona[];
  onSelectPersona: (persona: Persona) => void;
  onCreatePersona?: () => void;
  onEditPersona?: (persona: Persona) => void;
  onImportPersona?: (personaData: Record<string, unknown>) => void;
  selectedPersonaId?: string;
}

type SortField = 'updated_at' | 'name' | 'created_at';
type SortOption = `${SortField}_${'asc' | 'desc'}`;

export const PersonaGallery: React.FC<PersonaGalleryProps> = ({
  personas,
  onSelectPersona,
  onCreatePersona = () => {},
  onEditPersona = () => {},
  onImportPersona = () => {},
  selectedPersonaId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('updated_at_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredAndSortedPersonas = useFilterAndSort({
    data: personas,
    searchTerm,
    searchKeys: ['name', 'traits'],
    sortOption: sortOption as any,
    sortKeys: {
      // updated_at プロパティが Persona 型に存在しないため created_at を使用
      updated_at: (p: Persona) => p.created_at ? new Date(p.created_at).getTime() : 0,
      created_at: (p: Persona) => p.created_at ? new Date(p.created_at).getTime() : 0,
      name: (p: Persona) => p.name || '',
    },
  });

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'updated_at_desc', label: '更新日 (新しい順)' },
    { value: 'updated_at_asc', label: '更新日 (古い順)' },
    { value: 'name_asc', label: '名前 (昇順)' },
    { value: 'name_desc', label: '名前 (降順)' },
    { value: 'created_at_desc', label: '作成日 (新しい順)' },
    { value: 'created_at_asc', label: '作成日 (古い順)' },
  ];

  const handleJsonUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onImportPersona) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          onImportPersona(json);
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

        <Button 
          onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} 
          className="h-9 px-3 bg-transparent border border-slate-700 hover:bg-slate-700 text-white" 
          title={viewMode === 'grid' ? 'リスト表示に切替' : 'グリッド表示に切替'}
        >
          {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
        </Button>

        <div className="h-5 w-px bg-white/10 mx-1"></div>

        <Button asChild variant="ghost" className="h-9 px-3">
          <label htmlFor="persona-json-upload" className="cursor-pointer">
            <Upload className="w-4 h-4" />
            <input 
              id="persona-json-upload" 
              type="file" 
              className="hidden" 
              accept=".json" 
              onChange={handleJsonUpload} 
            />
          </label>
        </Button>
        <Button variant="ghost" onClick={onCreatePersona} className="h-9 px-3">
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
            {filteredAndSortedPersonas.length > 0 ? (
              filteredAndSortedPersonas.map(persona => (
                <Suspense 
                  key={persona.id} 
                  fallback={<PersonaCardLoadingFallback />}
                >
                  <PersonaCard
                    persona={persona}
                    onSelect={onSelectPersona}
                    onEdit={onEditPersona}
                    isSelected={persona.id === selectedPersonaId}
                  />
                </Suspense>
              ))
            ) : (
              <div className="col-span-full flex items-center justify-center h-full text-slate-500 py-10">
                <p>該当するペルソナが見つかりません。</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};