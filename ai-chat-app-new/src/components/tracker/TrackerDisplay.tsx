'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  Plus, 
  Minus, 
  BarChart3, 
  Activity, 
  Heart, 
  Target, 
  TrendingUp, 
  TrendingDown,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrackerDefinition, NumericTrackerConfig, StateTrackerConfig, BooleanTrackerConfig, TextTrackerConfig } from '@/types/core/tracker.types';
import { useAppStore } from '@/store';
import { TrackerManager } from '@/services/tracker/tracker-manager';

// TrackerDefinitionにcurrent_valueを加えた型 cd C:\ai-chat-v3\ai-chat-app-new
type TrackerWithValue = TrackerDefinition & { current_value: string | number | boolean };

interface TrackerChangeIndicator {
  trackerId: string;
  oldValue: string | number | boolean;
  newValue: string | number | boolean;
  timestamp: number;
}

interface TrackerDisplayProps {
  session_id: string;
  character_id: string;
}

// Category configuration with enhanced styling
const categoryIcons = {
  relationship: Heart,
  status: BarChart3,
  condition: Activity,
  emotion: Star,
  progress: TrendingUp,
  other: Target
};

const categoryColors = {
  relationship: 'text-pink-400',
  status: 'text-blue-400',
  condition: 'text-green-400',
  emotion: 'text-yellow-400',
  progress: 'text-orange-400',
  other: 'text-purple-400'
};

const categoryGradients = {
  relationship: 'from-pink-500/30 via-rose-500/20 to-pink-500/30',
  status: 'from-blue-500/30 via-indigo-500/20 to-blue-500/30',
  condition: 'from-green-500/30 via-emerald-500/20 to-green-500/30',
  emotion: 'from-yellow-500/30 via-amber-500/20 to-yellow-500/30',
  progress: 'from-orange-500/30 via-red-500/20 to-orange-500/30',
  other: 'from-purple-500/30 via-violet-500/20 to-purple-500/30'
};

export const TrackerDisplay: React.FC<TrackerDisplayProps> = ({ session_id, character_id }) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['relationship', 'status']));
  const [trackerChanges, setTrackerChanges] = useState<Map<string, TrackerChangeIndicator>>(new Map());
  const prevTrackersRef = useRef<Map<string, string | number | boolean>>(new Map());
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Get tracker data from store with initialization check
  const trackerManager = useAppStore(state => state.trackerManagers.get(character_id));
  const characters = useAppStore(state => state.characters);
  const character = characters.get(character_id);
  
  // Initialize tracker manager if not exists and we have character data
  useEffect(() => {
    const currentManager = useAppStore.getState().trackerManagers.get(character_id);
    if (!currentManager && character && character.trackers && character.trackers.length > 0) {
      console.log(`[TrackerDisplay] Initializing tracker manager for character: ${character.name}`);
      console.log(`[TrackerDisplay] Character trackers:`, character.trackers.map(t => ({ 
        name: t.name, 
        current_value: (t as any).current_value,
        config: t.config 
      })));
      
      // Create a new tracker manager and initialize it
      const newManager = new TrackerManager();
      newManager.initializeTrackerSet(character_id, character.trackers);
      
      // Update the store - キャラクターIDをキーとして使用
      useAppStore.setState(state => ({
        trackerManagers: new Map(state.trackerManagers).set(character_id, newManager)
      }));
      
      console.log(`[TrackerDisplay] Tracker manager initialized with ${character.trackers.length} trackers`);
    }
  }, [character_id, character]);

  const trackersMap = useAppStore(state => {
    // キャラクターIDで直接トラッカーマネージャーを取得
    const manager = state.trackerManagers.get(character_id);
    const set = manager?.getTrackerSet(character_id);
    return set ? (set.trackers as Map<string, TrackerWithValue>) : undefined;
  });

  const trackers = useMemo(() => {
    if (!trackersMap) return [];
    return Array.from(trackersMap.values()).sort((a, b) =>
      a.display_name.localeCompare(b.display_name)
    );
  }, [trackersMap]);

  // Track changes for visual feedback
  useEffect(() => {
    const changes = new Map<string, TrackerChangeIndicator>();
    const currentTrackersMap = new Map<string, string | number | boolean>();

    trackers.forEach(tracker => {
      currentTrackersMap.set(tracker.name, tracker.current_value);
      const previousValue = prevTrackersRef.current?.get(tracker.name);
      
      if (previousValue !== undefined && previousValue !== tracker.current_value) {
        changes.set(tracker.name, {
          trackerId: tracker.name,
          oldValue: previousValue,
          newValue: tracker.current_value,
          timestamp: Date.now()
        });
      }
    });

    prevTrackersRef.current = currentTrackersMap;
    setTrackerChanges(changes);
    
    // Clear change indicators after 3 seconds
    if (changes.size > 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setTrackerChanges(new Map());
      }, 3000);
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [trackers]);

  // Group trackers by category
  const categorizedTrackers = useMemo(() => trackers.reduce((acc, tracker) => {
    // カテゴリーはconfigの中にある
    const category = (tracker.config as any)?.category || tracker.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(tracker);
    return acc;
  }, {} as Record<string, TrackerWithValue[]>), [trackers]);

  const categories = useMemo(() => Object.entries(categorizedTrackers).map(([categoryName, trackers]) => ({
    name: categoryName,
    trackers: trackers as TrackerWithValue[],
    icon: (categoryIcons[categoryName as keyof typeof categoryIcons] || Target),
    color: categoryColors[categoryName as keyof typeof categoryColors] || 'text-purple-400'
  })), [categorizedTrackers]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) newSet.delete(categoryName);
      else newSet.add(categoryName);
      return newSet;
    });
  };

  const handleUpdateTracker = (trackerName: string, value: string | number | boolean) => {
    console.log(`[TrackerDisplay] Updating tracker '${trackerName}' to:`, value);
    
    // キャラクターIDでトラッカーマネージャーを取得
    const latestTrackerManager = useAppStore.getState().trackerManagers.get(character_id);
    if (latestTrackerManager) {
      const success = latestTrackerManager.updateTracker(character_id, trackerName, value as any);
      console.log(`[TrackerDisplay] Update result for '${trackerName}':`, success);
      
      // Force a state update in Zustand to trigger re-render
      useAppStore.setState(state => ({
        trackerManagers: new Map(state.trackerManagers)
      }));
    } else {
      console.error(`[TrackerDisplay] No tracker manager found for character: ${character_id}`);
    }
  };

  if (!trackerManager || !trackersMap) {
    // Check if we have character data but no tracker manager yet
    if (character && character.trackers && character.trackers.length > 0) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="p-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm mx-auto mb-4 w-16 h-16 flex items-center justify-center">
              <BarChart3 size={32} className="text-white" />
            </div>
            <p className="text-sm text-gray-300">トラッカーデータを初期化中...</p>
          </div>
        </div>
      );
    } else if (!character) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="p-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm mx-auto mb-4 w-16 h-16 flex items-center justify-center">
              <BarChart3 size={32} className="text-white" />
            </div>
            <p className="text-sm text-gray-300">キャラクターを選択してください</p>
          </div>
        </div>
      );
    }
  }

  if (categories.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="p-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm mx-auto mb-4 w-16 h-16 flex items-center justify-center">
            <BarChart3 size={32} className="text-white" />
          </div>
          <p className="text-sm text-gray-300 mb-4">トラッカーがありません</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-full flex flex-col"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex-1 overflow-y-auto space-y-4 p-2 md:p-4">
        {categories.map((category) => (
          <div key={category.name} className="space-y-2">
            {/* Category Header */}
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                toggleCategory(category.name);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "w-full flex items-center justify-between p-2 md:p-3 rounded-xl transition-all duration-300",
                "bg-gradient-to-r border border-white/20 backdrop-blur-sm",
                categoryGradients[category.name as keyof typeof categoryGradients] || categoryGradients.other,
                "hover:shadow-lg hover:shadow-white/10 hover:border-white/30",
                expandedCategories.has(category.name) && "shadow-lg shadow-white/10 border-white/30"
              )}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={expandedCategories.has(category.name) ? { rotate: 360 } : { rotate: 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-2 rounded-lg bg-white/10 backdrop-blur-sm"
                >
                  <category.icon size={18} className={category.color} />
                </motion.div>
                <span className="font-semibold text-sm text-white capitalize">{category.name}</span>
                <motion.span 
                  className="text-xs px-2 py-1 rounded-full bg-white/20 text-white font-medium backdrop-blur-sm"
                  animate={{ scale: expandedCategories.has(category.name) ? 1.1 : 1 }}
                >
                  {category.trackers.length}
                </motion.span>
              </div>
              <motion.div
                animate={{ rotate: expandedCategories.has(category.name) ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight size={16} className="text-white" />
              </motion.div>
            </motion.button>

            {/* Category Trackers */}
            <AnimatePresence>
              {expandedCategories.has(category.name) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 pl-6"
                >
                  {category.trackers.map((tracker) => (
                    <TrackerItem 
                      key={tracker.name} 
                      tracker={tracker} 
                      onUpdate={handleUpdateTracker}
                      hasRecentChange={trackerChanges.has(tracker.name) && (Date.now() - trackerChanges.get(tracker.name)!.timestamp < 3000)}
                      previousValue={prevTrackersRef.current?.get(tracker.name)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
};

// Enhanced TrackerItem component
const TrackerItem: React.FC<{ 
  tracker: TrackerWithValue; 
  onUpdate: (name: string, value: string | number | boolean) => void;
  hasRecentChange?: boolean;
  changeIndicator?: TrackerChangeIndicator;
  previousValue?: string | number | boolean;
}> = ({ tracker, onUpdate, hasRecentChange = false, previousValue }) => {

  const renderTracker = () => {
    // 新しいフォーマット（直接typeフィールド）と古いフォーマット（config.type）の両方をサポート
    const trackerType = tracker.type || tracker.config?.type;
    switch (trackerType) {
      case 'numeric':
        return <NumericTracker tracker={tracker} onUpdate={onUpdate} hasRecentChange={hasRecentChange} previousValue={previousValue} />;
      case 'state':
        return <StateTracker tracker={tracker} onUpdate={onUpdate} hasRecentChange={hasRecentChange} />;
      case 'boolean':
        return <BooleanTracker tracker={tracker} onUpdate={onUpdate} hasRecentChange={hasRecentChange} />;
      case 'text':
        return <TextTracker tracker={tracker} onUpdate={onUpdate} hasRecentChange={hasRecentChange} />;
      default:
        return <div className="text-sm text-gray-400">Unknown tracker type: {trackerType}</div>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-2 md:p-3 bg-black/20 backdrop-blur-sm rounded-lg group border border-white/20",
        "hover:shadow-lg hover:shadow-white/10 hover:border-white/30 transition-all duration-300",
        hasRecentChange && "ring-2 ring-blue-400 ring-opacity-50"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm text-white">{tracker.display_name}</h4>
        <AnimatePresence>
          {hasRecentChange && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: -180 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center"
            >
              {tracker.config?.type === 'numeric' && typeof tracker.current_value === 'number' && typeof previousValue === 'number' && tracker.current_value > previousValue ? (
                <TrendingUp size={12} className="text-green-400" />
              ) : (
                <TrendingDown size={12} className="text-red-400" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {tracker.description && (
        <p className="text-xs text-gray-300 mb-2">{tracker.description}</p>
      )}
      
      {renderTracker()}
    </motion.div>
  );
};

// Enhanced tracker type components with v2 styling
const NumericTracker: React.FC<{
  tracker: TrackerWithValue;
  onUpdate: (name: string, value: string | number | boolean) => void;
  hasRecentChange?: boolean;
  previousValue?: string | number | boolean;
}> = ({ tracker, onUpdate, hasRecentChange = false }) => {
  // 新旧フォーマット対応
  const config = tracker.config as NumericTrackerConfig;
  const initialValue = (tracker as any).initial_value || config?.initial_value || 0;
  const value = typeof tracker.current_value === 'number' ? tracker.current_value : initialValue;
  const minValue = (tracker as any).min_value || config?.min_value || 0;
  const maxValue = (tracker as any).max_value || config?.max_value || 100;
  const step = config?.step || 1;
  const unit = config?.unit || '';
  const displayType = config?.display_type || 'number';
  const progress = ((value - minValue) / (maxValue - minValue)) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {displayType === 'stars' ? (
          <div className="flex items-center gap-1">
            {Array.from({ length: maxValue }, (_, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate(tracker.name, i + 1);
                }}
                className="transition-colors duration-200"
              >
                <Star 
                  size={20}
                  className={cn(
                    "transition-colors duration-200",
                    i < value 
                      ? hasRecentChange 
                        ? "text-blue-400 fill-blue-400" 
                        : "text-yellow-400 fill-yellow-400"
                      : "text-gray-600 hover:text-yellow-300"
                  )}
                />
              </motion.button>
            ))}
            <motion.span 
              className={cn(
                "ml-2 text-sm font-medium transition-colors duration-300",
                hasRecentChange ? "text-blue-400" : "text-white"
              )}
              animate={hasRecentChange ? { scale: [1, 1.1, 1] } : {}}
            >
              {value}/{maxValue}
            </motion.span>
          </div>
        ) : (
          <motion.span 
            className={cn(
              "text-lg font-semibold transition-colors duration-300 tabular-nums",
              hasRecentChange ? "text-blue-400" : "text-white"
            )}
            animate={hasRecentChange ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {value}{unit}
          </motion.span>
        )}
        {displayType !== 'stars' && (
          <div className="flex items-center gap-1">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(tracker.name, Math.max(minValue, value - step));
              }}
              className="p-1 rounded-full text-red-400 hover:bg-red-500/20 transition-colors backdrop-blur-sm"
              disabled={value <= minValue}
            >
              <Minus size={12} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(tracker.name, Math.min(maxValue, value + step));
              }}
              className="p-1 rounded-full text-green-400 hover:bg-green-500/20 transition-colors backdrop-blur-sm"
              disabled={value >= maxValue}
            >
              <Plus size={12} />
            </motion.button>
          </div>
        )}
      </div>
      
      {displayType !== 'stars' && (
        <div className="relative">
          <div className="w-full bg-black/30 backdrop-blur-sm rounded-full h-3 overflow-hidden border border-white/20">
            <motion.div
              className={cn(
                "h-3 rounded-full transition-all duration-500",
                hasRecentChange 
                  ? "bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 shadow-lg" 
                  : "bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600"
              )}
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              style={{
                boxShadow: hasRecentChange ? '0 0 20px rgba(59, 130, 246, 0.6)' : 'none'
              }}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-white drop-shadow-md">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const StateTracker: React.FC<{
  tracker: TrackerWithValue;
  onUpdate: (name: string, value: string | number | boolean) => void;
  hasRecentChange?: boolean;
}> = ({ tracker, onUpdate, hasRecentChange = false }) => {
  // 新旧フォーマット対応
  const config = tracker.config as StateTrackerConfig;
  const possibleStates = (tracker as any).possible_states || config?.possible_states || [];
  const initialState = (tracker as any).initial_state || config?.initial_state || possibleStates[0]?.id;
  const value = (tracker.current_value as string) || initialState;
  
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {possibleStates.map((state: string | { id: string; label: string; color: string }) => {
          // 新しいフォーマットでは文字列の場合もある
          const stateObj = typeof state === 'string' ? { id: state, label: state, color: '#6366f1' } : state;
          const isSelected = stateObj.id === value;
          
          return (
            <motion.button
              key={stateObj.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(tracker.name, stateObj.id);
              }}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all duration-300",
                isSelected 
                  ? "text-white shadow-lg ring-2 ring-white/30 backdrop-blur-sm" 
                  : "text-gray-300 bg-black/20 hover:bg-black/30 backdrop-blur-sm border border-white/10",
                hasRecentChange && isSelected && "animate-pulse"
              )}
              style={{
                backgroundColor: isSelected ? stateObj.color + '80' : undefined,
                boxShadow: isSelected ? `0 0 20px ${stateObj.color}60` : undefined
              }}
            >
              {stateObj.label}
            </motion.button>
          );
        })}
      </div>
      
      <motion.div 
        className="text-center py-2 px-3 rounded-lg border backdrop-blur-sm"
        style={{
          borderColor: (() => {
            const foundState = possibleStates.find((s: string | { id: string; label: string; color: string }) => (typeof s === 'string' ? s : s.id) === value);
            return foundState ? (typeof foundState === 'string' ? '#6366f1' : foundState.color) + '60' : '#6366f160';
          })(),
          backgroundColor: (() => {
            const foundState = possibleStates.find((s: string | { id: string; label: string; color: string }) => (typeof s === 'string' ? s : s.id) === value);
            return foundState ? (typeof foundState === 'string' ? '#6366f1' : foundState.color) + '20' : '#6366f120';
          })()
        }}
        animate={hasRecentChange ? { scale: [1, 1.02, 1] } : {}}
      >
        <span 
          className="text-sm font-medium" 
          style={{ 
            color: (() => {
              const foundState = possibleStates.find((s: string | { id: string; label: string; color: string }) => (typeof s === 'string' ? s : s.id) === value);
              return foundState ? (typeof foundState === 'string' ? '#6366f1' : foundState.color) : '#6366f1';
            })()
          }}
        >
          現在: {(() => {
            const foundState = possibleStates.find((s: string | { id: string; label: string; color: string }) => (typeof s === 'string' ? s : s.id) === value);
            return foundState ? (typeof foundState === 'string' ? foundState : foundState.label) : value;
          })()}
        </span>
      </motion.div>
    </div>
  );
};

const BooleanTracker: React.FC<{
  tracker: TrackerWithValue;
  onUpdate: (name: string, value: string | number | boolean) => void;
  hasRecentChange?: boolean;
}> = ({ tracker, onUpdate, hasRecentChange = false }) => {
  // 新旧フォーマット対応
  const config = tracker.config as BooleanTrackerConfig;
  const initialBoolean = (tracker as any).initial_boolean !== undefined ? (tracker as any).initial_boolean : config?.initial_value || false;
  const value = typeof tracker.current_value === 'boolean' ? tracker.current_value : initialBoolean;
  const trueLabel = config?.true_label || 'はい';
  const falseLabel = config?.false_label || 'いいえ';
  const trueColor = config?.true_color || '#10b981';
  const falseColor = config?.false_color || '#6b7280';
  
  return (
    <motion.button
      onClick={(e) => {
        e.stopPropagation();
        onUpdate(tracker.name, !value);
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      animate={hasRecentChange ? { scale: [1, 1.05, 1] } : {}}
      className={cn(
        "w-full px-4 py-3 rounded-xl transition-all text-sm font-medium duration-300 relative overflow-hidden",
        "border-2 shadow-lg backdrop-blur-sm",
        hasRecentChange && "ring-4 ring-blue-500/40"
      )}
      style={{
        backgroundColor: value ? trueColor + '30' : falseColor + '30',
        borderColor: value ? trueColor + '80' : falseColor + '80',
        color: value ? trueColor : falseColor,
        boxShadow: `0 8px 25px ${value ? trueColor : falseColor}40`
      }}
    >
      <div className="flex items-center justify-center gap-2">
        <motion.span
          animate={{ rotate: hasRecentChange ? [0, 360] : 0 }}
          transition={{ duration: 0.5 }}
          className="text-lg"
        >
          {value ? '✓' : '✗'}
        </motion.span>
        <span>{value ? trueLabel : falseLabel}</span>
      </div>
      {hasRecentChange && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />
      )}
    </motion.button>
  );
};

const TextTracker: React.FC<{
  tracker: TrackerWithValue;
  onUpdate: (name: string, value: string | number | boolean) => void;
  hasRecentChange?: boolean;
}> = ({ tracker, onUpdate, hasRecentChange = false }) => {
  const config = tracker.config as TextTrackerConfig;
  const [text, setText] = useState(typeof tracker.current_value === 'string' ? tracker.current_value : config.initial_value || '');
  const currentLength = text.length;
  const lengthProgress = config.max_length ? (currentLength / config.max_length) * 100 : 0;
  const placeholder = config.placeholder || 'テキストを入力...';

  useEffect(() => {
    setText(tracker.current_value as string || '');
  }, [tracker.current_value]);

  const handleBlur = () => {
    if (text !== tracker.current_value) {
      onUpdate(tracker.name, text);
    }
  };

  return (
    <div className="space-y-2">
      <motion.div
        animate={hasRecentChange ? { scale: [1, 1.02, 1] } : {}}
        className="relative"
      >
        {config.multiline ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder}
            maxLength={config.max_length}
            rows={3}
            className={cn(
              "w-full px-3 py-2 text-sm rounded-lg border transition-all duration-300 resize-none",
              hasRecentChange 
                ? "border-blue-400 bg-blue-500/20 ring-2 ring-blue-500/30 backdrop-blur-sm" 
                : "border-white/30 bg-black/20 backdrop-blur-sm",
              "text-white placeholder-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400"
            )}
          />
        ) : (
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder}
            maxLength={config.max_length}
            className={cn(
              "w-full px-3 py-2 text-sm rounded-lg border transition-all duration-300",
              hasRecentChange 
                ? "border-blue-400 bg-blue-500/20 ring-2 ring-blue-500/30 backdrop-blur-sm" 
                : "border-white/30 bg-black/20 backdrop-blur-sm",
              "text-white placeholder-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400"
            )}
          />
        )}
        {hasRecentChange && (
          <motion.div
            className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            exit={{ scale: 0 }}
          />
        )}
      </motion.div>
      
      {config.max_length && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex-1 bg-black/30 backdrop-blur-sm rounded-full h-1 mr-2 border border-white/20">
            <motion.div
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                lengthProgress > 80 ? "bg-red-400" : 
                lengthProgress > 60 ? "bg-yellow-400" : "bg-green-400"
              )}
              initial={{ width: '0%' }}
              animate={{ width: `${lengthProgress}%` }}
            />
          </div>
          <span className={cn(
            "font-medium",
            lengthProgress > 90 ? "text-red-400" : "text-gray-400"
          )}>
            {currentLength}/{config.max_length}
          </span>
        </div>
      )}
    </div>
  );
};