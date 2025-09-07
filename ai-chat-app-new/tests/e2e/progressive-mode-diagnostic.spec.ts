import { test, expect } from '@playwright/test';

/**
 * Progressive Message Mode Diagnostic Test
 * 現在の UI 状態を診断し、スクリーンショットと詳細情報を収集
 */

const APP_URL = 'http://localhost:3000';

test.describe('Progressive Message Mode - Diagnostic Tests', () => {
  test('Visual Diagnostic - Current UI State', async ({ page }) => {
    console.log('🔍 Running diagnostic test to capture current UI state...');
    
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-results/diagnostic-initial-state.png',
      fullPage: true 
    });
    console.log('📸 Initial state screenshot captured');
    
    // Initialize chat if needed
    const quickStartButton = page.locator('button:has-text("⚡ クイックスタート")');
    if (await quickStartButton.isVisible()) {
      await quickStartButton.click();
      await page.waitForTimeout(2000);
      console.log('✅ Clicked Quick Start button');
    }
    
    // Take screenshot after initialization
    await page.screenshot({ 
      path: 'test-results/diagnostic-after-init.png',
      fullPage: true 
    });
    console.log('📸 After initialization screenshot captured');
    
    // Send test message
    const messageInput = page.locator('textarea, input[placeholder*="メッセージ"]').first();
    if (await messageInput.isVisible()) {
      await messageInput.fill('プログレッシブモード診断テスト: UI要素の状態を確認');
      
      // Take screenshot with message
      await page.screenshot({ 
        path: 'test-results/diagnostic-with-message.png',
        fullPage: true 
      });
      console.log('📸 With message screenshot captured');
      
      const sendButton = page.locator('button[type="submit"], button:has-text("送信"), button:last-of-type').first();
      await sendButton.click();
      console.log('✅ Message sent');
      
      // Wait for response and capture
      await page.waitForTimeout(5000);
      await page.screenshot({ 
        path: 'test-results/diagnostic-after-response.png',
        fullPage: true 
      });
      console.log('📸 After response screenshot captured');
      
      // Wait longer for potential progressive stages
      await page.waitForTimeout(10000);
      await page.screenshot({ 
        path: 'test-results/diagnostic-final-state.png',
        fullPage: true 
      });
      console.log('📸 Final state screenshot captured');
    }
    
    // Collect detailed element information
    const elementData = await page.evaluate(() => {
      const data = {
        stageIndicators: [],
        messageBubbles: [],
        progressiveElements: [],
        metadataElements: [],
        buttons: []
      };
      
      // Stage indicators
      const stageElements = document.querySelectorAll('[data-testid*="stage"], .stage-indicator, .stage-dot');
      stageElements.forEach((el, i) => {
        data.stageIndicators.push({
          index: i,
          tagName: el.tagName,
          className: el.className,
          textContent: el.textContent?.slice(0, 50),
          visible: el.offsetParent !== null
        });
      });
      
      // Message bubbles
      const messageElements = document.querySelectorAll('.progressive-message-bubble, [class*="message"], [class*="bubble"]');
      messageElements.forEach((el, i) => {
        data.messageBubbles.push({
          index: i,
          tagName: el.tagName,
          className: el.className,
          textLength: el.textContent?.length || 0,
          visible: el.offsetParent !== null
        });
      });
      
      // Progressive-specific elements
      const progressiveElements = document.querySelectorAll('[class*="progressive"], [class*="stage"]');
      progressiveElements.forEach((el, i) => {
        data.progressiveElements.push({
          index: i,
          tagName: el.tagName,
          className: el.className,
          visible: el.offsetParent !== null
        });
      });
      
      // Metadata elements
      const metadataElements = document.querySelectorAll('.metadata, [class*="metadata"], [class*="stats"]');
      metadataElements.forEach((el, i) => {
        data.metadataElements.push({
          index: i,
          tagName: el.tagName,
          className: el.className,
          visible: el.offsetParent !== null
        });
      });
      
      // All buttons
      const buttons = document.querySelectorAll('button');
      buttons.forEach((el, i) => {
        if (i < 20) { // Limit to first 20 buttons
          data.buttons.push({
            index: i,
            textContent: el.textContent?.slice(0, 30),
            className: el.className,
            visible: el.offsetParent !== null
          });
        }
      });
      
      return data;
    });
    
    console.log('\n🔍 DIAGNOSTIC RESULTS:');
    console.log(`📊 Stage Indicators: ${elementData.stageIndicators.length}`);
    elementData.stageIndicators.forEach((el, i) => {
      console.log(`  ${i}: ${el.tagName}.${el.className} - "${el.textContent}" (visible: ${el.visible})`);
    });
    
    console.log(`\n📊 Message Bubbles: ${elementData.messageBubbles.length}`);
    elementData.messageBubbles.forEach((el, i) => {
      console.log(`  ${i}: ${el.tagName}.${el.className} - ${el.textLength} chars (visible: ${el.visible})`);
    });
    
    console.log(`\n📊 Progressive Elements: ${elementData.progressiveElements.length}`);
    elementData.progressiveElements.forEach((el, i) => {
      console.log(`  ${i}: ${el.tagName}.${el.className} (visible: ${el.visible})`);
    });
    
    console.log(`\n📊 Metadata Elements: ${elementData.metadataElements.length}`);
    elementData.metadataElements.forEach((el, i) => {
      console.log(`  ${i}: ${el.tagName}.${el.className} (visible: ${el.visible})`);
    });
    
    console.log(`\n📊 Buttons (first 20): ${elementData.buttons.length}`);
    elementData.buttons.forEach((el, i) => {
      console.log(`  ${i}: "${el.textContent}" (visible: ${el.visible})`);
    });
    
    // Check console for progressive mode messages
    let progressiveMessages = [];
    page.on('console', msg => {
      if (msg.text().includes('Progressive') || msg.text().includes('Stage')) {
        progressiveMessages.push(msg.text());
      }
    });
    
    if (progressiveMessages.length > 0) {
      console.log('\n📝 Progressive Mode Console Messages:');
      progressiveMessages.forEach(msg => console.log(`  - ${msg}`));
    }
    
    console.log('\n🎯 Diagnostic test completed. Check test-results/ for screenshots.');
  });
});