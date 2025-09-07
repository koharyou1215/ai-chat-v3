/**
 * Optimized Imports for Performance
 * 
 * This file provides optimized import patterns to reduce bundle size
 * and improve loading performance by using dynamic imports and
 * tree-shaking optimizations.
 */

// ===== FRAMER MOTION OPTIMIZATIONS =====

// Instead of importing the entire framer-motion library,
// we can create optimized motion components for common use cases

export const createOptimizedMotion = async () => {
  // Only import what we need from framer-motion
  const { motion, AnimatePresence } = await import('framer-motion');
  return { motion, AnimatePresence };
};

// ===== ICON OPTIMIZATIONS =====

// Create tree-shakeable icon imports
export const getOptimizedIcons = async () => {
  // Lucide React is already tree-shakeable, but we can optimize common patterns
  const lucideReact = await import('lucide-react');
  return {
    // Core icons used everywhere
    X: lucideReact.X,
    Search: lucideReact.Search,
    Plus: lucideReact.Plus,
    Settings: lucideReact.Settings,
    
    // Chat icons
    Bot: lucideReact.Bot,
    Send: lucideReact.Send,
    Mic: lucideReact.Mic,
    Volume2: lucideReact.Volume2,
    VolumeX: lucideReact.VolumeX,
    Pause: lucideReact.Pause,
    Play: lucideReact.Play,
    
    // UI icons
    ChevronRight: lucideReact.ChevronRight,
    ChevronLeft: lucideReact.ChevronLeft,
    ChevronDown: lucideReact.ChevronDown,
    ChevronUp: lucideReact.ChevronUp,
    MoreVertical: lucideReact.MoreVertical,
    MoreHorizontal: lucideReact.MoreHorizontal,
    
    // Action icons
    Edit: lucideReact.Edit,
    Copy: lucideReact.Copy,
    RefreshCw: lucideReact.RefreshCw,
    Trash2: lucideReact.Trash2,
    Download: lucideReact.Download,
    Upload: lucideReact.Upload,
    
    // Status icons
    Check: lucideReact.Check,
    AlertCircle: lucideReact.AlertCircle,
    Info: lucideReact.Info,
    Warning: lucideReact.Warning,
    
    // Navigation icons
    Home: lucideReact.Home,
    User: lucideReact.User,
    Users: lucideReact.Users,
    MessageCircle: lucideReact.MessageCircle,
    Bell: lucideReact.Bell,
    Heart: lucideReact.Heart,
    Star: lucideReact.Star,
    
    // Media icons
    Image: lucideReact.Image,
    Video: lucideReact.Video,
    File: lucideReact.File,
    Folder: lucideReact.Folder,
    
    // System icons
    Menu: lucideReact.Menu,
    Close: lucideReact.Close,
    Maximize: lucideReact.Maximize,
    Minimize: lucideReact.Minimize,
    RotateCcw: lucideReact.RotateCcw,
    RotateCw: lucideReact.RotateCw,
    
    // Specialized icons
    Sparkles: lucideReact.Sparkles,
    Wand2: lucideReact.Wand2,
    Brain: lucideReact.Brain,
    Activity: lucideReact.Activity,
    Gauge: lucideReact.Gauge,
    Palette: lucideReact.Palette,
    Globe: lucideReact.Globe,
    Code: lucideReact.Code,
    Database: lucideReact.Database,
    Shield: lucideReact.Shield,
    Lightbulb: lucideReact.Lightbulb,
    Cpu: lucideReact.Cpu,
    Eye: lucideReact.Eye,
    EyeOff: lucideReact.EyeOff,
    Save: lucideReact.Save,
    Loader: lucideReact.Loader,
    Loader2: lucideReact.Loader2,
  };
};

// ===== COMPONENT OPTIMIZATIONS =====

// Lazy load heavy components
export const getOptimizedComponents = async () => {
  const [
    { HologramMessage, ParticleText, MessageEffects, EmotionDisplay },
    { EmotionReactions },
    { VoiceCallInterface },
    { AdvancedEffects }
  ] = await Promise.all([
    import('../lazy/LazyEffects'),
    import('@/components/emotion/EmotionDisplay'),
    import('@/components/voice/VoiceCallInterface'),
    import('@/components/chat/AdvancedEffects')
  ]);

  return {
    HologramMessage,
    ParticleText,
    MessageEffects,
    EmotionDisplay,
    EmotionReactions,
    VoiceCallInterface,
    AdvancedEffects
  };
};

// ===== UTILITY OPTIMIZATIONS =====

// Lazy load utility functions
export const getOptimizedUtils = async () => {
  const [
    { replaceVariables, replaceVariablesInMessage },
    { cn },
    { formatMessageContent }
  ] = await Promise.all([
    import('@/utils/variable-replacer'),
    import('@/lib/utils'),
    import('@/utils/text-formatter')
  ]);

  return {
    replaceVariables,
    replaceVariablesInMessage,
    cn,
    formatMessageContent
  };
};

// ===== HOOK OPTIMIZATIONS =====

// Lazy load custom hooks
export const getOptimizedHooks = async () => {
  const [
    { useAudioPlayback },
    { useVoiceCall },
    { useEmotionAnalysis }
  ] = await Promise.all([
    import('@/hooks/useAudioPlayback'),
    import('@/hooks/useVoiceCall'),
    import('@/hooks/useEmotionAnalysis')
  ]);

  return {
    useAudioPlayback,
    useVoiceCall,
    useEmotionAnalysis
  };
};

// ===== SERVICE OPTIMIZATIONS =====

// Lazy load services
export const getOptimizedServices = async () => {
  const [
    { EmotionAnalyzer },
    { VoiceService },
    { MemoryService }
  ] = await Promise.all([
    import('@/services/emotion/EmotionAnalyzer'),
    import('@/services/voice/VoiceService'),
    import('@/services/memory/MemoryService')
  ]);

  return {
    EmotionAnalyzer,
    VoiceService,
    MemoryService
  };
};

// ===== MAIN OPTIMIZATION FUNCTION =====

// Load all optimizations at once
export const loadAllOptimizations = async () => {
  const [
    motion,
    icons,
    components,
    utils,
    hooks,
    services
  ] = await Promise.all([
    createOptimizedMotion(),
    getOptimizedIcons(),
    getOptimizedComponents(),
    getOptimizedUtils(),
    getOptimizedHooks(),
    getOptimizedServices()
  ]);

  return {
    motion,
    icons,
    components,
    utils,
    hooks,
    services
  };
};