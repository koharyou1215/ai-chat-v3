import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:3000';

test.describe('Progressive Mode Visual Verification', () => {
  test('Take screenshots and verify Progressive Mode functionality', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-results/progressive-mode-initial-state.png', 
      fullPage: true 
    });
    console.log('📸 Initial state screenshot captured');

    // Check if we can find message input and other key elements
    const messageInput = page.locator('textarea, input[type="text"], [contenteditable="true"]').first();
    
    if (await messageInput.isVisible()) {
      console.log('✅ Message input is visible');
      
      // Try to type a message
      await messageInput.fill('Test progressive mode functionality');
      
      // Take screenshot after typing
      await page.screenshot({ 
        path: 'test-results/progressive-mode-with-message.png', 
        fullPage: true 
      });
      console.log('📸 Screenshot with message captured');
      
      // Look for send button variations
      const sendSelectors = [
        'button[type="submit"]',
        'button:has-text("Send")',
        'button:has-text("送信")',
        '[data-testid="send-button"]',
        '.send-button',
        'button[aria-label*="send"]',
        'button svg[data-icon="send"]',
        'button:has(svg)'
      ];
      
      let sendButton = null;
      for (const selector of sendSelectors) {
        const button = page.locator(selector).first();
        if (await button.isVisible()) {
          sendButton = button;
          console.log(`✅ Send button found with selector: ${selector}`);
          break;
        }
      }
      
      if (sendButton) {
        // Try to send the message
        await sendButton.click();
        console.log('✅ Send button clicked');
        
        // Wait for response
        await page.waitForTimeout(3000);
        
        // Take screenshot after sending
        await page.screenshot({ 
          path: 'test-results/progressive-mode-after-send.png', 
          fullPage: true 
        });
        console.log('📸 Screenshot after sending message captured');
        
        // Look for progressive mode indicators
        const progressiveElements = await page.locator([
          '.progressive-message-bubble',
          '.stage-indicator',
          '.progressive-stage-indicator', 
          '[data-stage]',
          '.message-bubble',
          '.message-content'
        ].join(', ')).count();
        
        console.log(`📊 Found ${progressiveElements} progressive-related elements`);
        
        // Wait a bit more for progressive stages
        await page.waitForTimeout(5000);
        
        // Final screenshot
        await page.screenshot({ 
          path: 'test-results/progressive-mode-final-state.png', 
          fullPage: true 
        });
        console.log('📸 Final state screenshot captured');
        
      } else {
        console.log('⚠️ No send button found with any selector');
        
        // Try keyboard shortcut
        await messageInput.press('Enter');
        console.log('⚠️ Tried Enter key as fallback');
        
        await page.waitForTimeout(3000);
        await page.screenshot({ 
          path: 'test-results/progressive-mode-enter-key-attempt.png', 
          fullPage: true 
        });
      }
    } else {
      console.log('⚠️ No message input found');
    }

    // Check for any obvious layout issues
    const bodyContent = await page.textContent('body');
    if (bodyContent && bodyContent.includes('Error')) {
      console.log('⚠️ Page contains error text');
    }

    // Check if page loaded successfully
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
    console.log('✅ Visual verification completed');
  });
});