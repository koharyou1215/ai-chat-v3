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
      console.log('🔄 AppInitializer: useEffect[loadData] triggered');
      console.log('📊 AppInitializer: Current state:', {
        isCharactersLoaded,
        isPersonasLoaded,
        charactersCount: characters.size,
        personasCount: personas.size
      });
      
      try {
        console.log('🚀 AppInitializer: Starting parallel data loading...');
        
        // キャラクターとペルソナを並行で読み込み（個別エラーハンドリング付き）
        const results = await Promise.allSettled([
          loadCharactersFromPublic(),
          loadPersonasFromPublic()
        ]);
        
        // 結果を個別に確認
        results.forEach((result, index) => {
          const type = index === 0 ? 'Characters' : 'Personas';
          if (result.status === 'rejected') {
            console.error(`❌ AppInitializer: ${type} loading failed:`, result.reason);
          } else {
            console.log(`✅ AppInitializer: ${type} loading succeeded`);
          }
        });
        
        // 最終状態を確認
        setTimeout(() => {
          console.log('📈 AppInitializer: Final state after loading:', {
            charactersLoaded: characters.size,
            personasLoaded: personas.size,
            isCharactersLoaded,
            isPersonasLoaded
          });
        }, 100);
        
        console.log('🎉 AppInitializer: Data loading process completed');
      } catch (error) {
        console.error('💥 AppInitializer: Critical error in data loading:', error);
      }
    };

    if (!isCharactersLoaded || !isPersonasLoaded) {
      console.log('🎯 AppInitializer: Loading condition met, executing loadData()');
      loadData();
    } else {
      console.log('✅ AppInitializer: Data already loaded, skipping');
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
          console.log('🎬 AppInitializer: Creating initial session...', {
            character: firstCharacter.name,
            persona: activePersona.name
          });
          await createSession(firstCharacter, activePersona);
          console.log('✨ AppInitializer: Initial session created successfully');
          
          // セッション作成後の状態確認
          setTimeout(() => {
            const newSessionsCount = sessions.size;
            console.log('📋 AppInitializer: Post-creation session state:', {
              sessionsCount: newSessionsCount,
              activeSessionId: active_session_id
            });
          }, 100);
        } catch (error) {
          console.error('❌ AppInitializer: Failed to create initial session:', error);
          console.log('🔄 AppInitializer: Attempting fallback session creation...');
          
          // フォールバック: 基本的なセッション作成を試行
          try {
            const fallbackSessionId = `fallback-${Date.now()}`;
            console.log('🆘 AppInitializer: Creating fallback session:', fallbackSessionId);
            // このフォールバックは必要に応じて実装
          } catch (fallbackError) {
            console.error('💥 AppInitializer: Fallback session creation also failed:', fallbackError);
          }
        }
      } else {
        console.error('⚠️ AppInitializer: Cannot initialize - missing required data:');
        console.log('📊 AppInitializer: Debug info:', {
          hasCharacter: !!firstCharacter,
          hasPersona: !!activePersona,
          charactersAvailable: characters.size,
          personasAvailable: personas.size,
          charactersList: Array.from(characters.keys()).slice(0, 5),
          personasList: Array.from(personas.keys()).slice(0, 5)
        });
        
        if (!firstCharacter) {
          console.error('❌ AppInitializer: No characters available - check character loading');
        }
        if (!activePersona) {
          console.error('❌ AppInitializer: No active persona available - check persona loading');
        }
      }
    };

    initializeSession();
  }, [isCharactersLoaded, isPersonasLoaded, characters, personas, sessions, getSelectedPersona, createSession, selectedCharacterId, setSelectedCharacterId, active_session_id]);

  return <>{children}</>;
};

export default AppInitializer;