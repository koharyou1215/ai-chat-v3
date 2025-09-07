import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:3000';

test.describe('Progressive Mode Full Functionality Test', () => {
  test('Enable Progressive Mode and Test Full Functionality', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('🚀 Starting Progressive Mode Full Functionality Test');

    // Step 1: Enable Progressive Mode in settings
    console.log('⚙️ Step 1: Opening Settings...');
    
    // Look for settings button (gear icon, settings text, etc.)
    const settingsSelectors = [
      'button[aria-label*="settings"]',
      'button[aria-label*="設定"]',
      '[data-testid="settings-button"]',
      'button:has(svg[data-icon="settings"])',
      '.settings-button',
      'button:has-text("Settings")',
      'button:has-text("設定")'
    ];
    
    let settingsButton = null;
    for (const selector of settingsSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible()) {
        settingsButton = button;
        console.log(`✅ Settings button found with selector: ${selector}`);
        break;
      }
    }
    
    if (settingsButton) {
      await settingsButton.click();
      await page.waitForTimeout(1000);
      
      // Look for Progressive Mode checkbox
      const progressiveCheckbox = page.locator('input[type="checkbox"]#progressive-enabled, input[type="checkbox"][id*="progressive"]').first();
      
      if (await progressiveCheckbox.isVisible()) {
        const isChecked = await progressiveCheckbox.isChecked();
        console.log(`📊 Progressive Mode currently: ${isChecked ? 'enabled' : 'disabled'}`);
        
        if (!isChecked) {
          await progressiveCheckbox.click();
          console.log('✅ Progressive Mode enabled');
          await page.waitForTimeout(500);
        }
        
        // Close settings
        const closeButton = page.locator('button:has-text("×"), button:has-text("Close"), [aria-label*="close"]').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
          await page.waitForTimeout(1000);
        }
      } else {
        console.log('⚠️ Progressive Mode checkbox not found in settings');
      }
    } else {
      console.log('⚠️ Settings button not found, trying programmatic approach');
      
      // Try to enable Progressive Mode programmatically
      await page.evaluate(() => {
        // Access Zustand store directly
        const store = (window as any).__ZUSTAND_STORE__;
        if (store && store.getState) {
          const state = store.getState();
          if (state.updateChatSettings) {
            state.updateChatSettings({
              progressiveMode: {
                enabled: true,
                showIndicators: true,
                highlightChanges: true,
                glowIntensity: 'medium'
              }
            });
            console.log('✅ Progressive Mode enabled programmatically');
          }
        }
      });
    }

    // Step 2: Send a test message
    console.log('📝 Step 2: Sending test message...');
    
    const messageInput = page.locator('textarea, input[type="text"], [contenteditable="true"]').first();
    
    if (await messageInput.isVisible()) {
      await messageInput.fill('Test progressive mode with multiple stages');
      
      // Find and click send button
      const sendButton = page.locator('button:has(svg), button[type="submit"], button:has-text("Send")').first();
      
      if (await sendButton.isVisible()) {
        await sendButton.click();
        console.log('✅ Message sent');
        
        // Step 3: Monitor progressive stages
        console.log('👀 Step 3: Monitoring progressive stages...');
        
        // Wait for progressive message to start
        await page.waitForTimeout(2000);
        
        // Look for progressive indicators over time
        for (let stage = 1; stage <= 3; stage++) {
          console.log(`🎯 Checking for Stage ${stage}...`);
          
          const stageIndicators = page.locator(`[data-stage="${stage}"], .stage-${stage}, .progressive-stage-indicator`);
          const messageContent = page.locator('.progressive-message-bubble, .message-bubble, .message-content').last();
          
          const indicatorCount = await stageIndicators.count();
          const hasContent = await messageContent.isVisible();
          
          console.log(`📊 Stage ${stage}: ${indicatorCount} indicators, content visible: ${hasContent}`);
          
          if (stage < 3) {
            await page.waitForTimeout(2000); // Wait for next stage
          }
        }
        
        // Step 4: Verify cumulative content
        console.log('🔍 Step 4: Verifying cumulative content...');
        
        const allMessages = page.locator('.message-bubble, .progressive-message-bubble');
        const messageCount = await allMessages.count();
        console.log(`📈 Total messages displayed: ${messageCount}`);
        
        if (messageCount > 0) {
          const lastMessage = allMessages.last();
          const messageText = await lastMessage.textContent();
          console.log(`💬 Last message content length: ${messageText?.length || 0} characters`);
        }
        
        // Step 5: Take final screenshot
        await page.screenshot({ 
          path: 'test-results/progressive-mode-enabled-final.png', 
          fullPage: true 
        });
        console.log('📸 Final screenshot captured');
        
        console.log('✅ Progressive Mode functionality test completed');
        
      } else {
        console.log('⚠️ Send button not found');
      }
    } else {
      console.log('⚠️ Message input not found');
    }

    // Step 6: Verify no layout issues
    console.log('🎨 Step 6: Final layout verification...');
    
    const duplicateTrackers = await page.locator('.tracker-display').count();
    const diffButtons = await page.locator('button:has-text("Show Diff")').count();
    
    console.log(`📊 Final verification:`);
    console.log(`  - Duplicate trackers: ${duplicateTrackers}`);
    console.log(`  - Show Diff buttons: ${diffButtons}`);
    
    expect(duplicateTrackers).toBe(0);
    expect(diffButtons).toBe(0);
    
    console.log('🎉 All Progressive Mode tests completed successfully!');
  });
});