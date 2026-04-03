import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Character,
  ConversationContext,
  MemoryLayerInstance,
  Persona,
  UnifiedChatSession,
  UnifiedMessage,
} from "@/types";

const { mockStoreState, getStateMock, generateMessageMock } = vi.hoisted(() => ({
  mockStoreState: {
    systemPrompts: {},
    enableSystemPrompt: false,
    chatSystemPromptMode: "legacy",
    enableAnchorPrompt: false,
    enableJailbreakPrompt: false,
    trackerManagers: new Map<string, unknown>(),
    memory_cards: new Map<string, unknown>(),
    chat: {
      memory_limits: {
        max_memory_cards: 50,
        max_relevant_memories: 5,
        max_context_messages: 20,
      },
    },
  },
  getStateMock: vi.fn(),
  generateMessageMock: vi.fn(),
}));

vi.mock("@/store", () => ({
  useAppStore: {
    getState: getStateMock,
  },
}));

vi.mock("@/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/services/simple-api-manager-v2", () => ({
  simpleAPIManagerV2: {
    generateMessage: generateMessageMock,
  },
}));

vi.mock("@/services/character-info-builder", () => ({
  CharacterInfoBuilder: {
    build: vi.fn(() => "CHARACTER SECTION"),
  },
}));

vi.mock("@/services/mem0/character-service", () => ({
  Mem0Character: {
    buildCharacterContext: vi.fn(async () => ({
      core: {
        identity: {
          name: "Alice",
          age: "18",
          occupation: "Mage",
        },
        personality: {
          external: "gentle",
          internal: "curious",
          traits: [],
        },
        communication: {
          speaking_style: "soft",
          first_person: "I",
          second_person: "you",
          verbal_tics: [],
        },
        principles: [],
      },
      memories: {
        learned_preferences: {
          likes: [],
          dislikes: [],
        },
        context_knowledge: {
          special_topics: [],
        },
      },
      token_usage: {
        total: 0,
      },
    })),
  },
}));

vi.mock("@/services/mem0/core", () => ({
  Mem0: {
    search: vi.fn(async () => []),
    getCandidateHistory: vi.fn(() => []),
    ingestMessage: vi.fn(async () => undefined),
  },
}));

import { PromptBuilderService } from "../prompt-builder.service";
import { ConversationManager } from "../memory/conversation-manager";
import { ProgressivePromptBuilder } from "../progressive-prompt-builder.service";
import { createMessageRegenerationHandler } from "@/store/slices/chat/operations/message-regeneration-handler";
import { createMessageContinuationHandler } from "@/store/slices/chat/operations/message-continuation-handler";
import {
  DEFAULT_SYSTEM_PROMPT,
  MINIMAL_CHAT_SYSTEM_PROMPT,
} from "@/constants/prompts";

type PersonaSectionAccessor = {
  buildPersonaSection: (persona?: Persona) => string;
};

type ReflexHintAccessor = {
  buildReflexPersonaHint: (persona?: Persona) => string;
};

const NOW = "2026-03-30T00:00:00.000Z";

function createPersona(overrides: Partial<Persona> = {}): Persona {
  return {
    id: "persona-1",
    name: "Taro",
    role: "Student",
    other_settings: "Prefers concise answers.",
    created_at: NOW,
    updated_at: NOW,
    version: 1,
    ...overrides,
  };
}

function createCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: "char-1",
    created_at: NOW,
    updated_at: NOW,
    version: 1,
    name: "Alice",
    age: "18",
    occupation: "Mage",
    catchphrase: "",
    personality: "kind",
    external_personality: "gentle",
    internal_personality: "curious",
    strengths: [],
    weaknesses: [],
    hobbies: [],
    likes: [],
    dislikes: [],
    appearance: "blue hair",
    speaking_style: "soft",
    first_person: "I",
    second_person: "you",
    verbal_tics: [],
    background: "academy student",
    scenario: "chatting after class",
    system_prompt: "",
    first_message: "",
    tags: [],
    trackers: [],
    ...overrides,
  };
}

function createMessage(
  overrides: Partial<UnifiedMessage> = {}
): UnifiedMessage {
  return {
    id: "message-1",
    created_at: NOW,
    updated_at: NOW,
    version: 1,
    session_id: "session-1",
    role: "user",
    content: "Hello",
    memory: {
      importance: {
        score: 0.5,
        factors: {
          emotional_weight: 0.5,
          repetition_count: 0,
          user_emphasis: 0.5,
          ai_judgment: 0.5,
        },
      },
      is_pinned: false,
      is_bookmarked: false,
      keywords: [],
    },
    expression: {
      emotion: {
        primary: "neutral",
        intensity: 0.5,
      },
      style: {},
      effects: [],
    },
    edit_history: [],
    regeneration_count: 0,
    is_deleted: false,
    metadata: {},
    ...overrides,
  };
}

function createMemorySystem(): MemoryLayerInstance {
  return {
    immediate_memory: {
      messages: [],
      max_size: 3,
      retention_policy: "fifo",
      last_accessed: NOW,
      access_count: 0,
    },
    working_memory: {
      messages: [],
      max_size: 10,
      retention_policy: "fifo",
      last_accessed: NOW,
      access_count: 0,
    },
    episodic_memory: {
      messages: [],
      max_size: 50,
      retention_policy: "fifo",
      last_accessed: NOW,
      access_count: 0,
    },
    semantic_memory: {
      messages: [],
      max_size: 200,
      retention_policy: "fifo",
      last_accessed: NOW,
      access_count: 0,
    },
    permanent_memory: {
      pinned_messages: [],
      memory_cards: [],
      summaries: [],
    },
  };
}

function createContext(
  overrides: Partial<ConversationContext> = {}
): ConversationContext {
  return {
    session_id: "session-1",
    current_emotion: {
      primary: "neutral",
      intensity: 0.5,
    },
    current_topic: "",
    current_mood: {
      type: "neutral",
      intensity: 0.5,
      stability: 0.8,
    },
    recent_messages: [],
    recent_topics: [],
    recent_emotions: [],
    relevant_memories: [],
    pinned_memories: [],
    next_likely_topics: [],
    suggested_responses: [],
    context_quality: 0.8,
    coherence_score: 0.8,
    ...overrides,
  };
}

function createSession(options?: {
  persona?: Persona;
  character?: Character;
  messages?: UnifiedMessage[];
}): UnifiedChatSession {
  const persona = options?.persona ?? createPersona();
  const character = options?.character ?? createCharacter();
  const messages = options?.messages ?? [];

  return {
    id: "session-1",
    created_at: NOW,
    updated_at: NOW,
    version: 1,
    metadata: {
      mode: "single",
      ai_model: "test-model",
      temperature: 0.7,
      max_tokens: 2048,
      language: "ja",
      timezone: "Asia/Tokyo",
    },
    participants: {
      user: persona,
      characters: [character],
      active_character_ids: new Set([character.id]),
    },
    messages,
    message_count: messages.length,
    memory_system: createMemorySystem(),
    state_management: {
      trackers: new Map(),
      mood_state: {
        current: "neutral",
        intensity: 0.5,
      },
    },
    context: createContext({
      recent_messages: messages,
    }),
    session_info: {
      title: "Test Session",
      description: "",
      tags: [],
    },
    statistics: {
      message_count: messages.length,
      start_time: NOW,
      end_time: NOW,
      duration_seconds: 0,
      user_message_count: messages.filter((message) => message.role === "user")
        .length,
      assistant_message_count: messages.filter(
        (message) => message.role === "assistant"
      ).length,
      average_response_time_ms: 0,
    },
  };
}

function countOccurrences(text: string, fragment: string): number {
  return text.split(fragment).length - 1;
}

function expectCanonicalPersonaSection(prompt: string): void {
  expect(prompt).toContain("<persona_information>");
  expect(prompt).toContain("Name: Taro");
  expect(prompt).toContain("Role: Student");
  expect(prompt).toContain("Other Settings: Prefers concise answers.");
  expect(prompt).not.toContain("Additional Settings");
  expect(prompt).not.toContain("Details:");
  expect(prompt).not.toContain("\nSettings:");
}

type HandlerState = {
  active_session_id: string | null;
  sessions: Map<string, UnifiedChatSession>;
  is_generating: boolean;
  lastError?: unknown;
  apiConfig: {
    temperature: number;
  };
  openRouterApiKey?: string;
  geminiApiKey?: string;
  useDirectGeminiAPI?: boolean;
  chat?: {
    memory_limits?: {
      max_context_messages?: number;
    };
  };
  getTrackerManager?: (sessionId: string) => undefined;
};

function createHandlerHarness(session: UnifiedChatSession): {
  getState: () => HandlerState;
  regenerateLastMessage: (targetMessageId?: string) => Promise<void>;
  continueLastMessage: () => Promise<void>;
} {
  let state: HandlerState = {
    active_session_id: session.id,
    sessions: new Map([[session.id, session]]),
    is_generating: false,
    apiConfig: {
      temperature: 0.7,
    },
    openRouterApiKey: "test-openrouter-key",
    geminiApiKey: "",
    useDirectGeminiAPI: false,
    chat: {
      memory_limits: {
        max_context_messages: 20,
      },
    },
    getTrackerManager: () => undefined,
  };

  const setState = (
    update:
      | Partial<HandlerState>
      | ((current: HandlerState) => Partial<HandlerState> | HandlerState)
  ) => {
    const partial =
      typeof update === "function" ? update(state) : update;
    state = {
      ...state,
      ...partial,
    };
  };

  const getState = () => state;
  const api = {} as never;

  return {
    getState,
    ...createMessageRegenerationHandler(
      setState as never,
      getState as never,
      api
    ),
    ...createMessageContinuationHandler(
      setState as never,
      getState as never,
      api
    ),
  };
}

describe("persona prompt regression", () => {
  beforeEach(() => {
    Object.assign(mockStoreState, {
      systemPrompts: {},
      enableSystemPrompt: false,
      chatSystemPromptMode: "legacy",
      enableAnchorPrompt: false,
      enableJailbreakPrompt: false,
      trackerManagers: new Map<string, unknown>(),
      memory_cards: new Map<string, unknown>(),
      chat: {
        memory_limits: {
          max_memory_cards: 50,
          max_relevant_memories: 5,
          max_context_messages: 20,
        },
      },
    });

    getStateMock.mockImplementation(() => mockStoreState);
    vi.clearAllMocks();
  });

  describe.each([
    {
      label: "PromptBuilderService",
      createAccessor: () =>
        new PromptBuilderService() as unknown as PersonaSectionAccessor,
    },
    {
      label: "ConversationManager",
      createAccessor: () =>
        new ConversationManager([]) as unknown as PersonaSectionAccessor,
    },
    {
      label: "ProgressivePromptBuilder",
      createAccessor: () =>
        new ProgressivePromptBuilder() as unknown as PersonaSectionAccessor,
    },
  ])("$label canonical persona section", ({ createAccessor }) => {
    it("formats full persona with canonical labels only", () => {
      const accessor = createAccessor();
      const section = accessor.buildPersonaSection(createPersona());

      expect(section).toContain("Name: Taro");
      expect(section).toContain("Role: Student");
      expect(section).toContain(
        "Other Settings: Prefers concise answers."
      );
      expect(countOccurrences(section, "Name:")).toBe(1);
      expect(countOccurrences(section, "Role:")).toBe(1);
      expect(countOccurrences(section, "Other Settings:")).toBe(1);
      expect(section).not.toContain("Additional Settings");
      expect(section).not.toContain("Details:");
      expect(section).not.toContain("\nSettings:");
    });

    it.each([
      {
        label: "name only",
        persona: createPersona({
          role: "",
          other_settings: "",
        }),
        expected: "Name: Taro",
        missing: ["Role:", "Other Settings:"],
      },
      {
        label: "role only",
        persona: createPersona({
          name: "",
          other_settings: "",
        }),
        expected: "Role: Student",
        missing: ["Name:", "Other Settings:"],
      },
      {
        label: "other_settings only",
        persona: createPersona({
          name: "",
          role: "",
        }),
        expected: "Other Settings: Prefers concise answers.",
        missing: ["Name:", "Role:"],
      },
    ])("supports partial persona: $label", ({ persona, expected, missing }) => {
      const accessor = createAccessor();
      const section = accessor.buildPersonaSection(persona);

      expect(section).toContain(expected);
      missing.forEach((fragment) => {
        expect(section).not.toContain(fragment);
      });
    });

    it("returns empty string for missing persona", () => {
      const accessor = createAccessor();

      expect(accessor.buildPersonaSection(undefined)).toBe("");
    });

    it("drops whitespace-only fields", () => {
      const accessor = createAccessor();
      const section = accessor.buildPersonaSection(
        createPersona({
          name: "   ",
          role: "\n\t",
          other_settings: "  ",
        })
      );

      expect(section).toBe("");
    });

    it("does not truncate long other_settings", () => {
      const accessor = createAccessor();
      const longOtherSettings = "very long profile ".repeat(40).trim();
      const section = accessor.buildPersonaSection(
        createPersona({
          other_settings: longOtherSettings,
        })
      );

      expect(section).toContain(longOtherSettings);
      expect(section).not.toContain("...");
    });
  });

  it("PromptBuilderService uses buildPromptProgressive as the minimal canonical fixture", async () => {
    const service = new PromptBuilderService();
    const session = createSession({
      persona: createPersona(),
    });

    const { basePrompt } = await service.buildPromptProgressive(
      session,
      "Hello there"
    );

    expect(basePrompt).toContain("<persona_information>");
    expect(basePrompt).toContain("Name: Taro");
    expect(basePrompt).toContain("Role: Student");
    expect(basePrompt).toContain(
      "Other Settings: Prefers concise answers."
    );
    expect(countOccurrences(basePrompt, "Other Settings:")).toBe(1);
    expect(basePrompt).not.toContain("Additional Settings");
    expect(basePrompt).not.toContain("Details:");
    expect(basePrompt).not.toContain("\nSettings:");
  });

  it("PromptBuilderService uses legacy fallback when custom system prompt is disabled", async () => {
    const service = new PromptBuilderService();
    const session = createSession({
      persona: createPersona(),
    });

    mockStoreState.enableSystemPrompt = false;
    mockStoreState.chatSystemPromptMode = "legacy";
    mockStoreState.systemPrompts = {};

    const { systemInstruction } = await service.buildPrompt(
      session,
      "Hello there"
    );

    expect(systemInstruction).toContain("# システム指示");
    expect(systemInstruction).toContain("Aliceとして、真実味があり");
  });

  it("PromptBuilderService uses minimal fallback when chatSystemPromptMode is minimal", async () => {
    const service = new PromptBuilderService();
    const session = createSession({
      persona: createPersona(),
    });

    mockStoreState.enableSystemPrompt = false;
    mockStoreState.chatSystemPromptMode = "minimal";
    mockStoreState.systemPrompts = {};

    const { systemInstruction } = await service.buildPrompt(
      session,
      "Hello there"
    );

    expect(systemInstruction).toContain("自然な日本語で、Aliceとしてのみ応答してください。");
    expect(systemInstruction).toContain("必要なときは自分の意思で無理なく先へ進めてください。");
    expect(systemInstruction).toContain("1つの自然な返答としてまとめてください。");
    expect(systemInstruction).not.toContain("# システム指示");
  });

  it("PromptBuilderService prefers custom system prompt over mode selection", async () => {
    const service = new PromptBuilderService();
    const session = createSession({
      persona: createPersona(),
    });

    mockStoreState.enableSystemPrompt = true;
    mockStoreState.chatSystemPromptMode = "minimal";
    mockStoreState.systemPrompts = {
      system: "CUSTOM SYSTEM PROMPT",
    };

    const { systemInstruction } = await service.buildPrompt(
      session,
      "Hello there"
    );

    expect(systemInstruction).toContain("CUSTOM SYSTEM PROMPT");
    expect(systemInstruction).not.toContain(MINIMAL_CHAT_SYSTEM_PROMPT);
    expect(systemInstruction).not.toContain(DEFAULT_SYSTEM_PROMPT);
  });

  it("PromptBuilderService omits persona section when all persona fields are blank", async () => {
    const service = new PromptBuilderService();
    const session = createSession({
      persona: createPersona({
        name: " ",
        role: "\t",
        other_settings: "\n",
      }),
    });

    const { basePrompt } = await service.buildPromptProgressive(
      session,
      "Hello there"
    );

    expect(basePrompt).not.toContain("<persona_information>");
  });

  it("ConversationManager omits persona section when persona is not provided", async () => {
    const manager = new ConversationManager([]);
    const prompt = await manager.generatePrompt(
      "Hello there",
      createCharacter(),
      undefined,
      {
        systemPrompts: {},
        enableSystemPrompt: false,
        enableAnchorPrompt: false,
      }
    );

    expect(prompt).not.toContain("<persona_information>");
  });

  it("ProgressivePromptBuilder Stage 2 and Stage 3 keep canonical persona labels only", async () => {
    const builder = new ProgressivePromptBuilder();
    const session = createSession({
      persona: createPersona({
        other_settings: "Detailed profile " + "x".repeat(240),
      }),
      messages: [
        createMessage({
          id: "message-user",
          role: "user",
          content: "Need advice",
        }),
        createMessage({
          id: "message-assistant",
          role: "assistant",
          content: "Sure",
        }),
      ],
    });

    const contextPrompt = await builder.buildContextPrompt(
      "Need advice",
      session,
      []
    );
    const intelligencePrompt = await builder.buildIntelligencePrompt(
      "Need advice",
      session,
      []
    );

    [contextPrompt.prompt, intelligencePrompt.prompt].forEach((prompt) => {
      expect(prompt).toContain("<persona_information>");
      expect(prompt).toContain("Name: Taro");
      expect(prompt).toContain("Role: Student");
      expect(prompt).toContain("Other Settings: Detailed profile");
      expect(prompt).not.toContain("Additional Settings");
      expect(prompt).not.toContain("Details:");
      expect(prompt).not.toContain("\nSettings:");
      expect(countOccurrences(prompt, "Other Settings:")).toBe(1);
      expect(prompt).toContain("x".repeat(240));
    });
  });

  it("ProgressivePromptBuilder Stage 1 injects User Role only", () => {
    const builder = new ProgressivePromptBuilder();
    const reflexPrompt = builder.buildReflexPrompt(
      "Hello there",
      createCharacter(),
      createPersona({
        other_settings: "Should not appear in Stage 1",
      })
    );

    expect(reflexPrompt.prompt).toContain("User Role: Student");
    expect(reflexPrompt.prompt).not.toContain("<persona_information>");
    expect(reflexPrompt.prompt).not.toContain("Other Settings:");
    expect(reflexPrompt.prompt).not.toContain("Name: Taro");
  });

  it("ProgressivePromptBuilder Stage 1 omits User Role when role is absent", () => {
    const builder = new ProgressivePromptBuilder();
    const reflexPrompt = builder.buildReflexPrompt(
      "Hello there",
      createCharacter(),
      createPersona({
        role: " ",
      })
    );

    expect(reflexPrompt.prompt).not.toContain("User Role:");
  });

  it("ProgressivePromptBuilder reflex hint helper returns role-only line", () => {
    const accessor =
      new ProgressivePromptBuilder() as unknown as ReflexHintAccessor;

    expect(accessor.buildReflexPersonaHint(createPersona())).toBe(
      "User Role: Student"
    );
    expect(
      accessor.buildReflexPersonaHint(
        createPersona({
          role: " ",
        })
      )
    ).toBe("");
  });

  describe("PromptBuilderService.buildPrompt operational handlers", () => {
    beforeEach(() => {
      generateMessageMock.mockResolvedValue("Mocked AI response");
    });

    it("regenerateLastMessage passes canonical persona section in system prompt", async () => {
      const session = createSession({
        persona: createPersona(),
        messages: [
          createMessage({
            id: "message-user",
            role: "user",
            content: "How are you?",
          }),
          createMessage({
            id: "message-ai",
            role: "assistant",
            content: "I am fine.",
            character_id: "char-1",
            character_name: "Alice",
          }),
        ],
      });
      const handlers = createHandlerHarness(session);

      await handlers.regenerateLastMessage("message-ai");

      expect(generateMessageMock).toHaveBeenCalledTimes(1);
      const systemPrompt = generateMessageMock.mock.calls[0]?.[0];
      expect(typeof systemPrompt).toBe("string");
      expectCanonicalPersonaSection(systemPrompt as string);
    });

    it("continueLastMessage passes canonical persona section in system prompt", async () => {
      const session = createSession({
        persona: createPersona(),
        messages: [
          createMessage({
            id: "message-user",
            role: "user",
            content: "Tell me more.",
          }),
          createMessage({
            id: "message-ai",
            role: "assistant",
            content: "There is more to say.",
            character_id: "char-1",
            character_name: "Alice",
          }),
        ],
      });
      const handlers = createHandlerHarness(session);

      await handlers.continueLastMessage();

      expect(generateMessageMock).toHaveBeenCalledTimes(1);
      const systemPrompt = generateMessageMock.mock.calls[0]?.[0];
      expect(typeof systemPrompt).toBe("string");
      expectCanonicalPersonaSection(systemPrompt as string);
    });
  });
});
