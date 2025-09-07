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
    Minus: lucideReact.Minus,
    Settings: lucideReact.Settings,
    MoreHorizontal: lucideReact.MoreHorizontal,
    MoreVertical: lucideReact.MoreVertical,
    
    // Action icons
    Edit: lucideReact.Edit,
    Delete: lucideReact.Trash2,
    Save: lucideReact.Save,
    Download: lucideReact.Download,
    Upload: lucideReact.Upload,
    Copy: lucideReact.Copy,
    Share: lucideReact.Share,
    
    // Navigation arrows
    ChevronLeft: lucideReact.ChevronLeft,
    ChevronRight: lucideReact.ChevronRight,
    ChevronUp: lucideReact.ChevronUp,
    ChevronDown: lucideReact.ChevronDown,
    ArrowLeft: lucideReact.ArrowLeft,
    ArrowRight: lucideReact.ArrowRight,
    
    // Status icons
    Check: lucideReact.Check,
    CheckCircle: lucideReact.CheckCircle,
    AlertTriangle: lucideReact.AlertTriangle,
    AlertCircle: lucideReact.AlertCircle,
    Info: lucideReact.Info,
    AlertOctagon: lucideReact.AlertOctagon, // 🔧 FIX: Warning -> AlertOctagon
    
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
    XCircle: lucideReact.XCircle, // 🔧 FIX: Close -> XCircle
    Maximize: lucideReact.Maximize,
    Minimize: lucideReact.Minimize,
    RotateCcw: lucideReact.RotateCcw,
    RotateCw: lucideReact.RotateCw,
    
    // Specialized icons
    Sparkles: lucideReact.Sparkles,
    Wand2: lucideReact.Wand2,
  };
};

// ===== UI COMPONENTS OPTIMIZATION =====

// Lazy load UI library components for better performance
export const getOptimizedUIComponents = async () => {
  const [
    { Button },
    { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle },
    { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger },
    { Tabs, TabsContent, TabsList, TabsTrigger },
    { Select, SelectContent, SelectItem, SelectTrigger, SelectValue },
    { Input },
    { Label },
    { Textarea },
    { Separator },
  ] = await Promise.all([
    import('@/components/ui/button'),
    import('@/components/ui/card'),
    import('@/components/ui/dialog'),
    import('@/components/ui/tabs'),
    import('@/components/ui/select'),
    import('@/components/ui/input'),
    import('@/components/ui/label'),
    import('@/components/ui/textarea'),
    import('@/components/ui/separator'),
  ]);

  return {
    Button,
    Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
    Tabs, TabsContent, TabsList, TabsTrigger,
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
    Input,
    Label,
    Textarea,
    Separator,
  };
};

// ===== CHAT COMPONENTS OPTIMIZATION =====

// Heavy chat components that should be loaded on demand
export const getChatComponents = async () => {
  const [
    { AdvancedEffects }, // 🔧 FIX: Remove incorrect reference
    { MessageEffects },
    { EmotionDisplay },
    { TrackerDisplay },
    { MemoryCard },
    { CharacterCard },
    { PersonaCard },
  ] = await Promise.all([
    import('@/components/chat/AdvancedEffects'),
    import('@/components/chat/MessageEffects'),
    import('@/components/emotion/EmotionDisplay'),
    import('@/components/tracker/TrackerDisplay'),
    import('@/components/memory/MemoryCard'),
    import('@/components/character/CharacterCard'),
    import('@/components/persona/PersonaCard'),
  ]);

  return {
    AdvancedEffects,
    MessageEffects,
    EmotionDisplay,
    TrackerDisplay,
    MemoryCard,
    CharacterCard,
    PersonaCard,
  };
};

// ===== MODAL COMPONENTS OPTIMIZATION =====

// Modals are perfect for lazy loading since they're not always visible
export const getModalComponents = async () => {
  const [
    { SettingsModal },
    { CharacterGalleryModal },
    { PersonaGalleryModal },
    { ChatHistoryModal },
    { SuggestionModal },
    { EnhancementModal },
    { ScenarioSetupModal },
  ] = await Promise.all([
    import('@/components/settings/SettingsModal'),
    import('@/components/character/CharacterGalleryModal'),
    import('@/components/persona/PersonaGalleryModal'),
    import('@/components/history/ChatHistoryModal'),
    import('@/components/chat/SuggestionModal'),
    import('@/components/chat/EnhancementModal'),
    import('@/components/chat/ScenarioSetupModal'),
  ]);

  return {
    SettingsModal,
    CharacterGalleryModal,
    PersonaGalleryModal,
    ChatHistoryModal,
    SuggestionModal,
    EnhancementModal,
    ScenarioSetupModal,
  };
};

// ===== HOOKS AND SERVICES OPTIMIZATION =====

// Services that might not be needed immediately
export const getOptimizedServices = async () => {
  // 🔧 FIX: Remove non-existent imports
  const [
    { promptBuilderService },
    { simpleAPIManagerV2 },
    { autoMemoryManager },
  ] = await Promise.all([
    import('@/services/prompt-builder.service'),
    import('@/services/simple-api-manager-v2'),
    import('@/services/memory/auto-memory-manager'),
  ]);

  return {
    promptBuilderService,
    simpleAPIManagerV2,
    autoMemoryManager,
  };
};

// ===== FORM VALIDATION OPTIMIZATION =====

// Form validation libraries can be large, so load on demand
export const getFormValidation = async () => {
  // Example of dynamic form validation loading
  const { z } = await import('zod');
  return { z };
};

// ===== UTILITY OPTIMIZATIONS =====

// Utility functions that might not be needed on initial load
export const getOptimizedUtilities = async () => {
  const [
    { cn },
    { formatDistanceToNow, format } // Add date-fns if needed
  ] = await Promise.all([
    import('@/lib/utils'),
    import('date-fns'),
  ]);

  return {
    cn,
    formatDistanceToNow,
    format,
  };
};

// ===== PERFORMANCE MONITORING =====

// Tools for performance monitoring that shouldn't block initial load
export const getPerformanceTools = async () => {
  // Example performance monitoring setup
  if (process.env.NODE_ENV === 'development') {
    const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals');
    return {
      getCLS,
      getFID,
      getFCP,
      getLCP,
      getTTFB,
    };
  }
  return {};
};

// ===== EXPORT OPTIMIZED LOADERS =====

export const OptimizedLoaders = {
  motion: createOptimizedMotion,
  icons: getOptimizedIcons,
  ui: getOptimizedUIComponents,
  chat: getChatComponents,
  modals: getModalComponents,
  services: getOptimizedServices,
  forms: getFormValidation,
  utils: getOptimizedUtilities,
  performance: getPerformanceTools,
};

export default OptimizedLoaders;