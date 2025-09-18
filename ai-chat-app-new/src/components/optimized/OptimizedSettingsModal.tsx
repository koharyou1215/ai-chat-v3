'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  Suspense,
  memo,
  lazy
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Palette, Zap, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';
import { EnhancedLoadingFallbacks } from './DynamicComponents';

// ===== DYNAMIC PANEL IMPORTS =====

// Only load the panel that's currently active
const DynamicSettingsPanels = {
  api: lazy(() => import('../settings/SettingsModal').then(module => ({
    default: () => {
      // Extract API panel from SettingsModal - this would need to be refactored
      console.log('Loading API Panel');
      return <div>API Settings Panel (Dynamic)</div>;
    }
  }))),

  appearance: lazy(() => import('../settings/SettingsModal').then(module => ({
    default: () => {
      console.log('Loading Appearance Panel');
      return <div>Appearance Settings Panel (Dynamic)</div>;
    }
  }))),

  effects: lazy(() => import('../settings/SettingsModal').then(module => ({
    default: () => {
      console.log('Loading Effects Panel');
      return <div>Effects Settings Panel (Dynamic)</div>;
    }
  }))),

  advanced: lazy(() => import('../settings/SettingsModal').then(module => ({
    default: () => {
      console.log('Loading Advanced Panel');
      return <div>Advanced Settings Panel (Dynamic)</div>;
    }
  }))),
};

// ===== INTERFACES =====

interface OptimizedSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

type SettingsTab = 'api' | 'appearance' | 'effects' | 'advanced';

// ===== MEMOIZED COMPONENTS =====

// Memoized tab button to prevent unnecessary re-renders
const MemoizedTabButton = memo(({
  tab,
  label,
  icon: Icon,
  isActive,
  onClick,
  disabled = false
}: {
  tab: SettingsTab;
  label: string;
  icon: any;
  isActive: boolean;
  onClick: (tab: SettingsTab) => void;
  disabled?: boolean;
}) => (
  <button
    onClick={() => !disabled && onClick(tab)}
    disabled={disabled}
    className={cn(
      "flex items-center gap-3 w-full p-3 rounded-lg text-left transition-all duration-200",
      isActive
        ? "bg-purple-600/30 text-purple-300 border border-purple-500/50"
        : "text-white/70 hover:bg-white/10 hover:text-white",
      disabled && "opacity-50 cursor-not-allowed"
    )}
  >
    <Icon className="w-5 h-5 flex-shrink-0" />
    <span className="font-medium">{label}</span>
    {isActive && (
      <div className="ml-auto w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
    )}
  </button>
));

MemoizedTabButton.displayName = 'MemoizedTabButton';

// Memoized modal header
const MemoizedModalHeader = memo(({ onClose }: { onClose: () => void }) => (
  <div className="flex items-center justify-between p-6 border-b border-white/10">
    <div className="flex items-center gap-3">
      <Settings className="w-6 h-6 text-purple-400" />
      <h2 className="text-xl font-semibold text-white">設定</h2>
    </div>
    <button
      onClick={onClose}
      className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
    >
      <X className="w-5 h-5" />
    </button>
  </div>
));

MemoizedModalHeader.displayName = 'MemoizedModalHeader';

// ===== MAIN COMPONENT =====

const OptimizedSettingsModalComponent: React.FC<OptimizedSettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'api'
}) => {
  // Performance optimization
  const {
    createOptimizedCallback,
    smartMemo,
    metrics,
    shouldSplitComponent
  } = usePerformanceOptimization('SettingsModal');

  // State management
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab as SettingsTab);
  const [loadedPanels, setLoadedPanels] = useState<Set<SettingsTab>>(new Set([initialTab as SettingsTab]));
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Memoized tab configuration
  const tabConfig = smartMemo(() => [
    {
      key: 'api' as SettingsTab,
      label: 'API設定',
      icon: Settings,
      description: 'APIキーとプロバイダー設定'
    },
    {
      key: 'appearance' as SettingsTab,
      label: '外観',
      icon: Palette,
      description: '背景、テーマ、UI設定'
    },
    {
      key: 'effects' as SettingsTab,
      label: 'エフェクト',
      icon: Zap,
      description: 'アニメーションとエフェクト設定'
    },
    {
      key: 'advanced' as SettingsTab,
      label: '詳細設定',
      icon: Wrench,
      description: 'システムとデバッグ設定'
    }
  ]);

  // Optimized tab change handler with preloading
  const handleTabChange = createOptimizedCallback(async (newTab: SettingsTab) => {
    if (newTab === activeTab || isTransitioning) return;

    setIsTransitioning(true);

    // Preload the panel if not already loaded
    if (!loadedPanels.has(newTab)) {
      setLoadedPanels(prev => new Set([...prev, newTab]));
    }

    // Add a small delay for smooth transition
    setTimeout(() => {
      setActiveTab(newTab);
      setIsTransitioning(false);
    }, 150);
  });

  // Preload adjacent panels on hover
  const preloadAdjacentPanels = createOptimizedCallback((hoveredTab: SettingsTab) => {
    const currentIndex = tabConfig.findIndex(tab => tab.key === hoveredTab);
    const adjacentTabs: SettingsTab[] = [];

    if (currentIndex > 0) {
      adjacentTabs.push(tabConfig[currentIndex - 1].key);
    }
    if (currentIndex < tabConfig.length - 1) {
      adjacentTabs.push(tabConfig[currentIndex + 1].key);
    }

    const newPanelsToLoad = adjacentTabs.filter(tab => !loadedPanels.has(tab));
    if (newPanelsToLoad.length > 0) {
      setLoadedPanels(prev => new Set([...prev, ...newPanelsToLoad]));
    }
  });

  // Initialize with the initial tab
  useEffect(() => {
    if (isOpen && initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab as SettingsTab);
      setLoadedPanels(prev => new Set([...prev, initialTab as SettingsTab]));
    }
  }, [isOpen, initialTab, activeTab]);

  // Optimized panel renderer
  const renderPanel = smartMemo(() => {
    if (!loadedPanels.has(activeTab)) {
      return <EnhancedLoadingFallbacks.settingsPanel />;
    }

    const PanelComponent = DynamicSettingsPanels[activeTab];

    return (
      <Suspense fallback={<EnhancedLoadingFallbacks.settingsPanel />}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="h-full"
        >
          <PanelComponent />
        </motion.div>
      </Suspense>
    );
  });

  // Handle modal close with cleanup
  const handleClose = createOptimizedCallback(() => {
    setIsTransitioning(false);
    onClose();
  });

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = tabConfig.findIndex(tab => tab.key === activeTab);
        let newIndex;

        if (e.key === 'ArrowUp') {
          newIndex = currentIndex > 0 ? currentIndex - 1 : tabConfig.length - 1;
        } else {
          newIndex = currentIndex < tabConfig.length - 1 ? currentIndex + 1 : 0;
        }

        handleTabChange(tabConfig[newIndex].key);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, tabConfig, handleTabChange, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative w-full max-w-6xl h-[80vh] mx-4 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <MemoizedModalHeader onClose={handleClose} />

        {/* Content */}
        <div className="flex h-[calc(100%-80px)]">
          {/* Sidebar */}
          <div className="w-64 bg-slate-800/50 border-r border-white/10 p-4">
            <div className="space-y-2">
              {tabConfig.map((tab) => (
                <div
                  key={tab.key}
                  onMouseEnter={() => preloadAdjacentPanels(tab.key)}
                >
                  <MemoizedTabButton
                    tab={tab.key}
                    label={tab.label}
                    icon={tab.icon}
                    isActive={activeTab === tab.key}
                    onClick={handleTabChange}
                    disabled={isTransitioning}
                  />
                  {activeTab === tab.key && (
                    <p className="text-xs text-white/50 mt-1 ml-8">
                      {tab.description}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Performance info in development */}
            {process.env.NODE_ENV === 'development' && metrics && (
              <div className="mt-8 p-3 bg-slate-700/30 rounded-lg">
                <h4 className="text-xs font-medium text-white/70 mb-2">Performance</h4>
                <div className="text-xs text-white/50 space-y-1">
                  <div>Renders: {metrics.renderCount}</div>
                  <div>Avg: {metrics.averageRenderTime.toFixed(1)}ms</div>
                  <div>Loaded: {loadedPanels.size}/{tabConfig.length}</div>
                </div>
              </div>
            )}
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {renderPanel}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Loading indicator */}
        {isTransitioning && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        )}
      </motion.div>
    </div>
  );
};

OptimizedSettingsModalComponent.displayName = 'OptimizedSettingsModal';

// ===== EXPORTED COMPONENT =====

export const OptimizedSettingsModal = memo(OptimizedSettingsModalComponent, (prevProps, nextProps) => {
  // Custom comparison for optimal re-rendering
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.initialTab === nextProps.initialTab &&
    prevProps.onClose === nextProps.onClose
  );
});

export default OptimizedSettingsModal;