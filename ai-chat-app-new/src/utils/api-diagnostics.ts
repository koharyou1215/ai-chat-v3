/**
 * API診断ユーティリティ
 * LocalStorageのAPIキー設定状態を確認
 */

export interface APIDiagnosticsResult {
  timestamp: string;
  hasGeminiKey: boolean;
  hasOpenRouterKey: boolean;
  useDirectGeminiAPI: boolean;
  currentModel: string;
  currentProvider: string;
  storageSize: number;
  apiConfigFound: boolean;
  geminiKeyLength: number;
  openRouterKeyLength: number;
  rawData?: any;
}

/**
 * LocalStorageからAPI設定を診断
 */
export function diagnoseAPIConfiguration(): APIDiagnosticsResult {
  const result: APIDiagnosticsResult = {
    timestamp: new Date().toISOString(),
    hasGeminiKey: false,
    hasOpenRouterKey: false,
    useDirectGeminiAPI: false,
    currentModel: 'unknown',
    currentProvider: 'unknown',
    storageSize: 0,
    apiConfigFound: false,
    geminiKeyLength: 0,
    openRouterKeyLength: 0,
  };

  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.error('❌ LocalStorage is not available');
      return result;
    }

    // 🔧 FIX: 統一設定から読み込む（ai-chat-v3-storageではなくunified-settingsから）
    const unifiedSettingsData = window.localStorage.getItem('unified-settings');

    if (!unifiedSettingsData) {
      console.error('❌ No unified settings found in localStorage');
      return result;
    }

    result.storageSize = new Blob([unifiedSettingsData]).size;

    const unifiedSettings = JSON.parse(unifiedSettingsData);

    if (!unifiedSettings?.api) {
      console.error('❌ No API settings found in unified settings');
      return result;
    }

    const api = unifiedSettings.api;

    // APIキーの確認
    result.hasGeminiKey = !!(api.geminiApiKey && api.geminiApiKey.length > 0);
    result.hasOpenRouterKey = !!(api.openrouterApiKey && api.openrouterApiKey.length > 0);
    result.geminiKeyLength = api.geminiApiKey?.length || 0;
    result.openRouterKeyLength = api.openrouterApiKey?.length || 0;
    result.useDirectGeminiAPI = api.useDirectGeminiAPI ?? false;

    // API設定の確認
    result.apiConfigFound = true;
    result.currentModel = api.model || 'unknown';
    result.currentProvider = api.provider || 'unknown';

    // デバッグ用に生データも保存（キーは含めない）
    result.rawData = {
      hasApi: !!api,
      apiKeys: Object.keys(api || {}),
      hasGeminiKey: result.hasGeminiKey,
      hasOpenRouterKey: result.hasOpenRouterKey,
    };

  } catch (error) {
    console.error('❌ Error diagnosing API configuration:', error);
  }

  return result;
}

/**
 * 診断結果を見やすく表示
 */
export function printAPIDiagnostics(): void {
  const result = diagnoseAPIConfiguration();

  console.log('\n═══════════════════════════════════════');
  console.log('🔍 API Configuration Diagnostics');
  console.log('═══════════════════════════════════════');
  console.log(`⏰ Timestamp: ${result.timestamp}`);
  console.log(`📦 Storage Size: ${(result.storageSize / 1024).toFixed(2)} KB`);
  console.log('');
  console.log('🔑 API Keys:');
  console.log(`  Gemini API Key: ${result.hasGeminiKey ? '✅ Found' : '❌ Not Found'} (${result.geminiKeyLength} chars)`);
  console.log(`  OpenRouter API Key: ${result.hasOpenRouterKey ? '✅ Found' : '❌ Not Found'} (${result.openRouterKeyLength} chars)`);
  console.log('');
  console.log('⚙️ API Settings:');
  console.log(`  API Config Found: ${result.apiConfigFound ? '✅' : '❌'}`);
  console.log(`  Current Provider: ${result.currentProvider}`);
  console.log(`  Current Model: ${result.currentModel}`);
  console.log(`  Use Direct Gemini API: ${result.useDirectGeminiAPI ? 'ON' : 'OFF'}`);
  console.log('');

  // 問題の診断
  const issues: string[] = [];

  if (!result.hasGeminiKey && !result.hasOpenRouterKey) {
    issues.push('❌ No API keys found in storage');
  }

  if (result.useDirectGeminiAPI && !result.hasGeminiKey) {
    issues.push('⚠️ Direct Gemini API is enabled but Gemini API key is missing');
  }

  if (!result.useDirectGeminiAPI && !result.hasOpenRouterKey) {
    issues.push('⚠️ OpenRouter mode is active but OpenRouter API key is missing');
  }

  if (!result.apiConfigFound) {
    issues.push('⚠️ API configuration not found in storage');
  }

  if (result.geminiKeyLength > 0 && result.geminiKeyLength < 30) {
    issues.push('⚠️ Gemini API key seems too short (likely invalid)');
  }

  if (result.openRouterKeyLength > 0 && result.openRouterKeyLength < 30) {
    issues.push('⚠️ OpenRouter API key seems too short (likely invalid)');
  }

  if (issues.length > 0) {
    console.log('🚨 Issues Detected:');
    issues.forEach(issue => console.log(`  ${issue}`));
  } else {
    console.log('✅ No issues detected');
  }

  console.log('═══════════════════════════════════════\n');
}

/**
 * テストAPI呼び出し（デバッグ用）
 */
export async function testAPICall(): Promise<void> {
  console.log('🧪 Testing API call...');

  const diagnostics = diagnoseAPIConfiguration();
  printAPIDiagnostics();

  if (!diagnostics.hasGeminiKey && !diagnostics.hasOpenRouterKey) {
    console.error('❌ Cannot test API call: No API keys configured');
    return;
  }

  try {
    // simpleAPIManagerV2を動的インポート
    const { simpleAPIManagerV2 } = await import('@/services/simple-api-manager-v2');

    console.log('📤 Sending test API request...');
    const response = await simpleAPIManagerV2.generateMessage(
      'You are a helpful assistant.',
      'Say "Hello" in Japanese.',
      [],
      {
        model: diagnostics.currentModel,
        provider: diagnostics.currentProvider as any,
        temperature: 0.7,
        max_tokens: 100,
      }
    );

    console.log('✅ API call successful!');
    console.log('📥 Response:', response);
  } catch (error: any) {
    console.error('❌ API call failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });
  }
}

// ブラウザのグローバルスコープに診断関数を追加
if (typeof window !== 'undefined') {
  (window as any).__apiDiagnostics = {
    diagnose: diagnoseAPIConfiguration,
    print: printAPIDiagnostics,
    test: testAPICall,
  };

  console.log('💡 API診断ツールが利用可能です:');
  console.log('  - window.__apiDiagnostics.print() - 設定を表示');
  console.log('  - window.__apiDiagnostics.test() - API呼び出しをテスト');
}
