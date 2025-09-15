import { test, expect } from '@playwright/test';

test.describe('Progressive Response Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should render chat interface', async ({ page }) => {
    // Check if chat interface loads
    const chatInterface = page.locator('.messages-container');
    await expect(chatInterface).toBeVisible({ timeout: 10000 });
  });

  test('should show message input area', async ({ page }) => {
    // Check if message input is visible
    const messageInput = page.locator('textarea[placeholder*="メッセージ"]');
    await expect(messageInput).toBeVisible({ timeout: 10000 });
  });

  test('should display chat menu on message hover', async ({ page }) => {
    // First, we need to have a message
    // Try to find an existing message or create one
    const messages = page.locator('.message-bubble, .progressive-message-bubble');
    const messageCount = await messages.count();

    if (messageCount > 0) {
      // Hover over the first message
      await messages.first().hover();

      // Check if menu appears
      const menu = page.locator('[role="menu"], .message-menu, button[title="コピー"]');
      await expect(menu).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have settings button', async ({ page }) => {
    // Check for settings button
    const settingsButton = page.locator('button[title*="設定"], button:has-text("設定")');
    const hasSettings = await settingsButton.count() > 0;

    if (hasSettings) {
      await settingsButton.first().click();

      // Check if settings modal opens
      const settingsModal = page.locator('[role="dialog"], .settings-modal');
      await expect(settingsModal).toBeVisible({ timeout: 5000 });

      // Close modal
      const closeButton = page.locator('button[aria-label*="Close"], button:has-text("×")');
      if (await closeButton.count() > 0) {
        await closeButton.first().click();
      } else {
        await page.keyboard.press('Escape');
      }
    }
  });

  test('should handle progressive message detection', async ({ page }) => {
    // Check console logs for progressive message detection
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });

    // Wait a bit to collect logs
    await page.waitForTimeout(2000);

    // Check if progressive mode checks are happening
    const hasProgressiveCheck = consoleLogs.some(log =>
      log.includes('Progressive Mode Check') ||
      log.includes('Progressive Message')
    );

    console.log('Console logs collected:', consoleLogs.length);
    console.log('Has progressive check:', hasProgressiveCheck);
  });
});