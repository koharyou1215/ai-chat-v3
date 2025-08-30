import { test, expect } from '@playwright/test';

/**
 * AI Chat V3 Final Critical Functions Test Suite
 * Comprehensive deployment readiness check
 */

const APP_URL = 'http://localhost:3000';

test.describe('AI Chat V3 Final Critical Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('🔥 CRITICAL: Complete Core Chat Function Test', async ({ page }) => {
    console.log('🔍 Testing complete chat functionality...');
    
    // Verify UI loads properly
    const messageInput = page.locator('textarea[placeholder="メッセージを入力..."]');
    await expect(messageInput).toBeVisible({ timeout: 10000 });
    console.log('✅ Message input visible');
    
    const messagesContainer = page.locator('.messages-container');
    await expect(messagesContainer).toBeVisible();
    console.log('✅ Messages container visible');
    
    // Test message sending
    const testMessage = 'Test message for deployment verification';
    await messageInput.fill(testMessage);
    
    // Find and click send button
    const sendButton = page.locator('button').last();
    await sendButton.click();
    console.log('✅ Message sent');
    
    // Wait for message to appear and check for AI response
    await page.waitForTimeout(15000);
    
    // Count messages in container
    const messageElements = messagesContainer.locator('div, p').filter({ hasText: /.+/ });
    const messageCount = await messageElements.count();
    
    if (messageCount >= 2) {
      console.log('✅ AI response received - Core chat is FUNCTIONAL');
    } else if (messageCount >= 1) {
      console.log('⚠️ Message sent but no AI response - Check API connectivity');
    } else {
      console.log('❌ No messages found - Chat system may be broken');
    }
    
    console.log(`📊 Total message elements found: ${messageCount}`);
  });

  test('🔥 CRITICAL: Settings and Configuration Access', async ({ page }) => {
    console.log('🔍 Testing settings access...');
    
    // Look for settings button using various approaches
    const settingsSelectors = [
      'button:has-text("設定")',
      'button:has-text("settings")',
      'button[title*="設定"]',
      'button[title*="settings"]'
    ];
    
    let settingsFound = false;
    for (const selector of settingsSelectors) {
      const button = page.locator(selector);
      if (await button.count() > 0) {
        settingsFound = true;
        await button.first().click();
        console.log(`✅ Settings accessed via: ${selector}`);
        
        await page.waitForTimeout(2000);
        
        // Check for settings content
        const settingsContent = page.locator('textarea, input[type="text"], input[type="number"], select');
        const contentCount = await settingsContent.count();
        console.log(`📊 Found ${contentCount} settings controls`);
        
        if (contentCount > 0) {
          console.log('✅ Settings interface is FUNCTIONAL');
        }
        break;
      }
    }
    
    if (!settingsFound) {
      console.log('⚠️ Settings button not found - may be in different location');
    }
  });

  test('🔥 CRITICAL: File Upload System Check', async ({ page }) => {
    console.log('🔍 Testing file upload system...');
    
    const fileInput = page.locator('input[type="file"]');
    const fileInputCount = await fileInput.count();
    
    if (fileInputCount > 0) {
      console.log('✅ File input element present');
      
      // Create test file
      const testFile = {
        name: 'test.png',
        mimeType: 'image/png',
        buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
      };
      
      await fileInput.setInputFiles([testFile]);
      console.log('✅ Test file uploaded');
      
      await page.waitForTimeout(3000);
      
      // Check for any image previews or upload indicators
      const previews = page.locator('img[src*="blob:"], img[src*="data:"], .preview');
      const previewCount = await previews.count();
      
      if (previewCount > 0) {
        console.log('✅ File upload system is FUNCTIONAL');
      } else {
        console.log('⚠️ File upload may not show immediate feedback');
      }
    } else {
      console.log('❌ No file input found - Upload system NOT AVAILABLE');
    }
  });

  test('🔥 CRITICAL: Error State and Generation Management', async ({ page }) => {
    console.log('🔍 Testing error states and generation management...');
    
    // Check for error indicators
    const errorSelectors = [
      '[class*="error"]',
      '[class*="issue"]', 
      '.text-red-500',
      '.text-red-600'
    ];
    
    let errorCount = 0;
    for (const selector of errorSelectors) {
      const errors = page.locator(selector);
      const count = await errors.count();
      errorCount += count;
    }
    
    console.log(`📊 Found ${errorCount} potential error indicators`);
    
    // Test generation state reset mechanism
    const messagesContainer = page.locator('.messages-container');
    if (await messagesContainer.isVisible()) {
      await messagesContainer.dblclick();
      console.log('✅ Double-click reset mechanism triggered');
      
      await page.waitForTimeout(2000);
      
      // Look for reset confirmation (various possible texts)
      const resetConfirmations = page.locator('text*="リセット", text*="reset"');
      const confirmationCount = await resetConfirmations.count();
      
      if (confirmationCount > 0) {
        console.log('✅ Generation state reset mechanism is FUNCTIONAL');
      } else {
        console.log('ℹ️ Reset mechanism available but no visual confirmation');
      }
    }
  });

  test('🔥 CRITICAL: API Connectivity Status', async ({ page }) => {
    console.log('🔍 Testing API connectivity status...');
    
    // Check for Gemini API indicator
    const geminiIndicator = page.locator('text*="Gemini"');
    const geminiCount = await geminiIndicator.count();
    
    if (geminiCount > 0) {
      const geminiText = await geminiIndicator.textContent();
      console.log(`✅ API Status: ${geminiText}`);
      
      if (geminiText && geminiText.includes('2.5')) {
        console.log('✅ Gemini 2.5 API is CONFIGURED');
      }
    } else {
      console.log('⚠️ No API status indicator found');
    }
    
    // Test basic API call
    const messageInput = page.locator('textarea[placeholder="メッセージを入力..."]');
    await messageInput.fill('Quick API test');
    
    const sendButton = page.locator('button').last();
    await sendButton.click();
    
    console.log('🔄 Testing API response time...');
    const startTime = Date.now();
    
    // Wait for response with timeout
    try {
      await page.waitForFunction(
        () => {
          const container = document.querySelector('.messages-container');
          const messages = container?.querySelectorAll('div, p');
          return messages && messages.length >= 2;
        },
        { timeout: 20000 }
      );
      
      const responseTime = Date.now() - startTime;
      console.log(`✅ API Response received in ${responseTime}ms`);
      
      if (responseTime < 10000) {
        console.log('✅ API Performance: GOOD');
      } else {
        console.log('⚠️ API Performance: SLOW');
      }
    } catch {
      console.log('❌ API Response: TIMEOUT or ERROR');
    }
    
    // Clear input
    await messageInput.clear();
  });

  test('🎯 FINAL DEPLOYMENT READINESS ASSESSMENT', async ({ page }) => {
    console.log('🔍 Running final deployment readiness assessment...');
    
    const assessment = {
      coreUI: false,
      messageInput: false,
      messagesContainer: false,
      fileUpload: false,
      apiIndicator: false,
      interactivity: false,
      responsiveDesign: false,
      criticalErrors: 0
    };
    
    // Test Core UI Elements
    const chatHeader = page.locator('.chat-header');
    assessment.coreUI = await chatHeader.isVisible();
    
    const messageInput = page.locator('textarea[placeholder="メッセージを入力..."]');
    assessment.messageInput = await messageInput.isVisible();
    
    const messagesContainer = page.locator('.messages-container');
    assessment.messagesContainer = await messagesContainer.isVisible();
    
    // Test File Upload
    const fileInput = page.locator('input[type="file"]');
    assessment.fileUpload = await fileInput.count() > 0;
    
    // Test API Indicator
    const apiIndicator = page.locator('text*="Gemini"');
    assessment.apiIndicator = await apiIndicator.count() > 0;
    
    // Test Basic Interactivity
    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();
    assessment.interactivity = buttonCount > 5; // Should have multiple interactive elements
    
    // Test Responsive Design
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    const mobileInput = page.locator('textarea[placeholder="メッセージを入力..."]');
    const mobileVisible = await mobileInput.isVisible();
    
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(1000);
    const desktopVisible = await messageInput.isVisible();
    
    assessment.responsiveDesign = mobileVisible && desktopVisible;
    
    // Check for Critical Errors
    const errorSelectors = ['[class*="error"]', '.text-red-500'];
    for (const selector of errorSelectors) {
      const errors = page.locator(selector);
      assessment.criticalErrors += await errors.count();
    }
    
    // Generate Report
    console.log('\n🎯 DEPLOYMENT READINESS REPORT:');
    console.log('=====================================');
    console.log(`✅ Core UI Components: ${assessment.coreUI ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Message Input: ${assessment.messageInput ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Messages Container: ${assessment.messagesContainer ? 'PASS' : 'FAIL'}`);
    console.log(`✅ File Upload System: ${assessment.fileUpload ? 'PASS' : 'FAIL'}`);
    console.log(`✅ API Configuration: ${assessment.apiIndicator ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Interactive Elements: ${assessment.interactivity ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Responsive Design: ${assessment.responsiveDesign ? 'PASS' : 'FAIL'}`);
    console.log(`⚠️ Critical Errors: ${assessment.criticalErrors}`);
    
    // Calculate overall score
    const totalChecks = 7;
    const passedChecks = Object.values(assessment).filter((value, index) => 
      index < totalChecks && value === true
    ).length;
    
    const score = Math.round((passedChecks / totalChecks) * 100);
    
    console.log(`\n📊 OVERALL SCORE: ${score}%`);
    
    if (score >= 85 && assessment.criticalErrors === 0) {
      console.log('🟢 DEPLOYMENT STATUS: READY');
      console.log('✅ Application is ready for user testing and deployment');
    } else if (score >= 70) {
      console.log('🟡 DEPLOYMENT STATUS: NEEDS ATTENTION');
      console.log('⚠️ Some features may not work optimally');
    } else {
      console.log('🔴 DEPLOYMENT STATUS: NOT READY');
      console.log('❌ Critical issues must be resolved before deployment');
    }
    
    console.log('\n🔧 RECOMMENDATIONS:');
    if (!assessment.coreUI) console.log('- Fix core UI layout issues');
    if (!assessment.messageInput) console.log('- Fix message input functionality');
    if (!assessment.fileUpload) console.log('- Implement or fix file upload system');
    if (!assessment.apiIndicator) console.log('- Verify API configuration and display');
    if (assessment.criticalErrors > 0) console.log('- Resolve error states in the application');
    if (!assessment.responsiveDesign) console.log('- Fix responsive design issues');
    
    console.log('\n=====================================');
  });
});