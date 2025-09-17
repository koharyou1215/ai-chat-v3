import { StateCreator } from "zustand";
import { Persona, UUID, UnifiedMessage } from "@/types";
import { AppStore } from "..";

export interface PersonaSlice {
  personas: Map<UUID, Persona>;
  activePersonaId: UUID | null;
  showPersonaGallery: boolean;
  isPersonasLoaded: boolean;
  addPersona: (persona: Persona) => void;
  updatePersona: (persona: Persona) => void;
  activatePersona: (personaId: UUID) => void;
  getActivePersona: () => Persona | null;
  setShowPersonaGallery: (show: boolean) => void;
  loadPersonasFromPublic: () => Promise<void>;
}

export const createPersonaSlice: StateCreator<
  AppStore,
  [],
  [],
  PersonaSlice
> = (set, get) => ({
  personas: new Map(),
  activePersonaId: null,
  showPersonaGallery: false,
  isPersonasLoaded: false,
  addPersona: (persona) => {
    set((state) => ({
      personas: new Map(state.personas).set(persona.id, persona),
    }));
  },
  updatePersona: (persona) => {
    set((state) => {
      const newPersonas = new Map(state.personas);
      newPersonas.set(persona.id, {
        ...persona,
        updated_at: new Date().toISOString(),
      });
      return { personas: newPersonas };
    });
  },
  activatePersona: (personaId) => {
    const personas = get().personas;
    // Only activate if the persona exists in the personas map
    if (personas.has(personaId)) {
      set({ activePersonaId: personaId });

      // Update active session with new persona and inject a system message
      const activeSessionId = get().active_session_id;
      const updateSession = get().updateSession;
      const addSystemMessage = (sessionId: UUID, content: string) => {
        // Lightweight helper to append a system message to a session
        try {
          const session = get().sessions.get(sessionId);
          if (!session) return;

          const systemMsg: unknown = {
            id: `system-${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            version: 1,
            session_id: sessionId,
            role: "system",
            content,
            memory: {
              importance: { score: 0.1, factors: {} },
              is_pinned: false,
              is_bookmarked: false,
              keywords: [],
            },
            expression: {
              emotion: { primary: "neutral", intensity: 0 },
              style: { font_weight: "normal", text_color: "#ffffff" },
              effects: [],
            },
            edit_history: [],
            regeneration_count: 0,
            metadata: { info: "persona-sync" },
            // Include required optional fields to satisfy type
            is_deleted: false,
          } as unknown as UnifiedMessage;

          const newMessages = [
            ...session.messages,
            systemMsg as UnifiedMessage,
          ];
          const newMessageCount =
            (session.message_count || session.messages.length) + 1;

          // Only provide the fields we intend to update to avoid duplicate 'id' properties
          updateSession({
            id: sessionId,
            messages: newMessages,
            message_count: newMessageCount,
            updated_at: new Date().toISOString(),
          });
        } catch (e) {
          // Best-effort: don't throw
          console.error(
            "[PersonaSlice] Failed to append system message for persona switch",
            e
          );
        }
      };

      if (activeSessionId && updateSession) {
        const newPersona = personas.get(personaId);
        if (newPersona) {
          updateSession({
            id: activeSessionId,
            participants: {
              user: newPersona,
              characters:
                get().sessions.get(activeSessionId)?.participants.characters ||
                [],
              active_character_ids:
                get().sessions.get(activeSessionId)?.participants
                  .active_character_ids || new Set(),
            },
          });

          // Inject a system message so downstream model/context consumers notice the change
          addSystemMessage(
            activeSessionId,
            `Persona switched to: ${newPersona.name}`
          );
        }
      }
    } else {
      console.warn(
        "⚠️ [PersonaSlice] Cannot activate non-existent persona:",
        personaId
      );
      // If trying to activate a non-existent persona, keep current or set to null
      const currentActive = get().activePersonaId;
      if (currentActive && !personas.has(currentActive)) {
        // Current active persona also doesn't exist, clear it
        set({ activePersonaId: null });
      }
    }
  },
  getActivePersona: () => {
    const activeId = get().activePersonaId;
    const personas = get().personas;

    if (activeId && personas.has(activeId)) {
      return personas.get(activeId) || null;
    }

    // Fallback: prefer default-user, then first available
    const defaultPersona = personas.get("default-user");
    if (defaultPersona) return defaultPersona;

    return personas.size > 0 ? Array.from(personas.values())[0] : null;
  },
  setShowPersonaGallery: (show) => set({ showPersonaGallery: show }),

  loadPersonasFromPublic: async () => {
    console.log(
      "persona.slice: loadPersonasFromPublic called. Current loaded state:",
      get().isPersonasLoaded
    );
    if (get().isPersonasLoaded) {
      console.log("persona.slice: Already loaded, skipping.");
      return;
    }

    try {
      console.log("persona.slice: Fetching /api/personas...");
      const response = await fetch("/api/personas");
      if (!response.ok) {
        console.error(
          "persona.slice: Failed to fetch persona list:",
          response.status,
          response.statusText
        );
        return;
      }

      const personas = await response.json();
      console.log("persona.slice: Received personas:", personas);
      const personasMap = new Map<UUID, Persona>();

      // APIから受け取ったPersonaオブジェクト配列を直接処理
      for (const personaData of personas) {
        try {
          // personaDataは既にPersona型のオブジェクト（APIで変換済み）
          const persona: Persona = {
            id: personaData.id,
            created_at: personaData.created_at,
            updated_at: new Date().toISOString(),
            version: 1,
            name: personaData.name || "名前なし",
            role: personaData.role || "user",
            other_settings: personaData.other_settings || "",
            avatar_path: personaData.avatar_path || null,
          };

          personasMap.set(persona.id, persona);
          console.log(
            `persona.slice: Added persona ${persona.name} (${persona.id})`
          );
        } catch (error) {
          console.error(
            `persona.slice: Error processing persona:`,
            error,
            personaData
          );
        }
      }

      console.log(
        "persona.slice: Setting persona data to store. Total personas:",
        personasMap.size
      );
      // 既存のactivePersonaIdを保持し、未設定の場合のみdefault-userを設定
      const currentActivePersonaId = get().activePersonaId;
      const shouldSetDefault =
        !currentActivePersonaId || !personasMap.has(currentActivePersonaId);

      set({
        personas: personasMap,
        isPersonasLoaded: true,
        activePersonaId: shouldSetDefault
          ? "default-user"
          : currentActivePersonaId,
      });
      console.log(
        "persona.slice: Store updated. isPersonasLoaded should be true."
      );
    } catch (error) {
      console.error("persona.slice: Error in loadPersonasFromPublic:", error);
      // エラーが発生した場合でもデフォルトペルソナは設定
      const defaultPersona: Persona = {
        id: "default-user",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        name: "あなた",
        role: "user",
        other_settings:
          "フレンドリーで親しみやすい性格です。デフォルトのユーザーペルソナとして設定されています。",
        avatar_path: null,
      };

      const defaultMap = new Map<UUID, Persona>();
      defaultMap.set(defaultPersona.id, defaultPersona);

      set({
        personas: defaultMap,
        activePersonaId: "default-user",
        isPersonasLoaded: true,
      });
    }
  },
});
