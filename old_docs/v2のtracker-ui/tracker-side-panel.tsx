'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ChevronDown, 
  Settings, 
  Plus,
  Minus,
  BarChart3,
  Activity,
  Heart,
  Zap,
  Target,
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tracker, TrackerCategory } from '@/types';
import { TrackerUpdaterService } from '@/services/tracker/tracker-updater.service';

interface TrackerCategoryDisplay {
  name: string;
  trackers: Tracker[];
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}

interface TrackerSidePanelProps {
  trackers: Tracker[];
  onUpdateTracker: (trackerId: string, value: any) => void;
  onAddTracker?: () => void;
  onEditTracker?: (tracker: Tracker) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

interface TrackerChangeIndicator {
  trackerId: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
}

const categoryIcons = {
  relationship: Heart,
  status: BarChart3,
  condition: Activity,
  other: Target
};

const categoryColors = {
  relationship: 'text-pink-400',
  status: 'text-blue-400',
  condition: 'text-green-400',
  other: 'text-purple-400'
};

const categoryGradients = {
  relationship: 'from-pink-500/30 via-rose-500/20 to-pink-500/30',
  status: 'from-blue-500/30 via-indigo-500/20 to-blue-500/30',
  condition: 'from-green-500/30 via-emerald-500/20 to-green-500/30',
  other: 'from-purple-500/30 via-violet-500/20 to-purple-500/30'
};

const TrackerSidePanel: React.FC<TrackerSidePanelProps> = ({
  trackers,
  onUpdateTracker,
  onAddTracker,
  onEditTracker,
  isCollapsed = false,
  onToggleCollapse,
  className
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['relationship', 'status'])
  );
  
  const [trackerChanges, setTrackerChanges] = useState<Map<string, TrackerChangeIndicator>>(new Map());
  const [previousTrackers, setPreviousTrackers] = useState<Map<string, any>>(new Map());

  // Track tracker changes for visual feedback
  useEffect(() => {
    const currentValues = new Map<string, any>();
    const changes = new Map<string, TrackerChangeIndicator>();
    
    trackers.forEach(tracker => {
      const currentValue = tracker.current_value ?? TrackerUpdaterService.initializeTracker(tracker).current_value;
      currentValues.set(tracker.name, currentValue);
      
      const previousValue = previousTrackers.get(tracker.name);
      if (previousValue !== undefined && previousValue !== currentValue) {
        changes.set(tracker.name, {
          trackerId: tracker.name,
          oldValue: previousValue,
          newValue: currentValue,
          timestamp: Date.now()
        });
      }
    });
    
    setPreviousTrackers(currentValues);
    setTrackerChanges(changes);
    
    // Clear change indicators after 3 seconds
    if (changes.size > 0) {
      const timeout = setTimeout(() => {
        setTrackerChanges(new Map());
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [trackers, previousTrackers]);

  // Group trackers by category
  const categorizedTrackers = trackers.reduce((acc, tracker) => {
    const category = tracker.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(tracker);
    return acc;
  }, {} as Record<string, Tracker[]>);

  // Create category objects
  const categories: TrackerCategoryDisplay[] = Object.entries(categorizedTrackers).map(([categoryName, trackers]) => ({
    name: categoryName,
    trackers,
    icon: (categoryIcons[categoryName as keyof typeof categoryIcons] || Target) as React.ComponentType<{ size?: number; className?: string }>,
    color: categoryColors[categoryName as keyof typeof categoryColors] || 'text-purple-400'
  }));

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  const renderTracker = (tracker: Tracker) => {
    const currentValue = tracker.current_value ?? TrackerUpdaterService.initializeTracker(tracker).current_value;
    const change = trackerChanges.get(tracker.name);
    const hasRecentChange = change && (Date.now() - change.timestamp < 3000);
    
    const handleUpdate = (newValue: any) => {
      onUpdateTracker(tracker.name, newValue);
    };

    const handleEdit = () => {
      if (onEditTracker) {
        onEditTracker(tracker);
      }
    };

    switch (tracker.type) {
      case 'numeric':
        const numValue = currentValue as number;
        const progress = TrackerUpdaterService.calculateProgress(tracker);
        const numTracker = tracker as any;
        const displayFormat = numTracker.display_format || 'number';
        const step = numTracker.step || 1;
        const unit = numTracker.unit || '';
        
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <motion.span 
                  className={cn(
                    "text-lg font-semibold transition-colors duration-300",
                    hasRecentChange ? "text-blue-400" : "text-white"
                  )}
                  animate={hasRecentChange ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {displayFormat === 'percentage' ? `${numValue}%` : `${numValue}${unit}`}
                </motion.span>
                {hasRecentChange && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, rotate: -180 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center"
                  >
                    {change && change.newValue > change.oldValue ? (
                      <TrendingUp size={12} className="text-green-400" />
                    ) : (
                      <TrendingDown size={12} className="text-red-400" />
                    )}
                  </motion.div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleUpdate(Math.max((tracker.min_value || 0), numValue - step))}
                  className="p-1 rounded-full text-red-400 hover:bg-red-500/20 transition-colors backdrop-blur-sm"
                  disabled={tracker.min_value !== undefined && numValue <= tracker.min_value}
                >
                  <Minus size={12} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleUpdate(Math.min((tracker.max_value || 100), numValue + step))}
                  className="p-1 rounded-full text-green-400 hover:bg-green-500/20 transition-colors backdrop-blur-sm"
                  disabled={tracker.max_value !== undefined && numValue >= tracker.max_value}
                >
                  <Plus size={12} />
                </motion.button>
              </div>
            </div>
            {(displayFormat === 'bar' || displayFormat === 'gauge') && progress !== null && (
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
                {displayFormat === 'gauge' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-white drop-shadow-md">
                      {Math.round(progress)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'state':
        const states = tracker.possible_states || [];
        const stateTracker = tracker as any;
        const stateColors = stateTracker.state_colors || {};
        const currentState = String(currentValue || tracker.initial_state || '');
        const currentStateColor = stateColors[currentState] || '#6b7280';
        
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {states.map((state) => {
                const isSelected = state === currentState;
                const stateColor = stateColors[state] || '#6b7280';
                
                return (
                  <motion.button
                    key={state}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleUpdate(state)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all duration-300",
                      isSelected 
                        ? "text-white shadow-lg ring-2 ring-white/30 backdrop-blur-sm" 
                        : "text-gray-300 bg-black/20 hover:bg-black/30 backdrop-blur-sm border border-white/10",
                      hasRecentChange && isSelected && "animate-pulse"
                    )}
                    style={{
                      backgroundColor: isSelected ? stateColor + '80' : undefined,
                      boxShadow: isSelected ? `0 0 20px ${stateColor}60` : undefined
                    }}
                  >
                    {state}
                  </motion.button>
                );
              })}
            </div>
            <motion.div 
              className="text-center py-2 px-3 rounded-lg border backdrop-blur-sm"
              style={{
                borderColor: currentStateColor + '60',
                backgroundColor: currentStateColor + '20'
              }}
              animate={hasRecentChange ? { scale: [1, 1.02, 1] } : {}}
            >
              <span className="text-sm font-medium" style={{ color: currentStateColor }}>
                現在: {currentState}
              </span>
            </motion.div>
          </div>
        );

      case 'boolean':
        const boolValue = currentValue as boolean;
        const boolTracker = tracker as any;
        const trueLabel = boolTracker.true_label || 'Yes';
        const falseLabel = boolTracker.false_label || 'No';
        const trueColor = boolTracker.true_color || '#10b981';
        const falseColor = boolTracker.false_color || '#6b7280';
        
        return (
          <motion.button
            onClick={() => handleUpdate(!boolValue)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            animate={hasRecentChange ? { scale: [1, 1.05, 1] } : {}}
            className={cn(
              "w-full px-4 py-3 rounded-xl transition-all text-sm font-medium duration-300 relative overflow-hidden",
              "border-2 shadow-lg backdrop-blur-sm",
              hasRecentChange && "ring-4 ring-blue-500/40"
            )}
            style={{
              backgroundColor: boolValue ? trueColor + '30' : falseColor + '30',
              borderColor: boolValue ? trueColor + '80' : falseColor + '80',
              color: boolValue ? trueColor : falseColor,
              boxShadow: `0 8px 25px ${boolValue ? trueColor : falseColor}40`
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <motion.span
                animate={{ rotate: hasRecentChange ? [0, 360] : 0 }}
                transition={{ duration: 0.5 }}
                className="text-lg"
              >
                {boolValue ? '✓' : '✗'}
              </motion.span>
              <span>{boolValue ? trueLabel : falseLabel}</span>
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

      case 'text':
        const textValue = currentValue as string;
        const textTracker = tracker as any;
        const maxLength = textTracker.max_length;
        const placeholder = textTracker.placeholder || 'Enter text...';
        const multiline = textTracker.multiline || false;
        const currentLength = (textValue || '').length;
        const lengthProgress = maxLength ? (currentLength / maxLength) * 100 : 0;
        
        return (
          <div className="space-y-2">
            <motion.div
              animate={hasRecentChange ? { scale: [1, 1.02, 1] } : {}}
              className="relative"
            >
              {multiline ? (
                <textarea
                  value={textValue || ''}
                  onChange={(e) => handleUpdate(e.target.value)}
                  placeholder={placeholder}
                  maxLength={maxLength}
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
                  value={textValue || ''}
                  onChange={(e) => handleUpdate(e.target.value)}
                  placeholder={placeholder}
                  maxLength={maxLength}
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
            {maxLength && (
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
                  {currentLength}/{maxLength}
                </span>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-400">
            Unknown tracker type
          </div>
        );
    }
  };

  if (isCollapsed) {
    return (
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: 'auto' }}
        className={cn(
          "h-full backdrop-blur-xl bg-black/20 border-l border-white/20",
          className
        )}
      >
        <div className="p-2">
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors backdrop-blur-sm"
            title="Expand trackers"
          >
            <ChevronRight size={20} className="text-white" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: 320 }}
      exit={{ width: 0 }}
      className={cn(
        "h-full backdrop-blur-xl bg-gradient-to-b from-black/40 via-black/30 to-black/40",
        "border-l border-white/20 shadow-2xl",
        "flex flex-col overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/20 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/30 to-purple-500/30 backdrop-blur-sm">
            <BarChart3 size={18} className="text-white" />
          </div>
          <h3 className="font-semibold text-white">
            Trackers
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {onAddTracker && (
            <button
              onClick={onAddTracker}
              className="p-1 rounded hover:bg-white/10 transition-colors backdrop-blur-sm"
              title="Add tracker"
            >
              <Plus size={16} className="text-white" />
            </button>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-white/10 transition-colors backdrop-blur-sm"
            title="Collapse trackers"
          >
            <ChevronRight size={16} className="text-white" />
          </button>
        </div>
      </div>

      {/* Tracker Categories */}
      <div className="flex-1 overflow-y-auto">
        {categories.length === 0 ? (
          <div className="p-4 text-center">
            <div className="p-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm mx-auto mb-4 w-16 h-16 flex items-center justify-center">
              <BarChart3 size={32} className="text-white" />
            </div>
            <p className="text-sm text-gray-300 mb-4">
              No trackers yet
            </p>
            {onAddTracker && (
              <button
                onClick={onAddTracker}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg text-sm transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Add Your First Tracker
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {categories.map((category) => (
              <div key={category.name} className="space-y-2">
                {/* Category Header */}
                <motion.button
                  onClick={() => toggleCategory(category.name)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl transition-all duration-300",
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
                    <span className="font-semibold text-sm text-white capitalize">
                      {category.name}
                    </span>
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
                        <motion.div
                          key={tracker.name}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "p-3 bg-black/20 backdrop-blur-sm rounded-lg group",
                            "border border-white/20",
                            "hover:shadow-lg hover:shadow-white/10 hover:border-white/30 transition-all duration-300",
                            trackerChanges.has(tracker.name) && "ring-2 ring-blue-400 ring-opacity-50"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm text-white">
                              {tracker.display_name}
                            </h4>
                            {onEditTracker && (
                              <button
                                onClick={() => onEditTracker(tracker)}
                                className="p-1 rounded hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                                title="Edit tracker"
                              >
                                <Settings size={12} className="text-white" />
                              </button>
                            )}
                          </div>
                          
                          {tracker.description && (
                            <p className="text-xs text-gray-300 mb-2">
                              {tracker.description}
                            </p>
                          )}
                          
                          {renderTracker(tracker)}
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TrackerSidePanel;