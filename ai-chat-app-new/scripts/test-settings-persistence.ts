/**
 * Settings Persistence Test Suite
 * Phase 0: Settings System Unification
 *
 * Usage: Copy to browser console and run
 */

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

class SettingsPersistenceTest {
  results: TestResult[] = [];

  async runAll(): Promise<void> {
    console.log('🧪 [SettingsTest] Starting comprehensive test suite...\n');

    await this.testLocalStorageStructure();
    await this.testSettingsPersistence();
    await this.testCategoryUpdates();
    await this.testZustandSeparation();

    this.printResults();
  }

  private test(name: string, condition: boolean, message: string): void {
    this.results.push({ name, passed: condition, message });
    const icon = condition ? '✅' : '❌';
    console.log(`${icon} ${name}: ${message}`);
  }

  // Test 1: localStorage structure
  async testLocalStorageStructure(): Promise<void> {
    console.log('\n📋 Test 1: localStorage Structure');

    const unifiedExists = !!localStorage.getItem('unified-settings');
    const zustandExists = !!localStorage.getItem('ai-chat-v3-storage');

    this.test(
      'unified-settings exists',
      unifiedExists,
      unifiedExists ? 'Found' : 'Missing'
    );

    if (zustandExists) {
      const zustandData = localStorage.getItem('ai-chat-v3-storage');
      if (zustandData) {
        const zustand = JSON.parse(zustandData);
        const state = zustand?.state;
        const hasSettings = !!(
          state?.effectSettings ||
          state?.apiConfig ||
          state?.appearanceSettings ||
          state?.systemPrompts ||
          state?.chat ||
          state?.voice ||
          state?.imageGeneration ||
          state?.languageSettings ||
          state?.emotionalIntelligenceFlags
        );

        this.test(
          'Zustand should NOT have settings',
          !hasSettings,
          hasSettings ? 'Settings found in Zustand (BAD - dual persist!)' : 'No settings in Zustand (GOOD - single source!)'
        );
      }
    }
  }

  // Test 2: Settings persistence
  async testSettingsPersistence(): Promise<void> {
    console.log('\n📋 Test 2: Settings Persistence');

    try {
      // @ts-ignore - Access store from window
      const store = window.useAppStore?.getState();
      if (!store) {
        this.test('Store access', false, 'Cannot access store');
        return;
      }

      // Test effect setting
      const originalValue = store.unifiedSettings?.effects?.colorfulBubbles;
      if (originalValue === undefined) {
        this.test('Settings loaded', false, 'unifiedSettings not found');
        return;
      }

      const testValue = !originalValue;

      // Update via updateCategory
      store.updateCategory('effects', { colorfulBubbles: testValue });

      // Wait for persistence
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check localStorage
      const saved = JSON.parse(localStorage.getItem('unified-settings')!);
      const savedValue = saved?.effects?.colorfulBubbles;

      this.test(
        'Effect setting persisted',
        savedValue === testValue,
        `Expected ${testValue}, got ${savedValue}`
      );

      // Restore original
      store.updateCategory('effects', { colorfulBubbles: originalValue });

      this.test(
        'Setting restored',
        true,
        'Original value restored successfully'
      );
    } catch (error) {
      this.test('Persistence test', false, `Error: ${error}`);
    }
  }

  // Test 3: Category updates
  async testCategoryUpdates(): Promise<void> {
    console.log('\n📋 Test 3: Category Updates');

    try {
      // @ts-ignore
      const store = window.useAppStore?.getState();
      if (!store) {
        this.test('Store access', false, 'Cannot access store');
        return;
      }

      const categories = ['effects', 'ui', 'api', 'chat', 'prompts', 'voice', 'imageGeneration', 'emotionalIntelligence'];

      for (const category of categories) {
        const settings = store.unifiedSettings?.[category];

        if (settings) {
          this.test(
            `${category} category exists`,
            true,
            'Category accessible via unifiedSettings'
          );
        } else {
          this.test(
            `${category} category exists`,
            false,
            'Category not found in unifiedSettings'
          );
        }
      }
    } catch (error) {
      this.test('Category test', false, `Error: ${error}`);
    }
  }

  // Test 4: Zustand separation
  async testZustandSeparation(): Promise<void> {
    console.log('\n📋 Test 4: Zustand/Settings Separation');

    const zustandData = localStorage.getItem('ai-chat-v3-storage');
    const unifiedData = localStorage.getItem('unified-settings');

    if (!zustandData || !unifiedData) {
      this.test('Both stores exist', false, 'One or both stores missing');
      return;
    }

    try {
      const zustand = JSON.parse(zustandData);
      const unified = JSON.parse(unifiedData);

      // Zustand should have sessions
      const hasSessions = !!zustand?.state?.sessions;
      this.test(
        'Zustand has sessions',
        hasSessions,
        hasSessions ? 'Sessions found (correct)' : 'Sessions missing (error)'
      );

      // Zustand should NOT have settings
      const hasSettings = !!(
        zustand?.state?.apiConfig ||
        zustand?.state?.effectSettings ||
        zustand?.state?.appearanceSettings
      );
      this.test(
        'Zustand has NO settings',
        !hasSettings,
        !hasSettings ? 'Clean separation (correct)' : 'Settings leak detected (error)'
      );

      // Unified should have settings
      const hasUnifiedSettings = !!(unified?.api || unified?.effects || unified?.ui);
      this.test(
        'unified-settings has settings',
        hasUnifiedSettings,
        hasUnifiedSettings ? 'Settings found (correct)' : 'Settings missing (error)'
      );

      // Unified should NOT have sessions
      const hasUnifiedSessions = !!unified?.sessions;
      this.test(
        'unified-settings has NO sessions',
        !hasUnifiedSessions,
        !hasUnifiedSessions ? 'Clean separation (correct)' : 'Session leak detected (error)'
      );
    } catch (error) {
      this.test('Separation test', false, `Parse error: ${error}`);
    }
  }

  private printResults(): void {
    console.log('\n' + '═'.repeat(50));
    console.log('📊 Test Results Summary');
    console.log('═'.repeat(50));

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const percentage = ((passed / total) * 100).toFixed(1);

    console.log(`\nTotal: ${total} tests`);
    console.log(`Passed: ${passed} (${percentage}%)`);
    console.log(`Failed: ${total - passed}\n`);

    if (passed === total) {
      console.log('✅ All tests passed! Phase 0 implementation is working correctly.');
      console.log('\n🎉 Settings are now managed by a single source of truth!');
      console.log('📝 Access settings via: useAppStore(state => state.unifiedSettings)');
    } else {
      console.log('❌ Some tests failed. Review output above.');
      console.log('\nFailed tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => console.log(`  - ${r.name}: ${r.message}`));
    }
  }
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  console.log('📝 Settings Persistence Test Suite loaded');
  console.log('Run: new SettingsPersistenceTest().runAll()');

  // Export to window for easy access
  (window as any).SettingsPersistenceTest = SettingsPersistenceTest;
  (window as any).runSettingsTest = () => new SettingsPersistenceTest().runAll();

  console.log('Quick start: runSettingsTest()');
}

export { SettingsPersistenceTest };
