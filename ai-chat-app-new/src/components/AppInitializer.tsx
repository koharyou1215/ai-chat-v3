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

  // データの読み込み（Safari対応：console.log削除）
  useEffect(() => {
    const loadData = async () => {
      try {
        // キャラクターとペルソナを並行で読み込み（個別エラーハンドリング付き）
        await Promise.allSettled([
          loadCharactersFromPublic(),
          loadPersonasFromPublic()
        ]);
      } catch (error) {
        // Safariでのエラーハンドリング
      }
    };

    if (!isCharactersLoaded || !isPersonasLoaded) {
      loadData();
    }
  }, [isCharactersLoaded, isPersonasLoaded, loadCharactersFromPublic, loadPersonasFromPublic, characters.size, personas.size]);

  // セッションの初期化（Safari対応：console.log削除）
  useEffect(() => {
    // データが読み込まれるまで待機
    if (!isCharactersLoaded || !isPersonasLoaded) {
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

      if (firstCharacter && activePersona) {
        try {
          await createSession(firstCharacter, activePersona);
        } catch (error) {
          // Safariでのエラーハンドリング（console.logなし）
        }
      }
    };

    initializeSession();
  }, [isCharactersLoaded, isPersonasLoaded, characters, personas, sessions, getSelectedPersona, createSession, selectedCharacterId, setSelectedCharacterId, active_session_id]);

  return <>{children}</>;
};

export default AppInitializer;