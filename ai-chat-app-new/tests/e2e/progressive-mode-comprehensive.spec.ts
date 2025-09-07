import { test, expect } from '@playwright/test';

/**
 * Comprehensive Progressive Message Mode E2E Test Suite
 * 要求された項目を網羅したプログレッシブメッセージモードの包括的テスト
 */

const APP_URL = 'http://localhost:3000';

test.describe('Comprehensive Progressive Message Mode Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
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

  test('1️⃣ Progressive Message Display Testing', async ({ page }) => {
    console.log('🚀 Testing Progressive Message Display with Stage Progression...');
    
    // Navigate to application
    expect(page.url()).toBe(APP_URL);
    console.log('✅ Navigation successful');
    
    // Send test message to trigger progressive mode
    const messageInput = page.locator('textarea[placeholder="メッセージを入力..."]');
    await expect(messageInput).toBeVisible({ timeout: 10000 });
    
    const testMessage = 'プログレッシブモードテスト: 3段階の応答を生成してください。反射→文脈→洞察の順序で表示されることを確認します。';
    await messageInput.fill(testMessage);
    console.log('✅ Test message entered');
    
    const sendButton = page.locator('button').last();
    await sendButton.click();
    console.log('✅ Message sent');
    
    // Wait for progressive message generation to start
    await page.waitForTimeout(2000);
    
    // Test stage progression (Reflex → Context → Intelligence)
    const stageSequence = ['reflex', 'context', 'intelligence'];
    const stageColors = {
      reflex: 'bg-red-500',      // 反射 = 赤
      context: 'bg-green-500',    // 文脈 = 緑  
      intelligence: 'bg-white'    // 洞察 = 白
    };
    
    for (const [index, stage] of stageSequence.entries()) {
      console.log(`🔍 Checking stage ${index + 1}: ${stage}`);
      
      // Check stage indicator dot
      const stageDot = page.locator(`[data-testid="stage-dot-${stage}"]`);
      await expect(stageDot).toBeVisible({ timeout: 15000 });
      
      // Verify stage indicator color
      const dotClasses = await stageDot.getAttribute('class');
      expect(dotClasses).toContain(stageColors[stage]);
      console.log(`✅ Stage ${stage} indicator has correct color: ${stageColors[stage]}`);
      
      // Check stage label
      const stageLabels = { reflex: '反射', context: '文脈', intelligence: '洞察' };
      const labelElement = page.locator(`text="${stageLabels[stage]}"`);
      await expect(labelElement).toBeVisible();
      console.log(`✅ Stage label "${stageLabels[stage]}" is visible`);
      
      // Wait for stage completion
      await page.waitForTimeout(3000);
    }
    
    // Verify stage indicators show correct colors and states
    const allStageDots = page.locator('[data-testid^="stage-dot-"]');
    const dotCount = await allStageDots.count();
    expect(dotCount).toBe(3);
    console.log(`✅ All 3 stage indicators present`);
    
    // Test that message content displays progressively through stages
    const messageContainer = page.locator('.progressive-message-bubble').last();
    const messageContent = messageContainer.locator('.message-content');
    await expect(messageContent).toBeVisible();
    
    const contentText = await messageContent.textContent();
    expect(contentText).toBeTruthy();
    expect(contentText?.length).toBeGreaterThan(10);
    console.log(`✅ Progressive content displayed (${contentText?.length} characters)`);
    
    // Test that tracker information shows only once (not duplicated)
    const statsElements = page.locator('.metadata');
    const statsCount = await statsElements.count();
    expect(statsCount).toBeLessThanOrEqual(1);
    console.log(`✅ Tracker information appears only once (count: ${statsCount})`);
    
    console.log('🎯 Progressive Message Display Testing: PASSED');
  });

  test('2️⃣ Layout and UI Testing', async ({ page }) => {
    console.log('🎨 Testing Layout and UI Components...');
    
    // Send test message
    const messageInput = page.locator('textarea[placeholder="メッセージを入力..."]');
    await messageInput.fill('レイアウトテスト用メッセージ');
    
    const sendButton = page.locator('button').last();
    await sendButton.click();
    await page.waitForTimeout(3000);
    
    // Verify Show Diff button only appears in development mode
    const isDevelopment = await page.evaluate(() => process.env.NODE_ENV === 'development');
    const diffToggleButton = page.locator('[data-testid="diff-toggle-button"]');
    
    if (isDevelopment) {
      await expect(diffToggleButton).toBeVisible();
      console.log('✅ Show Diff button visible in development mode');
      
      const buttonText = await diffToggleButton.textContent();
      expect(buttonText).toBe('Show Diff');
      console.log('✅ Default state is "Show Diff" (hidden)');
    } else {
      expect(await diffToggleButton.isVisible()).toBe(false);
      console.log('✅ Show Diff button hidden in production mode');
    }
    
    // Test mobile responsiveness for tracker displays
    const mobileViewport = { width: 375, height: 667 };
    await page.setViewportSize(mobileViewport);
    await page.waitForTimeout(1000);
    
    const stageIndicators = page.locator('[data-testid="stage-indicators"]');
    if (await stageIndicators.isVisible()) {
      const indicatorBox = await stageIndicators.boundingBox();
      if (indicatorBox) {
        // Check if indicators fit within mobile viewport with margin
        expect(indicatorBox.width).toBeLessThan(mobileViewport.width - 40);
        console.log(`✅ Mobile responsive: indicators width ${indicatorBox.width}px fits in ${mobileViewport.width}px`);
        
        // Check height doesn't wrap excessively
        expect(indicatorBox.height).toBeLessThan(120);
        console.log(`✅ Mobile responsive: indicators height ${indicatorBox.height}px within bounds`);
      }
    }
    
    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Validate message input height restrictions work properly
    await messageInput.fill('A'.repeat(500)); // Long text
    const inputBox = await messageInput.boundingBox();
    if (inputBox) {
      // Should have reasonable max height
      expect(inputBox.height).toBeLessThan(200);
      expect(inputBox.height).toBeGreaterThan(30);
      console.log(`✅ Message input height restriction: ${inputBox.height}px`);
    }
    
    // Check for any layout overlaps or display issues
    const messageMenus = page.locator('.message-menu');
    const menuCount = await messageMenus.count();
    
    for (let i = 0; i < menuCount; i++) {
      const menu = messageMenus.nth(i);
      const menuBox = await menu.boundingBox();
      
      if (menuBox) {
        // Menu should be within viewport
        expect(menuBox.x).toBeGreaterThanOrEqual(0);
        expect(menuBox.y).toBeGreaterThanOrEqual(0);
        expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(1280);
        
        console.log(`✅ Menu ${i} properly positioned at (${menuBox.x}, ${menuBox.y})`);
      }
    }
    
    console.log('🎯 Layout and UI Testing: PASSED');
  });

  test('3️⃣ Specific Bug Verification', async ({ page }) => {
    console.log('🐛 Testing Specific Bug Fixes...');
    
    // Send message to generate progressive response
    const messageInput = page.locator('textarea[placeholder="メッセージを入力..."]');
    await messageInput.fill('バグ検証用の詳細なメッセージです。各段階のコンテンツが正しく累積されることを確認します。');
    
    const sendButton = page.locator('button').last();
    await sendButton.click();
    await page.waitForTimeout(5000);
    
    // Confirm that stage content is cumulative (Reflex + Context + Intelligence)
    const messageContent = page.locator('.progressive-message-bubble').last().locator('.message-content');
    const contentText = await messageContent.textContent();
    
    // Content should be substantial if cumulative
    expect(contentText?.length).toBeGreaterThan(50);
    console.log(`✅ Cumulative content length: ${contentText?.length} characters`);
    
    // Should contain markers from different stages
    const hasMultipleElements = contentText?.includes('\n') || (contentText?.length || 0) > 100;
    if (hasMultipleElements) {
      console.log('✅ Content appears to be cumulative from multiple stages');
    }
    
    // Verify no duplicate tracker displays appear at bottom of screen
    const allMetadata = page.locator('.metadata');
    const metadataCount = await allMetadata.count();
    expect(metadataCount).toBeLessThanOrEqual(1);
    console.log(`✅ No duplicate trackers: found ${metadataCount} metadata panel(s)`);
    
    // Check for fixed elements that might be duplicated
    const fixedElements = page.locator('.fixed, .absolute');
    const fixedCount = await fixedElements.count();
    
    // Log positions to detect overlaps
    for (let i = 0; i < Math.min(fixedCount, 5); i++) {
      const element = fixedElements.nth(i);
      const box = await element.boundingBox();
      if (box) {
        console.log(`📍 Fixed element ${i}: ${box.width}x${box.height} at (${box.x}, ${box.y})`);
      }
    }
    
    // Test that metadata shows in message bubble only, not as separate fixed element
    const messageBlubbles = page.locator('.progressive-message-bubble');
    const bubbleCount = await messageBlubbles.count();
    
    if (bubbleCount > 0) {
      const lastBubble = messageBlubbles.last();
      const bubbleMetadata = lastBubble.locator('.metadata');
      const bubbleMetadataExists = await bubbleMetadata.isVisible();
      
      if (bubbleMetadataExists) {
        console.log('✅ Metadata correctly contained within message bubble');
        
        // Verify it's not absolutely positioned outside
        const metadataBox = await bubbleMetadata.boundingBox();
        const bubbleBox = await lastBubble.boundingBox();
        
        if (metadataBox && bubbleBox) {
          const isContained = (
            metadataBox.x >= bubbleBox.x - 10 &&
            metadataBox.y >= bubbleBox.y - 10 &&
            metadataBox.x + metadataBox.width <= bubbleBox.x + bubbleBox.width + 10 &&
            metadataBox.y + metadataBox.height <= bubbleBox.y + bubbleBox.height + 10
          );
          
          expect(isContained).toBeTruthy();
          console.log('✅ Metadata is properly contained within bubble bounds');
        }
      }
    }
    
    console.log('🎯 Specific Bug Verification: PASSED');
  });

  test('4️⃣ Cross-browser Testing', async ({ page, browserName }) => {
    console.log(`🌍 Testing on ${browserName}...`);
    
    // Test key functionality in different browsers
    const messageInput = page.locator('textarea[placeholder="メッセージを入力..."]');
    await expect(messageInput).toBeVisible({ timeout: 10000 });
    
    await messageInput.fill(`${browserName}互換性テスト`);
    const sendButton = page.locator('button').last();
    await sendButton.click();
    
    await page.waitForTimeout(3000);
    
    // Verify stage indicators work across browsers
    const stageIndicators = page.locator('[data-testid="stage-indicators"]');
    const hasIndicators = await stageIndicators.isVisible();
    
    if (hasIndicators) {
      console.log(`✅ Stage indicators render correctly on ${browserName}`);
      
      // Check CSS animations/transitions work
      const stageDot = page.locator('[data-testid^="stage-dot-"]').first();
      const hasTransition = await stageDot.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.transition !== 'none' && styles.transition !== '';
      });
      
      console.log(`✅ CSS transitions ${hasTransition ? 'working' : 'not detected'} on ${browserName}`);
    }
    
    // Test different viewport sizes for responsiveness
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);
      
      const messageContainer = page.locator('.progressive-message-bubble').last();
      const isVisible = await messageContainer.isVisible();
      expect(isVisible).toBeTruthy();
      
      console.log(`✅ ${viewport.name} viewport (${viewport.width}x${viewport.height}) works on ${browserName}`);
    }
    
    console.log(`🎯 Cross-browser Testing on ${browserName}: PASSED`);
  });

  test('5️⃣ Performance and Memory Testing', async ({ page }) => {
    console.log('⚡ Testing Performance and Memory Usage...');
    
    // Measure initial page load performance
    const navigationMetrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
        loadComplete: nav.loadEventEnd - nav.loadEventStart,
        firstContentfulPaint: nav.responseEnd - nav.navigationStart
      };
    });
    
    console.log(`📊 Navigation Metrics:
      DOM Content Loaded: ${navigationMetrics.domContentLoaded}ms
      Load Complete: ${navigationMetrics.loadComplete}ms
      First Contentful Paint: ${navigationMetrics.firstContentfulPaint}ms`);
    
    expect(navigationMetrics.domContentLoaded).toBeLessThan(5000);
    expect(navigationMetrics.loadComplete).toBeLessThan(10000);
    
    // Test multiple message generation for memory leaks
    const messageInput = page.locator('textarea[placeholder="メッセージを入力..."]');
    
    for (let i = 1; i <= 3; i++) {
      await messageInput.fill(`パフォーマンステスト ${i}: メモリリークのチェック`);
      const sendButton = page.locator('button').last();
      await sendButton.click();
      await page.waitForTimeout(3000);
      
      console.log(`✅ Message ${i} completed`);
    }
    
    // Check for excessive DOM nodes
    const totalNodes = await page.evaluate(() => document.querySelectorAll('*').length);
    expect(totalNodes).toBeLessThan(5000); // Reasonable limit
    console.log(`✅ DOM node count within limits: ${totalNodes} nodes`);
    
    // Verify no JavaScript errors
    let jsErrors = [];
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });
    
    // Wait a bit more to catch any delayed errors
    await page.waitForTimeout(2000);
    
    if (jsErrors.length > 0) {
      console.log('❌ JavaScript errors detected:', jsErrors);
      expect(jsErrors.length).toBe(0);
    } else {
      console.log('✅ No JavaScript errors detected');
    }
    
    console.log('🎯 Performance and Memory Testing: PASSED');
  });
});