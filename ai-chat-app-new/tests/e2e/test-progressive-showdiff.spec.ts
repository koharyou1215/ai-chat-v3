import { test, expect } from '@playwright/test';

test.describe('Progressive Message Show Diff Test', () => {
  test('Test Show Diff functionality', async ({ page }) => {
    console.log('🚀 Testing Progressive Message Show Diff functionality...');
    
    // アプリケーションを開く
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // アプリケーションの読み込みを待つ
    await page.waitForTimeout(5000);
    
    // スクリーンショットを撮る
    await page.screenshot({ 
      path: 'test-results/progressive-initial.png', 
      fullPage: true 
    });
    console.log('📸 Initial screenshot saved');
    
    // キャラクターを選択ボタンをクリック
    const selectCharacterButton = page.locator('button').filter({ hasText: /キャラクターを選択/i });
    if (await selectCharacterButton.count() > 0) {
      await selectCharacterButton.click();
      console.log('👤 Opening character selection');
      await page.waitForTimeout(2000);
      
      // 最初のキャラクターカードを選択
      const characterCard = page.locator('.character-card, [class*="character"]').first();
      if (await characterCard.count() > 0) {
        await characterCard.click();
        console.log('✅ Selected first character');
        await page.waitForTimeout(2000);
      }
    }
    
    // 設定を開く（ギアアイコンをクリック）
    const settingsButton = page.locator('button').filter({ hasText: /設定|⚙️|Settings/i }).first();
    if (await settingsButton.count() > 0) {
      await settingsButton.click();
      console.log('⚙️ Settings opened');
      await page.waitForTimeout(1000);
      
      // プログレッシブモードが有効か確認
      await page.screenshot({ 
        path: 'test-results/progressive-settings.png', 
        fullPage: true 
      });
      
      // 設定を閉じる
      const closeButton = page.locator('button').filter({ hasText: /×|閉じる|Close/i }).first();
      if (await closeButton.count() > 0) {
        await closeButton.click();
      }
    }
    
    // メッセージ入力欄を探す
    const messageInput = page.locator('textarea, input[type="text"]').first();
    if (await messageInput.count() > 0) {
      console.log('📝 Sending test message...');
      await messageInput.fill('こんにちは、プログレッシブメッセージのテストです');
      
      // Enterキーを押してメッセージを送信
      await messageInput.press('Enter');
      
      // レスポンスを待つ
      await page.waitForTimeout(10000);
      
      // スクリーンショットを撮る
      await page.screenshot({ 
        path: 'test-results/progressive-after-message.png', 
        fullPage: true 
      });
      console.log('📸 After message screenshot saved');
      
      // Show Diffボタンを探す
      const showDiffButtons = await page.locator('button').filter({ hasText: /Show Diff/i }).all();
      console.log(`🔍 Found ${showDiffButtons.length} Show Diff buttons`);
      
      if (showDiffButtons.length > 0) {
        // Show Diffボタンをクリック
        await showDiffButtons[0].click();
        console.log('✅ Clicked Show Diff button');
        
        await page.waitForTimeout(2000);
        
        // Diff表示後のスクリーンショット
        await page.screenshot({ 
          path: 'test-results/progressive-with-diff.png', 
          fullPage: true 
        });
        console.log('📸 With diff screenshot saved');
      }
      
      // プログレッシブメッセージのステージ表示を確認
      const stageIndicators = await page.locator('.stage-indicator').all();
      console.log(`📊 Found ${stageIndicators.length} stage indicators`);
      
      // ステージラベルを確認
      const stageLabels = await page.locator('.stage-label').allTextContents();
      console.log('🏷️ Stage labels:', stageLabels);
      
      // コンソールログを取得
      page.on('console', msg => {
        if (msg.text().includes('ProgressiveMessageBubble')) {
          console.log('📊 Console:', msg.text());
        }
      });
    } else {
      console.log('⚠️ Message input not found');
    }
    
    // 最終スクリーンショット
    await page.screenshot({ 
      path: 'test-results/progressive-final.png', 
      fullPage: true 
    });
    
    console.log('✅ Test completed');
  });
});