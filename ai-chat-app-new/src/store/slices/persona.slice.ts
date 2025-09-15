import { StateCreator } from 'zustand';
import { Persona, UUID } from '@/types';
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
        const personas = get().personas;
        // Only activate if the persona exists in the personas map
        if (personas.has(personaId)) {
            console.log('✅ [PersonaSlice] Activating persona:', personaId);
            set({ activePersonaId: personaId });
        } else {
            console.warn('⚠️ [PersonaSlice] Cannot activate non-existent persona:', personaId);
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

        if (activeId && personas.has(activeId)) {
            const persona = personas.get(activeId)!;
            console.log('✅ [PersonaSlice] Found active persona:', `${persona.name} (${persona.id})`);
            return persona;
        }

        // Active persona not found or not set - clear invalid activePersonaId
        if (activeId && !personas.has(activeId)) {
            console.warn('⚠️ [PersonaSlice] Active persona ID not found, clearing:', activeId);
            // Don't set state here to avoid infinite loops, just log the issue
        }

        // Fallback strategy: try default-user first, then first available persona
        const defaultPersona = personas.get('default-user');
        if (defaultPersona) {
            console.log('📌 [PersonaSlice] Using default persona:', `${defaultPersona.name} (${defaultPersona.id})`);
            return defaultPersona;
        }

        // Last resort: use first available persona
        const firstPersona = personas.size > 0 ? Array.from(personas.values())[0] : null;
        if (firstPersona) {
            console.log('📌 [PersonaSlice] Using first available persona:', `${firstPersona.name} (${firstPersona.id})`);
        } else {
            console.warn('⚠️ [PersonaSlice] No personas available');
        }
        return firstPersona;
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
