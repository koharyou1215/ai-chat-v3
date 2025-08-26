# 🤖 AI Chat V3 Quick Reference Guide for AI Development

> **CRITICAL**: This is an AI-optimized quick reference guide. Always consult the complete guide `🎯 AI Chat V3 完全開発ガイド.md` for detailed implementation.

## 📋 Immediate Action Checklist

### Before Starting Development ⚠️
- [ ] **NEVER use `any` type** → Use `unknown`, generics, or custom types
- [ ] **Read complete guide first** → `🎯 AI Chat V3 完全開発ガイド.md`
- [ ] **Check current git status** → `git status && git branch`
- [ ] **Use feature branches** → Never work on main/master

### Critical File Locations 📁
```typescript
// Core Types (MUST USE)
import { UnifiedMessage } from '@/types/core/message.types';
import { Character } from '@/types/core/character.types';
import { EffectSettings } from '@/store/slices/settings.slice';

// Services (Unified API)
import { apiManager } from '@/services/api-manager';
import { TrackerManager } from '@/services/tracker/tracker-manager';

// Store (Zustand)
import { useAppStore } from '@/store';
```

## 🏗️ System Architecture (Visual)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ UI Layer    │◄──►│ Service     │◄──►│ Data Store  │
│ Components  │    │ Layer       │    │ (Zustand)   │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
   ┌───┴───┐         ┌─────┴─────┐      ┌──────┴──────┐
   │React  │         │API Manager│      │Persistence  │
   │+Motion│         │+Trackers  │      │+LocalStorage│
   └───────┘         └───────────┘      └─────────────┘
```

## 🔧 Type System Rules

### ✅ CORRECT Usage
```typescript
// Message handling
const message: UnifiedMessage = {
  id: uuid(),
  session_id: sessionId,
  role: 'user', // NOT 'sender'
  content: text,
  memory: { importance: { score: 0.5 }, /* ... */ },
  expression: { emotion: { primary: 'neutral' }, /* ... */ }
};

// API calls
const response = await apiManager.generateMessage(prompt, message);

// Store access
const { sendMessage, sessions } = useAppStore();
```

### ❌ INCORRECT Usage
```typescript
// DO NOT USE
const message: any = getMessage(); // ❌ Never use 'any'
const msg: Message = oldMessage;   // ❌ 'Message' type deleted
message.sender = 'user';           // ❌ Use 'role' instead
```

## ⚡ Quick Fix Reference

### Common Errors & Solutions

| Error | Solution |
|-------|----------|
| `Property 'sender' does not exist` | Use `message.role` instead |
| `Tracker not displaying` | Use `tracker.config.type` not `tracker.type` |
| `API key undefined` | Check synchronous initialization in `gemini-client.ts` |
| `TypeError: state.toLowerCase is not a function` | Ensure `possible_states` contains only strings |

### Performance Rules
```typescript
// ✅ UI First Approach
const sendMessage = async (text: string) => {
  // 1. Update UI immediately
  addUserMessage(text);
  setIsGenerating(true);
  
  // 2. Background processing
  const response = await apiManager.generateMessage(/* ... */);
  addAIMessage(response);
  setIsGenerating(false);
};

// ❌ Blocking Approach (Don't do this)
const sendMessage = async (text: string) => {
  const response = await apiManager.generateMessage(/* ... */);
  addUserMessage(text);
  addAIMessage(response);
};
```

## 🎯 Critical Components

### ChatInterface.tsx
- **Purpose**: Main chat container
- **Key**: Session management, modal control
- **Updated**: Group/individual chat switching (Aug 25)

### MessageBubble.tsx  
- **Purpose**: Individual message rendering
- **Key**: Effects, emotions, user interactions
- **Updated**: Purple border theme, unified styling

### SettingsModal.tsx
- **Purpose**: 7-tab settings system
- **Key**: Effect settings, voice settings, performance
- **Updated**: Unified persistence, performance-first defaults

### TrackerDisplay.tsx
- **Purpose**: Real-time state tracking
- **Key**: Automatic updates based on conversation
- **Fixed**: Proper characterId-based manager access (Aug 25)

## 🔄 Recent Critical Fixes (Aug 25, 2025)

### 🚨 High Priority Fixes
1. **Gemini API Connection**: Fixed constructor initialization in `gemini-client.ts`
2. **Tracker System**: Fixed characterId-based manager access in `chat.slice.ts`  
3. **Memory Generation**: Lowered threshold (0.8→0.4) and time restriction (60s→10s)
4. **UI Consistency**: Unified purple border theme across all components

### ⚙️ Settings System Status
- **Persistence**: Unified through Zustand store
- **Effects**: All default to OFF for performance
- **Voice**: Multi-provider support (VoiceVox/ElevenLabs/System)
- **Memory**: Dual-layer with legacy compatibility

## 🚀 Development Commands

```bash
# Start development
npm run dev                    # Port 3000
npx tsc --noEmit              # Type check
npm run build                 # Production build

# Debugging
rm -rf .next node_modules     # Full reset
npm install                   # Reinstall
git status && git branch      # Check status
```

## ⚠️ Critical Don'ts

- ❌ Never use `any` type
- ❌ Never work on main/master branch  
- ❌ Never skip type checking
- ❌ Never block UI with heavy operations
- ❌ Never access trackers by sessionId (use characterId)

## ✅ Must-Do Checklist

- ✅ Always use UnifiedMessage type
- ✅ Always create feature branches
- ✅ Always run type checks before commit
- ✅ Always update documentation after changes
- ✅ Always use UI-first approach for async operations

---

**Remember**: This is a quick reference. For complete implementation details, system architecture, and comprehensive guides, always refer to `🎯 AI Chat V3 完全開発ガイド.md`.