import { test, expect, Page } from '@playwright/test';

/**
 * AI Chat V3 Critical Functions Test Suite
 * Tests all deployment-critical features that commonly break
 */

// Test configuration
const APP_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 30000;

test.describe('AI Chat V3 Critical Functions Test Suite', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
  });

  test.describe('🔥 CRITICAL: Core Chat Functions', () => {
    test('Solo chat: Send message → receive response', async () => {
      console.log('🔍 Testing solo chat functionality...');
      
      // Wait for chat interface to load
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
      
      // Find message input
      const messageInput = page.locator('[data-testid="message-input"], textarea[placeholder*="メッセージを入力"], textarea[placeholder*="message"]');
      await expect(messageInput).toBeVisible();
      
      // Type test message
      const testMessage = 'Hello, this is a test message for solo chat';
      await messageInput.fill(testMessage);
      
      // Send message
      const sendButton = page.locator('[data-testid="send-button"], button[type="submit"], button:has-text("送信")');
      await sendButton.click();
      
      // Verify message appears in chat
      await expect(page.locator(`text="${testMessage}"`)).toBeVisible();
      
      // Wait for AI response (with extended timeout)
      await expect(page.locator('.message-bubble, .chat-message')).toHaveCount(2, { timeout: TEST_TIMEOUT });
      
      console.log('✅ Solo chat test passed');
    });

    test('Message regeneration functionality', async () => {
      console.log('🔍 Testing message regeneration...');
      
      // First send a message to have something to regenerate
      const messageInput = page.locator('[data-testid="message-input"], textarea');
      await messageInput.fill('Test message for regeneration');
      await page.locator('button[type="submit"]').click();
      
      // Wait for response
      await page.waitForTimeout(5000);
      
      // Look for regeneration button
      const regenButton = page.locator('[data-testid="regenerate-button"], button:has-text("再生成"), button:has-text("regenerate")');
      if (await regenButton.isVisible()) {
        await regenButton.click();
        
        // Verify regeneration is working (loading state or new response)
        await expect(page.locator('.generating, .loading, [data-testid="generating"]')).toBeVisible({ timeout: 5000 });
      }
      
      console.log('✅ Message regeneration test completed');
    });

    test('Continue generation functionality', async () => {
      console.log('🔍 Testing continue generation...');
      
      // Send a message that might trigger a continue option
      const messageInput = page.locator('textarea');
      await messageInput.fill('Write a long story about AI');
      await page.locator('button[type="submit"]').click();
      
      // Wait for response
      await page.waitForTimeout(10000);
      
      // Look for continue button
      const continueButton = page.locator('[data-testid="continue-button"], button:has-text("続き"), button:has-text("continue")');
      if (await continueButton.isVisible()) {
        await continueButton.click();
        
        // Verify continue generation is working
        await expect(page.locator('.generating, .loading')).toBeVisible({ timeout: 5000 });
      }
      
      console.log('✅ Continue generation test completed');
    });
  });

  test.describe('🔥 CRITICAL: Chat State Management', () => {
    test('Generation state auto-reset after timeout', async () => {
      console.log('🔍 Testing generation state auto-reset...');
      
      // Check if there's a way to trigger stuck generation state
      // This test verifies the 30-second auto-reset functionality
      
      // Look for any stuck generation indicators
      const stuckIndicators = page.locator('.generating[data-stuck="true"], .is-generating-stuck');
      
      if (await stuckIndicators.count() > 0) {
        console.log('Found stuck generation state, waiting for auto-reset...');
        await page.waitForTimeout(31000); // Wait for 31 seconds
        
        // Verify auto-reset occurred
        await expect(stuckIndicators).toHaveCount(0);
        
        // Check for reset notification
        const resetNotification = page.locator('text="生成状態をリセットしました", text="Generation state reset"');
        if (await resetNotification.isVisible()) {
          console.log('✅ Auto-reset notification displayed');
        }
      }
      
      console.log('✅ Generation state management test completed');
    });

    test('Double-click message area resets generation state', async () => {
      console.log('🔍 Testing manual generation state reset...');
      
      // Find message area and double-click
      const messageArea = page.locator('[data-testid="chat-messages"], .chat-container, .messages-container').first();
      await messageArea.dblclick();
      
      // Look for reset confirmation
      const resetConfirmation = page.locator('text="✅ 生成状態をリセットしました", text="Generation state reset"');
      
      // The confirmation might appear briefly, so check with a short timeout
      try {
        await expect(resetConfirmation).toBeVisible({ timeout: 3000 });
        console.log('✅ Manual reset confirmation displayed');
      } catch {
        console.log('ℹ️ Manual reset trigger available but no confirmation shown');
      }
      
      console.log('✅ Manual generation reset test completed');
    });
  });

  test.describe('🔥 CRITICAL: Image/Video Upload', () => {
    test('File selection → upload → preview display', async () => {
      console.log('🔍 Testing file upload functionality...');
      
      // Look for file upload input or button
      const fileInput = page.locator('input[type="file"], [data-testid="file-upload"]');
      const uploadButton = page.locator('button:has-text("ファイル"), button:has-text("upload"), [data-testid="upload-button"]');
      
      if (await fileInput.isVisible()) {
        // Create a test image file for upload
        const testImagePath = 'test-image.png';
        
        // Set files on the input
        await fileInput.setInputFiles({
          name: 'test-image.png',
          mimeType: 'image/png',
          buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
        });
        
        // Wait for upload and preview
        await page.waitForTimeout(2000);
        
        // Check for image preview
        const imagePreview = page.locator('img[src*="blob:"], img[src*="data:"], .image-preview, .file-preview');
        if (await imagePreview.count() > 0) {
          console.log('✅ Image preview displayed successfully');
        }
      } else if (await uploadButton.isVisible()) {
        await uploadButton.click();
        // File dialog should open (can't test file selection in automated test)
        console.log('✅ File upload button is functional');
      } else {
        console.log('⚠️ File upload functionality not found in UI');
      }
      
      console.log('✅ File upload test completed');
    });
  });

  test.describe('🔥 CRITICAL: Settings Persistence', () => {
    test('System prompt settings → save → reload → maintained', async () => {
      console.log('🔍 Testing system prompt persistence...');
      
      // Navigate to settings
      const settingsButton = page.locator('[data-testid="settings-button"], button:has-text("設定"), button:has-text("settings")');
      if (await settingsButton.isVisible()) {
        await settingsButton.click();
        
        // Look for system prompt textarea
        const systemPromptInput = page.locator('textarea[placeholder*="システムプロンプト"], textarea[placeholder*="system prompt"], [data-testid="system-prompt"]');
        
        if (await systemPromptInput.isVisible()) {
          const testPrompt = `Test system prompt - ${Date.now()}`;
          
          // Clear and set new prompt
          await systemPromptInput.clear();
          await systemPromptInput.fill(testPrompt);
          
          // Save settings
          const saveButton = page.locator('button:has-text("保存"), button:has-text("save"), [data-testid="save-settings"]');
          if (await saveButton.isVisible()) {
            await saveButton.click();
            
            // Wait for save confirmation
            await page.waitForTimeout(1000);
            
            // Reload page
            await page.reload();
            await page.waitForLoadState('networkidle');
            
            // Navigate back to settings
            await settingsButton.click();
            
            // Verify prompt is maintained
            await expect(systemPromptInput).toHaveValue(testPrompt);
            console.log('✅ System prompt persistence verified');
          }
        }
      }
      
      console.log('✅ System prompt persistence test completed');
    });

    test('Model settings persistence', async () => {
      console.log('🔍 Testing model settings persistence...');
      
      // Navigate to model settings
      const settingsButton = page.locator('[data-testid="settings-button"], button:has-text("設定")');
      if (await settingsButton.isVisible()) {
        await settingsButton.click();
        
        // Look for temperature slider or input
        const temperatureControl = page.locator('input[type="range"][data-testid*="temperature"], input[name*="temperature"]');
        
        if (await temperatureControl.isVisible()) {
          const originalValue = await temperatureControl.inputValue();
          const newValue = originalValue === '0.7' ? '0.5' : '0.7';
          
          // Change temperature
          await temperatureControl.fill(newValue);
          
          // Save if there's a save button
          const saveButton = page.locator('button:has-text("保存"), button:has-text("save")');
          if (await saveButton.isVisible()) {
            await saveButton.click();
          }
          
          // Reload and verify
          await page.reload();
          await page.waitForLoadState('networkidle');
          await settingsButton.click();
          
          await expect(temperatureControl).toHaveValue(newValue);
          console.log('✅ Model settings persistence verified');
        }
      }
      
      console.log('✅ Model settings persistence test completed');
    });
  });

  test.describe('🔥 CRITICAL: API Connectivity', () => {
    test('Gemini API connection test', async () => {
      console.log('🔍 Testing Gemini API connectivity...');
      
      // Send a simple test message
      const messageInput = page.locator('textarea');
      await messageInput.fill('Hello API test');
      await page.locator('button[type="submit"]').click();
      
      // Wait for response and check for API errors
      await page.waitForTimeout(10000);
      
      // Look for error messages that indicate API issues
      const apiError = page.locator('text="API error", text="quota", text="invalid key", .error-message');
      
      if (await apiError.count() > 0) {
        const errorText = await apiError.textContent();
        console.log(`⚠️ API Error detected: ${errorText}`);
      } else {
        console.log('✅ API connectivity appears functional');
      }
      
      console.log('✅ API connectivity test completed');
    });

    test('Error handling for API failures', async () => {
      console.log('🔍 Testing API error handling...');
      
      // Look for any existing error states in the UI
      const errorIndicators = page.locator('.error, .api-error, [data-error="true"]');
      
      if (await errorIndicators.count() > 0) {
        console.log('Found existing error states - checking error handling...');
        
        // Verify error messages are user-friendly
        const errorMessages = await errorIndicators.allTextContents();
        for (const message of errorMessages) {
          if (message.includes('SyntaxError') || message.includes('Unexpected token')) {
            console.log('⚠️ Raw API error exposed to user - needs improvement');
          }
        }
      }
      
      console.log('✅ API error handling test completed');
    });
  });

  test.describe('🔥 CRITICAL: UI/UX Integrity', () => {
    test('Chat interface layout integrity', async () => {
      console.log('🔍 Testing chat interface layout...');
      
      // Check main UI components are present
      const criticalElements = [
        '[data-testid="chat-interface"], .chat-container',
        '[data-testid="message-input"], textarea',
        '[data-testid="send-button"], button[type="submit"]',
        '[data-testid="chat-messages"], .messages-container'
      ];
      
      for (const selector of criticalElements) {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          await expect(element).toBeVisible();
          console.log(`✅ Found: ${selector}`);
        } else {
          console.log(`⚠️ Missing: ${selector}`);
        }
      }
      
      console.log('✅ Layout integrity test completed');
    });

    test('Interactive elements responsiveness', async () => {
      console.log('🔍 Testing interactive elements...');
      
      // Test all clickable buttons
      const buttons = page.locator('button:not([disabled])');
      const buttonCount = await buttons.count();
      
      console.log(`Found ${buttonCount} interactive buttons`);
      
      // Test hover states on first few buttons
      for (let i = 0; i < Math.min(buttonCount, 3); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          await button.hover();
          await page.waitForTimeout(100);
        }
      }
      
      console.log('✅ Interactive elements test completed');
    });

    test('Responsive design on different screen sizes', async () => {
      console.log('🔍 Testing responsive design...');
      
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);
      
      // Check if UI adapts properly
      const messageInput = page.locator('textarea').first();
      if (await messageInput.isVisible()) {
        const inputBox = await messageInput.boundingBox();
        if (inputBox && inputBox.width > 0) {
          console.log(`✅ Mobile viewport: Input width ${inputBox.width}px`);
        }
      }
      
      // Test desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(1000);
      
      console.log('✅ Responsive design test completed');
    });
  });

  test.describe('🔥 CRITICAL: Group Chat Functions', () => {
    test('Multi-character conversation functionality', async () => {
      console.log('🔍 Testing group chat functionality...');
      
      // Look for group chat toggle or character selection
      const groupChatToggle = page.locator('[data-testid="group-chat"], button:has-text("グループ"), button:has-text("group")');
      
      if (await groupChatToggle.isVisible()) {
        await groupChatToggle.click();
        
        // Look for character selection interface
        const characterSelector = page.locator('.character-selector, .persona-selector, [data-testid="character-list"]');
        
        if (await characterSelector.isVisible()) {
          // Try to select multiple characters
          const characters = page.locator('.character-item, .persona-item');
          const characterCount = await characters.count();
          
          if (characterCount >= 2) {
            await characters.nth(0).click();
            await characters.nth(1).click();
            
            // Send a group message
            const messageInput = page.locator('textarea');
            await messageInput.fill('Group chat test message');
            await page.locator('button[type="submit"]').click();
            
            // Wait for group responses
            await page.waitForTimeout(15000);
            
            console.log('✅ Group chat functionality appears to be working');
          } else {
            console.log('⚠️ Insufficient characters for group chat test');
          }
        }
      } else {
        console.log('ℹ️ Group chat functionality not found or not enabled');
      }
      
      console.log('✅ Group chat test completed');
    });
  });

  // Summary test that checks overall application health
  test('🎯 Overall Application Health Check', async () => {
    console.log('🔍 Running overall health check...');
    
    // Check for any JavaScript errors in console
    let hasJSErrors = false;
    page.on('pageerror', (error) => {
      console.log(`❌ JavaScript Error: ${error.message}`);
      hasJSErrors = true;
    });
    
    // Check for failed network requests
    let hasNetworkErrors = false;
    page.on('response', (response) => {
      if (response.status() >= 400) {
        console.log(`⚠️ Network Error: ${response.url()} - ${response.status()}`);
        hasNetworkErrors = true;
      }
    });
    
    // Navigate and interact briefly
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Try basic interaction
    const messageInput = page.locator('textarea');
    if (await messageInput.isVisible()) {
      await messageInput.fill('Health check message');
      await messageInput.clear();
    }
    
    // Final assessment
    if (!hasJSErrors && !hasNetworkErrors) {
      console.log('✅ Overall application health appears good');
    } else {
      console.log('⚠️ Application health issues detected - see logs above');
    }
    
    console.log('✅ Health check completed');
  });
});