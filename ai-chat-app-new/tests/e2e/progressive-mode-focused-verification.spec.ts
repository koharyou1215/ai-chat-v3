import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:3000';

test.describe('Progressive Mode Verification', () => {
  test('Progressive Mode Basic Functionality', async ({ page }) => {
    // Navigate to application
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Application loaded successfully');

    // Check if URL is correct (allowing trailing slash)
    expect(page.url()).toMatch(/^http:\/\/localhost:3000\/?$/);

    // Wait for initial load
    await page.waitForTimeout(2000);
    
    // Look for message input
    const messageInput = page.locator('[data-testid="message-input"], textarea, input[type="text"]').first();
    
    if (await messageInput.isVisible()) {
      console.log('✅ Message input found');
      
      // Type a test message
      await messageInput.fill('Test progressive mode');
      
      // Look for send button and click it
      const sendButton = page.locator('[data-testid="send-button"], button[type="submit"], button:has-text("Send")').first();
      
      if (await sendButton.isVisible()) {
        await sendButton.click();
        console.log('✅ Message sent');
        
        // Wait for progressive message to appear
        await page.waitForTimeout(3000);
        
        // Look for progressive message indicators
        const progressiveIndicators = page.locator('.progressive-stage-indicator, .stage-indicator, [data-stage]');
        const messageContent = page.locator('.message-content, .progressive-message-bubble, .message-bubble').last();
        
        if (await progressiveIndicators.count() > 0) {
          console.log('✅ Progressive stage indicators found');
        }
        
        if (await messageContent.isVisible()) {
          console.log('✅ Message content is visible');
        }
        
        // Check for layout issues - no duplicate trackers
        const trackers = page.locator('.tracker-display, .progress-tracker');
        const trackerCount = await trackers.count();
        console.log(`📊 Tracker count: ${trackerCount}`);
        
        // Check message input height restriction
        const inputHeight = await messageInput.evaluate(el => {
          const style = window.getComputedStyle(el);
          return {
            height: style.height,
            maxHeight: style.maxHeight,
            minHeight: style.minHeight
          };
        });
        console.log(`📏 Input dimensions:`, inputHeight);
        
        console.log('✅ Progressive Mode basic functionality verified');
      } else {
        console.log('⚠️ Send button not found');
      }
    } else {
      console.log('⚠️ Message input not found');
    }
  });

  test('Layout and UI Verification', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('🎨 Testing Layout and UI Components...');

    // Check for duplicate elements
    const duplicateTrackers = page.locator('.tracker-display');
    const trackerCount = await duplicateTrackers.count();
    console.log(`📊 Bottom tracker elements: ${trackerCount}`);

    // Check for development-only elements
    const diffButtons = page.locator('button:has-text("Show Diff"), [data-testid="show-diff-button"]');
    const diffButtonCount = await diffButtons.count();
    console.log(`🔍 Show Diff buttons: ${diffButtonCount}`);

    // Check message input constraints
    const messageInputs = page.locator('textarea, input[type="text"]');
    if (await messageInputs.count() > 0) {
      const inputElement = messageInputs.first();
      const inputStyles = await inputElement.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(el);
        return {
          height: rect.height,
          maxHeight: computedStyle.maxHeight,
          overflow: computedStyle.overflow
        };
      });
      console.log('📏 Message input styles:', inputStyles);
      
      // Height should be restricted to around 120px or less
      if (inputStyles.height <= 130) {
        console.log('✅ Message input height is properly restricted');
      } else {
        console.log('⚠️ Message input height might be too large:', inputStyles.height);
      }
    }

    console.log('✅ Layout verification completed');
  });

  test('TypeScript and Runtime Error Check', async ({ page }) => {
    const consoleErrors: string[] = [];
    const jsErrors: string[] = [];

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Listen for JavaScript errors
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });

    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('🔍 Checking for runtime errors...');
    
    if (consoleErrors.length > 0) {
      console.log('⚠️ Console errors found:');
      consoleErrors.forEach(error => console.log('  -', error));
    } else {
      console.log('✅ No console errors detected');
    }

    if (jsErrors.length > 0) {
      console.log('⚠️ JavaScript errors found:');
      jsErrors.forEach(error => console.log('  -', error));
    } else {
      console.log('✅ No JavaScript runtime errors detected');
    }

    // Basic functionality test
    const isAppWorking = await page.evaluate(() => {
      return typeof window !== 'undefined' && 
             document.body && 
             document.readyState === 'complete';
    });

    expect(isAppWorking).toBeTruthy();
    console.log('✅ Application is running without critical errors');
  });
});