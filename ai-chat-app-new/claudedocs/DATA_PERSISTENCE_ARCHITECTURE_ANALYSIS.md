# AI Chat V3 - Data Persistence Architecture Analysis

**Analysis Date:** 2025-10-06
**Analysis Scope:** System-wide persistence architecture
**Focus:** Character files vs Session state management

---

## Executive Summary

AI Chat V3 implements a **dual-layer persistence architecture**:

1. **File-based persistence** for static character definitions (immutable across sessions)
2. **LocalStorage-based persistence** for dynamic session state (mutable, session-specific)

This separation ensures character data integrity while allowing flexible session management.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Data Persistence Layers                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────┐      ┌───────────────────────────┐   │
│  │   File System Layer   │      │  LocalStorage Layer       │   │
│  │   (Immutable Core)    │      │  (Mutable State)          │   │
│  ├───────────────────────┤      ├───────────────────────────┤   │
│  │                       │      │                           │   │
│  │ • Character JSONs     │      │ • Sessions                │   │
│  │ • Tracker Definitions │      │ • TrackerManagers         │   │
│  │ • Initial Values      │      │ • Memory Cards            │   │
│  │ • Profile Data        │      │ • Memory Layers           │   │
│  │                       │      │ • Active Session IDs      │   │
│  │ Path:                 │      │                           │   │
│  │ /public/characters/   │      │ Storage Key:              │   │
│  │                       │      │ "ai-chat-v3-storage"      │   │
│  └───────────────────────┘      └───────────────────────────┘   │
│         ↓ (read-only)                   ↓ (read/write)          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              API Route: /api/characters                   │  │
│  │              - GET: Load all characters from files        │  │
│  │              - POST: Save character updates to files      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Character Data Persistence (File System)

### 1.1 Storage Location
- **Path:** `/public/characters/*.json`
- **Format:** JSON files, one per character
- **Encoding:** UTF-8 (BOM removed automatically)

### 1.2 What Gets Saved to Files

#### ✅ Saved (Static Definition)
```typescript
{
  id: string,
  name: string,
  personality: string,
  external_personality: string,
  internal_personality: string,
  appearance: string,
  speaking_style: string,
  first_person: string,
  second_person: string,
  verbal_tics: string[],
  likes: string[],
  dislikes: string[],
  hobbies: string[],
  strengths: string[],
  weaknesses: string[],
  background: string,
  scenario: string,
  catchphrase: string,
  nsfw_profile: { ... },
  system_prompt: string,
  trackers: TrackerDefinition[]  // ⚠️ Definitions only, no current_value
}
```

#### ❌ NOT Saved to Files
```typescript
{
  current_value,      // Removed from tracker definitions
  memory_cards,       // Session-specific data
  memoryCards,        // Session-specific data
  value               // Runtime tracker value
}
```

### 1.3 Save Process

**Source:** `src/app/api/characters/route.ts:194-254`

```typescript
export async function POST(request: NextRequest) {
  const character = await request.json();

  // 🔧 Runtime data cleanup
  if (character.trackers && Array.isArray(character.trackers)) {
    character.trackers = character.trackers.map((tracker: any) => {
      const { current_value, value, ...trackerDefinition } = tracker;
      return trackerDefinition;  // Save definitions only
    });
  }

  // 🔧 Memory cards removal (session-specific)
  if ('memory_cards' in character) delete character.memory_cards;
  if ('memoryCards' in character) delete character.memoryCards;

  // 💾 Write to file
  const filePath = path.join(charactersDir, `${character.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(character, null, 2), "utf8");
}
```

**Key Points:**
- ✅ Character updates immediately save to JSON files
- ✅ Tracker **definitions** (type, initial_value) are saved
- ❌ Tracker **current values** are NOT saved (session-specific)
- ❌ Memory cards are NOT saved (session-specific)

---

## 2. Session State Persistence (LocalStorage)

### 2.1 Storage Configuration

**Source:** `src/store/index.ts:96-515`

```typescript
create<AppStore>()(
  persist(combinedSlices, {
    name: "ai-chat-v3-storage",
    storage: createJSONStorage(() => localStorage),
    version: 3,
    partialize: (state) => ({
      // 🔹 Session Data ONLY
      sessions: state.sessions,                    // ✅ Persisted
      active_session_id: state.active_session_id,  // ✅ Persisted
      trackerManagers: state.trackerManagers,      // ✅ Persisted

      // 🔹 Group Chat Sessions
      groupSessions: state.groupSessions,          // ✅ Persisted
      active_group_session_id: state.active_group_session_id,
      is_group_mode: state.is_group_mode,

      // 🔹 Character & Persona Data (References only)
      characters: state.characters,                // ⚠️ In-memory cache
      selectedCharacterId: state.selectedCharacterId,
      personas: state.personas,
      activePersonaId: state.activePersonaId,

      // 🔹 Memory System (Session-specific)
      memories: state.memories,                    // ✅ Persisted
      memoryCards: state.memory_cards,             // ✅ Persisted
      memoryLayers: state.memoryLayers,            // ✅ Persisted

      // 🔹 Suggestion Data
      suggestions: state.suggestions,
      suggestionData: state.suggestionData,

      // ❌ NOT Persisted
      // - UI state (isLeftSidebarOpen, isRightPanelOpen)
      // - isCharactersLoaded (forces reload from files)
      // - All settings (managed separately by settingsManager)
    })
  })
)
```

### 2.2 What Gets Persisted to LocalStorage

#### ✅ Persisted (Dynamic State)
```typescript
{
  // Session data
  sessions: Map<UUID, UnifiedChatSession>,
  active_session_id: UUID | null,
  trackerManagers: Map<characterId, TrackerManager>,

  // Group chat
  groupSessions: Map<UUID, GroupChatSession>,
  active_group_session_id: UUID | null,
  is_group_mode: boolean,

  // Memory system
  memory_cards: Map<UUID, MemoryCard>,
  memoryLayers: Map<UUID, MemoryLayer>,

  // Character references (in-memory cache)
  characters: Map<UUID, Character>,
  selectedCharacterId: UUID | null,

  // Personas
  personas: Map<UUID, Persona>,
  activePersonaId: UUID | null
}
```

#### ❌ NOT Persisted
```typescript
{
  // UI state (hydration issues)
  isLeftSidebarOpen,
  isRightPanelOpen,
  showCharacterReselectionModal,

  // Force reload flags
  isCharactersLoaded,  // Always false on startup → forces file reload

  // Settings (managed by settingsManager)
  apiConfig,
  systemPrompts,
  chat,
  voice,
  imageGeneration,
  appearanceSettings,
  effectSettings
}
```

### 2.3 Storage Size Management

**Automatic Cleanup Triggers:**
- Storage size > 2MB
- Session count > 5 (keeps latest 5)
- Memory cards > 50 (keeps latest 50)
- Group sessions > 3 (keeps latest 3)

**Source:** `src/store/index.ts:169-267`

---

## 3. Session Lifecycle

### 3.1 Session Creation

**Source:** `src/store/slices/chat/chat-session-management.ts:43-164`

```typescript
createSession: async (character, persona) => {
  const sessionId = generateSessionId();

  // 🔧 TrackerManager initialization (per character)
  const trackerManagers = get().trackerManagers;
  if (!trackerManagers.has(character.id)) {
    const trackerManager = new TrackerManager();
    trackerManager.initializeTrackerSet(character.id, character.trackers);
    trackerManagers.set(character.id, trackerManager);
  }

  // 📝 Create new session
  const newSession: UnifiedChatSession = {
    id: sessionId,
    created_at: new Date().toISOString(),
    participants: { user: persona, characters: [character] },
    messages: [welcomeMessage],
    memory_system: { ... },
    tracker_state: { ... }
  };

  // 💾 Save to sessions Map
  const sessions = new Map(get().sessions);
  sessions.set(sessionId, newSession);
  set({ sessions, active_session_id: sessionId });

  return sessionId;
}
```

**Key Points:**
- ✅ Each session gets a unique ID
- ✅ TrackerManager is initialized **per character** (not per session)
- ✅ Session includes welcome message
- ✅ Session immediately saved to LocalStorage (via Zustand persist)

### 3.2 Session Switching

When user switches to a different character:

```typescript
selectCharacter: async (characterId) => {
  const character = get().characters.get(characterId);
  const persona = get().getSelectedPersona();

  // Create NEW session
  const newSessionId = await get().createSession(character, persona);
  get().setActiveSessionId(newSessionId);
}
```

**Result:**
- ❌ Old session remains in LocalStorage
- ✅ New session created with fresh state
- ✅ TrackerManager preserved (per character)

### 3.3 Session Reset Behavior

**New Session Creation:**
```
User selects character
  → createSession() called
  → New session ID generated
  → New TrackerManager initialized (if not exists)
  → Fresh message history
  → Fresh memory system
  → Fresh tracker state
  → Old session preserved in LocalStorage
```

**Important:** New sessions **DO NOT** inherit:
- ❌ Conversation history
- ❌ Memory cards (session-specific)
- ❌ Tracker values (reset to initial_value)

**Important:** New sessions **DO** inherit:
- ✅ Character definition (from files)
- ✅ TrackerManager instance (if character was used before)

---

## 4. Tracker State Management

### 4.1 Tracker Architecture

```
┌───────────────────────────────────────────────┐
│          Tracker Data Flow                     │
├───────────────────────────────────────────────┤
│                                                │
│  Character File                                │
│  ┌──────────────────────────────────────┐     │
│  │ trackers: [                          │     │
│  │   {                                  │     │
│  │     id: "affection",                 │     │
│  │     type: "number",                  │     │
│  │     initial_value: 50,  ← Definition │     │
│  │     min: 0, max: 100                 │     │
│  │   }                                  │     │
│  │ ]                                    │     │
│  └──────────────────────────────────────┘     │
│           ↓ (read on startup)                 │
│                                                │
│  TrackerManager (per character)                │
│  ┌──────────────────────────────────────┐     │
│  │ trackerSets: Map<characterId, Set>   │     │
│  │   └─ "char-123": {                   │     │
│  │        affection: {                  │     │
│  │          current_value: 65 ← Runtime │     │
│  │          definition: { ... }         │     │
│  │        }                             │     │
│  │      }                               │     │
│  └──────────────────────────────────────┘     │
│           ↓ (saved to LocalStorage)           │
│                                                │
│  LocalStorage: "ai-chat-v3-storage"            │
│  ┌──────────────────────────────────────┐     │
│  │ trackerManagers: Map<charId, TM>     │     │
│  │   with current_value persisted       │     │
│  └──────────────────────────────────────┘     │
└───────────────────────────────────────────────┘
```

### 4.2 Tracker Persistence Rules

| Data Type | Saved to File | Saved to LocalStorage |
|-----------|--------------|----------------------|
| Tracker definition (type, min, max, initial_value) | ✅ Yes | ✅ Yes (in characters cache) |
| Tracker current_value | ❌ No | ✅ Yes (in trackerManagers) |
| TrackerManager instance | ❌ No | ✅ Yes (serialized) |

### 4.3 Tracker Lifecycle

1. **First Load:**
   - Character file loaded from `/public/characters/`
   - TrackerManager created
   - Trackers initialized with `initial_value`

2. **During Session:**
   - Tracker values updated via `TrackerManager.updateTracker()`
   - Changes immediately saved to LocalStorage (Zustand persist)

3. **Character File Save:**
   - Only tracker **definitions** saved
   - `current_value` stripped out (`route.ts:224-229`)

4. **New Session:**
   - Existing TrackerManager reused (if character used before)
   - OR new TrackerManager created with `initial_value`

---

## 5. Memory Card Management

### 5.1 Memory Card Architecture

**Source:** `src/store/slices/memory.slice.ts:7-55`

```typescript
export interface MemorySlice {
  // Session-isolated storage
  memory_cards_by_session: Map<UUID, Map<UUID, MemoryCard>>,
  memory_layers_by_session: Map<UUID, Map<UUID, MemoryLayer>>,
  current_session_id: UUID | null,

  // Backward compatibility (current session view)
  memory_cards: Map<UUID, MemoryCard>,

  // Session management
  setCurrentSessionId: (session_id: UUID) => void,
  getCurrentSessionMemoryCards: () => Map<UUID, MemoryCard>,

  // Operations
  createMemoryCard: (message_ids, session_id, character_id?) => Promise<MemoryCard | null>,
  updateMemoryCard: (id, updates) => void,
  deleteMemoryCard: (id) => void,
  clearSessionMemoryCards: (session_id) => void
}
```

### 5.2 Memory Card Persistence

| Operation | Saved to File | Saved to LocalStorage |
|-----------|--------------|----------------------|
| Create memory card | ❌ No | ✅ Yes (in memory_cards) |
| Update memory card | ❌ No | ✅ Yes |
| Pin memory card | ❌ No | ✅ Yes (in pinned_memories) |
| Delete memory card | ❌ No | ✅ Yes (removed from map) |

**Important:** Memory cards are **session-specific** and are:
- ✅ Saved to LocalStorage (per session)
- ❌ NOT saved to character files
- ❌ NOT transferred to new sessions

### 5.3 Memory Card Session Isolation

```typescript
// Memory cards are isolated per session
memory_cards_by_session: Map<sessionId, Map<cardId, MemoryCard>>

// When switching sessions:
setCurrentSessionId(newSessionId) → Only that session's cards visible
```

---

## 6. Data Flow Summary

### 6.1 Startup Flow

```
1. App Start
   ↓
2. LocalStorage Load
   ├─ sessions (Map)
   ├─ trackerManagers (Map)
   ├─ memory_cards (Map)
   └─ characters (cache, marked as stale)
   ↓
3. Character File Reload (forced)
   ├─ GET /api/characters
   ├─ Load all *.json files
   ├─ Replace cached characters
   └─ Merge with existing trackerManagers
   ↓
4. Active Session Resume
   ├─ Load active_session_id
   ├─ Load session from sessions Map
   ├─ Load tracker state from trackerManagers
   └─ Load memory cards for session
```

### 6.2 Character Edit Flow

```
1. User edits character
   ↓
2. updateCharacter() called
   ├─ Update characters Map (in-memory)
   └─ Update editingCharacter state
   ↓
3. saveCharacter() called
   ├─ Strip current_value from trackers
   ├─ Strip memory_cards
   ├─ POST /api/characters
   └─ Write to /public/characters/{id}.json
   ↓
4. File updated ✅
   ↓
5. Next app start
   ├─ File reloaded
   ├─ Changes visible
   └─ Tracker definitions updated
```

### 6.3 Session Create Flow

```
1. User selects character
   ↓
2. selectCharacter(characterId)
   ↓
3. createSession(character, persona)
   ├─ Generate new session ID
   ├─ Check if trackerManager exists for character
   │  ├─ Yes → Reuse existing (preserves tracker values)
   │  └─ No → Create new (initialize with initial_value)
   ├─ Create UnifiedChatSession
   ├─ Add welcome message
   ├─ Initialize memory_system
   └─ Save to sessions Map
   ↓
4. LocalStorage auto-save (Zustand persist)
   ├─ Session saved
   ├─ TrackerManager saved
   └─ Active session ID saved
```

---

## 7. Key Insights

### 7.1 Separation of Concerns

✅ **Strengths:**
- Character definitions are **immutable** across sessions
- Tracker definitions are **version-controlled** in files
- Session state is **isolated** and **recoverable**
- Memory cards are **session-specific** (prevents cross-contamination)

⚠️ **Trade-offs:**
- TrackerManager is **per-character**, not per-session
  - **Implication:** Switching back to a character preserves tracker values
  - **Behavior:** Not truly "fresh start" unless trackerManager cleared
- Character cache in LocalStorage can become stale
  - **Mitigation:** `isCharactersLoaded` flag forces reload on startup

### 7.2 Session Independence

✅ **New sessions are independent:**
- Fresh message history
- Fresh memory system
- Fresh tracker state (if new TrackerManager)

❌ **New sessions are NOT fully independent:**
- TrackerManager may be reused (if character used before in this browser)
- Character data cached in LocalStorage (stale until next reload)

### 7.3 Data Integrity

✅ **File integrity protected:**
- Runtime data (current_value, memory_cards) never saved to files
- Character definitions remain clean

✅ **Session integrity protected:**
- Each session has isolated memory cards
- Session switching preserves old sessions

⚠️ **Potential issue:**
- If user expects "fresh start" for tracker values, they won't get it
  - **Current behavior:** TrackerManager persists across sessions for same character
  - **Expected behavior (?):** Tracker values reset to initial_value for new session

---

## 8. Recommendations

### 8.1 Clarify Session Reset Behavior

**Current:** TrackerManager persists across sessions (per character)

**Options:**
1. **Keep current behavior** (tracker values preserved across sessions)
   - Document this clearly for users
   - Add "Reset Tracker Values" button

2. **Change to true session isolation** (tracker values reset for new session)
   - Create new TrackerManager for each session
   - Store trackerManagers per session, not per character

### 8.2 Add Session Management UI

Suggested features:
- "New Session (Fresh Start)" - resets all tracker values
- "Continue Session" - preserves tracker values
- "Reset Tracker Values" - manual reset to initial_value

### 8.3 Character File Reload Strategy

**Current:** Force reload on every app start

**Alternative:**
- Detect file changes via timestamp or hash
- Only reload if files changed
- Reduces API calls and load time

### 8.4 Storage Quota Management

**Current:** Automatic cleanup at 2MB

**Improvements:**
- Show storage usage in UI
- Let users manually archive old sessions
- Export sessions to file system

---

## 9. Conclusion

AI Chat V3's dual-layer persistence architecture effectively separates:
- **Static character definitions** (files)
- **Dynamic session state** (LocalStorage)

This design ensures data integrity while allowing flexible session management. The main area for improvement is clarifying and documenting the **TrackerManager persistence behavior** across sessions.

---

## Appendix: File References

### Core Files

| File | Purpose |
|------|---------|
| `src/store/index.ts` | Zustand store with persist config |
| `src/store/slices/character.slice.ts` | Character state management |
| `src/store/slices/chat/chat-session-management.ts` | Session lifecycle |
| `src/store/slices/memory.slice.ts` | Memory card management |
| `src/app/api/characters/route.ts` | Character file I/O (GET/POST) |

### Key Data Structures

```typescript
// Character file structure
interface Character {
  id: UUID;
  name: string;
  trackers: TrackerDefinition[];  // No current_value
  // ... other properties
}

// Session structure (LocalStorage)
interface UnifiedChatSession {
  id: UUID;
  participants: { user: Persona; characters: Character[] };
  messages: UnifiedMessage[];
  memory_system: MemorySystem;
  tracker_state: any;
}

// TrackerManager (LocalStorage)
interface TrackerManager {
  trackerSets: Map<characterId, TrackerSet>;
  // Includes current_value for each tracker
}
```

---

**Analysis completed:** 2025-10-06
**Next steps:** User review and decision on session reset behavior
