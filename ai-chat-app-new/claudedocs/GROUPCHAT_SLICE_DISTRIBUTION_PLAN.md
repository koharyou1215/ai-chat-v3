# Group Chat Slice Distribution Plan
**File**: `src/store/slices/groupChat.slice.ts`
**Current State**: 1,474 lines, 33 functions, 8 major responsibilities
**Target State**: 7 focused slices + 4 services + 250-line orchestrator
**Expected Impact**: 83% complexity reduction, dramatic maintainability improvement

---

## Executive Summary

### Current Problems
- **438-line sendGroupMessage()**: Single function handling 4 chat modes (sequential/simultaneous/random/smart)
- **State Management Chaos**: 33 state setters scattered throughout, no clear ownership
- **Mode-Specific Logic**: Complex branching for 4 execution modes mixed with shared logic
- **Background Processing**: Emotion/Memory/Tracker integration scattered, race condition risks
- **Testing Nightmare**: Cannot test individual chat modes in isolation

### Proposed Architecture
```
slices/group-chat/
├── group-session-lifecycle.slice.ts      (~180 lines) - Session CRUD operations
├── group-message-generation.slice.ts     (~350 lines) - AI message generation core
├── group-message-operations.slice.ts     (~300 lines) - Regenerate/Continue/Delete
├── group-member-management.slice.ts      (~250 lines) - Character add/remove/reorder
├── group-chat-configuration.slice.ts     (~60 lines)  - Settings management
├── group-emotion-integration.slice.ts    (~180 lines) - Emotion analysis integration
├── group-background-processing.slice.ts  (~150 lines) - Async memory/tracker updates
└── groupChat.slice.ts                    (~250 lines) - Composite slice orchestrator

services/group-chat/
├── character-response.service.ts         (~250 lines) - AI API calls per character
├── chat-mode-router.service.ts           (~180 lines) - Mode-specific execution logic
├── system-message-factory.ts             (~120 lines) - System message generation
└── group-emotion-integration.ts          (~180 lines) - Emotion state management
```

### Benefits Quantification
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Core slice size | 1,474 lines | 250 lines | 83% reduction |
| Largest function | 438 lines | <120 lines | 73% reduction |
| Chat modes isolation | Tangled | 4 strategies | Clear separation |
| Test coverage | ~20% | Target 85% | 4.25x improvement |
| Parallel development | 1-2 devs | 7 devs | 7x scalability |
| Race conditions | High risk | Controlled | Safety improvement |

---

## Module Specifications

### Slice 1: Session Lifecycle Management
**File**: `src/store/slices/group-chat/group-session-lifecycle.slice.ts`

**Responsibility**: Group chat session CRUD operations

**State**:
```typescript
interface GroupSessionState {
  groupSessions: Map<string, GroupChatSession>;
  activeGroupSessionId: string | null;
  isLoading: boolean;
}
```

**Actions**:
- `createGroupSession()` - Create new group chat session
- `deleteGroupSession()` - Remove session with cleanup
- `setActiveGroupSession()` - Switch active session
- `updateGroupSessionTitle()` - Rename session
- `duplicateGroupSession()` - Clone existing session
- `importGroupSession()` - Import from JSON
- `exportGroupSession()` - Export to JSON

**Dependencies**:
- None (pure state management)

**Estimated Lines**: 180

**Example Implementation**:
```typescript
export const createGroupSessionLifecycleSlice: StateCreator<
  GroupChatStore,
  [],
  [],
  GroupSessionLifecycleSlice
> = (set, get) => ({
  groupSessions: new Map(),
  activeGroupSessionId: null,
  isLoading: false,

  createGroupSession: (title: string, characterIds: string[]) => {
    const session: GroupChatSession = {
      id: generateId(),
      title,
      characterIds,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    set(state => ({
      groupSessions: new Map(state.groupSessions).set(session.id, session),
      activeGroupSessionId: session.id,
    }));
  },

  deleteGroupSession: (sessionId: string) => {
    const sessions = new Map(get().groupSessions);
    sessions.delete(sessionId);

    set({
      groupSessions: sessions,
      activeGroupSessionId: get().activeGroupSessionId === sessionId
        ? null
        : get().activeGroupSessionId,
    });
  },

  // ... other actions
});
```

---

### Slice 2: Message Generation (Core Logic)
**File**: `src/store/slices/group-chat/group-message-generation.slice.ts`

**Responsibility**: AI message generation with mode routing

**Current Problem**: `sendGroupMessage()` 438 lines handling:
1. Mode selection (sequential/simultaneous/random/smart)
2. Character response generation
3. Message storage
4. Background processing triggers
5. Error handling
6. State updates

**Proposed Solution**: Strategy Pattern with mode routing

**State**:
```typescript
interface MessageGenerationState {
  group_generating: boolean;
  group_generating_for: string | null; // Character ID currently generating
  pendingCharacters: string[];          // Queue for sequential mode
  generationErrors: Map<string, string>; // Character ID → error message
}
```

**Actions**:
- `sendGroupMessage()` - Main entry point (delegates to mode router)
- `generateCharacterResponse()` - Single character response generation
- `handleGenerationSuccess()` - Update state after success
- `handleGenerationError()` - Update state after error
- `cancelGeneration()` - Abort ongoing generation

**Dependencies**:
- `ChatModeRouter` service (for mode-specific logic)
- `CharacterResponseService` (for AI API calls)
- `GroupBackgroundProcessingSlice` (for async updates)

**Estimated Lines**: 350

**Example Implementation**:
```typescript
export const createGroupMessageGenerationSlice: StateCreator<
  GroupChatStore,
  [],
  [],
  GroupMessageGenerationSlice
> = (set, get) => ({
  group_generating: false,
  group_generating_for: null,
  pendingCharacters: [],
  generationErrors: new Map(),

  sendGroupMessage: async (sessionId: string, userMessage: string) => {
    const session = get().groupSessions.get(sessionId);
    if (!session) return;

    // Add user message
    const userMsg: GroupMessage = {
      id: generateId(),
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };

    get().addMessageToSession(sessionId, userMsg);

    // Get chat mode and delegate to router
    const mode = get().chatMode;
    const router = new ChatModeRouter();

    set({ group_generating: true, pendingCharacters: [...session.characterIds] });

    try {
      await router.executeMode(mode, {
        sessionId,
        characterIds: session.characterIds,
        onCharacterStart: (characterId) => {
          set({ group_generating_for: characterId });
        },
        onCharacterComplete: (characterId, message) => {
          get().handleGenerationSuccess(sessionId, characterId, message);
        },
        onCharacterError: (characterId, error) => {
          get().handleGenerationError(characterId, error);
        },
      });
    } finally {
      set({ group_generating: false, group_generating_for: null, pendingCharacters: [] });
    }
  },

  generateCharacterResponse: async (sessionId: string, characterId: string) => {
    const service = new CharacterResponseService();
    const response = await service.generateResponse(sessionId, characterId);
    return response;
  },

  handleGenerationSuccess: (sessionId: string, characterId: string, message: GroupMessage) => {
    get().addMessageToSession(sessionId, message);

    // Trigger background processing
    get().processMessageBackground(sessionId, message, characterId);

    // Remove from pending queue
    set(state => ({
      pendingCharacters: state.pendingCharacters.filter(id => id !== characterId),
    }));
  },

  handleGenerationError: (characterId: string, error: string) => {
    const errors = new Map(get().generationErrors);
    errors.set(characterId, error);
    set({ generationErrors: errors });
  },

  // ... other actions
});
```

---

### Slice 3: Message Operations
**File**: `src/store/slices/group-chat/group-message-operations.slice.ts`

**Responsibility**: Message regeneration, continuation, deletion, editing

**State**:
```typescript
interface MessageOperationsState {
  regenerating: Map<string, boolean>; // Message ID → regenerating status
  continuing: Map<string, boolean>;   // Message ID → continuing status
}
```

**Actions**:
- `regenerateGroupMessage()` - Regenerate specific message
- `continueGroupMessage()` - Continue from message
- `deleteGroupMessage()` - Delete message with cleanup
- `editGroupMessage()` - Edit message content
- `bulkDeleteMessages()` - Delete multiple messages

**Dependencies**:
- `CharacterResponseService` (for AI regeneration)
- `GroupBackgroundProcessingSlice` (for async updates)

**Estimated Lines**: 300

**Example Implementation**:
```typescript
export const createGroupMessageOperationsSlice: StateCreator<
  GroupChatStore,
  [],
  [],
  GroupMessageOperationsSlice
> = (set, get) => ({
  regenerating: new Map(),
  continuing: new Map(),

  regenerateGroupMessage: async (sessionId: string, messageId: string) => {
    const session = get().groupSessions.get(sessionId);
    const message = session?.messages.find(m => m.id === messageId);
    if (!message || !message.characterId) return;

    set(state => ({
      regenerating: new Map(state.regenerating).set(messageId, true),
    }));

    try {
      const service = new CharacterResponseService();
      const newMessage = await service.regenerateMessage(sessionId, message);

      // Replace message in session
      const updatedMessages = session.messages.map(m =>
        m.id === messageId ? { ...newMessage, id: messageId } : m
      );

      get().updateSessionMessages(sessionId, updatedMessages);
      get().processMessageBackground(sessionId, newMessage, message.characterId);
    } finally {
      set(state => {
        const regenerating = new Map(state.regenerating);
        regenerating.delete(messageId);
        return { regenerating };
      });
    }
  },

  deleteGroupMessage: (sessionId: string, messageId: string) => {
    const session = get().groupSessions.get(sessionId);
    if (!session) return;

    const updatedMessages = session.messages.filter(m => m.id !== messageId);
    get().updateSessionMessages(sessionId, updatedMessages);
  },

  // ... other actions
});
```

---

### Slice 4: Member Management
**File**: `src/store/slices/group-chat/group-member-management.slice.ts`

**Responsibility**: Character addition, removal, reordering in sessions

**State**:
```typescript
interface MemberManagementState {
  availableCharacters: Character[];
  characterLoadErrors: Map<string, string>;
}
```

**Actions**:
- `addCharacterToSession()` - Add character to group chat
- `removeCharacterFromSession()` - Remove character (with cleanup)
- `reorderCharacters()` - Change character order
- `replaceCharacter()` - Swap character in session
- `getCharacterById()` - Retrieve character data

**Dependencies**:
- Character data store

**Estimated Lines**: 250

**Example Implementation**:
```typescript
export const createGroupMemberManagementSlice: StateCreator<
  GroupChatStore,
  [],
  [],
  GroupMemberManagementSlice
> = (set, get) => ({
  availableCharacters: [],
  characterLoadErrors: new Map(),

  addCharacterToSession: (sessionId: string, characterId: string) => {
    const session = get().groupSessions.get(sessionId);
    if (!session) return;

    // Prevent duplicates
    if (session.characterIds.includes(characterId)) {
      console.warn(`Character ${characterId} already in session`);
      return;
    }

    const updatedSession = {
      ...session,
      characterIds: [...session.characterIds, characterId],
      updatedAt: Date.now(),
    };

    set(state => ({
      groupSessions: new Map(state.groupSessions).set(sessionId, updatedSession),
    }));
  },

  removeCharacterFromSession: (sessionId: string, characterId: string) => {
    const session = get().groupSessions.get(sessionId);
    if (!session) return;

    // Prevent removing last character
    if (session.characterIds.length <= 1) {
      console.warn('Cannot remove last character from group chat');
      return;
    }

    const updatedSession = {
      ...session,
      characterIds: session.characterIds.filter(id => id !== characterId),
      updatedAt: Date.now(),
    };

    set(state => ({
      groupSessions: new Map(state.groupSessions).set(sessionId, updatedSession),
    }));
  },

  reorderCharacters: (sessionId: string, newOrder: string[]) => {
    const session = get().groupSessions.get(sessionId);
    if (!session) return;

    const updatedSession = {
      ...session,
      characterIds: newOrder,
      updatedAt: Date.now(),
    };

    set(state => ({
      groupSessions: new Map(state.groupSessions).set(sessionId, updatedSession),
    }));
  },

  // ... other actions
});
```

---

### Slice 5: Configuration Management
**File**: `src/store/slices/group-chat/group-chat-configuration.slice.ts`

**Responsibility**: Chat mode, settings, preferences

**State**:
```typescript
interface ConfigurationState {
  chatMode: 'sequential' | 'simultaneous' | 'random' | 'smart';
  autoScroll: boolean;
  showTimestamps: boolean;
  messageDelay: number; // For sequential mode
}
```

**Actions**:
- `setChatMode()` - Change chat execution mode
- `updateGroupChatSettings()` - Update settings
- `resetToDefaults()` - Reset configuration

**Estimated Lines**: 60

**Example Implementation**:
```typescript
export const createGroupChatConfigurationSlice: StateCreator<
  GroupChatStore,
  [],
  [],
  GroupChatConfigurationSlice
> = (set) => ({
  chatMode: 'sequential',
  autoScroll: true,
  showTimestamps: true,
  messageDelay: 500,

  setChatMode: (mode) => {
    set({ chatMode: mode });
  },

  updateGroupChatSettings: (settings) => {
    set(settings);
  },

  resetToDefaults: () => {
    set({
      chatMode: 'sequential',
      autoScroll: true,
      showTimestamps: true,
      messageDelay: 500,
    });
  },
});
```

---

### Slice 6: Emotion Integration
**File**: `src/store/slices/group-chat/group-emotion-integration.slice.ts`

**Responsibility**: Emotion analysis integration for group messages

**State**:
```typescript
interface EmotionIntegrationState {
  messageEmotions: Map<string, EmotionState>; // Message ID → emotion
  characterEmotions: Map<string, EmotionState>; // Character ID → current emotion
  emotionAnalysisEnabled: boolean;
}
```

**Actions**:
- `analyzeMessageEmotion()` - Analyze emotion for message
- `updateCharacterEmotion()` - Update character emotional state
- `getEmotionForMessage()` - Retrieve emotion data
- `clearEmotionData()` - Clear emotion cache

**Dependencies**:
- Emotion analysis service

**Estimated Lines**: 180

---

### Slice 7: Background Processing
**File**: `src/store/slices/group-chat/group-background-processing.slice.ts`

**Responsibility**: Async memory, tracker, emotion updates

**State**:
```typescript
interface BackgroundProcessingState {
  processingQueue: Map<string, ProcessingTask>;
  processingErrors: Map<string, string>;
}
```

**Actions**:
- `processMessageBackground()` - Trigger async processing
- `updateMemoryCards()` - Mem0 integration
- `updateTrackers()` - Tracker updates
- `updateEmotionAnalysis()` - Emotion processing
- `retryFailedProcessing()` - Retry failed tasks

**Critical**: Prevents race conditions by queuing

**Estimated Lines**: 150

**Example Implementation**:
```typescript
export const createGroupBackgroundProcessingSlice: StateCreator<
  GroupChatStore,
  [],
  [],
  GroupBackgroundProcessingSlice
> = (set, get) => ({
  processingQueue: new Map(),
  processingErrors: new Map(),

  processMessageBackground: async (sessionId: string, message: GroupMessage, characterId: string) => {
    const taskId = `${message.id}_${Date.now()}`;

    // Add to queue
    set(state => ({
      processingQueue: new Map(state.processingQueue).set(taskId, {
        sessionId,
        messageId: message.id,
        characterId,
        status: 'pending',
      }),
    }));

    try {
      // Process in parallel
      await Promise.all([
        get().updateMemoryCards(sessionId, message, characterId),
        get().updateTrackers(sessionId, message, characterId),
        get().updateEmotionAnalysis(message, characterId),
      ]);

      // Mark complete
      set(state => {
        const queue = new Map(state.processingQueue);
        queue.delete(taskId);
        return { processingQueue: queue };
      });
    } catch (error) {
      set(state => ({
        processingErrors: new Map(state.processingErrors).set(taskId, error.message),
      }));
    }
  },

  updateMemoryCards: async (sessionId: string, message: GroupMessage, characterId: string) => {
    // Mem0 integration
  },

  updateTrackers: async (sessionId: string, message: GroupMessage, characterId: string) => {
    // Tracker updates
  },

  updateEmotionAnalysis: async (message: GroupMessage, characterId: string) => {
    // Emotion analysis
  },

  // ... other actions
});
```

---

### Composite Orchestrator
**File**: `src/store/slices/groupChat.slice.ts`

**Responsibility**: Combine all slices using Zustand's slice composition

**Estimated Lines**: 250

**Implementation**:
```typescript
import { createGroupSessionLifecycleSlice } from './group-chat/group-session-lifecycle.slice';
import { createGroupMessageGenerationSlice } from './group-chat/group-message-generation.slice';
import { createGroupMessageOperationsSlice } from './group-chat/group-message-operations.slice';
import { createGroupMemberManagementSlice } from './group-chat/group-member-management.slice';
import { createGroupChatConfigurationSlice } from './group-chat/group-chat-configuration.slice';
import { createGroupEmotionIntegrationSlice } from './group-chat/group-emotion-integration.slice';
import { createGroupBackgroundProcessingSlice } from './group-chat/group-background-processing.slice';

export type GroupChatStore =
  & GroupSessionLifecycleSlice
  & GroupMessageGenerationSlice
  & GroupMessageOperationsSlice
  & GroupMemberManagementSlice
  & GroupChatConfigurationSlice
  & GroupEmotionIntegrationSlice
  & GroupBackgroundProcessingSlice;

export const createGroupChatSlice: StateCreator<
  AppStore,
  [],
  [],
  GroupChatStore
> = (...args) => ({
  ...createGroupSessionLifecycleSlice(...args),
  ...createGroupMessageGenerationSlice(...args),
  ...createGroupMessageOperationsSlice(...args),
  ...createGroupMemberManagementSlice(...args),
  ...createGroupChatConfigurationSlice(...args),
  ...createGroupEmotionIntegrationSlice(...args),
  ...createGroupBackgroundProcessingSlice(...args),
});
```

---

## Service Layer (New Files)

### Service 1: Character Response Service
**File**: `src/services/group-chat/character-response.service.ts`

**Responsibility**: Handle AI API calls for character responses

**Methods**:
- `generateResponse()` - Generate single character response
- `regenerateMessage()` - Regenerate existing message
- `continueMessage()` - Continue from message
- `buildPrompt()` - Build character-specific prompt
- `handleAPIError()` - Error handling and retries

**Estimated Lines**: 250

**Example**:
```typescript
export class CharacterResponseService {
  async generateResponse(
    sessionId: string,
    characterId: string
  ): Promise<GroupMessage> {
    const character = await this.loadCharacter(characterId);
    const session = this.getSession(sessionId);
    const prompt = this.buildPrompt(session, character);

    const response = await apiManager.generateMessage({
      messages: prompt,
      character,
    });

    return {
      id: generateId(),
      role: 'assistant',
      content: response.content,
      characterId,
      timestamp: Date.now(),
    };
  }

  private buildPrompt(session: GroupChatSession, character: Character): Message[] {
    // Build character-specific prompt from session history
  }

  // ... other methods
}
```

---

### Service 2: Chat Mode Router
**File**: `src/services/group-chat/chat-mode-router.service.ts`

**Responsibility**: Execute chat mode-specific logic

**Current Problem**: 4 modes tangled in sendGroupMessage()

**Proposed Solution**: Strategy Pattern with mode strategies

**Implementation**:
```typescript
interface ChatModeStrategy {
  execute(context: ChatModeContext): Promise<void>;
}

class SequentialModeStrategy implements ChatModeStrategy {
  async execute(context: ChatModeContext): Promise<void> {
    for (const characterId of context.characterIds) {
      context.onCharacterStart(characterId);
      try {
        const message = await context.generateResponse(characterId);
        context.onCharacterComplete(characterId, message);
      } catch (error) {
        context.onCharacterError(characterId, error.message);
      }
    }
  }
}

class SimultaneousModeStrategy implements ChatModeStrategy {
  async execute(context: ChatModeContext): Promise<void> {
    const promises = context.characterIds.map(async (characterId) => {
      context.onCharacterStart(characterId);
      try {
        const message = await context.generateResponse(characterId);
        context.onCharacterComplete(characterId, message);
      } catch (error) {
        context.onCharacterError(characterId, error.message);
      }
    });

    await Promise.all(promises);
  }
}

class RandomModeStrategy implements ChatModeStrategy {
  async execute(context: ChatModeContext): Promise<void> {
    const randomCharacter = context.characterIds[
      Math.floor(Math.random() * context.characterIds.length)
    ];

    context.onCharacterStart(randomCharacter);
    try {
      const message = await context.generateResponse(randomCharacter);
      context.onCharacterComplete(randomCharacter, message);
    } catch (error) {
      context.onCharacterError(randomCharacter, error.message);
    }
  }
}

class SmartModeStrategy implements ChatModeStrategy {
  async execute(context: ChatModeContext): Promise<void> {
    // Analyze context and select most relevant character
    const relevantCharacter = await this.selectRelevantCharacter(context);

    context.onCharacterStart(relevantCharacter);
    try {
      const message = await context.generateResponse(relevantCharacter);
      context.onCharacterComplete(relevantCharacter, message);
    } catch (error) {
      context.onCharacterError(relevantCharacter, error.message);
    }
  }

  private async selectRelevantCharacter(context: ChatModeContext): Promise<string> {
    // AI-based character selection logic
  }
}

export class ChatModeRouter {
  private strategies: Record<ChatMode, ChatModeStrategy> = {
    sequential: new SequentialModeStrategy(),
    simultaneous: new SimultaneousModeStrategy(),
    random: new RandomModeStrategy(),
    smart: new SmartModeStrategy(),
  };

  async executeMode(mode: ChatMode, context: ChatModeContext): Promise<void> {
    const strategy = this.strategies[mode];
    if (!strategy) {
      throw new Error(`Unknown chat mode: ${mode}`);
    }

    await strategy.execute(context);
  }
}
```

**Estimated Lines**: 180

**Benefits**:
- Each mode testable in isolation
- Easy to add new modes (Open/Closed Principle)
- Clear separation of concerns

---

### Service 3: System Message Factory
**File**: `src/services/group-chat/system-message-factory.ts`

**Responsibility**: Generate system messages (join/leave/error notifications)

**Methods**:
- `createJoinMessage()` - Character joined message
- `createLeaveMessage()` - Character left message
- `createErrorMessage()` - Error notification
- `createModeChangeMessage()` - Mode change notification

**Estimated Lines**: 120

---

### Service 4: Group Emotion Integration
**File**: `src/services/group-chat/group-emotion-integration.ts`

**Responsibility**: Emotion analysis for group context

**Methods**:
- `analyzeGroupEmotion()` - Analyze overall group mood
- `analyzeCharacterEmotion()` - Character-specific emotion
- `detectEmotionalShifts()` - Track emotional changes

**Estimated Lines**: 180

---

## Migration Phases

### Phase 1: Service Layer Extraction (Low Risk, 3 days)
**Goal**: Extract pure service logic first

**Tasks**:
1. Create `CharacterResponseService`
2. Create `ChatModeRouter` with 4 strategies
3. Create `SystemMessageFactory`
4. Create `GroupEmotionIntegration`
5. Unit tests for all services

**Validation**:
- All services independently testable
- `npx tsc --noEmit` = 0 errors

**Rollback**: Delete service files, keep original slice

---

### Phase 2: Configuration & Member Slices (Low Risk, 2 days)
**Goal**: Extract simple state management first

**Tasks**:
1. Create `group-chat-configuration.slice.ts`
2. Create `group-member-management.slice.ts`
3. Update orchestrator to compose slices
4. Update UI to use new selectors

**Validation**:
- Configuration changes work
- Character add/remove works
- All tests pass

---

### Phase 3: Session & Operations Slices (Medium Risk, 3 days)
**Goal**: Extract session and message operations

**Tasks**:
1. Create `group-session-lifecycle.slice.ts`
2. Create `group-message-operations.slice.ts`
3. Update orchestrator composition
4. Migration tests

**Validation**:
- Session CRUD works
- Message regenerate/continue/delete works
- No data loss

---

### Phase 4: Message Generation Refactor (High Risk, 5 days)
**Goal**: Break down 438-line sendGroupMessage()

**Tasks**:
1. Create `group-message-generation.slice.ts`
2. Integrate `ChatModeRouter` service
3. Comprehensive mode testing (all 4 modes)
4. Side-by-side comparison tests

**Validation**:
- **CRITICAL**: All 4 modes must work identically to old implementation
- Sequential mode: Messages in order
- Simultaneous mode: Parallel generation
- Random mode: Random selection
- Smart mode: Context-aware selection

**Risk**: Mode logic changes breaking UX
**Mitigation**: Feature flag per mode for gradual rollout

---

### Phase 5: Background Processing & Emotion (Medium Risk, 3 days)
**Goal**: Extract async processing logic

**Tasks**:
1. Create `group-background-processing.slice.ts`
2. Create `group-emotion-integration.slice.ts`
3. Race condition testing
4. Performance testing

**Validation**:
- Mem0 integration works
- Tracker updates work
- Emotion analysis works
- No race conditions
- No memory leaks

---

### Phase 6: Final Orchestrator & Cleanup (Low Risk, 2 days)
**Goal**: Complete composition and remove old code

**Tasks**:
1. Finalize `groupChat.slice.ts` orchestrator
2. Create barrel export `index.ts`
3. Update all external imports
4. Remove old implementation
5. Documentation updates

**Validation**:
- All group chat features work
- Performance equal or better
- No TypeScript errors

---

## Risk Assessment & Mitigation

### Risk 1: Chat Mode Logic Changes
**Severity**: 🔴 Critical
**Probability**: High
**Impact**: Group chat modes behave differently, user confusion

**Mitigation**:
- Side-by-side testing: old vs new implementation for each mode
- Record actual execution flow for comparison
- Feature flags per mode: `USE_NEW_SEQUENTIAL_MODE`, etc.
- Gradual rollout: Enable one mode at a time

---

### Risk 2: Race Conditions in Background Processing
**Severity**: 🔴 Critical
**Probability**: Medium
**Impact**: Memory/emotion/tracker updates conflict, data corruption

**Mitigation**:
- Task queue with sequential processing
- Explicit error handling per background task
- Retry mechanism with exponential backoff
- Integration tests with concurrent operations

---

### Risk 3: State Synchronization Across Slices
**Severity**: 🟡 High
**Probability**: Medium
**Impact**: Slices out of sync, inconsistent UI state

**Mitigation**:
- Zustand's built-in slice composition (handles sync)
- Shared state accessed via `get()` function
- Immutable updates (Map spread, array spread)
- State validation in development mode

---

### Risk 4: Breaking External Consumers
**Severity**: 🟡 High
**Probability**: Low
**Impact**: UI components break due to selector changes

**Mitigation**:
- Keep public API surface identical
- Use type aliases for backward compatibility
- Deprecation warnings before removal
- Comprehensive selector tests

---

## Testing Strategy

### Unit Tests (Per Slice)
```typescript
// group-message-generation.slice.test.ts
describe('GroupMessageGenerationSlice', () => {
  it('should handle message generation', async () => {
    const store = createTestStore();
    await store.sendGroupMessage(sessionId, 'Hello');

    expect(store.group_generating).toBe(false);
    expect(store.groupSessions.get(sessionId)?.messages.length).toBeGreaterThan(1);
  });

  it('should handle generation errors gracefully', async () => {
    mockAPIError();
    const store = createTestStore();

    await store.sendGroupMessage(sessionId, 'Hello');

    expect(store.generationErrors.size).toBeGreaterThan(0);
  });
});

// chat-mode-router.service.test.ts
describe('ChatModeRouter', () => {
  it('should execute sequential mode in order', async () => {
    const router = new ChatModeRouter();
    const executionOrder: string[] = [];

    await router.executeMode('sequential', {
      characterIds: ['char1', 'char2', 'char3'],
      onCharacterStart: (id) => executionOrder.push(id),
      // ... other callbacks
    });

    expect(executionOrder).toEqual(['char1', 'char2', 'char3']);
  });

  it('should execute simultaneous mode in parallel', async () => {
    const router = new ChatModeRouter();
    const startTimes: Record<string, number> = {};

    await router.executeMode('simultaneous', {
      characterIds: ['char1', 'char2'],
      onCharacterStart: (id) => { startTimes[id] = Date.now(); },
      // ... other callbacks
    });

    const timeDiff = Math.abs(startTimes.char1 - startTimes.char2);
    expect(timeDiff).toBeLessThan(100); // Started within 100ms
  });
});
```

### Integration Tests
```typescript
describe('GroupChat Integration', () => {
  it('should complete full group chat flow', async () => {
    const store = createTestStore();

    // Create session
    store.createGroupSession('Test Chat', ['char1', 'char2']);
    const sessionId = store.activeGroupSessionId!;

    // Send message
    await store.sendGroupMessage(sessionId, 'Hello everyone');

    // Verify
    const session = store.groupSessions.get(sessionId);
    expect(session?.messages.length).toBe(3); // User + 2 characters
    expect(session?.messages[0].content).toBe('Hello everyone');
    expect(session?.messages[1].characterId).toBe('char1');
    expect(session?.messages[2].characterId).toBe('char2');
  });

  it('should handle member changes mid-conversation', async () => {
    const store = createTestStore();
    const sessionId = store.activeGroupSessionId!;

    // Add character
    store.addCharacterToSession(sessionId, 'char3');

    // Send message
    await store.sendGroupMessage(sessionId, 'New member joined');

    // Verify char3 responded
    const session = store.groupSessions.get(sessionId);
    const char3Messages = session?.messages.filter(m => m.characterId === 'char3');
    expect(char3Messages?.length).toBeGreaterThan(0);
  });
});
```

### E2E Tests
```typescript
describe('GroupChat E2E', () => {
  it('should support all 4 chat modes', async () => {
    for (const mode of ['sequential', 'simultaneous', 'random', 'smart']) {
      const store = createTestStore();
      store.setChatMode(mode as ChatMode);
      store.createGroupSession(`${mode} Test`, ['char1', 'char2']);

      await store.sendGroupMessage(store.activeGroupSessionId!, 'Test message');

      const session = store.groupSessions.get(store.activeGroupSessionId!);
      expect(session?.messages.length).toBeGreaterThan(1);
    }
  });
});
```

---

## Rollback Plan

### Feature Flags
```typescript
// src/config/feature-flags.ts
export const GROUP_CHAT_FEATURE_FLAGS = {
  USE_MODULAR_SLICES: false,
  USE_NEW_SEQUENTIAL_MODE: false,
  USE_NEW_SIMULTANEOUS_MODE: false,
  USE_NEW_RANDOM_MODE: false,
  USE_NEW_SMART_MODE: false,
  USE_BACKGROUND_PROCESSING_QUEUE: false,
};

// Usage in store
const sendGroupMessage = GROUP_CHAT_FEATURE_FLAGS.USE_MODULAR_SLICES
  ? newGroupMessageGenerationSlice.sendGroupMessage
  : legacySendGroupMessage;
```

### Validation Gates
- Mode-by-mode comparison testing
- Performance benchmarks (should not regress)
- Memory leak detection
- Race condition detection

### Gradual Rollout
1. **Week 1**: Enable modular slices with all legacy mode logic
2. **Week 2**: Enable new sequential mode only
3. **Week 3**: Enable simultaneous mode
4. **Week 4**: Enable random mode
5. **Week 5**: Enable smart mode
6. **Week 6**: Remove legacy code if no issues

---

## Acceptance Criteria

### Functional Requirements
- [ ] All 33 original functions work identically
- [ ] All 4 chat modes work (sequential/simultaneous/random/smart)
- [ ] Session CRUD works (create/read/update/delete)
- [ ] Member management works (add/remove/reorder)
- [ ] Message operations work (send/regenerate/continue/delete)
- [ ] Background processing works (memory/tracker/emotion)
- [ ] Configuration changes persist

### Non-Functional Requirements
- [ ] Core orchestrator file ≤ 300 lines (target: 250)
- [ ] Largest slice ≤ 350 lines
- [ ] TypeScript errors = 0
- [ ] Test coverage ≥ 85% for new slices
- [ ] Build succeeds
- [ ] No performance regression
- [ ] No race conditions in background processing

### Code Quality
- [ ] All slices follow Single Responsibility Principle
- [ ] ChatModeRouter uses Strategy Pattern
- [ ] Background processing uses task queue
- [ ] All state updates are immutable
- [ ] No `any` types introduced

---

## Timeline Estimate

| Phase | Duration | Risk Level |
|-------|----------|------------|
| Phase 1: Services | 3 days | 🟢 Low |
| Phase 2: Config & Members | 2 days | 🟢 Low |
| Phase 3: Session & Ops | 3 days | 🟡 Medium |
| Phase 4: Message Generation | 5 days | 🔴 High |
| Phase 5: Background & Emotion | 3 days | 🟡 Medium |
| Phase 6: Orchestrator | 2 days | 🟢 Low |
| **Total** | **18 days** | |

**Effort**: 1 developer, full-time

---

## Success Metrics

### Maintainability
- **Before**: 438-line function, 4 tangled modes
- **After**: 4 clean strategies, each <100 lines

### Testing
- **Before**: Cannot test modes in isolation
- **After**: Each mode strategy independently testable

### Extensibility
- **Before**: Adding 5th mode requires editing monolith
- **After**: Implement `ChatModeStrategy`, add to router

### Performance
- **Before**: No background task queue, race conditions
- **After**: Controlled async processing, no conflicts

### Developer Experience
- **Before**: 1-2 devs max (merge conflicts)
- **After**: 7 devs can work in parallel (7 slices)

---

## Appendix: Current Function Distribution

| Function | Lines | Target Module |
|----------|-------|---------------|
| createGroupSession | 38 | group-session-lifecycle.slice.ts |
| deleteGroupSession | 42 | group-session-lifecycle.slice.ts |
| setActiveGroupSession | 12 | group-session-lifecycle.slice.ts |
| **sendGroupMessage** | **438** | **group-message-generation.slice.ts** |
| regenerateGroupMessage | 96 | group-message-operations.slice.ts |
| continueGroupMessage | 87 | group-message-operations.slice.ts |
| deleteGroupMessage | 34 | group-message-operations.slice.ts |
| addCharacterToSession | 52 | group-member-management.slice.ts |
| removeCharacterFromSession | 48 | group-member-management.slice.ts |
| reorderCharacters | 28 | group-member-management.slice.ts |
| setChatMode | 8 | group-chat-configuration.slice.ts |
| updateGroupChatSettings | 14 | group-chat-configuration.slice.ts |
| processMessageBackground | 68 | group-background-processing.slice.ts |
| updateMemoryCards | 42 | group-background-processing.slice.ts |
| analyzeGroupEmotion | 56 | group-emotion-integration.slice.ts |
| (18+ utility functions) | ~410 | Distributed across modules |

**Total**: 1,474 lines → 250 lines orchestrator + 1,220 lines in focused slices/services
