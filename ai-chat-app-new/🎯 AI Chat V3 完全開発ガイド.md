# 🎯 AI Chat V3 Complete Development Guide

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
10. #System_Prompt_Integration
11. #Settings_Management_System
12. #Voice_Synthesis_System
13. #Development_Workflow
14. #Debugging_Guide
15. #Deployment
16. #Latest_Updates

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

**Data Flow**

```
User Input → Component → Zustand Store → Service Layer → API → Response
    ↑                                                              ↓
    └──────────────── UI Update ← State Update ←──────────────────┘
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

**`MessageBubble.tsx`**

*   **Description:** Renders an individual message.
*   **Responsibilities:** Message rendering, user interactions, and visual effects.
*   **Key Features:**
    *   Dynamic message styling
    *   Edit functionality (added August 2024)
    *   Voice playback and synthesis
    *   Emotion-based animations
    *   Action menu (regenerate, copy, edit, delete, etc.)

**`TrackerDisplay.tsx`**

*   **Description:** Displays and manages trackers.
*   **Responsibilities:** Real-time state display and interactive updates.
*   **Key Features:**
    *   Grouping by category
    *   Supports numeric, state, boolean, and text trackers
    *   Real-time change indicators
    *   Visual feedback

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
  analyzeMessageForTrackerUpdates(message: UnifiedMessage): TrackerUpdate[]
}
```

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
    *   **Fully Automatic Creation:** ✅ Newly implemented - `auto-memory-manager.ts`
        *   Auto-detects important messages during conversation
        *   Evaluates based on keywords, emotion, depth, and temporal importance
        *   Executes creation if score exceeds threshold of 0.7
        *   Runs after each AI message via `chat.slice.ts:260-272`
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
    *   `src/types/core/message.types.ts`    # Unified Message Type
    *   `src/store/index.ts`                 # Zustand Integrated Store
    *   `src/services/api-manager.ts`        # Unified API Manager
    *   `src/components/chat/ChatInterface.tsx`
    *   `src/components/chat/MessageBubble.tsx`

*   ⚡ **Important (Key Features)**
    *   `src/services/tracker/tracker-manager.ts`
    *   `src/services/memory/memory-layer-manager.ts`
    *   `src/store/slices/chat.slice.ts`
    *   `src/components/tracker/TrackerDisplay.tsx`
    *   `src/contexts/EffectSettingsContext.tsx`

*   🛠️ **Config & Utilities**
    *   `src/types/index.ts`
    *   `src/lib/utils.ts`
    *   `next.config.js`
    *   `tailwind.config.js`

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

This AI Chat V3 project is designed with a strong emphasis on type safety, maintainability, and extensibility.

**Development Guidelines**

1.  Always use the `UnifiedMessage` type (the old `Message` type is deleted).
2.  Make API calls through the service layer.
3.  Manage state using the Zustand slice pattern.
4.  Run TypeScript type checks regularly.

**Guidelines for Extension**

1.  Implement new features following the existing architecture.
2.  Create type definitions before implementation.
3.  Build with small, testable components.

---
## 🆕 Latest Updates

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