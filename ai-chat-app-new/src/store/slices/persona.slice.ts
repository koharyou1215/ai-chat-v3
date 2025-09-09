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
        set({ activePersonaId: personaId });
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
        const defaultPersona = personasArray.find(p => p.is_default) || personasArray[0] || null;
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
            
            const personaFiles = await response.json();
            console.log('persona.slice: Received persona files:', personaFiles);
            const personasMap = new Map<UUID, Persona>();
            
            // まずデフォルトペルソナを追加
            const defaultPersona: Persona = {
                id: 'default-user',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1,
                name: 'あなた',
                description: 'デフォルトのユーザーペルソナ',
                role: 'user',
                traits: ['親しみやすい', '好奇心旺盛'],
                likes: ['会話', '新しい発見'],
                dislikes: ['退屈', '一方的な会話'],
                other_settings: 'フレンドリーで親しみやすい性格です。',
                is_active: true,
                is_default: true
            };
            personasMap.set(defaultPersona.id, defaultPersona);
            console.log('persona.slice: Default persona added.');
            
            // 各ペルソナファイルを読み込み（フォルダが空の場合はスキップ）
            for (const filename of personaFiles) {
                try {
                    const personaResponse = await fetch(`/personas/${encodeURIComponent(filename)}`);
                    if (!personaResponse.ok) {
                        console.warn(`persona.slice: Failed to fetch persona data for ${filename}`);
                        continue;
                    }
                    
                    const personaData = await personaResponse.json();
                    console.log(`persona.slice: Successfully loaded data for ${filename}`);
                    
                    // JSONデータをPersona型に変換
                    const persona: Persona = {
                        id: filename.replace('.json', ''),
                        created_at: new Date().toISOString(),
                        updated_at: personaData.lastModified || new Date().toISOString(),
                        version: 1,
                        name: personaData.name || '名前なし',
                        description: personaData.description || '',
                        role: personaData.role || 'user',
                        traits: personaData.traits || [],
                        likes: personaData.likes || [],
                        dislikes: personaData.dislikes || [],
                        other_settings: personaData.other_settings || '',
                        is_active: true,
                        is_default: false
                    };
                    
                    personasMap.set(persona.id, persona);
                } catch (error) {
                    console.error(`persona.slice: Error processing persona file ${filename}:`, error);
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
                description: 'デフォルトのユーザーペルソナ',
                role: 'user',
                traits: ['親しみやすい', '好奇心旺盛'],
                likes: ['会話', '新しい発見'],
                dislikes: ['退屈', '一方的な会話'],
                other_settings: 'フレンドリーで親しみやすい性格です。',
                is_active: true,
                is_default: true
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
