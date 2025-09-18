import { StateCreator } from 'zustand';
import { Persona, UUID } from '@/types';
import { UnifiedMessage } from '@/types/memory';
import { AppStore } from '..';

export interface PersonaSlice {
    personas: Map<UUID, Persona>;
    activePersonaId: UUID | null;
    showPersonaGallery: boolean;
    isPersonasLoaded: boolean;
    addPersona: (persona: Persona) => void;
    updatePersona: (persona: Persona) => void;
    activatePersona: (personaId: UUID) => void;
    getActivePersona: () => Persona | null;
    getSelectedPersona: () => Persona | null; // 追加
    setShowPersonaGallery: (show: boolean) => void;
    loadPersonasFromPublic: () => Promise<void>;
}

export const createPersonaSlice: StateCreator<AppStore, [], [], PersonaSlice> = (set, get) => ({
    personas: new Map(),
    activePersonaId: null,
    showPersonaGallery: false,
    isPersonasLoaded: false,
    addPersona: (persona) => {
        set(state => ({
            personas: new Map(state.personas).set(persona.id, persona)
        }));
    },
    updatePersona: (persona) => {
        set(state => {
            const newPersonas = new Map(state.personas);
            newPersonas.set(persona.id, {
                ...persona,
                updated_at: new Date().toISOString(),
            });
            return { personas: newPersonas };
        });
    },
    activatePersona: (personaId) => {
        const state = get();
        const personas = state.personas;

        // ペルソナ存在確認バリデーション
        if (!personas.has(personaId)) {
            console.warn(`[PersonaSlice] Persona ID ${personaId} not found in personas map`);
            return;
        }

        set({ activePersonaId: personaId });

        // アクティブセッションのparticipants.userも更新
        const activeSessionId = state.active_session_id;
        const updateSession = state.updateSession;

        if (activeSessionId && state.sessions?.has(activeSessionId)) {
            const session = state.sessions.get(activeSessionId);
            const persona = personas.get(personaId);

            if (session && persona && updateSession) {
                // updateSession()メソッドパターン実装
                updateSession(activeSessionId, {
                    participants: {
                        ...session.participants,
                        user: persona
                    }
                });

                // addSystemMessageヘルパー関数
                const addSystemMessage = (sessionId: UUID, content: string) => {
                    try {
                        const currentSession = get().sessions.get(sessionId);
                        if (!currentSession) return;

                        const systemMsg: UnifiedMessage = {
                            id: `system-${Date.now()}`,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            version: 1,
                            session_id: sessionId,
                            role: 'system' as const,
                            content,
                            timestamp: Date.now(),
                            memory: {
                                importance: { score: 0.1, factors: {} },
                                is_pinned: false,
                                is_bookmarked: false,
                                keywords: [],
                            },
                            expression: {
                                emotion: { primary: 'neutral', intensity: 0 },
                                style: { font_weight: 'normal', text_color: '#ffffff' },
                                effects: [],
                            },
                            edit_history: [],
                            regeneration_count: 0,
                            metadata: {
                                info: 'persona-sync',
                                system_event: 'persona_switch',
                                new_persona_id: personaId,
                                new_persona_name: persona.name
                            },
                            is_deleted: false,
                        };

                        const updatedMessages = [...currentSession.messages, systemMsg];
                        updateSession(sessionId, { messages: updatedMessages });
                    } catch (error) {
                        console.error('[PersonaSlice] Error adding system message:', error);
                    }
                };

                addSystemMessage(activeSessionId, `[システム] ユーザーが ${persona.name} に切り替わりました。`);
                console.log(`✅ [PersonaSlice] Updated active session with new persona: ${persona.name}`);
            }
        }
    },
    getActivePersona: () => {
        const activeId = get().activePersonaId;
        if (!activeId) return null;
        return get().personas.get(activeId) || null;
    },
    getSelectedPersona: () => {
        const activeId = get().activePersonaId;
        const personas = get().personas;
        
        console.log('🔍 [PersonaSlice] getSelectedPersona called:', {
            activePersonaId: activeId,
            personasCount: personas.size,
            personaIds: Array.from(personas.keys())
        });
        
        if (activeId) {
            const persona = personas.get(activeId);
            if (persona) {
                console.log('🔍 [PersonaSlice] Found active persona:', `${persona.name} (${persona.id})`);
                return persona;
            } else {
                console.warn('🔍 [PersonaSlice] Active persona ID not found in personas map:', activeId);
            }
        }
        
        // アクティブなものがない場合、デフォルトを探す
        const personasArray = Array.from(personas.values());
        const defaultPersona = personasArray.find(p => p.id === 'default-user') || personasArray[0] || null;
        console.log('🔍 [PersonaSlice] Falling back to default persona:', defaultPersona ? `${defaultPersona.name} (${defaultPersona.id})` : 'null');
        return defaultPersona;
    },
    setShowPersonaGallery: (show) => set({ showPersonaGallery: show }),

    loadPersonasFromPublic: async () => {
        console.log('persona.slice: loadPersonasFromPublic called. Current loaded state:', get().isPersonasLoaded);
        if (get().isPersonasLoaded) {
            console.log('persona.slice: Already loaded, skipping.');
            return;
        }
        
        try {
            console.log('persona.slice: Fetching /api/personas...');
            const response = await fetch('/api/personas');
            if (!response.ok) {
                console.error('persona.slice: Failed to fetch persona list:', response.status, response.statusText);
                return;
            }
            
            const personas = await response.json();
            console.log('persona.slice: Received personas:', personas);
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
                        name: personaData.name || '名前なし',
                        role: personaData.role || 'user',
                        other_settings: personaData.other_settings || '',
                        avatar_path: personaData.avatar_path || null
                    };
                    
                    personasMap.set(persona.id, persona);
                    console.log(`persona.slice: Added persona ${persona.name} (${persona.id})`);
                } catch (error) {
                    console.error(`persona.slice: Error processing persona:`, error, personaData);
                }
            }

            console.log('persona.slice: Setting persona data to store. Total personas:', personasMap.size);
            // 既存のactivePersonaIdを保持し、未設定の場合のみdefault-userを設定
            const currentActivePersonaId = get().activePersonaId;
            const shouldSetDefault = !currentActivePersonaId || !personasMap.has(currentActivePersonaId);
            
            set({ 
                personas: personasMap, 
                isPersonasLoaded: true,
                activePersonaId: shouldSetDefault ? 'default-user' : currentActivePersonaId
            });
            console.log('persona.slice: Store updated. isPersonasLoaded should be true.');
            
        } catch (error) {
            console.error('persona.slice: Error in loadPersonasFromPublic:', error);
            // エラーが発生した場合でもデフォルトペルソナは設定
            const defaultPersona: Persona = {
                id: 'default-user',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1,
                name: 'あなた',
                role: 'user',
                other_settings: 'フレンドリーで親しみやすい性格です。デフォルトのユーザーペルソナとして設定されています。',
                avatar_path: null
            };
            
            const defaultMap = new Map<UUID, Persona>();
            defaultMap.set(defaultPersona.id, defaultPersona);
            
            set({ 
                personas: defaultMap, 
                activePersonaId: 'default-user',
                isPersonasLoaded: true 
            });
        }
    }
});
