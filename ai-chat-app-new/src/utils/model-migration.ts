/**
 * Model Migration Utility
 * 古いGeminiモデル名の自動修正とlocalStorage清浄化
 */

export interface ModelMigrationResult {
  migrated: boolean;
  oldModel?: string;
  newModel?: string;
  errors: string[];
}

// 有効なGemini 2.5モデルのマッピング
const VALID_GEMINI_MODELS = {
  'gemini-2.5-pro': true,
  'gemini-2.5-flash': true, 
  'gemini-2.5-flash-light': true,
};

// 古いモデルから新しいモデルへのマッピング
const MODEL_MIGRATION_MAP: Record<string, string> = {
  // 1.5系のマッピング
  'gemini-1.5-pro': 'gemini-2.5-pro',
  'gemini-1.5-flash': 'gemini-2.5-flash',
  'gemini-1.5-flash-light': 'gemini-2.5-flash-light',
  
  // 無効なサフィックス付きモデル
  'gemini-1.5-flash-8b': 'gemini-2.5-flash',
  'gemini-2.5-flash-8b': 'gemini-2.5-flash',
  'gemini-pro': 'gemini-2.5-pro',
  'gemini-flash': 'gemini-2.5-flash',
  
  // google/プレフィックス付きの古いモデル
  'google/gemini-1.5-pro': 'gemini-2.5-pro',
  'google/gemini-1.5-flash': 'gemini-2.5-flash',
  'google/gemini-1.5-flash-light': 'gemini-2.5-flash-light',
  'google/gemini-1.5-flash-8b': 'gemini-2.5-flash',
  'google/gemini-2.5-flash-8b': 'gemini-2.5-flash',
};

/**
 * モデル名を2.5系に自動移行
 */
export function migrateModelName(modelName: string): string {
  if (!modelName) {
    return 'gemini-2.5-flash'; // デフォルト
  }

  // google/プレフィックスを除去
  const cleanModel = modelName.startsWith('google/') 
    ? modelName.substring(7) 
    : modelName;

  // 移行マップでチェック
  if (MODEL_MIGRATION_MAP[cleanModel]) {
    const newModel = MODEL_MIGRATION_MAP[cleanModel];
    console.warn(`🔄 Model migrated: ${modelName} → ${newModel}`);
    return newModel;
  }
  
  if (MODEL_MIGRATION_MAP[modelName]) {
    const newModel = MODEL_MIGRATION_MAP[modelName];
    console.warn(`🔄 Model migrated: ${modelName} → ${newModel}`);
    return newModel;
  }

  // 既に有効なモデルの場合
  if (VALID_GEMINI_MODELS[cleanModel as keyof typeof VALID_GEMINI_MODELS]) {
    return cleanModel;
  }

  // 無効なモデルの場合デフォルトを返却
  console.warn(`❌ Invalid model ${modelName}, using default: gemini-2.5-flash`);
  return 'gemini-2.5-flash';
}

/**
 * LocalStorageの設定を移行
 */
export function migrateLocalStorageSettings(): ModelMigrationResult {
  const result: ModelMigrationResult = {
    migrated: false,
    errors: []
  };

  try {
    if (typeof window === 'undefined') {
      return result; // SSR環境では処理しない
    }

    const storageName = 'ai-chat-v3-storage';
    const stored = localStorage.getItem(storageName);
    
    if (!stored) {
      return result; // データがない場合は何もしない
    }

    let data: any;
    try {
      data = JSON.parse(stored);
    } catch (parseError) {
      result.errors.push(`JSON parse error: ${parseError}`);
      // 壊れたデータを削除
      localStorage.removeItem(storageName);
      result.migrated = true;
      return result;
    }

    let needsMigration = false;
    
    // APIConfig のモデルを確認・移行
    if (data.state?.apiConfig?.model) {
      const currentModel = data.state.apiConfig.model;
      const migratedModel = migrateModelName(currentModel);
      
      if (currentModel !== migratedModel) {
        data.state.apiConfig.model = migratedModel;
        result.oldModel = currentModel;
        result.newModel = migratedModel;
        needsMigration = true;
        
        console.log(`🔄 API Config model migrated: ${currentModel} → ${migratedModel}`);
      }
    }

    // その他の設定で古いモデル名をチェック
    const checkAndMigrateModel = (obj: any, path: string) => {
      if (typeof obj === 'string' && (
        obj.includes('gemini-1.5') || 
        obj.includes('flash-8b') ||
        obj.includes('google/gemini-1.5')
      )) {
        const migratedModel = migrateModelName(obj);
        if (obj !== migratedModel) {
          console.log(`🔄 Found old model in ${path}: ${obj} → ${migratedModel}`);
          needsMigration = true;
          return migratedModel;
        }
      }
      return obj;
    };

    // 設定内のすべてのモデル参照を再帰的にチェック
    const migrateObjectModels = (obj: any, path = 'root'): any => {
      if (typeof obj === 'string') {
        return checkAndMigrateModel(obj, path);
      } else if (Array.isArray(obj)) {
        return obj.map((item, index) => 
          migrateObjectModels(item, `${path}[${index}]`)
        );
      } else if (obj && typeof obj === 'object') {
        const newObj: any = {};
        for (const [key, value] of Object.entries(obj)) {
          newObj[key] = migrateObjectModels(value, `${path}.${key}`);
        }
        return newObj;
      }
      return obj;
    };

    data = migrateObjectModels(data);

    if (needsMigration) {
      try {
        localStorage.setItem(storageName, JSON.stringify(data));
        result.migrated = true;
        console.log('✅ LocalStorage settings migrated successfully');
      } catch (saveError) {
        result.errors.push(`Failed to save migrated settings: ${saveError}`);
      }
    }

  } catch (error) {
    result.errors.push(`Migration error: ${error}`);
  }

  return result;
}

/**
 * 緊急時のlocalStorage完全クリア
 */
export function emergencyStorageReset(): void {
  try {
    if (typeof window === 'undefined') return;
    
    // AI Chat関連のストレージをクリア
    const keysToRemove = [
      'ai-chat-v3-storage',
      'memory_cards',
      'character_data',
      'persona_data',
      'inspiration_cache'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('🧹 Emergency storage reset completed');
    
    // ページリロードを促す
    if (confirm('設定をリセットしました。ページをリロードしますか？')) {
      window.location.reload();
    }
    
  } catch (error) {
    console.error('Storage reset failed:', error);
  }
}

/**
 * 起動時の自動移行実行
 */
export function initializeModelMigration(): ModelMigrationResult {
  console.log('🔄 Initializing model migration...');
  
  const result = migrateLocalStorageSettings();
  
  if (result.migrated) {
    console.log('✅ Model migration completed');
    if (result.oldModel && result.newModel) {
      console.log(`   ${result.oldModel} → ${result.newModel}`);
    }
  }
  
  if (result.errors.length > 0) {
    console.error('⚠️ Migration errors:', result.errors);
  }
  
  return result;
}

/**
 * プロバイダー別のモデル名クリーニング
 */
export function cleanModelForProvider(model: string, provider: 'openrouter' | 'gemini'): string {
  const baseModel = migrateModelName(model);
  
  if (provider === 'openrouter' && baseModel.startsWith('gemini-')) {
    // OpenRouter向けにはgoogle/プレフィックスを追加
    return `google/${baseModel}`;
  }
  
  // 直接Gemini APIの場合はプレフィックスなし
  return baseModel;
}