// Model Migration Utility - 完全にレガシーモデル名を排除
// レガシーモデル名を現在の正式なモデル名に自動変換し、警告を表示

export interface ModelMigrationResult {
  originalModel: string;
  migratedModel: string;
  wasLegacy: boolean;
  message?: string;
}

/**
 * レガシーモデル名を現在の正式なモデル名に自動変換
 * マッピングではなく、完全な置換を実行
 */
export function migrateModelName(modelName: string): ModelMigrationResult {
  if (!modelName) {
    return {
      originalModel: '',
      migratedModel: 'google/gemini-2.5-flash',
      wasLegacy: false,
      message: '空のモデル名をデフォルトに設定しました'
    };
  }

  // "google/" プレフィックスを一時的に除去
  const cleanModel = modelName.replace(/^google\//, '');
  
  // レガシーモデルは全て削除 - 公式モデルのみサポート
  const legacyMigrations: { [key: string]: { current: string; reason: string } } = {
    'gemini-1.5-flash-8b': { current: 'gemini-2.5-flash', reason: '1.5 flash 8b model is deprecated' },
    'gemini-1.5-flash': { current: 'gemini-2.5-flash', reason: '1.5 flash model is deprecated' },
    'gemini-1.5-pro': { current: 'gemini-2.5-pro', reason: '1.5 pro model is deprecated' },
    'gemini-1.0-pro': { current: 'gemini-2.5-pro', reason: '1.0 pro model is deprecated' },
    'gemini-flash': { current: 'gemini-2.5-flash', reason: 'Unversioned flash model is deprecated' },
    'gemini-pro': { current: 'gemini-2.5-pro', reason: 'Unversioned pro model is deprecated' }
  };

  const migration = legacyMigrations[cleanModel];
  
  if (migration) {
    const migratedModel = `google/${migration.current}`;
    console.warn(`🔄 モデル自動移行: ${modelName} → ${migratedModel} (${migration.reason})`);
    
    return {
      originalModel: modelName,
      migratedModel,
      wasLegacy: true,
      message: `${migration.reason}。自動的に ${migratedModel} に更新しました。`
    };
  }

  // 公式にサポートされている3つのモデルのみ
  const supportedModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite'];
  
  if (!supportedModels.includes(cleanModel)) {
    console.warn(`⚠️ 未対応モデル: ${modelName}。デフォルトに変更します。`);
    return {
      originalModel: modelName,
      migratedModel: 'google/gemini-2.5-flash',
      wasLegacy: false,
      message: `未対応のモデル ${modelName} をデフォルトの google/gemini-2.5-flash に変更しました。`
    };
  }

  // 有効なモデル名の場合、google/ プレフィックスを確保
  const validModel = cleanModel.startsWith('google/') ? cleanModel : `google/${cleanModel}`;
  
  return {
    originalModel: modelName,
    migratedModel: validModel,
    wasLegacy: false
  };
}

/**
 * ユーザー設定の自動マイグレーション
 * localStorage などに保存されたレガシー設定を自動更新
 */
export function migrateUserSettings(): void {
  if (typeof window === 'undefined') return;

  try {
    // Zustand settings の確認と移行
    const settingsKey = 'chat-app-settings';
    const storedSettings = localStorage.getItem(settingsKey);
    
    if (storedSettings) {
      const settings = JSON.parse(storedSettings);
      
      if (settings?.state?.apiConfig?.model) {
        const migration = migrateModelName(settings.state.apiConfig.model);
        
        if (migration.wasLegacy) {
          console.log(`🔧 設定自動移行: APIモデル ${migration.originalModel} → ${migration.migratedModel}`);
          settings.state.apiConfig.model = migration.migratedModel;
          localStorage.setItem(settingsKey, JSON.stringify(settings));
        }
      }
    }
    
    // 他の設定キーも確認
    const possibleKeys = ['api_config', 'model_settings', 'gemini_settings'];
    
    possibleKeys.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (parsed.model) {
            const migration = migrateModelName(parsed.model);
            if (migration.wasLegacy) {
              console.log(`🔧 設定自動移行: ${key}.model ${migration.originalModel} → ${migration.migratedModel}`);
              parsed.model = migration.migratedModel;
              localStorage.setItem(key, JSON.stringify(parsed));
            }
          }
        } catch (e) {
          // JSON parse エラーは無視
        }
      }
    });

  } catch (error) {
    console.warn('設定のマイグレーション中にエラーが発生しました:', error);
  }
}

/**
 * アプリケーション起動時にマイグレーションを実行
 */
export function initializeModelMigration(): void {
  console.log('🚀 モデル名マイグレーションを開始します...');
  migrateUserSettings();
  console.log('✅ モデル名マイグレーション完了');
}