import { StateCreator } from 'zustand';
import { Character, UUID, TrackerDefinition, TrackerCategory, TrackerType } from '@/types';
import { AppStore } from '..';

export interface CharacterSlice {
    characters: Map<UUID, Character>;
    selectedCharacterId: UUID | null;
    editingCharacter: Character | null; // 編集中のキャラクター
    showCharacterGallery: boolean;
    showCharacterForm: boolean; // 編集フォームの表示状態
    isCharactersLoaded: boolean;
    updateTrigger: number; // Force re-render trigger for character updates
    addCharacter: (character: Character) => void;
    updateCharacter: (character: Character) => void;
    deleteCharacter: (characterId: UUID) => void; // 削除機能追加
    selectCharacter: (characterId: UUID) => void;
    setSelectedCharacterId: (characterId: UUID | null) => void; // 追加
    getSelectedCharacter: () => Character | null;
    setShowCharacterGallery: (show: boolean) => void;
    startEditingCharacter: (character: Character) => void; // 編集開始
    closeCharacterForm: () => void; // フォームを閉じる
    saveCharacter: (character: Character) => void; // 保存
    loadCharactersFromPublic: (forceReload?: boolean) => Promise<void>;
    reloadCharacters: () => Promise<void>; // 手動リロード機能追加
}

export const createCharacterSlice: StateCreator<AppStore, [], [], CharacterSlice> = (set, get) => ({
  characters: new Map(),
  selectedCharacterId: null,
  editingCharacter: null,
  showCharacterGallery: false,
  showCharacterForm: false,
  isCharactersLoaded: false,
  updateTrigger: 0,
  addCharacter: (character) => {
    set(state => {
      const characters = new Map(state.characters);

      // 重複チェック - 同じIDが既に存在する場合の処理
      if (characters.has(character.id)) {
        // Character with ID already exists, overwriting
      }

      characters.set(character.id, character);
      // Increment updateTrigger to force re-renders
      return {
        characters,
        updateTrigger: state.updateTrigger + 1
      };
    });
  },
  updateCharacter: (character) => {
    set(state => {
      const characters = new Map(state.characters);
      characters.set(character.id, character);
      // Increment updateTrigger to force re-renders
      return {
        characters,
        editingCharacter: character,
        updateTrigger: state.updateTrigger + 1
      };
    });
  },
  deleteCharacter: (characterId) => {
    set(state => {
      const characters = new Map(state.characters);
      characters.delete(characterId);
      
      // 選択中のキャラクターが削除された場合はリセット
      const newSelectedId = state.selectedCharacterId === characterId ? null : state.selectedCharacterId;
      
      return { 
        characters, 
        selectedCharacterId: newSelectedId,
        editingCharacter: state.editingCharacter?.id === characterId ? null : state.editingCharacter
      };
    });
  },
  selectCharacter: (characterId) => {
    const characters = get().characters;
    let character;
    // Map型かオブジェクト型かを確認して対応
    if (characters instanceof Map) {
      character = characters.get(characterId);
    } else if (typeof characters === 'object' && characters && characterId in characters) {
      character = (characters as Record<string, Character>)[characterId];
    }
    
    const persona = get().getSelectedPersona();
    if (character && persona) {
        get().createSession(character, persona);
        set({ selectedCharacterId: characterId, showCharacterGallery: false });
    } else {
        // キャラクターまたはペルソナが見つからない場合のエラーハンドリング
        console.error("Character or Persona not found, cannot create session.");
        set({ selectedCharacterId: characterId });
    }
  },
  setSelectedCharacterId: (characterId) => { // 追加
    set({ selectedCharacterId: characterId });
  },
  getSelectedCharacter: () => {
    const selectedId = get().selectedCharacterId;
    if (!selectedId) return null;
    const characters = get().characters;
    // Map型かオブジェクト型かを確認して対応
    if (characters instanceof Map) {
      return characters.get(selectedId) || null;
    } else if (typeof characters === 'object' && characters && selectedId in characters) {
      // オブジェクトとして扱う（永続化後の場合）
      return (characters as Record<string, Character>)[selectedId] || null;
    }
    return null;
  },
  setShowCharacterGallery: (show) => set({ showCharacterGallery: show }),
  
  startEditingCharacter: (character) => set({ editingCharacter: character, showCharacterForm: true }),
  closeCharacterForm: () => set({ showCharacterForm: false, editingCharacter: null }),
  saveCharacter: async (character) => {
    try {
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(character),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save character on the server');
      }

      // If API call is successful, update the state
      set(state => ({
        characters: new Map(state.characters).set(character.id, character),
        showCharacterForm: false,
        editingCharacter: null
      }));

    } catch (error) {
      console.error('Error saving character:', error);
      // Optionally, handle the error in the UI, e.g., show a notification
    }
  },

  loadCharactersFromPublic: async (forceReload = false) => {
    // Always load from files on startup to get latest character data
    // Then merge with persisted data (for user-uploaded images)

    try {
      const response = await fetch('/api/characters');
      if (!response.ok) {
        console.error('character.slice: Failed to fetch character list:', response.status, response.statusText);
        return;
      }
      
      const charactersData = await response.json();
      const charactersMap = new Map<UUID, Character>();
      
      // APIから直接キャラクターデータを処理
      for (const characterData of charactersData) {
        try {
          
          // JSONデータをCharacter型に変換
          const character: Character = {
            id: characterData.id || characterData.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
            created_at: new Date().toISOString(),
            updated_at: characterData.lastModified || new Date().toISOString(),
            version: 1,

            // 各フィールドを直接マッピング
            name: characterData.name || '名前なし',
            age: characterData.age || '不明',
            occupation: characterData.occupation || '不明',
            catchphrase: characterData.catchphrase || characterData.first_message || '',
            
            personality: characterData.personality || '',
            external_personality: characterData.external_personality || '',
            internal_personality: characterData.internal_personality || '',
            strengths: Array.isArray(characterData.strengths) ? characterData.strengths : (typeof characterData.strengths === 'string' ? characterData.strengths.split(',').map((s: string) => s.trim()) : []),
            weaknesses: Array.isArray(characterData.weaknesses) ? characterData.weaknesses : (typeof characterData.weaknesses === 'string' ? characterData.weaknesses.split(',').map((s: string) => s.trim()) : []),
            
            hobbies: Array.isArray(characterData.hobbies) ? characterData.hobbies : (typeof characterData.hobbies === 'string' ? characterData.hobbies.split(',').map((s: string) => s.trim()) : []),
            likes: Array.isArray(characterData.likes) ? characterData.likes : (typeof characterData.likes === 'string' ? characterData.likes.split(',').map((s: string) => s.trim()) : []),
            dislikes: Array.isArray(characterData.dislikes) ? characterData.dislikes : (typeof characterData.dislikes === 'string' ? characterData.dislikes.split(',').map((s: string) => s.trim()) : []),
            
            appearance: characterData.appearance || '',
            avatar_url: (characterData.avatar_url && typeof characterData.avatar_url === 'string' && characterData.avatar_url.trim() !== '')
              ? characterData.avatar_url
              : '',
            background_url: (characterData.background_url && typeof characterData.background_url === 'string' && characterData.background_url.trim() !== '')
              ? characterData.background_url
              : '/images/default-bg.jpg',

            speaking_style: characterData.speaking_style || '',
            first_person: characterData.first_person || '私',
            second_person: characterData.second_person || 'あなた',
            verbal_tics: Array.isArray(characterData.verbal_tics) ? characterData.verbal_tics : (typeof characterData.verbal_tics === 'string' ? characterData.verbal_tics.split(',').map((s: string) => s.trim()) : []),

            background: characterData.background || '',
            scenario: characterData.scenario || '',
            
            system_prompt: characterData.system_prompt || '',
            first_message: characterData.first_message || '',
            
            tags: Array.isArray(characterData.tags) ? characterData.tags : (typeof characterData.tags === 'string' ? characterData.tags.split(',').map((s: string) => s.trim()) : []),
            trackers: Array.isArray(characterData.trackers) ? characterData.trackers.reduce((acc: TrackerDefinition[], t: Record<string, unknown>) => {
              if (!t || typeof t.name !== 'string') {
                  // Skipping invalid tracker data
                  return acc;
              }

              // Support both old format (direct fields) and new format (config object)
              const hasConfig = t.config && typeof t.config === 'object';
              const trackerType = hasConfig
                ? (t.config as any).type
                : t.type;

              if (!trackerType || typeof trackerType !== 'string') {
                  console.log(`⚠️ Skipping tracker "${t.name}" - no valid type found`);
                  return acc;
              }

              // Debug log to track which format is being used
              if (hasConfig) {
                console.log(`📋 Processing tracker "${t.name}" with NEW format (config object)`);
              } else {
                console.log(`📋 Processing tracker "${t.name}" with OLD format (direct fields)`);
              }

              const definition: Partial<TrackerDefinition> = {
                id: t.name,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1,
                name: t.name,
                display_name: String(t.display_name || ''),
                description: String(t.description || ''),
                category: (hasConfig ? (t.config as any).category : t.category) as TrackerCategory || 'status',
                type: trackerType as TrackerType,
              };

              let isValid = true;

              // Extract values from either old format or new format (config object)
              if (hasConfig) {
                // New format with config object
                const config = t.config as any;
                switch (trackerType) {
                  case 'numeric':
                    definition.config = {
                      type: 'numeric',
                      initial_value: Number(config.initial_value) || 0,
                      min_value: Number(config.min_value) || 0,
                      max_value: Number(config.max_value) || 100,
                      step: Number(config.step) || 1,
                    };
                    break;
                  case 'state':
                    definition.config = {
                      type: 'state',
                      initial_state: config.initial_state as string,
                      possible_states: Array.isArray(config.possible_states)
                        ? config.possible_states.map((s: any) =>
                            typeof s === 'object' ? s : { id: String(s), label: String(s) }
                          )
                        : [],
                    };
                    break;
                  case 'boolean':
                    definition.config = {
                      type: 'boolean',
                      initial_value: Boolean(config.initial_value !== undefined ? config.initial_value : config.initial_boolean),
                    };
                    break;
                  case 'text':
                    definition.config = {
                      type: 'text',
                      initial_value: String(config.initial_value || config.initial_text || ''),
                    };
                    break;
                  default:
                    isValid = false;
                }
              } else {
                // Old format with direct fields
                switch (trackerType) {
                  case 'numeric':
                    definition.config = {
                      type: 'numeric',
                      initial_value: Number(t.initial_value) || 0,
                      min_value: Number(t.min_value) || 0,
                      max_value: Number(t.max_value) || 100,
                      step: Number(t.step) || 1,
                    };
                    break;
                  case 'state':
                    definition.config = {
                      type: 'state',
                      initial_state: t.initial_state as string,
                      possible_states: Array.isArray(t.possible_states)
                        ? t.possible_states.map((s: unknown) =>
                            typeof s === 'string' ? { id: String(s), label: String(s) } : s
                          )
                        : [],
                    };
                    break;
                  case 'boolean':
                    definition.config = {
                      type: 'boolean',
                      initial_value: Boolean(t.initial_boolean !== undefined ? t.initial_boolean : t.initial_value),
                    };
                    break;
                  case 'text':
                    definition.config = {
                      type: 'text',
                      initial_value: String(t.initial_text || t.initial_value || ''),
                    };
                    break;
                  default:
                    isValid = false;
                }
              }

              if (isValid) {
                acc.push(definition as TrackerDefinition);
              }
              return acc;
            }, []) : [],
            nsfw_profile: characterData.nsfw_profile,

            // statisticsはストアの内部で初期化
            statistics: {
              usage_count: 0,
              last_used: new Date().toISOString(),
              favorite_count: 0,
              average_session_length: 0
            }
          };
          
          charactersMap.set(character.id, character);
        } catch (error) {
          console.error(`character.slice: Error processing character data:`, error);
        }
      }

      // Merge with existing persisted data (for user-uploaded images)
      const existingCharacters = get().characters;
      if (existingCharacters && existingCharacters.size > 0) {
        console.log('📋 Merging with existing character data...');

        // Preserve user-uploaded images from existing data
        existingCharacters.forEach((existingChar, id) => {
          const newChar = charactersMap.get(id);
          if (newChar) {
            // Preserve user-uploaded avatar and background if they exist
            if (existingChar.avatar_url && existingChar.avatar_url.includes('/uploads/')) {
              newChar.avatar_url = existingChar.avatar_url;
            }
            if (existingChar.background_url && existingChar.background_url.includes('/uploads/')) {
              newChar.background_url = existingChar.background_url;
            }
            charactersMap.set(id, newChar);
          } else {
            // New character that doesn't exist in files - preserve it
            // This handles manually added characters
            console.log(`📝 Preserving manually added character: ${existingChar.name}`);
            charactersMap.set(id, existingChar);
          }
        });
      }

      set({
        characters: charactersMap,
        isCharactersLoaded: true
      });
      
    } catch (error) {
      console.error('character.slice: Error in loadCharactersFromPublic:', error);
    }
  },

  // 手動リロード機能
  reloadCharacters: async () => {
    const { loadCharactersFromPublic } = get();
    console.log('🔄 Manually reloading characters...');
    await loadCharactersFromPublic(true);
  }
});
