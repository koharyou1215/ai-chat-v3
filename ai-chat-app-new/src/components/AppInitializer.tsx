'use client';

import { useEffect, ReactNode } from 'react';
import { useAppStore } from '@/store';

interface AppInitializerProps {
  children: ReactNode;
}

const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const { 
    sessions, 
    active_session_id,
    createSession, 
    getSelectedPersona,
    characters, 
    personas, 
    isCharactersLoaded, 
    isPersonasLoaded,
    loadCharactersFromPublic,
    loadPersonasFromPublic,
    selectedCharacterId,
    setSelectedCharacterId,
  } = useAppStore();

  // データの読み込み
  useEffect(() => {
    const loadData = async () => {
      console.log('AppInitializer: useEffect[loadData] triggered.');
      console.log('AppInitializer: Starting data loading...');
      
      try {
        // キャラクターとペルソナを並行で読み込み
        await Promise.all([
          loadCharactersFromPublic(),
          loadPersonasFromPublic()
        ]);
        
        console.log('AppInitializer: Data loading completed');
      } catch (error) {
        console.error('AppInitializer: Error loading data:', error);
      }
    };

    if (!isCharactersLoaded || !isPersonasLoaded) {
      console.log('AppInitializer: condition met, calling loadData()');
      loadData();
    }
  }, [isCharactersLoaded, isPersonasLoaded, loadCharactersFromPublic, loadPersonasFromPublic]);

  // セッションの初期化
  useEffect(() => {
    // データが読み込まれるまで待機
    if (!isCharactersLoaded || !isPersonasLoaded) {
      console.log('AppInitializer: Waiting for data to load...');
      return;
    }

    // セッションが存在する場合の処理
    if (sessions.size > 0) {
      // しかし、選択中のキャラクターがいない場合
      if (!selectedCharacterId) {
        // アクティブなセッション、または最初のセッションを取得
        const sessionToSetActive = sessions.get(active_session_id!) || sessions.values().next().value;
        if (sessionToSetActive && sessionToSetActive.participants.characters.length > 0) {
          const charId = sessionToSetActive.participants.characters[0].id;
          console.log(`AppInitializer: Persisted session found but no selected character. Setting character to: ${charId}`);
          setSelectedCharacterId(charId);
        }
      }
      return; // セッションがあるので初期化は不要
    }

    // 以下はセッションが一つもない場合（初回起動時など）の処理
    const initializeSession = async () => {
      // 最初のキャラクターとアクティブなペルソナを取得
      const firstCharacter = characters.values().next().value;
      const activePersona = getSelectedPersona();
      
      console.log('AppInitializer: Initializing with:', {
        character: firstCharacter?.name,
        persona: activePersona?.name,
        charactersCount: characters.size,
        personasCount: personas.size
      });

      if (firstCharacter && activePersona) {
        try {
          console.log('AppInitializer: Creating initial session...');
          await createSession(firstCharacter, activePersona);
          console.log('AppInitializer: Initial session created successfully');
        } catch (error) {
          console.error('AppInitializer: Failed to create initial session:', error);
        }
      } else {
        console.log('AppInitializer: Missing character or persona for initialization');
        if (!firstCharacter) console.log('AppInitializer: No characters available');
        if (!activePersona) console.log('AppInitializer: No active persona available');
      }
    };

    initializeSession();
  }, [isCharactersLoaded, isPersonasLoaded, characters, personas, sessions, getSelectedPersona, createSession, selectedCharacterId, setSelectedCharacterId, active_session_id]);

  return <>{children}</>;
};

export default AppInitializer;