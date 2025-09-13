'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, 
  Clock, 
  Brain, 
  Database, 
  HardDrive, 
  Activity,
  TrendingUp,
  MessageSquare,
  Zap,
  Info
} from 'lucide-react';
import { MemoryLayerType, MemoryLayer } from '@/types';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

interface MemoryLayerDisplayProps {
  session_id: string;
  className?: string;
}

interface LayerStats {
  total: number;
  pinned: number;
  hidden: number;
  categories: Record<string, number>;
}

export const MemoryLayerDisplay: React.FC<MemoryLayerDisplayProps> = ({ 
  session_id: _session_id,
  className 
}) => {
  const [expandedLayer, setExpandedLayer] = useState<MemoryLayerType | null>(null);
  
  const { 
    immediate_memory,
    working_memory,
    episodic_memory,
    semantic_memory,
    permanent_memory,
    // getLayeredContext,
    getLayerStatistics,
    clearLayer
  } = useAppStore() as any;
  
  // セッション固有のレイヤーデータ（現在はグローバル）
  const sessionLayers = {
    immediate_memory,
    working_memory,
    episodic_memory,
    semantic_memory,
    permanent_memory
  };
  
  const layerConfigs = [
    {
      type: 'immediate_memory' as const,
      name: '即座メモリー',
      description: '現在の会話の文脈を保持',
      icon: Zap,
      color: 'from-red-500 to-orange-500',
      bgColor: 'bg-red-500/20',
      textColor: 'text-red-400',
      borderColor: 'border-red-500/30'
    },
    {
      type: 'working_memory' as const,
      name: '作業メモリー',
      description: '短期間の重要な情報を保持',
      icon: Brain,
      color: 'from-orange-500 to-yellow-500',
      bgColor: 'bg-orange-500/20',
      textColor: 'text-orange-400',
      borderColor: 'border-orange-500/30'
    },
    {
      type: 'episodic_memory' as const,
      name: 'エピソードメモリー',
      description: '会話の流れと出来事を記録',
      icon: Clock,
      color: 'from-yellow-500 to-green-500',
      bgColor: 'bg-yellow-500/20',
      textColor: 'text-yellow-400',
      borderColor: 'border-yellow-500/30'
    },
    {
      type: 'semantic_memory' as const,
      name: '意味メモリー',
      description: '概念と知識を長期保存',
      icon: Database,
      color: 'from-green-500 to-blue-500',
      bgColor: 'bg-green-500/20',
      textColor: 'text-green-400',
      borderColor: 'border-green-500/30'
    },
    {
      type: 'permanent_memory' as const,
      name: '永続メモリー',
      description: '最も重要な情報を永続保存',
      icon: HardDrive,
      color: 'from-blue-500 to-purple-500',
      bgColor: 'bg-blue-500/20',
      textColor: 'text-blue-400',
      borderColor: 'border-blue-500/30'
    }
  ];
  
  const getLayerData = (type: MemoryLayerType): MemoryLayer<number> | null => {
    if (!sessionLayers) return null;
    
    switch (type) {
      case 'immediate_memory':
        return sessionLayers.immediate_memory as MemoryLayer<number>;
      case 'working_memory':
        return sessionLayers.working_memory as MemoryLayer<number>;
      case 'episodic_memory':
        return sessionLayers.episodic_memory as MemoryLayer<number>;
      case 'semantic_memory':
        return sessionLayers.semantic_memory as MemoryLayer<number>;
      case 'permanent_memory':
        return sessionLayers.permanent_memory as any as MemoryLayer<number>; // PermanentMemory is different structure
      default:
        return null;
    }
  };
  
  const getLayerStats = (_type: MemoryLayerType): LayerStats | null => {
    if (!sessionLayers) return null;
    return getLayerStatistics();
  };
  
  const handleLayerToggle = (type: MemoryLayerType) => {
    setExpandedLayer(expandedLayer === type ? null : type);
  };
  
  const handleClearLayer = async (type: MemoryLayerType) => {
    if (confirm(`${layerConfigs.find(l => l.type === type)?.name}をクリアしますか？`)) {
      await clearLayer(type);
    }
  };
  
  const formatRetentionPolicy = (policy: string) => {
    switch (policy) {
      case 'fifo':
        return 'FIFO（先入れ先出し）';
      case 'importance':
        return '重要度ベース';
      case 'lru':
        return 'LRU（最近使用）';
      case 'hybrid':
        return 'ハイブリッド';
      default:
        return policy;
    }
  };
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          <h3 className="text-white font-medium">階層的メモリー</h3>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Info className="w-4 h-4" />
          <span>各レイヤーの状態を表示</span>
        </div>
      </div>
      
      {/* メモリーレイヤー一覧 */}
      {!sessionLayers ? (
        <div className="text-center py-8 text-white/50">
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">メモリーレイヤーが初期化されていません</p>
          <p className="text-xs text-white/30">チャットを開始すると自動的に作成されます</p>
        </div>
      ) : (
        <div className="space-y-3">
          {layerConfigs.map(config => {
            const layerData = getLayerData(config.type);
            const stats = getLayerStats(config.type);
            const IconComponent = config.icon;
            const isExpanded = expandedLayer === config.type;
            
            if (!layerData) return null;
            
            return (
              <motion.div
                key={config.type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'bg-white/5 backdrop-blur-sm rounded-lg border transition-all duration-200',
                  config.borderColor,
                  isExpanded && 'ring-2 ring-white/20'
                )}
              >
                {/* レイヤーヘッダー */}
                <button
                  onClick={() => handleLayerToggle(config.type)}
                  className="w-full p-4 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        config.bgColor
                      )}>
                        <IconComponent className={cn('w-5 h-5', config.textColor)} />
                      </div>
                      
                      <div className="text-left">
                        <h4 className={cn('font-medium text-sm', config.textColor)}>
                          {config.name}
                        </h4>
                        <p className="text-white/60 text-xs">{config.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* 統計情報 */}
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <MessageSquare className="w-3 h-3" />
                        <span>{layerData?.messages?.length || 0}</span>
                        <Activity className="w-3 h-3" />
                        <span>{stats?.total || 0}</span>
                      </div>
                      
                      {/* 展開/折りたたみアイコン */}
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <TrendingUp className="w-4 h-4 text-white/50" />
                      </motion.div>
                    </div>
                  </div>
                </button>
                
                {/* レイヤー詳細 */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3 border-t border-white/10">
                        {/* 保持ポリシー */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/60">保持ポリシー:</span>
                          <span className="text-white/80">
                            {formatRetentionPolicy(layerData.retention_policy)}
                          </span>
                        </div>
                        
                        {/* 容量情報 */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/60">容量:</span>
                          <span className="text-white/80">
{layerData?.messages?.length || 0} / {layerData?.max_size || '∞'}
                          </span>
                        </div>
                        
                        {/* 最新メッセージ */}
                        {(layerData?.messages?.length || 0) > 0 && (
                          <div className="space-y-2">
                            <span className="text-xs text-white/60">最新メッセージ:</span>
                            <div className="bg-white/5 rounded p-2">
                              <p className="text-white/80 text-xs line-clamp-2">
                                {layerData?.messages?.[layerData.messages.length - 1]?.content || '内容なし'}
                              </p>
                              <span className="text-white/50 text-xs">
                                {new Date(layerData?.messages?.[layerData.messages.length - 1]?.created_at || Date.now()).toLocaleTimeString('ja-JP')}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* アクションボタン */}
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => handleClearLayer(config.type)}
                            className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition-colors"
                          >
                            クリア
                          </button>
                          
                          <button
                            onClick={() => {
                              // レイヤー間の移動機能（実装予定）
                              console.log(`${config.name}の詳細表示`);
                            }}
                            className="px-3 py-1.5 bg-white/10 text-white/70 rounded text-xs hover:bg-white/20 transition-colors"
                          >
                            詳細表示
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
      
      {/* 全体統計 */}
      {sessionLayers && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4"
        >
          <h4 className="text-white font-medium text-sm mb-3">全体統計</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-white/60">総メッセージ数:</span>
              <span className="text-white/80">
                {Object.values(sessionLayers).reduce((total: number, layer: any) => total + (layer?.messages?.length || 0), 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">アクティブレイヤー:</span>
              <span className="text-white/80">
{Object.values(sessionLayers).filter((layer: any) => layer?.messages?.length > 0).length}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
