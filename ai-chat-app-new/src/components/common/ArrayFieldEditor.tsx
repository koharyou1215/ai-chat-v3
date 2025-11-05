// src/components/common/ArrayFieldEditor.tsx
import React, { useState } from 'react';
import { PlusCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArrayFieldEditorProps {
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (index: number) => void;
  placeholder?: string;
  label?: string;
  maxItems?: number;
  colorScheme?: 'blue' | 'green' | 'red' | 'purple' | 'teal' | 'emerald' | 'rose' | 'indigo';
  className?: string;
}

const colorSchemes = {
  blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  green: 'bg-green-500/20 text-green-300 border-green-500/30',
  red: 'bg-red-500/20 text-red-300 border-red-500/30',
  purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  teal: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  rose: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  indigo: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
};

/**
 * 配列型フィールドの統一UIコンポーネント
 *
 * @example
 * ```tsx
 * <ArrayFieldEditor
 *   items={verbalTics}
 *   onAdd={addItem}
 *   onRemove={removeItem}
 *   label="口癖"
 *   placeholder="口癖を入力してEnter（例：だよね、なのです）"
 *   maxItems={10}
 *   colorScheme="teal"
 * />
 * ```
 */
export const ArrayFieldEditor: React.FC<ArrayFieldEditorProps> = ({
  items,
  onAdd,
  onRemove,
  placeholder = '項目を入力してEnter',
  label,
  maxItems,
  colorScheme = 'purple',
  className,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      if (maxItems && items.length >= maxItems) {
        alert(`最大${maxItems}個までです`);
        return;
      }
      onAdd(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {label && (
        <label className="text-sm font-medium text-slate-300">{label}</label>
      )}

      {/* タグ表示 */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={index}
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border',
                colorSchemes[colorScheme]
              )}
            >
              {item}
              <button
                onClick={() => onRemove(index)}
                className="ml-1 hover:text-red-300 transition-colors"
                aria-label={`${item}を削除`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 入力フィールド */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg focus:border-purple-400 focus:outline-none text-white placeholder-slate-400"
          disabled={maxItems !== undefined && items.length >= maxItems}
        />
        <button
          onClick={() => {
            if (inputValue.trim()) {
              onAdd(inputValue.trim());
              setInputValue('');
            }
          }}
          disabled={!inputValue.trim() || (maxItems !== undefined && items.length >= maxItems)}
          className="p-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="追加"
        >
          <PlusCircle className="w-5 h-5 text-purple-400" />
        </button>
      </div>

      {/* 上限表示 */}
      {maxItems && (
        <p className="text-xs text-slate-500">
          {items.length} / {maxItems} 個
        </p>
      )}
    </div>
  );
};
