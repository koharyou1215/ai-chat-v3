"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TrackerDefinition,
  NumericTrackerConfig,
  StateTrackerConfig,
  BooleanTrackerConfig,
  TextTrackerConfig,
} from "@/types/core/tracker.types";
import { useAppStore } from "@/store";
import { TrackerManager } from "@/services/tracker/tracker-manager";

// TrackerDefinitionにcurrent_valueを加えた型 cd C:\ai-chat-v3\ai-chat-app-new
type TrackerWithValue = TrackerDefinition & {
  current_value: string | number | boolean;
};

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
  other: Target,
};

const categoryColors = {
  relationship: "text-pink-400",
  status: "text-blue-400",
  condition: "text-green-400",
  emotion: "text-yellow-400",
  progress: "text-orange-400",
  other: "text-purple-400",
};

const categoryGradients = {
  relationship: "from-pink-500/30 via-rose-500/20 to-pink-500/30",
  status: "from-blue-500/30 via-indigo-500/20 to-blue-500/30",
  condition: "from-green-500/30 via-emerald-500/20 to-green-500/30",
  emotion: "from-yellow-500/30 via-amber-500/20 to-yellow-500/30",
  progress: "from-orange-500/30 via-red-500/20 to-orange-500/30",
  other: "from-purple-500/30 via-violet-500/20 to-purple-500/30",
};

// カテゴリーの日本語名マッピング
const categoryLabels: Record<string, string> = {
  relationship: "関係性",
  status: "状態",
  condition: "状況",
  emotion: "感情",
  progress: "進捗",
  other: "その他",
};

export const TrackerDisplay: React.FC<TrackerDisplayProps> = ({
  session_id,
  character_id,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["relationship", "status"])
  );
  const [trackerChanges, setTrackerChanges] = useState<
    Map<string, TrackerChangeIndicator>
  >(new Map());
  const prevTrackersRef = useRef<Map<string, string | number | boolean>>(
    new Map()
  );
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Safe access helper for trackerManagers which may be a Map or plain object
  const getTrackerManagerSafe = (trackerManagers: unknown, id: string | undefined): TrackerManager | undefined => {
    if (!trackerManagers || !id) return undefined;
    if (trackerManagers instanceof Map) return trackerManagers.get(id) as TrackerManager | undefined;
    if (typeof trackerManagers === "object") {
      const managersRecord = trackerManagers as Record<string, TrackerManager>;
      return managersRecord[id] as TrackerManager | undefined;
    }
    return undefined;
  };

  // 🔧 修正: キャラクターIDでTrackerManagerを取得（保存時と同じキーを使用）
  // Get tracker data from store with initialization check (safe for serialized store shape)
  const trackerManager = useAppStore((state) =>
    getTrackerManagerSafe(state.trackerManagers, character_id)
  );
  const characters = useAppStore((state) => state.characters);
  const character = characters.get(character_id);

  // 🆕 セッション切り替え時のトラッカー同期
  useEffect(() => {
    if (character_id && session_id) {
      console.log(`🔄 [TrackerDisplay] Session/Character changed:`, {
        session_id: session_id.substring(0, 8) + '...',
        character_id: character_id.substring(0, 8) + '...',
        characterName: character?.name
      });

      // セッション切り替え時にトラッカーマネージャーの状態確認
      const rawManagers = useAppStore.getState().trackerManagers;
      const currentManager = getTrackerManagerSafe(rawManagers, character_id);
      if (currentManager) {
        // 既存のマネージャーがある場合、一度状態を強制更新
        useAppStore.setState((state) => ({
          trackerManagers:
            state.trackerManagers instanceof Map
              ? new Map(state.trackerManagers)
              : new Map(Object.entries(state.trackerManagers || {})),
        }));
        console.log(`✅ [TrackerDisplay] Refreshed tracker manager state for session switch`);
      }
    }
  }, [session_id, character_id, character?.name]);

  // Initialize tracker manager if not exists and we have character data
  useEffect(() => {
    const rawManagers = useAppStore.getState().trackerManagers;
    const currentManager = getTrackerManagerSafe(rawManagers, character_id);
    if (
      !currentManager &&
      character &&
      character.trackers &&
      character.trackers.length > 0
    ) {
      console.log(
        `[TrackerDisplay] Initializing tracker manager for character: ${character.name}`
      );
      console.log(
        `[TrackerDisplay] Character trackers:`,
        character.trackers.map((t) => {
          // Tracker may have current_value property for runtime state
          const trackerWithValue = t as typeof t & { current_value?: unknown };
          return {
            name: t.name,
            current_value: trackerWithValue.current_value,
            config: t.config,
          };
        })
      );

      // Create a new tracker manager and initialize it
      const newManager = new TrackerManager();
      newManager.initializeTrackerSet(character_id, character.trackers);

      // Update the store - キャラクターIDをキーとして使用
      useAppStore.setState((state) => {
        const base =
          state.trackerManagers instanceof Map
            ? new Map(state.trackerManagers) as Map<string, TrackerManager>
            : new Map(Object.entries(state.trackerManagers || {})) as Map<string, TrackerManager>;
        base.set(character_id, newManager);
        return { trackerManagers: base };
      });

      console.log(
        `[TrackerDisplay] Tracker manager initialized with ${character.trackers.length} trackers`
      );
    } else if (
      currentManager &&
      character &&
      character.trackers &&
      currentManager.getTrackerSet(character_id)?.trackers.size !==
        character.trackers.length
    ) {
      // 既存のマネージャーがあっても、トラッカー数が異なる場合は再初期化を検討
      console.log(
        `[TrackerDisplay] Re-initializing tracker manager due to tracker count mismatch for character: ${character.name}`
      );
      const newManager = new TrackerManager();
      newManager.initializeTrackerSet(character_id, character.trackers);
      useAppStore.setState((state) => {
        const base =
          state.trackerManagers instanceof Map
            ? new Map(state.trackerManagers) as Map<string, TrackerManager>
            : new Map(Object.entries(state.trackerManagers || {})) as Map<string, TrackerManager>;
        base.set(character_id, newManager);
        return { trackerManagers: base };
      });
    }
  }, [character_id, character]);

  // Get current trackers with values from manager
  const trackersWithValues: TrackerWithValue[] = useMemo(() => {
    if (!trackerManager || !character?.trackers) return [];

    const trackerSet = trackerManager.getTrackerSet(character_id);
    if (!trackerSet) return [];

    return character.trackers
      .map((trackerDef) => {
        const tracker = trackerSet.trackers.get(trackerDef.name);
        if (!tracker) return null;

        return {
          ...trackerDef,
          current_value: tracker.current_value,
        };
      })
      .filter((t): t is TrackerWithValue => t !== null);
  }, [trackerManager, character?.trackers, character_id]);

  // Group trackers by category
  const groupedTrackers = useMemo(() => {
    const grouped: Record<string, TrackerWithValue[]> = {};

    trackersWithValues.forEach((tracker) => {
      const category = tracker.category || "other";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(tracker);
    });

    return grouped;
  }, [trackersWithValues]);

  // Track value changes for visual feedback
  useEffect(() => {
    const currentValues = new Map<string, string | number | boolean>();
    trackersWithValues.forEach((tracker) => {
      currentValues.set(tracker.name, tracker.current_value);
    });

    // Compare with previous values
    const changes = new Map<string, TrackerChangeIndicator>();
    currentValues.forEach((value, name) => {
      const prevValue = prevTrackersRef.current.get(name);
      if (prevValue !== undefined && prevValue !== value) {
        changes.set(name, {
          trackerId: name,
          oldValue: prevValue,
          newValue: value,
          timestamp: Date.now(),
        });
      }
    });

    if (changes.size > 0) {
      setTrackerChanges(changes);
      // Clear changes after 3 seconds
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setTrackerChanges(new Map());
      }, 3000);
    }

    prevTrackersRef.current = currentValues;
  }, [trackersWithValues]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleTrackerValueChange = (
    trackerName: string,
    change: number | string | boolean
  ) => {
    // 🔍 デバッグ: ボタンクリックを確認（コンソールが動かない場合用）
    if (!trackerManager) {
      alert(`❌ TrackerManagerが存在しません\ncharacter_id: ${character_id}\ntracker: ${trackerName}`);
      return;
    }

    const trackerSet = trackerManager.getTrackerSet(character_id);
    if (!trackerSet) return;

    const tracker = trackerSet.trackers.get(trackerName);
    if (!tracker) return;

    const oldValue = tracker.current_value;
    let newValue: number | string | boolean;

    if (typeof change === "number" && typeof tracker.current_value === "number") {
      newValue = tracker.current_value + change;
      trackerManager.updateTracker(character_id, trackerName, newValue);
    } else {
      newValue = change;
      trackerManager.updateTracker(character_id, trackerName, change);
    }

    // Log the tracker change for debugging
    console.log(`🎯 [TrackerDisplay] Tracker updated:`, {
      character_id,
      trackerName,
      oldValue,
      newValue,
      session_id
    });

    // Force re-render by updating the store
    useAppStore.setState((state) => ({
      trackerManagers: new Map(state.trackerManagers) as Map<string, TrackerManager>,
    }));

    // 🆕 トラッカー値変更時に自動的にプロンプト更新フラグを設定
    // プロンプトビルダーサービスにて次回プロンプト生成時に最新のトラッカー値が反映される
    try {
      const store = useAppStore.getState();
      if (store.clearConversationCache) {
        // ConversationManagerのキャッシュをクリアして、次回プロンプト生成時に最新のトラッカー値を反映
        store.clearConversationCache(session_id);
        console.log(`✅ [TrackerDisplay] Cleared conversation cache for session: ${session_id}`);
      }
    } catch (error) {
      console.warn('Failed to clear conversation cache:', error);
    }
  };

  const renderTrackerValue = (tracker: TrackerWithValue) => {
    const change = trackerChanges.get(tracker.name);
    const hasChange = !!change;

    return (
      <motion.div
        key={tracker.name}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "bg-slate-800/40 border border-slate-700/50 rounded-lg p-3",
          hasChange && "ring-2 ring-blue-400/50 animate-pulse"
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-white/90 truncate">
            {tracker.name}
          </h4>
          {hasChange && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-xs text-blue-400 bg-blue-400/20 px-2 py-1 rounded"
            >
              変更
            </motion.div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1">
            {/* Numeric tracker */}
            {tracker.config?.type === "numeric" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/80 font-mono">
                    {tracker.current_value}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTrackerValueChange(tracker.name, -1)}
                      className="p-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleTrackerValueChange(tracker.name, 1)}
                      className="p-1 rounded bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {/* Progress bar */}
                {typeof tracker.current_value === "number" && (
                  <div className="w-full bg-slate-700/50 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            ((tracker.current_value as number) /
                              ((tracker.config as NumericTrackerConfig)?.max_value || 100)) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Boolean tracker */}
            {tracker.config?.type === "boolean" && (
              <button
                onClick={() =>
                  handleTrackerValueChange(tracker.name, !tracker.current_value)
                }
                className={cn(
                  "w-full p-2 rounded transition-colors",
                  tracker.current_value
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                )}
              >
                {tracker.current_value ? "有効" : "無効"}
              </button>
            )}

            {/* State tracker */}
            {tracker.config?.type === "state" && (
              <div className="space-y-1">
                <div className="text-sm text-white/80 bg-slate-700/50 rounded px-2 py-1">
                  {tracker.current_value as string}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {(tracker.config as StateTrackerConfig).possible_states?.map((state) => (
                    <button
                      key={state.id}
                      onClick={() => handleTrackerValueChange(tracker.name, state.id)}
                      className={cn(
                        "text-xs p-1 rounded transition-colors",
                        tracker.current_value === state.id
                          ? "bg-purple-500/30 text-purple-300 border border-purple-500/50"
                          : "bg-slate-600/30 text-slate-400 hover:bg-slate-600/50"
                      )}
                    >
                      {state.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Text tracker */}
            {tracker.config?.type === "text" && (
              <div className="text-sm text-white/80 bg-slate-700/50 rounded px-2 py-1 break-words">
                {tracker.current_value as string}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!character || !trackersWithValues.length) {
    return (
      <div className="flex items-center justify-center h-32 text-white/50">
        <div className="text-center">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>トラッカーが設定されていません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-white/80">
        <BarChart3 className="w-5 h-5" />
        <h3 className="font-medium">トラッカー状況</h3>
        <span className="text-xs text-white/50">
          ({trackersWithValues.length}個)
        </span>
      </div>

      <div className="space-y-3">
        {Object.entries(groupedTrackers).map(([category, trackers]) => {
          const isExpanded = expandedCategories.has(category);
          const Icon = categoryIcons[category as keyof typeof categoryIcons] || Target;
          const colorClass = categoryColors[category as keyof typeof categoryColors] || "text-purple-400";
          const gradientClass = categoryGradients[category as keyof typeof categoryGradients] || "from-purple-500/30 via-violet-500/20 to-purple-500/30";

          return (
            <div key={category} className="space-y-2">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200",
                  `bg-gradient-to-r ${gradientClass}`,
                  "border border-white/10 hover:border-white/20"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-4 h-4", colorClass)} />
                  <span className="font-medium text-white/90">
                    {categoryLabels[category] || category}
                  </span>
                  <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded">
                    {trackers.length}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="w-4 h-4 text-white/60" />
                </motion.div>
              </button>

              {/* Category Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 pl-4">
                      {trackers.map((tracker) => renderTrackerValue(tracker))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};