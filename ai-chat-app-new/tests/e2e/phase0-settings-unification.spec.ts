/**
 * Phase 0: Settings System Unification - E2E Test
 *
 * Tests:
 * 1. Settings persist correctly across page reload
 * 2. No duplicate settings in localStorage
 * 3. Settings are stored in single source (unified-settings)
 * 4. Zustand persist does NOT contain settings
 */

import { test, expect } from '@playwright/test';

test.describe('Phase 0: Settings Unification', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should store settings in unified-settings only', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Check localStorage structure
    const storageCheck = await page.evaluate(() => {
      const unifiedSettings = localStorage.getItem('unified-settings');
      const zustandStorage = localStorage.getItem('ai-chat-v3-storage');

      return {
        hasUnified: !!unifiedSettings,
        hasZustand: !!zustandStorage,
        unifiedData: unifiedSettings ? JSON.parse(unifiedSettings) : null,
        zustandData: zustandStorage ? JSON.parse(zustandStorage) : null,
      };
    });

    // Verify unified-settings exists
    expect(storageCheck.hasUnified).toBe(true);

    // Verify unified-settings has settings structure
    expect(storageCheck.unifiedData).toHaveProperty('api');
    expect(storageCheck.unifiedData).toHaveProperty('effects');
    expect(storageCheck.unifiedData).toHaveProperty('ui');
    expect(storageCheck.unifiedData).toHaveProperty('chat');
    expect(storageCheck.unifiedData).toHaveProperty('prompts');
    expect(storageCheck.unifiedData).toHaveProperty('voice');
    expect(storageCheck.unifiedData).toHaveProperty('imageGeneration');
    expect(storageCheck.unifiedData).toHaveProperty('emotionalIntelligence');

    // Verify Zustand does NOT have settings if it exists
    if (storageCheck.hasZustand && storageCheck.zustandData?.state) {
      const state = storageCheck.zustandData.state;
      expect(state).not.toHaveProperty('apiConfig');
      expect(state).not.toHaveProperty('effectSettings');
      expect(state).not.toHaveProperty('appearanceSettings');
      expect(state).not.toHaveProperty('systemPrompts');
      expect(state).not.toHaveProperty('languageSettings');
      expect(state).not.toHaveProperty('emotionalIntelligenceFlags');
    }
  });

  test('should persist effect settings across reload', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Get initial colorfulBubbles value
    const initialValue = await page.evaluate(() => {
      // @ts-ignore
      const store = window.useAppStore?.getState();
      return store?.unifiedSettings?.effects?.colorfulBubbles;
    });

    expect(initialValue).toBeDefined();

    // Toggle the value
    const newValue = !initialValue;
    await page.evaluate((val) => {
      // @ts-ignore
      const store = window.useAppStore?.getState();
      store?.updateCategory('effects', { colorfulBubbles: val });
    }, newValue);

    // Wait for persistence
    await page.waitForTimeout(200);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check if value persisted
    const persistedValue = await page.evaluate(() => {
      // @ts-ignore
      const store = window.useAppStore?.getState();
      return store?.unifiedSettings?.effects?.colorfulBubbles;
    });

    expect(persistedValue).toBe(newValue);

    // Restore original value
    await page.evaluate((val) => {
      // @ts-ignore
      const store = window.useAppStore?.getState();
      store?.updateCategory('effects', { colorfulBubbles: val });
    }, initialValue);
  });

  test('should persist API settings across reload', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Update API temperature
    const testTemperature = 0.85;
    await page.evaluate((temp) => {
      // @ts-ignore
      const store = window.useAppStore?.getState();
      store?.updateCategory('api', { temperature: temp });
    }, testTemperature);

    await page.waitForTimeout(200);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check if value persisted
    const persistedTemp = await page.evaluate(() => {
      // @ts-ignore
      const store = window.useAppStore?.getState();
      return store?.unifiedSettings?.api?.temperature;
    });

    expect(persistedTemp).toBe(testTemperature);
  });

  test('should persist UI settings across reload', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Update theme
    const testTheme = 'midnight';
    await page.evaluate((theme) => {
      // @ts-ignore
      const store = window.useAppStore?.getState();
      store?.updateCategory('ui', { theme });
    }, testTheme);

    await page.waitForTimeout(200);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check if value persisted
    const persistedTheme = await page.evaluate(() => {
      // @ts-ignore
      const store = window.useAppStore?.getState();
      return store?.unifiedSettings?.ui?.theme;
    });

    expect(persistedTheme).toBe(testTheme);
  });

  test('should maintain Zustand/Settings separation', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    const separation = await page.evaluate(() => {
      const zustandData = localStorage.getItem('ai-chat-v3-storage');
      const unifiedData = localStorage.getItem('unified-settings');

      if (!zustandData || !unifiedData) {
        return { valid: false, reason: 'Missing storage' };
      }

      const zustand = JSON.parse(zustandData);
      const unified = JSON.parse(unifiedData);

      // Check Zustand has sessions, not settings
      const zustandHasSessions = !!zustand?.state?.sessions;
      const zustandHasSettings = !!(
        zustand?.state?.apiConfig ||
        zustand?.state?.effectSettings ||
        zustand?.state?.appearanceSettings
      );

      // Check Unified has settings, not sessions
      const unifiedHasSettings = !!(unified?.api || unified?.effects);
      const unifiedHasSessions = !!unified?.sessions;

      return {
        valid: zustandHasSessions && !zustandHasSettings && unifiedHasSettings && !unifiedHasSessions,
        zustandHasSessions,
        zustandHasSettings,
        unifiedHasSettings,
        unifiedHasSessions,
      };
    });

    expect(separation.valid).toBe(true);
    expect(separation.zustandHasSessions).toBe(true);
    expect(separation.zustandHasSettings).toBe(false);
    expect(separation.unifiedHasSettings).toBe(true);
    expect(separation.unifiedHasSessions).toBe(false);
  });

  test('should handle multiple setting updates correctly', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Update multiple settings
    await page.evaluate(() => {
      // @ts-ignore
      const store = window.useAppStore?.getState();
      store?.updateCategory('effects', { colorfulBubbles: true, typewriterEffect: false });
      store?.updateCategory('ui', { theme: 'cosmic', fontSize: 'large' });
      store?.updateCategory('api', { temperature: 0.9, maxTokens: 4096 });
    });

    await page.waitForTimeout(200);

    // Reload
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify all persisted
    const values = await page.evaluate(() => {
      // @ts-ignore
      const store = window.useAppStore?.getState();
      return {
        colorfulBubbles: store?.unifiedSettings?.effects?.colorfulBubbles,
        typewriterEffect: store?.unifiedSettings?.effects?.typewriterEffect,
        theme: store?.unifiedSettings?.ui?.theme,
        fontSize: store?.unifiedSettings?.ui?.fontSize,
        temperature: store?.unifiedSettings?.api?.temperature,
        maxTokens: store?.unifiedSettings?.api?.maxTokens,
      };
    });

    expect(values.colorfulBubbles).toBe(true);
    expect(values.typewriterEffect).toBe(false);
    expect(values.theme).toBe('cosmic');
    expect(values.fontSize).toBe('large');
    expect(values.temperature).toBe(0.9);
    expect(values.maxTokens).toBe(4096);
  });
});
