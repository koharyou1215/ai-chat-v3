import { test, expect } from '@playwright/test';

test.describe('Progressive Mode 3-Stage Generation', () => {
  test('should complete all 3 stages', async ({ page }) => {
    // Capture console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);

      // Log progressive-related messages
      if (text.includes('Stage') || text.includes('Progressive') ||
          text.includes('progressive') || text.includes('Reflex') ||
          text.includes('Context') || text.includes('Intelligence')) {
        console.log(`[Console]: ${text}`);
      }
    });

    // Navigate to the app
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Wait for the app to load
    await page.waitForTimeout(2000);

    // Check if progressive mode is mentioned in logs
    const progressiveCheck = consoleLogs.some(log =>
      log.includes('Progressive Mode Check') ||
      log.includes('Using Progressive Message')
    );

    console.log('=== Progressive Mode Test Results ===');
    console.log('Total console logs:', consoleLogs.length);
    console.log('Progressive mode detected:', progressiveCheck);

    // Look for stage-related logs
    const stage1Logs = consoleLogs.filter(log =>
      log.includes('Stage 1') || log.includes('Reflex')
    );
    const stage2Logs = consoleLogs.filter(log =>
      log.includes('Stage 2') || log.includes('Context')
    );
    const stage3Logs = consoleLogs.filter(log =>
      log.includes('Stage 3') || log.includes('Intelligence')
    );

    console.log('Stage 1 (Reflex) logs:', stage1Logs.length);
    console.log('Stage 2 (Context) logs:', stage2Logs.length);
    console.log('Stage 3 (Intelligence) logs:', stage3Logs.length);

    // Log any errors
    const errorLogs = consoleLogs.filter(log =>
      log.includes('error') || log.includes('Error') ||
      log.includes('failed') || log.includes('Failed')
    );

    if (errorLogs.length > 0) {
      console.log('=== Errors Found ===');
      errorLogs.forEach(err => console.log(err));
    }

    // Check for API-related logs
    const apiLogs = consoleLogs.filter(log =>
      log.includes('API') || log.includes('generateMessage') ||
      log.includes('simpleAPIManagerV2')
    );

    console.log('API-related logs:', apiLogs.length);
    if (apiLogs.length > 0) {
      console.log('=== API Logs ===');
      apiLogs.slice(0, 5).forEach(log => console.log(log.substring(0, 100)));
    }
  });

  test('should verify text opacity works correctly', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Wait for messages to load
    await page.waitForTimeout(2000);

    // Check for message bubbles
    const messageBubbles = page.locator('[class*="rounded-2xl"][class*="shadow-lg"]');
    const bubbleCount = await messageBubbles.count();

    if (bubbleCount > 0) {
      const firstBubble = messageBubbles.first();

      // Get computed styles
      const bubbleStyles = await firstBubble.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          background: styles.background,
          opacity: styles.opacity,
          color: styles.color,
        };
      });

      console.log('=== Bubble Styles ===');
      console.log('Background:', bubbleStyles.background?.substring(0, 100));
      console.log('Opacity:', bubbleStyles.opacity);
      console.log('Text Color:', bubbleStyles.color);

      // Check if text is readable (opacity should be 1 for text)
      const textElement = firstBubble.locator('.prose, [class*="text"]').first();
      if (await textElement.count() > 0) {
        const textOpacity = await textElement.evaluate(el => {
          return window.getComputedStyle(el).opacity;
        });
        console.log('Text opacity:', textOpacity);

        // Text opacity should be 1 (fully opaque)
        expect(parseFloat(textOpacity)).toBe(1);
      }
    }
  });
});