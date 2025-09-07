import { test, expect } from '@playwright/test';

test.describe('Progressive Message Complete Test', () => {
  test('Complete test of Progressive Message with Show Diff', async ({ page }) => {
    console.log('🚀 Starting complete Progressive Message test...');
    
    // アプリケーションを開く
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // 初期状態のスクリーンショット
    await page.screenshot({ 
      path: 'test-results/prog-1-initial.png', 
      fullPage: true 
    });
    console.log('📸 1. Initial state captured');
    
    // キャラクターを選択ボタンをクリック
    const selectCharButton = page.locator('button:has-text("キャラクターを選択")');
    if (await selectCharButton.isVisible()) {
      await selectCharButton.click();
      console.log('👤 2. Clicked character selection button');
      await page.waitForTimeout(2000);
      
      // キャラクター選択後のスクリーンショット
      await page.screenshot({ 
        path: 'test-results/prog-2-character-gallery.png', 
        fullPage: true 
      });
      
      // キャラクターカードの「チャット」ボタンをクリック
      const chatButtons = page.locator('button:has-text("チャット")');
      const chatButtonCount = await chatButtons.count();
      console.log(`🎭 Found ${chatButtonCount} chat buttons`);
      
      if (chatButtonCount > 0) {
        await chatButtons.first().click();
        console.log('✅ 3. Selected first character');
        await page.waitForTimeout(3000);
        
        // キャラクター選択後のスクリーンショット
        await page.screenshot({ 
          path: 'test-results/prog-3-after-selection.png', 
          fullPage: true 
        });
      }
    }
    
    // 設定を開いてプログレッシブモードを確認
    const settingsIcon = page.locator('[data-testid="settings-button"], button:has(svg), button').filter({ hasText: /⚙/ });
    const settingsButtonCount = await settingsIcon.count();
    console.log(`⚙️ Found ${settingsButtonCount} settings buttons`);
    
    if (settingsButtonCount > 0) {
      await settingsIcon.first().click();
      console.log('⚙️ 4. Opening settings');
      await page.waitForTimeout(2000);
      
      // 設定画面のスクリーンショット
      await page.screenshot({ 
        path: 'test-results/prog-4-settings.png', 
        fullPage: true 
      });
      
      // プログレッシブモードのトグルを探す
      const progressiveToggle = page.locator('text=/プログレッシブ.*モード/i').locator('..').locator('input[type="checkbox"], button');
      if (await progressiveToggle.count() > 0) {
        const isChecked = await progressiveToggle.isChecked().catch(() => false);
        if (!isChecked) {
          await progressiveToggle.click();
          console.log('✅ 5. Enabled progressive mode');
        } else {
          console.log('✅ 5. Progressive mode already enabled');
        }
      }
      
      // 設定を閉じる
      const closeButton = page.locator('button:has-text("×"), button:has-text("閉じる")');
      if (await closeButton.count() > 0) {
        await closeButton.first().click();
        console.log('✅ 6. Closed settings');
        await page.waitForTimeout(1000);
      }
    }
    
    // メッセージ入力欄を探す
    const messageInput = page.locator('textarea[placeholder*="メッセージ"], textarea[placeholder*="message"], input[type="text"][placeholder*="メッセージ"], textarea').first();
    const inputCount = await messageInput.count();
    console.log(`📝 Found ${inputCount} message input fields`);
    
    if (inputCount > 0) {
      // メッセージを入力
      await messageInput.fill('プログレッシブメッセージのテストです。Show Diff機能を確認します。');
      console.log('📝 7. Entered test message');
      
      // メッセージ入力後のスクリーンショット
      await page.screenshot({ 
        path: 'test-results/prog-5-message-entered.png', 
        fullPage: true 
      });
      
      // Enterキーで送信
      await messageInput.press('Enter');
      console.log('📤 8. Sent message');
      
      // レスポンスを待つ（プログレッシブメッセージの3段階を考慮）
      await page.waitForTimeout(15000);
      
      // メッセージ送信後のスクリーンショット
      await page.screenshot({ 
        path: 'test-results/prog-6-after-response.png', 
        fullPage: true 
      });
      
      // プログレッシブメッセージの要素を確認
      const stageIndicators = await page.locator('.stage-indicator, .stage-label').all();
      console.log(`📊 Found ${stageIndicators.length} stage indicators`);
      
      // Show Diffボタンを探す
      const showDiffButtons = await page.locator('button:has-text("Show Diff")').all();
      console.log(`🔍 Found ${showDiffButtons.length} Show Diff buttons`);
      
      if (showDiffButtons.length > 0) {
        await showDiffButtons[0].click();
        console.log('✅ 9. Clicked Show Diff button');
        await page.waitForTimeout(2000);
        
        // Diff表示後のスクリーンショット
        await page.screenshot({ 
          path: 'test-results/prog-7-with-diff.png', 
          fullPage: true 
        });
        
        // Diff表示エリアを確認
        const diffDisplay = await page.locator('.diff-display, .diff-section').all();
        console.log(`📊 Found ${diffDisplay.length} diff display sections`);
      }
      
      // コンソールログを監視
      const consoleLogs: string[] = [];
      page.on('console', msg => {
        const text = msg.text();
        if (text.includes('ProgressiveMessageBubble') || text.includes('stages')) {
          consoleLogs.push(text);
          console.log('🔍 Console:', text);
        }
      });
      
      // 少し待ってからログを確認
      await page.waitForTimeout(2000);
      console.log(`📊 Collected ${consoleLogs.length} relevant console logs`);
    }
    
    // 最終スクリーンショット
    await page.screenshot({ 
      path: 'test-results/prog-8-final.png', 
      fullPage: true 
    });
    
    console.log('✅ 10. Test completed successfully');
  });
});