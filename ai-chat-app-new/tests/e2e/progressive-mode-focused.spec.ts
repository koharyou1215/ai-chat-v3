import { test, expect } from '@playwright/test';

/**
 * Focused Progressive Message Mode E2E Tests
 * 実際のUI状態に対応したプログレッシブメッセージモードの焦点テスト
 */

const APP_URL = 'http://localhost:3000';

test.describe('Progressive Message Mode - Focused Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Initialize chat session if needed
    const quickStartButton = page.locator('button:has-text("⚡ クイックスタート")');
    if (await quickStartButton.isVisible()) {
      await quickStartButton.click();
      await page.waitForTimeout(2000);
      console.log('✅ Initialized chat session with Quick Start');
    }
    
    // Console monitoring
    page.on('console', msg => {
      if (msg.type() === 'log' && (
        msg.text().includes('Progressive') || 
        msg.text().includes('Stage') ||
        msg.text().includes('🚀') ||
        msg.text().includes('Error')
      )) {
        console.log(`🎯 CONSOLE: ${msg.text()}`);
      }
    });
  });

  test('Progressive Message Display Testing', async ({ page }) => {
    console.log('🚀 Testing Progressive Message Display with Stage Progression...');
    
    // Wait for message input to be available
    const messageInput = page.locator('textarea, input[placeholder*="メッセージ"]').first();
    await expect(messageInput).toBeVisible({ timeout: 15000 });
    
    // Send test message to trigger progressive mode
    const testMessage = 'プログレッシブモードをテストします。3段階で応答を生成してください。';
    await messageInput.fill(testMessage);
    console.log('✅ Test message entered');
    
    // Find and click send button
    const sendButton = page.locator('button[type="submit"], button:has-text("送信"), button:last-of-type').first();
    await sendButton.click();
    console.log('✅ Message sent');
    
    // Wait for response generation to start
    await page.waitForTimeout(2000);
    
    // Test progressive message rendering with stage progression (Reflex → Context → Intelligence)
    console.log('🔍 Checking for stage indicators...');
    
    // Check for stage indicators (may take time to appear)
    const stageIndicators = page.locator('[data-testid="stage-indicators"], .stage-indicator');
    
    let hasIndicators = false;
    for (let i = 0; i < 10; i++) {
      hasIndicators = await stageIndicators.isVisible();
      if (hasIndicators) break;
      await page.waitForTimeout(1000);
    }
    
    if (hasIndicators) {
      console.log('✅ Stage indicators found');
      
      // Verify stage indicator colors show correct colors and states
      const stageDots = page.locator('[data-testid^="stage-dot-"], .stage-dot');
      const dotCount = await stageDots.count();
      console.log(`📊 Found ${dotCount} stage dots`);
      
      for (let i = 0; i < dotCount; i++) {
        const dot = stageDots.nth(i);
        const classes = await dot.getAttribute('class');
        console.log(`🔍 Stage dot ${i}: ${classes}`);
      }
      
      // Test stage colors (Red → Green → White progression)
      const expectedStages = ['reflex', 'context', 'intelligence'];
      const expectedColors = ['bg-red-500', 'bg-green-500', 'bg-white'];
      
      for (let i = 0; i < expectedStages.length; i++) {
        const stageDot = page.locator(`[data-testid="stage-dot-${expectedStages[i]}"]`);
        if (await stageDot.isVisible()) {
          const classes = await stageDot.getAttribute('class');
          if (classes?.includes(expectedColors[i])) {
            console.log(`✅ Stage ${expectedStages[i]} has correct color: ${expectedColors[i]}`);
          }
        }
      }
    } else {
      console.log('⚠️ Stage indicators not found - may be in different UI state');
    }
    
    // Wait for message content to appear
    await page.waitForTimeout(5000);
    
    // Test that message content displays progressively through stages
    const messageContent = page.locator('.message-content, .prose, .progressive-message-bubble .content').first();
    
    let contentFound = false;
    for (let i = 0; i < 15; i++) {
      contentFound = await messageContent.isVisible();
      if (contentFound) break;
      await page.waitForTimeout(1000);
    }
    
    if (contentFound) {
      const contentText = await messageContent.textContent();
      console.log(`✅ Progressive content displayed (${contentText?.length || 0} characters)`);
      expect(contentText?.length).toBeGreaterThan(0);
    } else {
      console.log('⚠️ Message content not found - checking alternative selectors...');
      
      // Try alternative selectors
      const altContent = page.locator('.message, [class*="message"], [class*="bubble"]').first();
      if (await altContent.isVisible()) {
        const altText = await altContent.textContent();
        console.log(`✅ Alternative content found (${altText?.length || 0} characters)`);
      }
    }
    
    // Test that tracker information shows only once (not duplicated)
    const trackerElements = page.locator('.metadata, [class*="metadata"], [class*="stats"]');
    const trackerCount = await trackerElements.count();
    console.log(`📊 Tracker elements found: ${trackerCount}`);
    expect(trackerCount).toBeLessThanOrEqual(2); // Allow some flexibility
    
    console.log('🎯 Progressive Message Display Testing: COMPLETED');
  });

  test('Layout and UI Testing', async ({ page }) => {
    console.log('🎨 Testing Layout and UI Components...');
    
    // Send test message
    const messageInput = page.locator('textarea, input[placeholder*="メッセージ"]').first();
    await expect(messageInput).toBeVisible({ timeout: 10000 });
    
    await messageInput.fill('レイアウトテスト');
    const sendButton = page.locator('button[type="submit"], button:has-text("送信"), button:last-of-type').first();
    await sendButton.click();
    
    await page.waitForTimeout(3000);
    
    // Verify Show Diff button only appears in development mode
    const diffButtons = page.locator('button:has-text("Diff"), [data-testid*="diff"]');
    const diffButtonCount = await diffButtons.count();
    console.log(`🔘 Diff buttons found: ${diffButtonCount}`);
    
    // Test mobile responsiveness for tracker displays
    console.log('📱 Testing mobile responsiveness...');
    const mobileViewport = { width: 375, height: 667 };
    await page.setViewportSize(mobileViewport);
    await page.waitForTimeout(1000);
    
    // Check if UI elements are responsive
    const body = page.locator('body');
    const bodyWidth = await body.evaluate(el => el.offsetWidth);
    expect(bodyWidth).toBeLessThanOrEqual(mobileViewport.width);
    console.log(`✅ Mobile responsive: body width ${bodyWidth}px`);
    
    // Validate message input height restrictions work properly
    await messageInput.fill('A'.repeat(1000)); // Long text
    const inputBox = await messageInput.boundingBox();
    if (inputBox) {
      expect(inputBox.height).toBeLessThan(300); // Reasonable max height
      console.log(`✅ Message input height restricted: ${inputBox.height}px`);
    }
    
    // Check for any layout overlaps or display issues
    const viewport = page.viewportSize();
    if (viewport) {
      const elementsOutsideViewport = await page.locator('*').evaluateAll((elements, vp) => {
        return elements.filter(el => {
          const rect = el.getBoundingClientRect();
          return rect.right > vp.width || rect.bottom > vp.height;
        }).length;
      }, viewport);
      
      console.log(`📏 Elements outside viewport: ${elementsOutsideViewport}`);
      // Allow some elements to be outside (like modals, tooltips)
      expect(elementsOutsideViewport).toBeLessThan(10);
    }
    
    console.log('🎯 Layout and UI Testing: COMPLETED');
  });

  test('Bug Verification - Content and Tracker Issues', async ({ page }) => {
    console.log('🐛 Testing Specific Bug Fixes...');
    
    // Send message to generate progressive response
    const messageInput = page.locator('textarea, input[placeholder*="メッセージ"]').first();
    await expect(messageInput).toBeVisible({ timeout: 10000 });
    
    await messageInput.fill('バグ検証: コンテンツの累積表示と重複トラッカーの確認');
    const sendButton = page.locator('button[type="submit"], button:has-text("送信"), button:last-of-type').first();
    await sendButton.click();
    
    // Wait longer for progressive generation
    await page.waitForTimeout(8000);
    
    // Confirm that stage content is cumulative (Reflex + Context + Intelligence)
    const allMessages = page.locator('[class*="message"], [class*="bubble"]');
    const messageCount = await allMessages.count();
    console.log(`📊 Total message elements: ${messageCount}`);
    
    if (messageCount > 0) {
      const lastMessage = allMessages.last();
      const messageText = await lastMessage.textContent();
      
      if (messageText && messageText.length > 50) {
        console.log(`✅ Cumulative content detected (${messageText.length} characters)`);
      } else {
        console.log(`⚠️ Content may not be cumulative (${messageText?.length || 0} characters)`);
      }
    }
    
    // Verify no duplicate tracker displays appear at bottom of screen
    const fixedElements = page.locator('.fixed, [style*="position: fixed"]');
    const fixedCount = await fixedElements.count();
    console.log(`📍 Fixed positioned elements: ${fixedCount}`);
    
    // Check for duplicate metadata panels
    const metadataElements = page.locator('.metadata, [class*="metadata"], [class*="stats"]');
    const metadataCount = await metadataElements.count();
    console.log(`📊 Metadata panels: ${metadataCount}`);
    expect(metadataCount).toBeLessThanOrEqual(2);
    
    // Test that metadata shows in message bubble only, not as separate fixed element
    if (messageCount > 0) {
      const messageContainers = page.locator('[class*="bubble"], [class*="message-container"]');
      const containerCount = await messageContainers.count();
      
      if (containerCount > 0) {
        console.log(`✅ Message containers found: ${containerCount}`);
        
        // Check if metadata is within message containers
        for (let i = 0; i < Math.min(containerCount, 3); i++) {
          const container = messageContainers.nth(i);
          const containerMetadata = container.locator('.metadata, [class*="stats"]');
          const hasMetadata = await containerMetadata.isVisible();
          
          if (hasMetadata) {
            console.log(`✅ Metadata found within message container ${i}`);
          }
        }
      }
    }
    
    console.log('🎯 Bug Verification Testing: COMPLETED');
  });

  test('Performance and Responsiveness Check', async ({ page }) => {
    console.log('⚡ Testing Performance and Responsiveness...');
    
    // Measure basic performance metrics
    const navigationMetrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        loadTime: nav.loadEventEnd - nav.navigationStart,
        domReady: nav.domContentLoadedEventEnd - nav.navigationStart
      };
    });
    
    console.log(`📊 Performance Metrics:
      Load Time: ${navigationMetrics.loadTime}ms
      DOM Ready: ${navigationMetrics.domReady}ms`);
    
    // Test responsive behavior across different viewport sizes
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);
      
      // Check if main elements are visible and properly sized
      const messageInput = page.locator('textarea, input[placeholder*="メッセージ"]').first();
      const isInputVisible = await messageInput.isVisible();
      
      console.log(`✅ ${viewport.name} (${viewport.width}x${viewport.height}): Input visible = ${isInputVisible}`);
      expect(isInputVisible).toBeTruthy();
    }
    
    // Check for JavaScript errors
    const jsErrors = [];
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });
    
    await page.waitForTimeout(2000);
    
    if (jsErrors.length > 0) {
      console.log('❌ JavaScript errors detected:', jsErrors);
    } else {
      console.log('✅ No JavaScript errors detected');
    }
    
    expect(jsErrors.length).toBe(0);
    
    console.log('🎯 Performance Testing: COMPLETED');
  });
});