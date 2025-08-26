# 🎯 AI Chat V3 Complete Development Guide

⚠️ **CRITICAL AI REFERENCE RULES - READ FIRST** ⚠️

**Development Principles**

Adherence to the following rules is of the **highest priority** in this project.

1.  **Strict Prohibition of `any` Type:**
    *   To maintain code safety and maintainability, the use of TypeScript's `any` type is strictly prohibited.
    *   In cases where type inference is difficult or external library type definitions are insufficient, do not resort to `any`. Instead, use the `unknown` type, generics, or create custom type definitions (`.d.ts`).
    *   If you find existing code using `any`, you are strongly encouraged to refactor it with the appropriate types.

2.  **Absolute Reference to Project Documentation:**
    *   Before starting any development work, you must consult this `🎯 AI Chat V3 Complete Development Guide.md`.
    *   When making any changes to the code (e.g., adding features, refactoring, specification changes), you **must** also update this document to ensure consistency between the implementation and the documentation.

**Common Pitfalls and Best Practices**

Following these best practices can help prevent common errors.

1.  **Character Data Integrity:**
    *   **Problem:** A `TypeError: state.toLowerCase is not a function` may occur in `tracker-manager.ts`.
    *   **Cause:** The `possible_states` array in a character's JSON file contains non-string values (e.g., `null`, numbers).
    *   **Solution:** When editing character data, ensure all elements in the `possible_states` array are strings.

2.  **API Keys and External API Errors:**
    *   **Problem:** A `SyntaxError: Unexpected token '<'` (JSON parsing error) may occur.
    *   **Cause:** The API server returns an HTML error page when an API key is invalid or has reached its usage limit.
    *   **Solution:** If errors with external APIs like OpenRouter occur frequently, verify the API key's validity and check your account status (e.g., credits) on the official website.

3.  **Next.js Dev Server Cache:**
    *   **Problem:** Build-related errors such as `EPERM` or `missing bootstrap script` can occur.
    *   **Cause:** Corruption or inconsistency in the `.next` directory's build cache.
    *   **Solution:** After significant changes (e.g., large refactors, library updates), it is recommended to stop the dev server, delete the `.next` folder, and restart it.

4.  **Async Operations in Zustand Store:**
    *   **Problem:** The UI may freeze for an extended period when performing actions that involve API calls.
    *   **Cause:** The store action waits synchronously for a heavy asynchronous operation to complete before updating the UI state.
    *   **Solution:** Adopt a "UI First" approach. Update the UI state immediately (e.g., display the user's message) and then execute time-consuming asynchronous operations in the background.

---

📋 **Table of Contents**

1.  #Project_Overview
2.  #Architecture_Design
3.  #Directory_Structure
4.  #Type_Definition_System
5.  #Key_Components
6.  #State_Management_Zustand
7.  #API_Design
8.  #Memory_System
9.  #Tracker_System
10. #Settings_Management_System
11. #Visual_Effects_System
12. #Voice_Synthesis_System
13. #Development_Workflow
14. #Debugging_Guide
15. #Deployment
16. #Latest_Updates

---

🚨 **AI QUICK REFERENCE - ALWAYS CHECK THESE FIRST** 🚨

**Critical File Paths (Never Forget)**
```typescript
// MUST USE Types
import { UnifiedMessage } from '@/types/core/message.types';     // NOT Message (deleted)
import { Character } from '@/types/core/character.types';         // Unified character type
import { EffectSettings } from '@/store/slices/settings.slice';   // All settings

// MUST USE Services  
import { apiManager } from '@/services/api-manager';              // Unified API
import { useAppStore } from '@/store';                            // Zustand store
```

**Recent CRITICAL Fixes (Aug 25, 2025)**
- 🔧 **Gemini API**: Fixed constructor in `src/services/api/gemini-client.ts` 
- 🔧 **Tracker System**: Fixed characterId access in `src/store/slices/chat.slice.ts`
- 🔧 **Memory Generation**: Lowered threshold 0.8→0.4, time 60s→10s
- 🔧 **UI**: Unified purple borders, transparent effects

**FORBIDDEN Actions**
- ❌ `any` type usage
- ❌ Working on main/master branch  
- ❌ Using old `Message` type (deleted)
- ❌ Accessing trackers by sessionId (use characterId)

---
📊 **Project Overview**

**Tech Stack**

*   **Frontend:** Next.js 15.4.6 + TypeScript + Tailwind CSS
*   **State Management:** Zustand (Slice-based architecture)
*   **Animation:** Framer Motion
*   **UI:** Radix UI + Lucide React Icons
*   **APIs:** Gemini AI + OpenRouter + VoiceVox + ElevenLabs
*   **Deployment:** Vercel

**Core Features**

*   **AI Chat:** Support for Gemini/OpenRouter/Claude
*   **Character System:** Custom persona functionality
*   **Memory Management:** 5-layer hierarchical memory system
*   **Tracker System:** Real-time state tracking
*   **Voice Synthesis:** VoiceVox/ElevenLabs integration
*   **Effects:** Real-time emotion analysis and visual effects

---
🏗️ **Architecture Design**

**Overall Architecture**

```
  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
  │   Presentation  │    │    Business     │    │      Data       │
  │   (Components)  │◄──►│    (Services)   │◄──►│   (API/Store)   │
  └─────────────────┘    └─────────────────┘    └─────────────────┘
           │                       │                       │
      ┌────┴────┐            ┌─────┴─────┐          ┌──────┴──────┐
      │UI Layer │            │Logic Layer│          │Storage Layer│
      └─────────┘            └───────────┘          └─────────────┘
```

**Enhanced System Architecture (August 2025)**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI Chat V3 System Architecture                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  UI Layer                                                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │ ChatInterface│  │SettingsModal │  │MessageBubble│  │  EffectsSystem  │   │
│  └─────────────┘  └──────────────┘  └─────────────┘  └─────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Service Layer                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │   APIManager│  │TrackerManager│  │EmotionAnalz │  │ PromptBuilder   │   │
│  └─────────────┘  └──────────────┘  └─────────────┘  └─────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│  State Management (Zustand)                                                │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │  ChatSlice  │  │SettingsSlice │  │MemorySlice  │  │  TrackerSlice   │   │
│  └─────────────┘  └──────────────┘  └─────────────┘  └─────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Persistence Layer                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │ LocalStorage│  │    Zustand   │  │MemoryCards  │  │ EffectSettings  │   │
│  │  (Unified)  │  │ Persistence  │  │   (Auto)     │  │   (Context)     │   │
│  └─────────────┘  └──────────────┘  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Enhanced Data Flow**

```
User Action → Settings Modal → Zustand Store → Immediate UI Update
    │                             │
    │                             ├─→ Automatic Persistence
    │                             │
    │                             └─→ Effect System Triggers
    │                                     │
    └─→ Message Input ──→ Effect Analysis ─→ Emotion Detection
                              │                     │
                              ├─→ Visual Effects ──┘
                              │
                              └─→ Tracker Updates → Conversation Memory
                                          │
                                          └─→ AI Response Generation
```

**Settings System Integration Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Settings Management Flow                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Settings Modal (7 Tabs)                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Effects │ 3D │ Emotion │ Tracker │ Performance │ Chat │ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Zustand Settings Slice                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │   Effect    │  │   Voice     │  │   Memory    │    │   │
│  │  │  Settings   │  │  Settings   │  │  Settings   │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           Automatic Persistence & Distribution          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │ LocalStorage│  │ Components  │  │  Effect     │    │   │
│  │  │   (Sync)    │  │   (React)   │  │ Context     │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

  ---
📁 **Directory Structure**

```
  src/
  ├── app/                      # Next.js App Router
  │   ├── api/                 # API Routes
│   │   ├── characters/      # Character management API
│   │   ├── personas/        # Persona management API
│   │   ├── upload/          # File upload API
│   │   └── voice/           # Voice synthesis API
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
├── components/              # UI Components
│   ├── chat/               # Chat-related UI
  │   │   ├── ChatInterface.tsx
  │   │   ├── MessageBubble.tsx
  │   │   ├── MessageInput.tsx
  │   │   ├── RichMessage.tsx
  │   │   └── AdvancedEffects.tsx
│   ├── character/          # Character management UI
│   ├── settings/           # Settings UI
│   ├── tracker/            # Tracker UI
│   ├── memory/             # Memory management UI
│   └── ui/                 # Common UI components
  ├── contexts/               # React Context
  │   └── EffectSettingsContext.tsx
├── services/               # Business Logic
│   ├── api/                # API-related services
  │   │   ├── gemini-client.ts
│   │   ├── openrouter-client.ts (deleted)
  │   │   └── vector-search.ts
│   ├── memory/             # Memory system
  │   │   ├── conversation-manager.ts
  │   │   ├── dynamic-summarizer.ts
  │   │   ├── memory-layer-manager.ts
  │   │   └── vector-store.ts
│   ├── tracker/            # Tracker system
  │   │   └── tracker-manager.ts
│   ├── api-manager.ts      # Unified API Manager
│   ├── inspiration-service.ts # Suggestion generation service
  │   └── prompt-builder.service.ts
├── store/                  # Zustand State Management
│   ├── slices/             # State slices
  │   │   ├── chat.slice.ts
  │   │   ├── character.slice.ts
  │   │   ├── memory.slice.ts
  │   │   ├── settings.slice.ts
  │   │   ├── suggestion.slice.ts
  │   │   └── tracker.slice.ts
│   └── index.ts            # Store integration
├── types/                  # TypeScript Type Definitions
│   ├── core/               # Core type definitions
  │   │   ├── base.types.ts
│   │   ├── message.types.ts (unified)
  │   │   ├── character.types.ts
  │   │   ├── memory.types.ts
  │   │   ├── session.types.ts
  │   │   ├── tracker.types.ts
  │   │   └── settings.types.ts
│   ├── api/                # API type definitions
  │   │   ├── requests.types.ts
  │   │   └── responses.types.ts
│   ├── ui/                 # UI type definitions
│   └── index.ts            # Type export aggregation
├── lib/                    # Utilities
  │   └── utils.ts
└── hooks/                  # Custom Hooks
```

  ---
🔧 **Type Definition System**

**Unified Message Type (Refactored August 2024)**

```typescript
  // src/types/core/message.types.ts
  export interface UnifiedMessage extends BaseEntity, SoftDeletable, WithMetadata {
  // Basic Info
    session_id: UUID;
    role: MessageRole;
    content: string;
    image_url?: string;

  // Character Info
    character_id?: UUID;
    character_name?: string;
    character_avatar?: string;

  // Memory Info
    memory: {
      importance: MemoryImportance;
      is_pinned: boolean;
      is_bookmarked: boolean;
      keywords: string[];
      summary?: string;
    };

  // Expression Info
    expression: {
      emotion: EmotionState;
      style: MessageStyle;
      effects: VisualEffect[];
    };

  // Edit History
    edit_history: MessageEditEntry[];
    regeneration_count: number;
  }
```

**Base Entity Types**

```typescript
  // src/types/core/base.types.ts
  export interface BaseEntity {
    id: UUID;
    created_at: Timestamp;
    updated_at: Timestamp;
    version: number;
  }

  export interface SoftDeletable {
    is_deleted: boolean;
  }

  export interface WithMetadata<T = Record<string, unknown>> {
    metadata: T;
  }
```

**Character Type**

```typescript
  // src/types/core/character.types.ts
  export interface Character extends BaseEntity {
  // Basic Info
    name: string;
    age: string;
    occupation: string;
    catchphrase: string;
    
  // Personality & Traits
    personality: string;
    external_personality: string;
    internal_personality: string;
    strengths: string[];
    weaknesses: string[];
    
  // Preferences & Hobbies
    hobbies: string[];
    likes: string[];
    dislikes: string[];
    
  // Appearance & Style
    appearance: string;
    avatar_url?: string;
    background_url?: string;
    image_prompt?: string;
    negative_prompt?: string;
    
  // Speaking Style
    speaking_style: string;
    first_person: string;
    second_person: string;
    verbal_tics: string[];
    
  // Background & Scenario
    background: string;
    scenario: string;
    
  // AI System Settings
    system_prompt: string;
    first_message: string;
    
  // Metadata
    tags: string[];
    
  // Tracker Definitions
    trackers: TrackerDefinition[];
    
  // NSFW Profile (Optional)
    nsfw_profile?: NSFWProfile;
  }
```

---
🧩 **Key Components**

**`ChatInterface.tsx`**

*   **Description:** The main chat interface component.
*   **Responsibilities:** Manages the overall layout, modals, and session control.
*   **Dependencies:** All sub-components.
*   **Key Features:**
    *   Session management
    *   Integrated modal control
    *   Responsive layout
    *   Keyboard shortcuts
    *   **UPDATED (Aug 25):** Enhanced group/individual chat mode switching

**`ChatHeader.tsx`**

*   **Description:** Top navigation and chat controls.
*   **Responsibilities:** Mode switching, character display, and settings access.
*   **Key Features:**
    *   **ENHANCED (Aug 25):** Improved chat type toggle button with text labels
    *   Character information display
    *   Model selector dropdown
    *   **UPDATED:** Transparent border implementation for better visual integration

**`MessageBubble.tsx`**

*   **Description:** Renders an individual message.
*   **Responsibilities:** Message rendering, user interactions, and visual effects.
*   **Key Features:**
    *   Dynamic message styling
    *   Edit functionality (added August 2024)
    *   Voice playback and synthesis
    *   Emotion-based animations
    *   Action menu (regenerate, copy, edit, delete, etc.)
    *   **UPDATED (Aug 25):** Unified purple border theme (`border-purple-400/20-50`)

**`RichMessage.tsx`**

*   **Description:** Renders formatted AI messages with enhanced styling.
*   **Responsibilities:** Text analysis, pattern matching, and visual enhancement of dialogue.
*   **Key Features:**
    *   Pattern-based text styling (「」, 『』)
    *   **UPDATED (Aug 25):** Removed background highlighting, text-color only
    *   Emotion detection and color mapping
    *   Quote analysis and emphasis detection

**`TrackerDisplay.tsx`**

*   **Description:** Displays and manages trackers.
*   **Responsibilities:** Real-time state display and interactive updates.
*   **Key Features:**
    *   Grouping by category
    *   Supports numeric, state, boolean, and text trackers
    *   Real-time change indicators
    *   Visual feedback
    *   **FIXED (Aug 25):** Proper characterId-based tracker manager access

---
🏪 **State Management (Zustand)**

**Store Structure**

```typescript
  // src/store/index.ts
  export interface AppStore extends
    ChatSlice,
    CharacterSlice,
    MemorySlice,
    SettingsSlice,
    SuggestionSlice,
    TrackerSlice {}

// Slice Integration
  export const useAppStore = create<AppStore>()(
    persist(
      (...args) => ({
        ...createChatSlice(...args),
        ...createCharacterSlice(...args),
        ...createMemorySlice(...args),
        ...createSettingsSlice(...args),
        ...createSuggestionSlice(...args),
        ...createTrackerSlice(...args),
      }),
      {
        name: 'ai-chat-store',
        partialize: (state) => ({
        // Select state to persist
          characters: state.characters,
          personas: state.personas,
          apiConfig: state.apiConfig,
          voice: state.voice,
        // Sessions are not persisted for security reasons
        }),
      }
    )
  );
```

**`ChatSlice`**

```typescript
  // src/store/slices/chat.slice.ts
  export interface ChatSlice {
    sessions: Map<UUID, UnifiedChatSession>;
    trackerManagers: Map<UUID, TrackerManager>;
    active_session_id: UUID | null;
    is_generating: boolean;

  // Actions
    createSession: (character: Character, persona: Persona) => Promise<UUID>;
    sendMessage: (content: string, imageUrl?: string) => Promise<void>;
    regenerateLastMessage: () => Promise<void>;
    deleteMessage: (message_id: UUID) => void;
  }
```

  ---
🔌 **API Design**

**API Manager (Unified)**

```typescript
  // src/services/api-manager.ts
  export class APIManager {
    private currentConfig: APIConfig;
    private openRouterApiKey: string | null = null;

  // Unified message generation interface
    async generateMessage(
      systemPrompt: string,
      userMessage: string,
      conversationHistory: { role: 'user' | 'assistant'; content: string }[],
      options?: Partial<APIConfig>
    ): Promise<string>

  // Automatic switching between Gemini/OpenRouter
    private async generateWithGemini(...)
    private async generateWithOpenRouter(...)
  }
```

**API Routes**

```typescript
  // src/app/api/characters/route.ts
  export async function GET(): Promise<NextResponse<Character[]>>
  export async function POST(request: NextRequest): Promise<NextResponse>

  // src/app/api/voice/voicevox/route.ts
  export async function POST(request: NextRequest): Promise<NextResponse>
  // Body: { text: string, speakerId: number, settings: VoiceVoxSettings }

  // src/app/api/upload/image/route.ts
  export async function POST(request: NextRequest): Promise<NextResponse>
// Supports image/video uploads (50MB limit)
```

**Gemini API Client (August 25, 2025 Fix)**

```typescript
// src/services/api/gemini-client.ts - Critical Constructor Fix
export class GeminiClient {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor() {
    this.apiKey = '';
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.model = 'gemini-2.5-pro';
    this.initializeApiKeySync(); // FIXED: Synchronous initialization
  }

  // FIXED: Replaced async initializeApiKey() with synchronous version
  private initializeApiKeySync(): void {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (apiKey) {
      this.apiKey = apiKey;
      console.log('Gemini API Key loaded from environment variable (sync)');
    } else {
      console.warn('NEXT_PUBLIC_GEMINI_API_KEY not found, API calls will fail');
    }
  }

  // Note: Previous async initialization in constructor was causing API key
  // to be undefined when API calls were made immediately after instantiation
}
```

  ---
🧠 **Memory System**

**5-Layer Hierarchical Memory**

```typescript
  // src/services/memory/memory-layer-manager.ts
  interface MemoryLayers {
  immediate_memory: MemoryLayer;    // Last 3 messages
  working_memory: MemoryLayer;      // Active 10 messages
  episodic_memory: MemoryLayer;     // 50 episodic messages
  semantic_memory: MemoryLayer;     // 200 important messages
  permanent_memory: PermanentLayer; // Pinned messages & summaries
}

// Automatic transition logic
  class MemoryLayerManager {
    addMessage(message: UnifiedMessage): void
    promoteMessage(messageId: string, fromLayer: string, toLayer: string): void
    demoteMessage(messageId: string, fromLayer: string, toLayer: string): void
    compressLayer(layerName: string): void
  }
```

**Vector Search**

```typescript
  // src/services/memory/vector-store.ts
  class VectorStore {
    private messages: Map<string, UnifiedMessage> = new Map();
    private embeddings: Map<string, number[]> = new Map();

    async addMessage(message: UnifiedMessage): Promise<void>
    async searchSimilar(query: string, limit: number = 5): Promise<SearchResult[]>
    cosineSimilarity(a: number[], b: number[]): number
  }
```

  ---
📊 **Tracker System**

**Tracker Definition**

```typescript
  // src/types/core/tracker.types.ts
  export interface TrackerDefinition extends BaseEntity {
    name: string;
    display_name: string;
    description?: string;
    category: 'relationship' | 'status' | 'condition' | 'other';
    config: TrackerConfig;
  }

  export type TrackerConfig =
    | NumericTrackerConfig
    | StateTrackerConfig
    | BooleanTrackerConfig
    | TextTrackerConfig;
```

**Tracker Manager**

```typescript
  // src/services/tracker/tracker-manager.ts
  export class TrackerManager {
    private trackerSets: Map<string, TrackerSet> = new Map();

    initializeTrackerSet(characterId: string, trackers: TrackerDefinition[]): TrackerSet
    updateTracker(characterId: string, trackerName: string, newValue: TrackerValue): void
    getTrackersForPrompt(characterId: string): string

  // Automatic update logic
    analyzeMessageForTrackerUpdates(message: UnifiedMessage, characterId: string): TrackerUpdate[]
  }
```

**Critical Tracker Fix (August 25, 2025)**

```typescript
// src/store/slices/chat.slice.ts - Fixed tracker manager access
export interface ChatSlice {
  trackerManagers: Map<UUID, TrackerManager>; // Key: characterId (NOT sessionId)
  
  sendMessage: async (content, imageUrl) => {
    // ❌ BEFORE: Incorrect access using sessionId
    // const trackerManager = get().trackerManagers.get(activeSessionId);
    
    // ✅ AFTER: Correct access using characterId  
    const characterId = activeSession.participants.characters[0]?.id;
    const trackerManager = characterId ? get().trackerManagers.get(characterId) : null;
    
    // Fixed tracker analysis with proper characterId
    trackerManager && characterId ? Promise.all([
      trackerManager.analyzeMessageForTrackerUpdates(userMessage, characterId),
      trackerManager.analyzeMessageForTrackerUpdates(aiResponse, characterId)
    ]) : Promise.resolve()
  }
}
```

---
⚙️ **Settings Management System**

**Settings Modal Architecture**

The settings system is built around a comprehensive modal with 7 main tabs:

```typescript
// src/components/settings/SettingsModal.tsx
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
  onEffectSettingsChange?: (settings: EffectSettings) => void;
}

// Available tabs
const tabs = [
  { id: 'effects', label: 'エフェクト', icon: Sparkles },
  { id: '3d', label: '3D機能', icon: Wand2 },
  { id: 'emotion', label: '感情分析', icon: Brain },
  { id: 'tracker', label: 'トラッカー', icon: Activity },
  { id: 'performance', label: 'パフォーマンス', icon: Gauge },
  { id: 'chat', label: 'チャット', icon: Brain },
  { id: 'voice', label: '音声', icon: Volume2 },
  { id: 'ai', label: 'AI', icon: Cpu },
  // Additional tabs: appearance, data, privacy, notifications, language, developer
];
```

**Effect Settings Type Definition**

```typescript
// src/store/slices/settings.slice.ts
export interface EffectSettings {
  // Message Effects
  colorfulBubbles: boolean;
  fontEffects: boolean;
  particleEffects: boolean;
  typewriterEffect: boolean;
  
  // Appearance Settings
  bubbleOpacity: number; // 0-100
  bubbleBlur: boolean;
  
  // 3D Features
  hologramMessages: boolean;
  particleText: boolean;
  rippleEffects: boolean;
  backgroundParticles: boolean;
  
  // Emotion Analysis
  realtimeEmotion: boolean;
  emotionBasedStyling: boolean;
  autoReactions: boolean;
  
  // Tracker Settings
  autoTrackerUpdate: boolean;
  showTrackers: boolean;
  
  // Performance Settings
  effectQuality: 'low' | 'medium' | 'high';
  animationSpeed: number; // 0.5-2.0
}
```

**Memory Capacity Settings (Legacy)**

```typescript
// Chat Settings - Memory Management
interface ChatSettings {
  bubbleTransparency: number;
  bubbleBlur: boolean;
  responseFormat: ChatResponseFormat;
  memoryCapacity: number; // Legacy setting (0-500)
  generationCandidates: number;
  memory_limits: {
    max_working_memory: number;        // Active messages (default: 6)
    max_memory_cards: number;          // Memory cards limit (default: 50)
    max_relevant_memories: number;     // Related memories (default: 5)
    max_prompt_tokens: number;         // Prompt token limit (default: 32000)
    max_context_messages: number;      // Context messages (default: 20)
  };
}
```

**Voice Settings Enhancement**

```typescript
// src/types/core/settings.types.ts - Updated Voice Settings
export interface VoiceSettings {
  enabled: boolean;                    // Master voice toggle
  provider: 'voicevox' | 'elevenlabs' | 'system';
  autoPlay: boolean;
  
  voicevox: {
    speaker: number;    // Speaker ID (0-46)
    speed: number;      // Speed scale (0.5-2.0)
    pitch: number;      // Pitch scale (-0.15-0.15)
    intonation: number; // Intonation scale (0-2.0)
    volume: number;     // Volume scale (0-2.0)
  };
  
  elevenlabs: {
    voiceId: string;
    stability: number;
    similarity: number;
  };
  
  system: {            // NEW: System voice fallback
    voice: string;
    rate: number;
    pitch: number;
    volume: number;
  };
  
  advanced: {          // NEW: Advanced audio settings
    bufferSize: number;
    crossfade: boolean;
    normalization: boolean;
    noiseReduction: boolean;
    echoCancellation: boolean;
  };
}
```

**Unified Persistence Strategy**

The settings system uses a unified Zustand store with automatic persistence:

```typescript
// src/store/slices/settings.slice.ts
export interface SettingsSlice extends AISettings {
  // Language and localization
  languageSettings: LanguageSettings;
  // Effect settings (integrated from Context)
  effectSettings: EffectSettings;
  
  // Actions
  updateLanguageSettings: (settings: Partial<LanguageSettings>) => void;
  updateEffectSettings: (settings: Partial<EffectSettings>) => void;
  // ... other actions
}

// Default values - Performance-first approach (all effects OFF by default)
effectSettings: {
  colorfulBubbles: false,
  fontEffects: false,
  particleEffects: false,
  // ... all visual effects default to false
  effectQuality: 'medium',
  animationSpeed: 1.0
}
```

**Settings Integration Flow**

```
User Changes Setting → SettingsModal Component → Zustand Store → Automatic Persistence
                                               ↓
                                     Component Re-renders → Visual Update
```

**Key Implementation Notes:**

1. **Dual Persistence Resolution**: Eliminated the dual persistence issue between EffectSettingsContext and Zustand store
2. **Performance-First Defaults**: All visual effects default to OFF to ensure optimal performance
3. **Instant Updates**: Settings changes are applied immediately without requiring save confirmation
4. **Type Safety**: Full TypeScript integration with strict type checking
5. **Backward Compatibility**: Supports both legacy and new settings formats

---
✨ **Visual Effects System**

**Effect System Architecture**

The visual effects system provides real-time animations and visual enhancements based on user messages and emotions:

```typescript
// src/components/chat/MessageEffects.tsx
interface MessageEffectsProps {
  trigger: string;  // Message content that triggers effects
  position: { x: number; y: number };
}

// Effect mapping system
const effectMap: Record<string, () => void> = {
  '愛してる': () => createHeartShower(),
  'おめでとう': () => createConfetti(),
  'ありがとう': () => createSparkles(),
  '素晴らしい': () => createStarBurst(),
  '最高': () => createRainbow()
};
```

**Advanced 3D Effects**

```typescript
// src/components/chat/AdvancedEffects.tsx
export const HologramMessage: React.FC<{
  message: string;
  isVisible: boolean;
}> = ({ message, isVisible }) => {
  // WebGL-based holographic message display
  // Three.js integration for 3D text rendering
  // Particle system for floating effect
};

export const ParticleText: React.FC<{
  text: string;
  animation: 'gather' | 'scatter';
}> = ({ text, animation }) => {
  // Text particle decomposition and reformation
  // Canvas-based particle system
  // Physics simulation for natural movement
};
```

**Emotion-Based Styling System**

```typescript
// src/services/emotion/EmotionAnalyzer.ts
export interface EmotionResult {
  primary: string;            // Primary emotion detected
  secondary: string[];        // Secondary emotions
  implicit: string[];         // Implicit emotional undertones
  intensity: number;          // Emotion intensity (0-1)
  confidence: number;         // Detection confidence (0-1)
  flow: EmotionFlow;         // Emotion transition data
  suggestedReactions: AutoReaction[]; // Recommended visual reactions
}

export interface AutoReaction {
  type: 'visual' | 'audio' | 'background' | 'avatar';
  effect?: string;           // Effect name to trigger
  sound?: string;           // Sound to play
  color?: string;           // Color theme to apply
  duration?: number;        // Effect duration in ms
  animation?: string;       // Animation type
  intensity?: number;       // Effect intensity
}
```

**Real-time Emotion Detection**

```typescript
// src/components/emotion/EmotionDisplay.tsx
export const EmotionDisplay: React.FC<EmotionDisplayProps> = ({ 
  message, 
  onEmotionDetected 
}) => {
  const { settings } = useEffectSettings();
  
  useEffect(() => {
    if (!settings.realtimeEmotion || !message.trim()) return;
    
    const analyzeEmotion = async () => {
      const emotion = await analyzerRef.current.analyzeEmotion(message);
      setCurrentEmotion(emotion);
      
      // Auto-trigger visual reactions
      if (settings.autoReactions && emotion.suggestedReactions) {
        triggerAutoReactions(emotion.suggestedReactions);
      }
      
      // Apply emotion-based styling
      if (settings.emotionBasedStyling) {
        applyEmotionalStyling(emotion);
      }
    };
    
    const timeout = setTimeout(analyzeEmotion, 500); // Debounced
    return () => clearTimeout(timeout);
  }, [message, settings]);
};
```

**Message Bubble Effects Integration**

```typescript
// src/components/chat/MessageBubble.tsx - Effect Integration
const getEmotionAnimation = () => {
  if (!emotion || !settings.emotionBasedStyling) return {};
  
  const emotionAnimations: Record<string, any> = {
    joy: { scale: [1, 1.05, 1], transition: { duration: 0.3 } },
    anger: { x: [-2, 2, -2, 2, 0], transition: { duration: 0.4 } },
    sadness: { y: [0, -5, 0], opacity: [1, 0.8, 1] },
    surprise: { scale: [1, 1.15, 1], rotate: [0, 2, -2, 0] },
    fear: { filter: ['blur(0px)', 'blur(1px)', 'blur(0px)'] }
  };
  
  return emotionAnimations[emotion.primary] || {};
};

// Apply effects in render
<motion.div
  animate={!isUser && settings.emotionBasedStyling ? getEmotionAnimation() : {}}
  className={cn(
    'message-bubble',
    settings.colorfulBubbles && 'colorful-gradient',
    settings.bubbleBlur && 'backdrop-blur-sm'
  )}
  style={{
    opacity: settings.bubbleOpacity / 100,
    '--animation-speed': `${settings.animationSpeed}s`,
  }}
>
  {/* Message content */}
  
  {/* Real-time emotion display */}
  {settings.realtimeEmotion && (
    <EmotionDisplay message={message.content} onEmotionDetected={setEmotion} />
  )}
  
  {/* Particle effects */}
  {settings.particleEffects && (
    <MessageEffects trigger={message.content} position={bubblePosition} />
  )}
</motion.div>
```

**Effect Context Integration**

```typescript
// src/contexts/EffectSettingsContext.tsx - Backward Compatibility
const defaultSettings: EffectSettings = {
  // Performance-optimized defaults
  colorfulBubbles: !safeMode,      // OFF in safe mode
  fontEffects: !safeMode,          // OFF in safe mode
  particleEffects: false,          // Always OFF (performance heavy)
  typewriterEffect: !safeMode,     // OFF in safe mode
  
  // 3D features - OFF by default
  hologramMessages: false,
  particleText: false,
  rippleEffects: false,
  backgroundParticles: false,
  
  // Emotion analysis - Selective defaults
  realtimeEmotion: !safeMode,      // OFF in safe mode
  emotionBasedStyling: false,      // OFF (can cause UI instability)
  autoReactions: false,            // OFF (CPU intensive)
  
  // Performance settings
  effectQuality: safeMode ? 'low' : 'medium',
  animationSpeed: safeMode ? 0 : 0.5  // Reduced for stability
};
```

**Effect Performance Management**

```typescript
// Dynamic quality adjustment based on device capabilities
const adjustEffectQuality = (settings: EffectSettings) => {
  const performanceProfile = detectDevicePerformance();
  
  if (performanceProfile === 'low') {
    return {
      ...settings,
      particleEffects: false,
      hologramMessages: false,
      effectQuality: 'low',
      animationSpeed: Math.min(settings.animationSpeed, 0.5)
    };
  }
  
  return settings;
};

// Safe mode detection and auto-adjustment
const safeMode = typeof window !== 'undefined' && 
  localStorage.getItem('safe-mode') === 'true';
```

**Key Effect System Features:**

1. **Keyword-based Triggers**: Effects triggered by specific keywords in messages
2. **Real-time Emotion Analysis**: AI-powered emotion detection with visual feedback
3. **Performance Optimization**: Safe mode and quality adjustment for low-end devices
4. **Modular Architecture**: Each effect can be enabled/disabled independently
5. **WebGL Integration**: Advanced 3D effects using Three.js and WebGL
6. **Animation Debouncing**: Prevents effect spam and ensures smooth performance

  ---
🔧 **Development Workflow**

**Setup**

```bash
# 1. Install dependencies
  npm install

# 2. Set up environment variables
  cp .env.local.example .env.local
  # NEXT_PUBLIC_GEMINI_API_KEY=your_api_key
  # ELEVENLABS_API_KEY=your_api_key
  # VOICEVOX_ENGINE_URL=http://127.0.0.1:50021

# 3. Start the development server
  npm run dev
  # http://localhost:3000

# 4. Type check
  npx tsc --noEmit

# 5. Build for production
  npm run build
```

**Coding Standards**

```typescript
// 1. Prioritize Type Safety
// ❌ Bad
  const message: any = getMessage();

// ✅ Good
  const message: UnifiedMessage = getMessage();

// 2. Use Unified Message Type
// ❌ Old (deleted)
  interface Message { sender: 'user' | 'assistant'; }

// ✅ New
  interface UnifiedMessage { role: 'user' | 'assistant'; }

// 3. Separate Service Layer
// ❌ Calling API directly in a component
  const response = await fetch('/api/chat');

// ✅ Using the service layer
  const response = await apiManager.generateMessage(prompt, message);

// 4. Error Handling
  try {
    const result = await someAsyncOperation();
    return result;
  } catch (error) {
    console.error('Operation failed:', error);
    throw new Error(`Failed to complete operation: ${error.message}`);
  }
```

---
🐛 **Debugging Guide**

**Common Issues and Solutions**

1.  **Type Errors**
    *   **Error:** `Property 'sender' does not exist on type 'UnifiedMessage'`
    *   **Solution:** Update references from old types to the new unified types.
        `message.sender` → `message.role`

2.  **Tracker Display Issues**
    *   **Error:** Tracker's initial value is not displayed.
    *   **Solution:** Reference the type correctly via `tracker.config`.
        `tracker.type` → `tracker.config?.type`

3.  **Voice Playback Errors**
    *   **Error:** VoiceVox API parameter error.
    *   **Solution:** Use the correct parameter format.
        `{ speaker: 1, speed: 1.0 }`
        →
        `{ speakerId: 1, settings: { speed: 1.0 } }`

4.  **Build Errors**
    ```bash
    # TypeScript type errors
  npx tsc --noEmit --skipLibCheck

    # Dependency issues
  rm -rf node_modules package-lock.json
  npm install

    # Clear Next.js cache
  rm -rf .next
  npm run build
    ```

**Debugging Tools Setup**

```typescript
// 1. Console Log Helper
  // src/lib/debug.ts
  export const debugLog = (component: string, data: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${component}]`, data);
    }
  };

  // 2. Zustand DevTools
  import { devtools } from 'zustand/middleware';
  export const useAppStore = create<AppStore>()(
    devtools(
      persist(...),
      { name: 'ai-chat-store' }
    )
  );

// 3. React DevTools Profiler is recommended.
```

**Performance Monitoring**

```typescript
// 1. Optimize Rendering
  const MemoizedComponent = React.memo(ExpensiveComponent);

// 2. Optimize State Updates
// ❌ Causes excessive re-renders
  const allMessages = useAppStore(state => state.sessions);

// ✅ Select only what's needed
  const activeMessages = useAppStore(state =>
    state.sessions.get(state.active_session_id)?.messages || []
  );

// 3. Virtualize Large Lists
  import { FixedSizeList as List } from 'react-window';
```

  ---
⚡ **Performance Principles**

This project prioritizes a highly responsive user experience. All development should adhere to the following performance principles, derived from the analysis in the [Performance Optimization Report](./docs/PERFORMANCE_OPTIMIZATION_REPORT.md).

1.  **Non-Blocking UI (UI First):**
    *   **Rule:** Expensive operations (API calls, heavy computation) must not block the UI thread.
    *   **Implementation:** For actions like sending a message, update the UI state immediately with the user's input first. Then, execute asynchronous operations like API calls, memory processing, and tracker analysis in the background. This provides immediate feedback to the user.
    *   **Reference:** See the refactored `sendMessage` function in `src/store/slices/chat.slice.ts` for a practical example.

2.  **Stateful and Efficient Resource Management:**
    *   **Rule:** Heavy objects or services like `ConversationManager` should not be re-initialized on every use.
    *   **Implementation:** These resources should be instantiated once per session and managed within the Zustand store. Subsequent operations should perform differential updates rather than reprocessing the entire state.
    *   **Status:** This is a future optimization target. The current implementation creates instances on-demand.

3.  **Strategic Caching:**
    *   **Rule:** Avoid re-computing or re-fetching data that has not changed.
    *   **Implementation:** Persisted state in Zustand should be leveraged to cache results of expensive operations like vector embeddings or conversation summaries. For details on the current persistence strategy, see the `persist` middleware configuration in `src/store/index.ts`.

4.  **Future Optimization Roadmap:**
    *   **Web Workers:** For computationally intensive tasks like vector similarity calculations or large data processing, offload the work from the main thread using Web Workers.
    *   **Streaming Responses:** For AI responses, use streaming to display text progressively as it is generated, rather than waiting for the full response.
    *   **Server-Side Caching:** Implement a server-side cache (e.g., Redis) for frequently accessed data or API responses to reduce latency.

---
🚀 **Deployment**

**Vercel Configuration**

```json
  // vercel.json
  {
    "buildCommand": "npm run build",
    "installCommand": "npm install",
    "outputDirectory": ".next",
    "functions": {
      "src/app/api/**/*.ts": {
        "maxDuration": 30
      }
    },
    "env": {
      "NEXT_PUBLIC_GEMINI_API_KEY": "@gemini-api-key",
      "ELEVENLABS_API_KEY": "@elevenlabs-api-key",
      "VOICEVOX_ENGINE_URL": "@voicevox-url"
    }
  }
```

**Environment Variables**

```
# Production Environment
NEXT_PUBLIC_GEMINI_API_KEY=     # Gemini API Key
ELEVENLABS_API_KEY=             # ElevenLabs API Key
OPENROUTER_TITLE=               # OpenRouter App Name
RUNWARE_API_KEY=                # Image Generation API Key
VOICEVOX_ENGINE_URL=            # VoiceVox Engine URL
```

**Deployment Commands**

```bash
# 1. Verify local build
  npm run build

# 2. Deploy to Vercel
  npx vercel --prod

# 3. Remove project (if needed)
  vercel rm project-name --yes

# 4. Create a new project
  rm -rf .vercel
  npx vercel --prod --yes
```

---
🔍 **System Status (as of August 20, 2024)**

**Memory System Status**

*   **Memory Layers**
    *   **Auto-update:** ❌ Not implemented
    *   **Layer Management:** `memory-layer-manager.ts` exists, but auto-transition logic is not implemented.
    *   **Manual Operations:** ✅ Limited functionality available
        *   Expand/view layer details (`MemoryLayerDisplay.tsx:129-131`)
        *   Clear layer function (`MemoryLayerDisplay.tsx:133-137`)
        *   Display stats (message count, access count)

*   **Memory Card Feature**
    *   **Manual Creation:** ✅ AI auto-generation implemented - `memory.slice.ts:49-169`
        *   User can create via "New" button
        *   Auto-generates from the last 5 messages
        *   Auto-determines title, summary, keywords, category
        *   Auto-assigns importance score, emotion tags, context tags
        *   Includes fallback for AI generation failure
    *   **Fully Automatic Creation:** ✅ Enhanced implementation - `auto-memory-manager.ts`
        *   Auto-detects important messages during conversation
        *   Evaluates based on keywords, emotion, depth, and temporal importance
        *   **UPDATED (Aug 25):** Threshold reduced from 0.8 to 0.4 for more frequent generation
        *   **UPDATED (Aug 25):** Time restriction reduced from 60s to 10s for testing
        *   **ENHANCED:** Added comprehensive debug logging for importance calculation
        *   Runs after each AI message via `chat.slice.ts:304-314`
    *   **AI Generation Service:** `memory-card-generator.ts`
        *   Structured analysis in JSON format
        *   Auto-calculation of emotion weight, repetition, emphasis
        *   Similarity detection and duplicate checking via Levenshtein distance
    *   **Display/Edit:** ✅ Implemented - `MemoryCard.tsx`
    *   **Filter/Search:** ✅ Implemented

**Inspiration Feature Status**

*   **Reply Suggestions**
    *   **Prompt Reference:** ✅ References from chat settings
    *   **Implementation:** `inspiration-service.ts:14-67`
    *   **Custom Prompt Support:** ✅ Via `customPrompt` parameter
    *   **Placeholder:** `{{conversation}}` is replaced with conversation context
    *   **Default Categories:** Hardcoded in `inspiration-service.ts:30-35`
        *   Empathetic/Accepting
        *   Inquisitive/Analytical (Trainer-style)
        *   Provocative/Deviant
        *   Needy/Dependent (Yandere/Younger Boyfriend-style)
    *   **Enhanced Parsing:** Flexible parsing with multiple methods (`inspiration-service.ts:188-261`)
        *   Exact `[Category]` matching
        *   Numbered list parsing (1., 2., 3.)
        *   Bulleted list parsing (-, •)
        *   Final fallback via paragraph splitting
    *   **Output Format Improved:** Directives added for `{{user}}` perspective, bullet points, and no explanations.

*   **Text Enhancement**
    *   **Prompt Reference:** ✅ References from chat settings
    *   **Implementation:** `inspiration-service.ts:75-112`
    *   **Custom Prompt Support:** ✅ Via `enhancePrompt` parameter
    *   **Placeholders:** `{{conversation}}`, `{{user}}`, `{{text}}` are replaced
    *   **Required Placeholder:** Either `{{user}}` or `{{text}}` for the input text

**Tracker System Status**
*   **Auto-update:** ✅ Working correctly
*   **UI Display:** ✅ Working correctly
*   **Real-time Reflection:** ✅ Working correctly

---
📚 **Additional Resources**

**Key Files**

*   🔥 **Core (Most Important)**
    *   `src/types/core/message.types.ts`       # Unified Message Type
    *   `src/store/index.ts`                    # Zustand Integrated Store
    *   `src/services/api-manager.ts`           # Unified API Manager
    *   `src/components/chat/ChatInterface.tsx` # Main Chat Interface
    *   `src/components/chat/MessageBubble.tsx` # Message Display with Effects

*   ⚡ **Settings & Effects (Critical)**
    *   `src/components/settings/SettingsModal.tsx`  # 7-Tab Settings System
    *   `src/store/slices/settings.slice.ts`         # Unified Settings Store
    *   `src/components/chat/MessageEffects.tsx`     # Visual Effects Engine
    *   `src/services/emotion/EmotionAnalyzer.ts`    # AI Emotion Detection
    *   `src/contexts/EffectSettingsContext.tsx`     # Backward Compatibility

*   📊 **Data & Memory Management**
    *   `src/services/tracker/tracker-manager.ts`    # Tracker System
    *   `src/services/memory/memory-layer-manager.ts` # 5-Layer Memory
    *   `src/store/slices/chat.slice.ts`            # Chat State Management
    *   `src/components/tracker/TrackerDisplay.tsx`  # Tracker UI

*   🎨 **Visual & Audio Systems**
    *   `src/components/chat/AdvancedEffects.tsx`    # 3D Effects & Holograms
    *   `src/components/emotion/EmotionDisplay.tsx`  # Real-time Emotion UI
    *   `src/types/core/settings.types.ts`          # Enhanced Settings Types
    *   `src/hooks/useAudioPlayback.ts`             # Voice Playback Hook

*   🛠️ **Config & Utilities**
    *   `src/types/index.ts`        # Type Aggregation
    *   `src/lib/utils.ts`          # Utility Functions
    *   `next.config.js`            # Next.js Configuration
    *   `tailwind.config.js`        # Tailwind CSS Configuration

**Development Commands**

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run start                  # Start production server
npx tsc --noEmit               # Type check only

# Debugging
npm run dev -- --port 3001   # Start on a specific port
npm run build -- --debug     # Create a debug build

# Cleanup
rm -rf .next node_modules     # Full reset
npm install                   # Reinstall dependencies
```

---
🎯 **Summary**

This AI Chat V3 project is designed with a strong emphasis on type safety, maintainability, and extensibility. The August 2025 updates have significantly enhanced the system with comprehensive settings management, visual effects, and performance optimization.

**Core System Features (Updated August 2025)**

1. **Unified Settings Management**: 7-tab comprehensive settings system with automatic persistence
2. **Advanced Visual Effects**: Real-time emotion detection, 3D effects, and performance-optimized animations
3. **Enhanced Voice System**: Multi-provider support with advanced audio controls and fallback mechanisms
4. **Memory Management**: Dual-layer memory system with legacy and modern interfaces
5. **Tracker Integration**: Automatic state tracking with seamless UI integration

**Development Guidelines**

1.  Always use the `UnifiedMessage` type (the old `Message` type is deleted).
2.  Make API calls through the unified service layer.
3.  Manage state using the Zustand slice pattern with automatic persistence.
4.  Use the settings system for all user-configurable options.
5.  Implement effects with performance-first approach (default OFF).
6.  Run TypeScript type checks regularly to maintain strict mode compliance.

**Performance Guidelines**

1. **Effect Defaults**: All visual effects default to OFF for optimal performance
2. **Safe Mode Support**: Automatic performance adjustments for low-end devices
3. **Quality Management**: Dynamic effect quality based on device capabilities  
4. **Memory Efficiency**: Optimized state management with selective persistence

**Guidelines for Extension**

1.  Implement new features following the existing architecture.
2.  Create type definitions before implementation.
3.  Build with small, testable components.
4.  Add new settings through the unified settings slice.
5.  Implement visual effects with performance considerations.
6.  Ensure backward compatibility with existing systems.

---
## 🆕 Latest Updates

### Critical Update: August 25, 2025

#### 🔧 Comprehensive Bug Fixes and UI Improvements
- **Gemini API Connection Issues Resolved:** Fixed critical constructor initialization problem in `gemini-client.ts` by replacing async `initializeApiKey()` with synchronous `initializeApiKeySync()` that directly accesses environment variables
- **UI Transparency Enhancement:** Implemented transparent borders for chat header and input areas using `border-transparent` and `backdrop-blur-sm` effects for better visual integration
- **Mobile Header Positioning:** Confirmed and verified existing safe-area-inset implementation handles top/bottom black areas correctly
- **Text Highlighting Removal:** Modified `RichMessage.tsx` to remove background highlighting from dialogue text while preserving text color changes (`「」` and `『』` patterns now use only text colors)
- **Border Color Unification:** Systematically unified all gray borders (`border-white/10`, `border-slate-700`, etc.) to purple theme (`border-purple-400/20-50`) across all chat components for visual consistency

#### 📊 Tracker System and Memory Generation Fixes
- **Tracker Manager Access Bug Fixed:** Corrected critical issue where tracker managers were accessed using `activeSessionId` instead of `characterId`, causing tracker updates to fail completely
- **Memory Card Generation Optimization:** Lowered importance threshold from 0.8 to 0.4 and reduced time restriction from 60s to 10s to increase generation frequency
- **Debug Logging Implementation:** Added comprehensive logging to both tracker analysis and memory card generation for better debugging visibility
- **Auto-Update Restoration:** Tracker values and memory cards now properly update after conversation rounds with improved analysis triggers

#### 🎯 Group Chat System Enhancements
- **AI Generation Functionality Verified:** Confirmed complete implementation of group chat AI generation with comprehensive debug logging added to track message processing
- **Chat Mode Toggle Visibility:** Enhanced chat type switching button with improved styling, border, text label ("グループ"/"個人"), and better hover effects for clearer user guidance
- **Character Reselection Feature Confirmed:** Verified complete implementation of "キャラクター編集" button and CharacterReselectionModal functionality allowing users to change group chat participants

#### 🏗️ System Architecture Improvements
- **API Client Reliability:** Gemini API now properly initializes on startup preventing connection failures
- **UI/UX Consistency:** Unified purple color scheme across all interactive elements creating cohesive visual experience
- **State Management Optimization:** Fixed tracker manager state synchronization with proper character ID mapping
- **Debug Infrastructure:** Added detailed logging throughout critical systems for better troubleshooting capabilities

#### 🛠️ Developer Experience Enhancements
- **Error Prevention:** Eliminated common initialization failures through synchronous API key loading
- **Visual Debugging:** Color-coded debug logs help identify issues in tracker updates, memory generation, and group chat processing
- **Performance Monitoring:** Reduced memory generation thresholds provide more frequent feedback for testing and validation
- **Code Quality:** Maintained strict TypeScript compliance while implementing all fixes

### Critical Update: August 24, 2025

#### 🔧 Settings System Complete Overhaul
- **Dual Persistence Resolution:** Eliminated duplicate persistence between EffectSettingsContext and Zustand store
- **Unified Settings Architecture:** All settings now managed through single Zustand store with automatic persistence  
- **Settings Modal Enhancement:** Complete 7-tab settings interface with comprehensive controls
- **Performance-First Defaults:** All visual effects default to OFF for optimal performance

#### ✨ Visual Effects System Restoration
- **Effect Dependencies Fixed:** Restored all visual effect dependencies after performance optimization
- **Emotion Analysis Integration:** Real-time emotion detection with automatic visual reactions
- **3D Effects Support:** Complete implementation of hologram messages, particle text, and advanced animations
- **Keyword-Based Triggers:** Smart effect triggering based on message content analysis

#### 🎵 Voice System Type Safety Enhancement
- **VoiceSettings Interface Updated:** Added missing `enabled`, `system`, and `advanced` properties
- **Provider Support Enhancement:** Full support for VoiceVox, ElevenLabs, and system voice fallback
- **Advanced Audio Settings:** Buffer management, crossfade, normalization, and noise reduction controls

#### 📊 Memory Management Improvements
- **Legacy Settings Integration:** Comprehensive memory capacity controls with both legacy and modern interfaces
- **Memory Limits Configuration:** Granular control over working memory, memory cards, and context limits
- **Prompt Token Management:** Advanced token limit controls for optimized AI interactions

#### 🎯 Tracker System Stability
- **Auto-Update Restoration:** Fixed automatic tracker updates based on conversation content
- **Display Integration:** Seamless tracker panel integration with settings controls
- **Performance Optimization:** Efficient tracker management without UI blocking

#### 🏗️ Architecture Improvements  
- **Type Safety Enhancement:** Resolved all TypeScript strict mode violations in settings system
- **Component Integration:** Improved component communication between settings modal and effect systems
- **State Management:** Streamlined state updates with immediate persistence and UI reflection

#### 🛠️ Developer Experience
- **Documentation Alignment:** Complete synchronization between implementation and documentation
- **Code Quality:** Eliminated all `any` types and improved type definitions
- **Performance Monitoring:** Added effect quality management and safe mode detection

### Major Update: August 21, 2025

#### 🔧 System Fixes
- **JSON Parse Error Fix:** Resolved console errors by handling corrupted data in localStorage.
- **Side Panel Position Fix:** Fixed display issues with the right side panel on mobile.
- **`useMemo` Import Added:** Fixed type error in `ChatInterface`.

#### 🎵 Audio System Improvements
- **Auto-Playback Feature:** Implemented automatic audio playback for AI messages.
- **Duplicate Playback Prevention:** Completely resolved issues with repeated or overlapping audio.
- **VoiceVox/ElevenLabs Support:** Enabled auto-playback for both providers.

#### 📊 Tracker System Enhancements
- **New/Old Format Compatibility:** Supports unified character setting format.
- **Display Issue Resolved:** Fixed issue where the tracker panel was only half-visible.
- **Initialization Improved:** Enhanced stability when switching characters.

#### 🧠 Memory Card Feature Restoration
- **Auto-Update Function:** Re-enabled automatic memory card generation linked to trackers.
- **Importance Scoring:** Auto-creates memories based on conversation importance.

#### ⚙️ Settings System Improvements
- **Custom Prompt Fix:** Resolved issue where deleted custom prompts would reappear.
- **Settings Persistence:** Implemented more secure saving and loading of settings.
- **Reset Function:** Added a feature to reset system prompts to default.

#### 🎨 UI/UX Enhancements
- **"Continue" Button:** Restored the "Continue" button to the chat menu.
- **Mobile Responsiveness:** Improved responsive layout for mobile devices.
- **Error Handling:** Implemented more user-friendly notifications for errors.

#### 📝 Developer Experience
- **Type Safety:** Full compliance with TypeScript strict mode.
- **Debug Information:** More detailed operational logs in the console.
- **Code Quality:** Automatic formatting with ESLint/Prettier.

#### 🎤 Voice Call Feature (January 21, 2025)
- **WebSocket Voice Server:** Real-time voice call system with Node.js + TypeScript.
- **Audio Processing Pipeline:** Integration of Whisper API + VoiceVox/ElevenLabs.
- **VAD (Voice Activity Detection):** Natural conversation experience with auto start/end detection.
- **Low-Latency Optimization:** Streaming responses, progressive synthesis, and audio caching.
- **System Integration:** Full integration with Zustand store, character system, and chat history.

### Voice Call Feature Status (January 21, 2025)

#### 🏗️ Voice Call System Architecture

**Server-side Implementation**
- **WebSocket Voice Server:** `音声通話/voice-server.js` - Runs on port 8082
- **Audio Processing Pipeline:** Speech Recognition → AI Response → Speech Synthesis → Streaming
- **VAD Implementation:** Auto-detection of speech segments via simple audio level analysis
- **Error Handling:** Mock functionality allows testing even without an OpenAI API key

**Client-side Implementation**
- **Voice Call Interface:** `音声通話/voice-test-component.ts` - Phased testing features
- **WebSocket Communication:** Real-time, bi-directional audio data streaming
- **Audio Visualizer:** Real-time audio level display
- **Mic Control:** Record, stop, and mute functions

#### 📁 Voice Call File Structure

```
音声通話/
├── voice-server.js              # Main voice server (Node.js)
├── voice-test-component.ts      # Test React component
├── 音声通話.txt                 # Implementation specs & integration guide
└── 音声通話デバッグガイドライン.md  # Troubleshooting guide
```

#### 🔧 Implemented Features

**Audio Processing**
- ✅ WebSocket connection and session management
- ✅ Real-time audio data send/receive
- ✅ Audio level detection and speech segment detection
- ✅ Speech recognition (Whisper API / Mock)
- ✅ AI response generation (GPT-3.5-turbo / Mock)
- ✅ Speech synthesis (VoiceVox / ElevenLabs)
- ✅ Audio streaming and caching

**UI/UX**
- ✅ Voice call modal interface
- ✅ Real-time audio visualizer
- ✅ Call status display (Connecting, Recording, Processing, Playing)
- ✅ Audio control buttons (Record, Mute, Speaker)
- ✅ Call duration and connection status display
- ✅ Transcription display of spoken content

**Integration**
- ✅ Integration with existing character system
- ✅ Recording of voice conversations in chat history
- ✅ State synchronization with Zustand store
- ✅ Responsive design support

#### 🚧 Current Implementation Status

**Verified**
- WebSocket connection and session establishment
- Audio data transmission (2,855 messages confirmed)
- Basic server-client communication

**In Debugging**
- Full operation of the audio processing pipeline
- Optimization of VAD for speech segment detection
- End-to-end processing for speech recognition and synthesis

**Next Steps**
- Verify and optimize the audio processing pipeline
- Enhance error handling
- Performance tuning
- Full UI integration

#### 🛠️ Development & Test Environment

**Required Dependencies**
```bash
# Server-side
npm install ws express axios dotenv openai uuid

# Development
npm install -D @types/ws @types/express
```

**Environment Variable Setup**
```env
# .env.local
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_VOICE_SERVER_URL=ws://localhost:8082
VOICEVOX_ENGINE_URL=http://127.0.0.1:50021
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

**Startup Commands**
```bash
# Start voice server
node 音声通話/voice-server.js

# Start development server
npm run dev
```

#### 🔍 Debugging & Troubleshooting

**Current Issues**
- Audio data transmission is successful (2,855 messages confirmed)
- Processing stalls in the server-side audio pipeline
- Error occurring in VAD, speech recognition, or speech synthesis

**Recommended Debugging Steps**
1.  Check detailed logs in `voice-server.js`
2.  Perform phased tests with `VoiceCallTest.tsx`
3.  Isolate the error in each processing stage
4.  Start with a minimal configuration and add features incrementally

**Health Checks**
```bash
# Check server status
curl http://localhost:8082/health

# Check VoiceVox connection
curl http://127.0.0.1:50021/speakers
```

#### 📊 Performance Specifications

**Audio Quality**
- Sample Rate: 16kHz
- Channels: 1 (Mono)
- Bit Depth: 16-bit
- Frame Size: 20ms

**Latency Optimization**
- Audio compression disabled (`perMessageDeflate: false`)
- Chunk Size: 2048 bytes
- Buffer Delay: 10ms
- Progressive speech synthesis (early start on punctuation)

**Caching**
- Audio data cache: Max 100 entries
- Response text cache
- Audio query cache

#### 🎯 Future Extensions

**Short-term Goals**
- Fully operational audio processing pipeline
- Stabilization of basic voice call features
- Enhanced error handling

**Mid-term Goals**
- WebRTC integration for P2P communication
- Multi-language support
- Emotion analysis integration
- Group call functionality

**Long-term Goals**
- Commercial-grade audio quality
- Cloud deployment support
- Mobile app integration