/**
 * Optimized import utilities to reduce bundle size
 * This file provides optimized imports that avoid barrel imports and heavy dependencies
 */

// ===== FRAMER MOTION OPTIMIZATIONS =====

// Instead of importing the entire framer-motion library,
// we can create optimized motion components for common use cases

export const createOptimizedMotion = () => {
  // Only import what we need from framer-motion
  const { motion, AnimatePresence } = require('framer-motion');
  return { motion, AnimatePresence };
};

// ===== ICON OPTIMIZATIONS =====

// Create tree-shakeable icon imports
export const getOptimizedIcons = () => {
  // Lucide React is already tree-shakeable, but we can optimize common patterns
  return {
    // Core icons used everywhere
    X: require('lucide-react').X,
    Search: require('lucide-react').Search,
    Plus: require('lucide-react').Plus,
    Settings: require('lucide-react').Settings,
    
    // Chat icons
    Bot: require('lucide-react').Bot,
    Send: require('lucide-react').Send,
    Mic: require('lucide-react').Mic,
    
    // Action icons
    Copy: require('lucide-react').Copy,
    Edit: require('lucide-react').Edit,
    RefreshCw: require('lucide-react').RefreshCw,
    
    // Media icons
    Volume2: require('lucide-react').Volume2,
    Pause: require('lucide-react').Pause,
    Upload: require('lucide-react').Upload,
  };
};

// ===== TYPE IMPORT OPTIMIZATIONS =====

// Instead of importing all types from barrel exports,
// provide specific type imports
export type { Character } from '@/types/core/character.types';
export type { Persona } from '@/types/core/persona.types';
export type { UnifiedMessage } from '@/types/core/message.types';
export type { MemoryCard } from '@/types/core/memory.types';

// ===== COMPONENT IMPORT OPTIMIZATIONS =====

// Wrapper for commonly used UI components to avoid repeated imports
export const getUIComponents = () => {
  return {
    Button: require('@/components/ui/button').Button,
    Input: require('@/components/ui/input').Input,
    Dialog: require('@/components/ui/dialog').Dialog,
    DialogContent: require('@/components/ui/dialog').DialogContent,
    Tabs: require('@/components/ui/tabs').Tabs,
    TabsContent: require('@/components/ui/tabs').TabsContent,
  };
};

// ===== STORE OPTIMIZATIONS =====

// Optimized store selectors to prevent unnecessary re-renders
export const getOptimizedStoreSelectors = () => {
  return {
    // Commonly used selectors that can be memoized
    useSelectedCharacter: () => require('@/store').useAppStore(state => state.getSelectedCharacter()),
    useSelectedPersona: () => require('@/store').useAppStore(state => state.getSelectedPersona()),
    useIsGenerating: () => require('@/store').useAppStore(state => state.is_generating),
    useActiveSession: () => require('@/store').useAppStore(state => state.getActiveSession()),
  };
};