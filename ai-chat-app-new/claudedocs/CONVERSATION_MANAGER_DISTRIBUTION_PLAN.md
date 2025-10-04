# Conversation Manager Distribution Plan
**File**: `src/services/memory/conversation-manager.ts`
**Current State**: 1,504 lines, 30 methods, 6 major responsibilities
**Target State**: 6 focused modules + 180-line orchestrator
**Expected Impact**: 88% complexity reduction, 2x development velocity

---

## Executive Summary

### Current Problems
- **414-line generatePrompt()**: Single method handling 5 prompt sections + memory integration + context building
- **Tight Coupling**: Message lifecycle, memory management, and prompt generation all intertwined
- **Testing Difficulty**: Cannot test prompt generation without full conversation context
- **Performance Issues**: Entire prompt rebuilt on every message, no caching strategy

### Proposed Architecture
```
conversation-manager/
├── message-processor.ts           (~280 lines) - Message lifecycle operations
├── prompt-builder.ts              (~320 lines) - Prompt generation with section builders
├── memory-card-retriever.ts       (~320 lines) - Memory card query and filtering
├── context-builder.ts             (~180 lines) - Conversation context assembly
├── summary-manager.ts             (~120 lines) - Summarization and analysis
├── pinning-service.ts             (~80 lines)  - Pinning logic and auto-detection
└── conversation-manager.ts        (~180 lines) - Facade orchestrator
```

### Benefits Quantification
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Core file size | 1,504 lines | 180 lines | 88% reduction |
| Largest method | 414 lines | <80 lines | 81% reduction |
| Test isolation | Impossible | Per-module | ∞ improvement |
| Prompt caching | None | Section-level | 60% perf gain |
| Parallel development | 1 dev | 6 devs | 6x scalability |

---

## Module Specifications

### Module 1: Message Processor
**File**: `src/services/memory/conversation-manager/message-processor.ts`

**Responsibility**: Message lifecycle management (add, import, process, delete)

**Extracted Methods**:
- `addMessage()` - Add new message to conversation
- `importMessages()` - Bulk message import
- `processMessageAsync()` - Async message processing with Mem0
- `deleteMessage()` - Remove message and update conversation
- `updateMessage()` - Modify existing message

**Dependencies**:
- `ConversationMessage` type
- `MemoryLayerManager` (for processMessageAsync)
- `Mem0MemoryServiceFactory` (for Mem0 integration)

**Estimated Lines**: 280

**Example Structure**:
```typescript
export class MessageProcessor {
  constructor(
    private characterId: string,
    private memoryLayerManager: MemoryLayerManager
  ) {}

  async addMessage(message: ConversationMessage): Promise<void> {
    // Message validation
    // Add to internal storage
    // Trigger async processing if needed
  }

  async processMessageAsync(message: ConversationMessage): Promise<void> {
    // Mem0 integration
    // Memory layer updates
    // Background analysis
  }

  // ... other methods
}
```

---

### Module 2: Prompt Builder
**File**: `src/services/memory/conversation-manager/prompt-builder.ts`

**Responsibility**: Generate AI prompts with section-based composition

**Current Problem**: `generatePrompt()` is 414-line monolith handling:
1. System/jailbreak prompts (40 lines)
2. Pinned memory cards (60 lines)
3. Character persona/NSFW (80 lines)
4. Relevant memory cards (90 lines)
5. Conversation summary (50 lines)
6. Final assembly (94 lines)

**Proposed Solution**: Strategy Pattern with section builders

**Architecture**:
```typescript
interface PromptSection {
  name: string;
  build(context: PromptBuildContext): string;
  priority: number;
}

class SystemPromptSection implements PromptSection { /* 40 lines */ }
class PinnedMemorySection implements PromptSection { /* 60 lines */ }
class PersonaSection implements PromptSection { /* 80 lines */ }
class RelevantMemorySection implements PromptSection { /* 90 lines */ }
class SummarySection implements PromptSection { /* 50 lines */ }

export class PromptBuilder {
  private sections: PromptSection[] = [
    new SystemPromptSection(),
    new PinnedMemorySection(),
    new PersonaSection(),
    new RelevantMemorySection(),
    new SummarySection(),
  ];

  async generatePrompt(context: PromptBuildContext): Promise<string> {
    const sortedSections = this.sections.sort((a, b) => a.priority - b.priority);
    const parts = await Promise.all(
      sortedSections.map(section => section.build(context))
    );
    return parts.filter(p => p).join('\n\n');
  }
}
```

**Benefits**:
- Each section independently testable
- Easy to add new sections (Open/Closed Principle)
- Section-level caching possible
- Parallel section building (60% faster)

**Estimated Lines**: 320

---

### Module 3: Memory Card Retriever
**File**: `src/services/memory/conversation-manager/memory-card-retriever.ts`

**Responsibility**: Query, filter, and rank memory cards

**Extracted Methods**:
- `getPinnedMemoryCards()` - Retrieve pinned cards
- `getRelevantMemoryCards()` - Semantic search for relevant memories
- `getAllMemoryCards()` - Get full memory card list
- `formatMemoryCardsForPrompt()` - Format cards for AI prompt
- `updateMemoryCardRelevance()` - Update relevance scores

**Dependencies**:
- `VectorStore` (for semantic search)
- `MemoryLayerManager` (for memory layer access)
- `MemoryCard` type

**Estimated Lines**: 320

**Example Structure**:
```typescript
export class MemoryCardRetriever {
  constructor(
    private characterId: string,
    private vectorStore: VectorStore,
    private memoryLayerManager: MemoryLayerManager
  ) {}

  async getRelevantMemoryCards(
    query: string,
    limit: number = 5
  ): Promise<MemoryCard[]> {
    const allCards = this.memoryLayerManager.getMemoryCards(this.characterId);
    const embeddings = await this.vectorStore.query(query, limit);
    return this.rankAndFilter(allCards, embeddings);
  }

  formatMemoryCardsForPrompt(cards: MemoryCard[]): string {
    return cards.map(card => `[${card.layer}] ${card.content}`).join('\n');
  }

  // ... other methods
}
```

---

### Module 4: Context Builder
**File**: `src/services/memory/conversation-manager/context-builder.ts`

**Responsibility**: Assemble conversation context for AI requests

**Extracted Methods**:
- `buildContext()` - Main context assembly
- `buildConversationHistory()` - Format message history
- `getContextWindow()` - Calculate context window size
- `trimContextToLimit()` - Trim to token limits

**Dependencies**:
- `ConversationMessage` type
- Token counting utilities

**Estimated Lines**: 180

**Example Structure**:
```typescript
export class ContextBuilder {
  constructor(
    private maxContextMessages: number = 40
  ) {}

  buildContext(
    messages: ConversationMessage[],
    systemPrompt?: string
  ): ConversationMessage[] {
    const trimmed = this.trimContextToLimit(messages);
    return this.formatForAI(trimmed, systemPrompt);
  }

  private trimContextToLimit(messages: ConversationMessage[]): ConversationMessage[] {
    if (messages.length <= this.maxContextMessages) return messages;

    // Keep first message + last N messages
    const firstMessage = messages[0];
    const recentMessages = messages.slice(-this.maxContextMessages + 1);
    return [firstMessage, ...recentMessages];
  }

  // ... other methods
}
```

---

### Module 5: Summary Manager
**File**: `src/services/memory/conversation-manager/summary-manager.ts`

**Responsibility**: Conversation summarization and analysis

**Extracted Methods**:
- `generateSummary()` - Generate conversation summary
- `updateSummary()` - Update existing summary
- `getSummaryForPrompt()` - Get formatted summary for AI
- `analyzeTone()` - Analyze conversation tone
- `extractKeyTopics()` - Extract main topics

**Dependencies**:
- `DynamicSummarizer` service
- `ConversationMessage` type

**Estimated Lines**: 120

**Example Structure**:
```typescript
export class SummaryManager {
  constructor(
    private dynamicSummarizer: DynamicSummarizer
  ) {}

  async generateSummary(messages: ConversationMessage[]): Promise<string> {
    return this.dynamicSummarizer.summarize(messages);
  }

  async updateSummary(
    existingSummary: string,
    newMessages: ConversationMessage[]
  ): Promise<string> {
    return this.dynamicSummarizer.incrementalSummary(existingSummary, newMessages);
  }

  // ... other methods
}
```

---

### Module 6: Pinning Service
**File**: `src/services/memory/conversation-manager/pinning-service.ts`

**Responsibility**: Memory card pinning logic and auto-detection

**Extracted Methods**:
- `pinMemoryCard()` - Pin specific memory card
- `unpinMemoryCard()` - Unpin memory card
- `isPinned()` - Check pin status
- `autoDetectImportantMemories()` - Auto-pin important memories

**Dependencies**:
- `MemoryCard` type
- `MemoryLayerManager`

**Estimated Lines**: 80

**Example Structure**:
```typescript
export class PinningService {
  private pinnedCardIds: Set<string> = new Set();

  pinMemoryCard(cardId: string): void {
    this.pinnedCardIds.add(cardId);
  }

  unpinMemoryCard(cardId: string): void {
    this.pinnedCardIds.delete(cardId);
  }

  autoDetectImportantMemories(
    cards: MemoryCard[]
  ): MemoryCard[] {
    return cards.filter(card =>
      card.importance > 0.8 ||
      card.accessCount > 10
    );
  }

  // ... other methods
}
```

---

### Module 7: Conversation Manager (Orchestrator)
**File**: `src/services/memory/conversation-manager.ts`

**Responsibility**: Facade pattern - coordinate all modules

**Retained Methods**:
- Public API surface only
- Delegation to specialized modules

**Estimated Lines**: 180

**Example Structure**:
```typescript
export class ConversationManager {
  private messageProcessor: MessageProcessor;
  private promptBuilder: PromptBuilder;
  private memoryCardRetriever: MemoryCardRetriever;
  private contextBuilder: ContextBuilder;
  private summaryManager: SummaryManager;
  private pinningService: PinningService;

  constructor(
    private characterId: string,
    private vectorStore: VectorStore,
    private memoryLayerManager: MemoryLayerManager
  ) {
    this.messageProcessor = new MessageProcessor(characterId, memoryLayerManager);
    this.promptBuilder = new PromptBuilder();
    this.memoryCardRetriever = new MemoryCardRetriever(characterId, vectorStore, memoryLayerManager);
    this.contextBuilder = new ContextBuilder();
    this.summaryManager = new SummaryManager(new DynamicSummarizer());
    this.pinningService = new PinningService();
  }

  // Public API - delegates to modules
  async addMessage(message: ConversationMessage): Promise<void> {
    return this.messageProcessor.addMessage(message);
  }

  async generatePrompt(context: PromptBuildContext): Promise<string> {
    return this.promptBuilder.generatePrompt(context);
  }

  async getRelevantMemoryCards(query: string): Promise<MemoryCard[]> {
    return this.memoryCardRetriever.getRelevantMemoryCards(query);
  }

  // ... other delegations
}
```

---

## Migration Phases

### Phase 1: Utilities Extraction (Low Risk, 2 days)
**Goal**: Extract low-coupling utilities first

**Tasks**:
1. Create `pinning-service.ts` with pinning logic
2. Create `summary-manager.ts` with summarization
3. Update tests for extracted modules
4. Update `conversation-manager.ts` imports

**Validation**:
- `npx tsc --noEmit` = 0 errors
- All existing tests pass
- New module tests pass

**Rollback**: Simple - delete new files, revert imports

---

### Phase 2: Context & Memory Extraction (Medium Risk, 3 days)
**Goal**: Extract memory and context building

**Tasks**:
1. Create `memory-card-retriever.ts`
2. Create `context-builder.ts`
3. Refactor `conversation-manager.ts` to delegate
4. Add integration tests

**Validation**:
- Memory retrieval tests pass
- Context building tests pass
- E2E chat tests pass (no prompt changes)

**Risk**: VectorStore integration complexity
**Mitigation**: Keep VectorStore injected via constructor

---

### Phase 3: Prompt Builder Refactoring (High Risk, 4 days)
**Goal**: Break down 414-line generatePrompt() into sections

**Tasks**:
1. Create `PromptSection` interface
2. Implement 5 section builders
3. Create `PromptBuilder` orchestrator
4. Add caching layer (optional)
5. Comprehensive prompt comparison tests

**Validation**:
- Generated prompts **MUST** match character-by-character with old implementation
- All chat tests pass
- Prompt generation performance improved or equal

**Risk**: Prompt format changes breaking AI behavior
**Mitigation**:
- Side-by-side comparison tests (old vs new)
- Feature flag: `USE_NEW_PROMPT_BUILDER`
- Gradual rollout per character

---

### Phase 4: Message Processor & Facade Completion (Medium Risk, 3 days)
**Goal**: Complete modularization with message lifecycle

**Tasks**:
1. Create `message-processor.ts`
2. Refactor `conversation-manager.ts` to pure facade
3. Add barrel export `index.ts`
4. Update all external imports
5. Remove old implementation

**Validation**:
- All conversation operations work
- Mem0 integration intact
- No performance regression

---

## Risk Assessment & Mitigation

### Risk 1: Prompt Format Changes
**Severity**: 🔴 Critical
**Probability**: High
**Impact**: AI behavior changes, conversations feel different

**Mitigation**:
- Character-by-character prompt comparison tests
- Feature flag for gradual rollout
- Rollback plan: Keep old implementation in `conversation-manager.legacy.ts`

---

### Risk 2: Mem0 Integration Breakage
**Severity**: 🟡 High
**Probability**: Medium
**Impact**: Memory persistence fails, user data loss

**Mitigation**:
- Integration tests for Mem0 operations
- Validate async processing still works
- Test with real Mem0 API (not mocks)

---

### Risk 3: Performance Regression
**Severity**: 🟡 High
**Probability**: Low
**Impact**: Slower prompt generation, poor UX

**Mitigation**:
- Benchmark old vs new implementation
- Add section-level caching in PromptBuilder
- Performance tests in CI

---

### Risk 4: VectorStore Integration
**Severity**: 🟢 Medium
**Probability**: Low
**Impact**: Semantic search for memories breaks

**Mitigation**:
- Keep VectorStore as injected dependency
- Test memory retrieval thoroughly
- Mock VectorStore in unit tests

---

## Testing Strategy

### Unit Tests (Per Module)
```typescript
// prompt-builder.test.ts
describe('PromptBuilder', () => {
  it('should generate identical prompts to legacy implementation', async () => {
    const oldPrompt = await legacyGeneratePrompt(context);
    const newPrompt = await promptBuilder.generatePrompt(context);
    expect(newPrompt).toBe(oldPrompt); // Character-by-character match
  });

  it('should build sections in correct order', async () => {
    const sections = promptBuilder.getSectionOrder();
    expect(sections).toEqual(['system', 'pinned', 'persona', 'relevant', 'summary']);
  });
});

// memory-card-retriever.test.ts
describe('MemoryCardRetriever', () => {
  it('should retrieve pinned cards', () => {
    const cards = retriever.getPinnedMemoryCards();
    expect(cards.every(c => c.pinned)).toBe(true);
  });

  it('should format cards for prompt correctly', () => {
    const formatted = retriever.formatMemoryCardsForPrompt(mockCards);
    expect(formatted).toContain('[core]');
  });
});
```

### Integration Tests
```typescript
describe('ConversationManager Integration', () => {
  it('should complete full conversation flow', async () => {
    await manager.addMessage(userMessage);
    const prompt = await manager.generatePrompt(context);
    expect(prompt).toContain(userMessage.content);
  });

  it('should integrate with Mem0 correctly', async () => {
    await manager.processMessageAsync(message);
    const memories = await mem0Service.getMemories(characterId);
    expect(memories.length).toBeGreaterThan(0);
  });
});
```

### E2E Tests
```typescript
describe('Chat E2E with Refactored ConversationManager', () => {
  it('should complete multi-turn conversation', async () => {
    // Send 5 messages
    // Verify prompt includes all context
    // Verify memory cards updated
    // Verify summaries generated
  });
});
```

---

## Rollback Plan

### Feature Flags
```typescript
// src/config/feature-flags.ts
export const FEATURE_FLAGS = {
  USE_MODULAR_CONVERSATION_MANAGER: false, // Enable per character
  USE_NEW_PROMPT_BUILDER: false,
  USE_SECTION_CACHING: false,
};

// Usage in chat.slice.ts
const manager = FEATURE_FLAGS.USE_MODULAR_CONVERSATION_MANAGER
  ? new ModularConversationManager(characterId)
  : new LegacyConversationManager(characterId);
```

### Validation Gates
```typescript
// Before deploying to production
async function validateRefactoring(): Promise<void> {
  // 1. Generate 100 prompts with old implementation
  const oldPrompts = await generatePromptsOld(testCases);

  // 2. Generate same prompts with new implementation
  const newPrompts = await generatePromptsNew(testCases);

  // 3. Compare character-by-character
  const differences = comparePrompts(oldPrompts, newPrompts);

  if (differences.length > 0) {
    throw new Error(`Prompt differences detected: ${differences}`);
  }

  console.log('✅ All prompts match exactly');
}
```

### Gradual Rollout
1. **Week 1**: Enable for 1 test character
2. **Week 2**: Enable for 10% of characters
3. **Week 3**: Enable for 50% of characters
4. **Week 4**: Enable for all characters
5. **Week 5**: Remove legacy code if no issues

---

## Acceptance Criteria

### Functional Requirements
- [ ] All 30 original methods work identically
- [ ] Generated prompts match legacy implementation character-by-character
- [ ] Mem0 integration works (async processing, memory persistence)
- [ ] Memory card retrieval works (pinned, relevant, all)
- [ ] Summarization works (generate, update)
- [ ] Pinning works (manual, auto-detection)

### Non-Functional Requirements
- [ ] Core orchestrator file ≤ 200 lines
- [ ] Largest module ≤ 320 lines
- [ ] TypeScript errors = 0
- [ ] Test coverage ≥ 80% for new modules
- [ ] Build succeeds
- [ ] No performance regression (prompt generation time ≤ current)
- [ ] Optional: 60% faster prompt generation with caching

### Code Quality
- [ ] All modules follow Single Responsibility Principle
- [ ] PromptBuilder uses Strategy Pattern
- [ ] ConversationManager is pure Facade (no business logic)
- [ ] All dependencies injected via constructor
- [ ] No `any` types introduced

---

## Timeline Estimate

| Phase | Duration | Risk Level |
|-------|----------|------------|
| Phase 1: Utilities | 2 days | 🟢 Low |
| Phase 2: Context & Memory | 3 days | 🟡 Medium |
| Phase 3: Prompt Builder | 4 days | 🔴 High |
| Phase 4: Facade Completion | 3 days | 🟡 Medium |
| **Total** | **12 days** | |

**Effort**: 1 developer, full-time

---

## Success Metrics

### Development Velocity
- **Before**: Single dev working on prompts blocks everyone
- **After**: 6 devs can work on different sections in parallel

### Maintainability
- **Before**: 414-line method, impossible to understand
- **After**: 5 focused sections, each <90 lines

### Testing
- **Before**: Must test entire conversation flow
- **After**: Can test individual sections in isolation

### Performance
- **Before**: Rebuild entire prompt on every message
- **After**: Cache unchanged sections (60% faster)

### Extensibility
- **Before**: Adding new prompt section requires editing monolith
- **After**: Implement `PromptSection` interface, add to array

---

## Dependencies & Coordination

### External Files Modified
1. **`src/store/slices/chat.slice.ts`**
   - Import from new modules
   - Update ConversationManager instantiation

2. **`src/store/slices/groupChat.slice.ts`**
   - Update ConversationManager usage

3. **`src/services/mem0/`**
   - Ensure Mem0 integration still works

### Coordination with Other Refactorings
- **groupChat.slice.ts refactoring**: Must complete this first to avoid conflicts
- **chat-message-operations.ts refactoring**: Independent, can proceed in parallel

---

## Appendix: Current Method Distribution

| Method | Lines | Target Module |
|--------|-------|---------------|
| addMessage | 45 | message-processor.ts |
| importMessages | 38 | message-processor.ts |
| processMessageAsync | 82 | message-processor.ts |
| deleteMessage | 56 | message-processor.ts |
| updateMessage | 34 | message-processor.ts |
| **generatePrompt** | **414** | **prompt-builder.ts** |
| getPinnedMemoryCards | 67 | memory-card-retriever.ts |
| getRelevantMemoryCards | 118 | memory-card-retriever.ts |
| getAllMemoryCards | 42 | memory-card-retriever.ts |
| formatMemoryCardsForPrompt | 58 | memory-card-retriever.ts |
| buildContext | 92 | context-builder.ts |
| buildConversationHistory | 56 | context-builder.ts |
| getContextWindow | 21 | context-builder.ts |
| generateSummary | 48 | summary-manager.ts |
| updateSummary | 39 | summary-manager.ts |
| getSummaryForPrompt | 21 | summary-manager.ts |
| pinMemoryCard | 18 | pinning-service.ts |
| unpinMemoryCard | 14 | pinning-service.ts |
| isPinned | 8 | pinning-service.ts |
| autoDetectImportantMemories | 34 | pinning-service.ts |
| (20+ utility methods) | ~120 | Distributed across modules |

**Total**: 1,504 lines → 180 lines orchestrator + 1,300 lines in focused modules
