'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Character, Persona, TrackerDefinition, TrackerConfig } from '@/types';

// TrackerEditor component (existing one)
const TrackerEditor: React.FC<{
    tracker: TrackerDefinition;
    onChange: (newConfig: TrackerConfig) => void;
}> = ({ tracker, onChange }) => {
    
    const config = tracker?.config; // Use optional chaining

    if (!config) {
        return <p className="text-sm text-slate-400">トラッカーの設定情報が見つかりません。</p>;
    }

    switch(config.type) {
        case 'numeric':
            return (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">最小値</label>
                        <input
                            type="number"
                            value={config.min_value || 0}
                            onChange={e => onChange({...config, min_value: parseInt(e.target.value) || 0})}
                            className="w-full bg-slate-800/50 border-slate-600 text-white rounded-md p-2"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">最大値</label>
                        <input
                            type="number"
                            value={config.max_value || 100}
                            onChange={e => onChange({...config, max_value: parseInt(e.target.value) || 100})}
                            className="w-full bg-slate-800/50 border-slate-600 text-white rounded-md p-2"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">初期値</label>
                        <input
                            type="number"
                            value={config.initial_value || 0}
                            onChange={e => onChange({...config, initial_value: parseInt(e.target.value) || 0})}
                            className="w-full bg-slate-800/50 border-slate-600 text-white rounded-md p-2"
                        />
                    </div>
                </div>
            )
        case 'state':
            return (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">利用可能な状態</label>
                        <div className="flex flex-wrap gap-2">
                            {config.possible_states?.map((state, idx) => (
                                <span key={idx} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-sm">
                                    {typeof state === 'string' ? state : state.label || state.id || 'Unknown'}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">初期状態</label>
                        <input
                            type="text"
                            value={config.initial_state || ''}
                            onChange={e => onChange({...config, initial_state: e.target.value})}
                            className="w-full bg-slate-800/50 border-slate-600 text-white rounded-md p-2"
                            placeholder="初期状態を入力"
                        />
                    </div>
                </div>
            )
        case 'boolean':
             return <p className="text-sm text-slate-400">ブール型トラッカーには追加設定はありません。</p>
        case 'text':
            return (
                 <div className="space-y-2">
                     <label className="text-sm font-medium text-slate-300">プレースホルダー</label>
                     <input
                         type="text"
                         value={config.placeholder || ''}
                         onChange={e => onChange({...config, placeholder: e.target.value})}
                         className="w-full bg-slate-800/50 border-slate-600 text-white rounded-md p-2"
                         placeholder="プレースホルダーテキスト"
                     />
                 </div>
             )
        default:
            return <p className="text-sm text-slate-400">不明なトラッカータイプです。</p>
    }
}

interface TrackersPanelProps {
  formData: Character | Persona | null;
  setFormData: React.Dispatch<React.SetStateAction<Character | Persona | null>>;
  mode: 'character' | 'persona';
}

export const TrackersPanel: React.FC<TrackersPanelProps> = ({
  formData,
  setFormData,
  mode,
}) => {
  const [expandedTracker, setExpandedTracker] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">トラッカー設定</h3>
        <Button variant="outline" size="sm" onClick={() => console.log("Add new tracker")}>
          <PlusCircle className="w-4 h-4 mr-2" />
          新規トラッカーを追加
        </Button>
      </div>
      <div className="space-y-4">
        {(mode === 'character' && formData ? (formData as Character).trackers : [])?.map((tracker: TrackerDefinition, index: number) => (
          <div key={index} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedTracker(expandedTracker === index ? null : index)}>
              <span className="font-semibold text-white">{tracker.display_name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full">{tracker.type}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); console.log("Delete tracker", index)}}>
                  <Trash2 className="w-4 h-4" />
                </Button>
                {expandedTracker === index ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-1">{tracker.description}</p>
            <AnimatePresence>
            {expandedTracker === index && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <TrackerEditor 
                  tracker={tracker} 
                  onChange={(newConfig) => {
                    const newTrackers = [...(formData && mode === 'character' ? (formData as Character).trackers || [] : [])];
                    newTrackers[index] = { ...newTrackers[index], config: newConfig };
                    setFormData(prev => prev ? { ...prev, trackers: newTrackers } : null);
                  }}
                />
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        ))}
        {(mode !== 'character' || !formData || !(formData as Character).trackers || (formData as Character).trackers.length === 0) && (
          <p className="text-slate-500 text-center py-4">
            このキャラクターにはトラッカーが設定されていません。
          </p>
        )}
      </div>
    </div>
  );
};