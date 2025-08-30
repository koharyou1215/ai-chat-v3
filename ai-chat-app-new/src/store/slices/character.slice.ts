import { StateCreator } from 'zustand';
import { Character, UUID, TrackerDefinition } from '@/types';
import { AppStore } from '..';

export interface CharacterSlice {
    characters: Map<UUID, Character>;
    selectedCharacterId: UUID | null;
    editingCharacter: Character | null; // 編集中のキャラクター
    showCharacterGallery: boolean;
    showCharacterForm: boolean; // 編集フォームの表示状態
    isCharactersLoaded: boolean;
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
    loadCharactersFromPublic: () => Promise<void>;
}

export const createCharacterSlice: StateCreator<AppStore, [], [], CharacterSlice> = (set, get) => ({
  characters: new Map(),
  selectedCharacterId: null,
  editingCharacter: null,
  showCharacterGallery: false,
  showCharacterForm: false,
  isCharactersLoaded: false,
  addCharacter: (character) => {
    set(state => {
      const characters = new Map(state.characters);
      
      // 重複チェック - 同じIDが既に存在する場合の処理
      if (characters.has(character.id)) {
        console.warn(`Character with ID ${character.id} already exists. Overwriting.`);
      }
      
      characters.set(character.id, character);
      return { characters };
    });
  },
  updateCharacter: (character) => {
    set(state => {
      const characters = new Map(state.characters);
      characters.set(character.id, character);
      return { characters, editingCharacter: character };
    });
  },
  deleteCharacter: (characterId) => {
    set(state => {
      const characters = new Map(state.characters);
      characters.delete(characterId);
      
      // 選択中のキャラクターが削除された場合はリセット
      const newSelectedId = state.selectedCharacterId === characterId ? null : state.selectedCharacterId;
      
      console.log(`✅ Deleted character: ${characterId}`);
      return { 
        characters, 
        selectedCharacterId: newSelectedId,
        editingCharacter: state.editingCharacter?.id === characterId ? null : state.editingCharacter
      };
    });
  },
  selectCharacter: (characterId) => {
    const character = get().characters.get(characterId);
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
    return get().characters.get(selectedId) || null;
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
      console.log('Character saved successfully and state updated.');

    } catch (error) {
      console.error('Error saving character:', error);
      // Optionally, handle the error in the UI, e.g., show a notification
    }
  },

  loadCharactersFromPublic: async () => {
    console.log('character.slice: loadCharactersFromPublic called. Current loaded state:', get().isCharactersLoaded);
    if (get().isCharactersLoaded) {
      console.log('character.slice: Already loaded, skipping.');
      return;
    }
    
    try {
      console.log('character.slice: Fetching /api/characters...');
      const response = await fetch('/api/characters');
      if (!response.ok) {
        console.error('character.slice: Failed to fetch character list:', response.status, response.statusText);
        return;
      }
      
      const characterFiles = await response.json();
      console.log('character.slice: Received character files:', characterFiles);
      const charactersMap = new Map<UUID, Character>();
      
      // 各キャラクターファイルを読み込み
      for (const filename of characterFiles) {
        try {
          const charResponse = await fetch(`/characters/${encodeURIComponent(filename)}`);
          if (!charResponse.ok) {
            console.warn(`character.slice: Failed to fetch character data for ${filename}`);
            continue;
          }
          
          const characterData = await charResponse.json();
          
          // JSONデータをCharacter型に変換
          const character: Character = {
            id: filename.replace('.json', ''),
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
            strengths: Array.isArray(characterData.strengths) ? characterData.strengths : (typeof characterData.strengths === 'string' ? characterData.strengths.split(',').map(s => s.trim()) : []),
            weaknesses: Array.isArray(characterData.weaknesses) ? characterData.weaknesses : (typeof characterData.weaknesses === 'string' ? characterData.weaknesses.split(',').map(s => s.trim()) : []),
            
            hobbies: Array.isArray(characterData.hobbies) ? characterData.hobbies : (typeof characterData.hobbies === 'string' ? characterData.hobbies.split(',').map(s => s.trim()) : []),
            likes: Array.isArray(characterData.likes) ? characterData.likes : (typeof characterData.likes === 'string' ? characterData.likes.split(',').map(s => s.trim()) : []),
            dislikes: Array.isArray(characterData.dislikes) ? characterData.dislikes : (typeof characterData.dislikes === 'string' ? characterData.dislikes.split(',').map(s => s.trim()) : []),
            
            appearance: characterData.appearance || '',
            avatar_url: characterData.avatar_url,
            background_url: characterData.background_url,

            speaking_style: characterData.speaking_style || '',
            first_person: characterData.first_person || '私',
            second_person: characterData.second_person || 'あなた',
            verbal_tics: Array.isArray(characterData.verbal_tics) ? characterData.verbal_tics : (typeof characterData.verbal_tics === 'string' ? characterData.verbal_tics.split(',').map(s => s.trim()) : []),

            background: characterData.background || '',
            scenario: characterData.scenario || '',
            
            system_prompt: characterData.system_prompt || '',
            first_message: characterData.first_message || '',
            
            tags: Array.isArray(characterData.tags) ? characterData.tags : (typeof characterData.tags === 'string' ? characterData.tags.split(',').map(s => s.trim()) : []),
            trackers: (characterData.trackers || []).reduce((acc: TrackerDefinition[], t: Record<string, unknown>) => {
              if (!t || typeof t.name !== 'string' || typeof t.type !== 'string') {
                  console.warn('Skipping invalid tracker data:', t);
                  return acc;
              }

              const definition: Partial<TrackerDefinition> = {
                id: t.name,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1,
                name: t.name,
                display_name: t.display_name,
                description: t.description,
                category: t.category,
                type: t.type,
              };

              let isValid = true;
              switch (t.type) {
                case 'numeric':
                  definition.config = {
                    type: 'numeric',
                    initial_value: t.initial_value,
                    min_value: t.min_value,
                    max_value: t.max_value,
                    step: t.step || 1,
                  };
                  break;
                case 'state':
                  definition.config = {
                    type: 'state',
                    initial_state: t.initial_state as string,
                    possible_states: Array.isArray(t.possible_states) ? t.possible_states.map((s: unknown) => ({ id: String(s), label: String(s) })) : [],
                  };
                  break;
                case 'boolean':
                  definition.config = {
                    type: 'boolean',
                    initial_value: t.initial_boolean,
                  };
                  break;
                case 'text':
                  definition.config = {
                    type: 'text',
                    initial_value: t.initial_text || '',
                  };
                  break;
                default:
                  isValid = false;
                  console.warn(`Skipping tracker with unknown type: ${t.type}`, t);
              }

              if (isValid) {
                acc.push(definition as TrackerDefinition);
              }
              return acc;
            }, []),
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
          console.error(`character.slice: Error processing character file ${filename}:`, error);
        }
      }
      
      console.log('character.slice: Setting character data to store. Total characters:', charactersMap.size);
      set({ 
        characters: charactersMap, 
        isCharactersLoaded: true 
      });
      console.log('character.slice: Store updated. isCharactersLoaded should be true.');
      
    } catch (error) {
      console.error('character.slice: Error in loadCharactersFromPublic:', error);
    }
  }
});
