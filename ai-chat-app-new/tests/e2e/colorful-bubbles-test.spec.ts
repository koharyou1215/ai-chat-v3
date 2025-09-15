import { test, expect } from '@playwright/test';

test.describe('Colorful Bubbles Effect', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should check if colorful bubbles setting exists', async ({ page }) => {
    // Try to open settings
    const settingsButton = page.locator('button[title*="設定"], button:has-text("設定")').first();

    if (await settingsButton.count() > 0) {
      await settingsButton.click();

      // Look for effects tab
      const effectsTab = page.locator('button:has-text("エフェクト"), button:has-text("Effects")');
      if (await effectsTab.count() > 0) {
        await effectsTab.click();

        // Check for colorful bubbles toggle
        const colorfulBubblesToggle = page.locator('label:has-text("カラフル"), label:has-text("Colorful")');
        await expect(colorfulBubblesToggle).toBeVisible({ timeout: 5000 });
      }

      // Close settings
      await page.keyboard.press('Escape');
    }
  });

  test('should verify message bubble classes', async ({ page }) => {
    // Check if any message bubbles exist
    const messageBubbles = page.locator('[class*="rounded-2xl"][class*="shadow-lg"]');
    const bubbleCount = await messageBubbles.count();

    if (bubbleCount > 0) {
      // Check first bubble for gradient classes
      const firstBubble = messageBubbles.first();
      const bubbleClass = await firstBubble.getAttribute('class');

      console.log('Bubble classes:', bubbleClass);

      // Check for gradient background classes
      const hasGradient = bubbleClass?.includes('bg-gradient') || false;
      const hasColorfulClasses =
        bubbleClass?.includes('from-purple') ||
        bubbleClass?.includes('from-blue') ||
        bubbleClass?.includes('via-blue') ||
        bubbleClass?.includes('to-teal') ||
        false;

      console.log('Has gradient:', hasGradient);
      console.log('Has colorful classes:', hasColorfulClasses);
    }
  });

  test('should check effect components loading', async ({ page }) => {
    // Check console for effect-related messages
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('effect') || text.includes('Effect') ||
          text.includes('particle') || text.includes('Particle') ||
          text.includes('colorful') || text.includes('Colorful')) {
        consoleLogs.push(text);
      }
    });

    // Wait and check for effects
    await page.waitForTimeout(3000);

    // Check for MessageEffects component
    const hasEffectComponent = await page.locator('[class*="particle"], [class*="effect"]').count() > 0;

    console.log('Effect-related logs:', consoleLogs);
    console.log('Has effect components:', hasEffectComponent);
  });

  test('should verify progressive message bubble styles', async ({ page }) => {
    // Check for progressive message bubbles
    const progressiveBubbles = page.locator('.progressive-message-bubble');
    const progressiveCount = await progressiveBubbles.count();

    if (progressiveCount > 0) {
      const firstProgressive = progressiveBubbles.first();
      const messageContent = firstProgressive.locator('.message-content');

      if (await messageContent.count() > 0) {
        const contentClass = await messageContent.getAttribute('class');
        console.log('Progressive bubble classes:', contentClass);

        // Check for colorful gradient
        const hasColorfulGradient =
          contentClass?.includes('from-purple-500/20') ||
          contentClass?.includes('via-blue-500/20') ||
          contentClass?.includes('to-teal-500/20') ||
          false;

        console.log('Progressive has colorful gradient:', hasColorfulGradient);
      }
    }
  });
});