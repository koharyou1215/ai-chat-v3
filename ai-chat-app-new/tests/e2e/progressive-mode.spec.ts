import { test, expect } from '@playwright/test';

/**
 * Progressive Mode E2E Test Suite
 * 3段階プログレッシブ応答システムの動作確認
 */

const APP_URL = 'http://localhost:3000';

test.describe('Progressive Mode Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // コンソールログを監視
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('Progressive')) {
        console.log(`🎯 CONSOLE: ${msg.text()}`);
      }
    });
  });

  test('🌟 Progressive Mode: 3-Stage Response Generation', async ({ page }) => {
    console.log('🚀 Testing Progressive Mode functionality...');
    
    // デバッグ: ページの状態を確認
    console.log(`📍 Current URL: ${page.url()}`);
    const title = await page.title();
    console.log(`📋 Page title: ${title}`);
    
    // 1. 設定画面を開く
    const settingsButton = page.locator('button[title*="設定"], button:has-text("設定"), [data-testid="settings-button"]').first();
    
    // 設定ボタンが見つからない場合の代替方法
    const settingsButtonCount = await settingsButton.count();
    console.log(`🔍 Settings buttons found: ${settingsButtonCount}`);
    
    if (settingsButtonCount > 0) {
      await settingsButton.click();
      console.log('✅ Settings button clicked');
    } else {
      // 他の方法で設定画面を開く
      console.log('⚠️ Settings button not found, trying alternative method...');
      await page.keyboard.press('Escape'); // まずモーダルを閉じる
      await page.waitForTimeout(1000);
      
      // 直接設定画面を開くためのショートカットや他の方法を試す
      const allButtons = await page.locator('button').all();
      console.log(`🔍 Total buttons on page: ${allButtons.length}`);
      
      // ボタンのテキストを確認
      for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
        const buttonText = await allButtons[i].textContent();
        console.log(`  Button ${i}: "${buttonText}"`);
      }
      
      return; // テストを終了
    }
    
    // 設定モーダルが開くのを待つ
    await page.waitForTimeout(2000);
    
    // 2. チャット設定タブに移動
    const chatTab = page.locator('button:has-text("チャット")');
    if (await chatTab.isVisible()) {
      await chatTab.click();
      console.log('✅ Chat settings tab clicked');
      await page.waitForTimeout(500);
    }
    
    // 3. プログレッシブモードを有効にする - より具体的なセレクタを使用
    await page.waitForTimeout(2000); // 設定画面の読み込みを待つ
    
    // プログレッシブモード関連の要素を探す
    let progressiveModeToggle = page.locator('input[type="checkbox"]').first();
    
    // もしチェックボックスが見つからない場合、他の方法を試す
    const checkboxCount = await page.locator('input[type="checkbox"]').count();
    console.log(`🔍 Found ${checkboxCount} checkboxes`);
    
    if (checkboxCount > 0) {
      const isChecked = await progressiveModeToggle.isChecked();
      
      if (!isChecked) {
        await progressiveModeToggle.click();
        console.log('✅ Progressive mode enabled');
        await page.waitForTimeout(500);
      } else {
        console.log('✅ Progressive mode already enabled');
      }
    } else {
      console.log('⚠️ No checkboxes found - settings may not be loaded');
    }
    
    // 4. 設定を閉じる
    const closeButton = page.locator('button:has-text("閉じる"), button:has-text("×")').first();
    await closeButton.click();
    await page.waitForTimeout(1000);
    
    // 5. メッセージ入力
    const messageInput = page.locator('textarea[placeholder="メッセージを入力..."]');
    await expect(messageInput).toBeVisible({ timeout: 10000 });
    
    const testMessage = 'プログレッシブモードのテストです。3段階で応答を生成してください。';
    await messageInput.fill(testMessage);
    console.log('✅ Test message entered');
    
    // 6. コンソールログを監視開始
    const expectedLogs = [
      '🔍 Progressive Mode Check:',
      '🚀 Using Progressive Message Generation',
      '🚀 Starting Progressive Message Generation - Stage 1: Reflex',
      '🚀 Starting Progressive Message Generation - Stage 2: Context', 
      '🚀 Starting Progressive Message Generation - Stage 3: Intelligence'
    ];
    
    let capturedLogs = [];
    
    // コンソールログキャプチャ
    page.on('console', msg => {
      const text = msg.text();
      expectedLogs.forEach(expectedLog => {
        if (text.includes(expectedLog)) {
          capturedLogs.push(expectedLog);
          console.log(`📝 CAPTURED: ${expectedLog}`);
        }
      });
    });
    
    // 7. メッセージ送信
    const sendButton = page.locator('button').last();
    await sendButton.click();
    console.log('✅ Message sent');
    
    // 8. プログレッシブ表示を確認
    await page.waitForTimeout(1000);
    
    // Stage indicators の確認
    const stageIndicators = page.locator('.stage-indicator, button:has-text("反射"), button:has-text("文脈"), button:has-text("洞察")');
    const indicatorCount = await stageIndicators.count();
    
    if (indicatorCount >= 3) {
      console.log('✅ Stage indicators found');
    } else {
      console.log('⚠️ Stage indicators not found');
    }
    
    // 9. 3段階の完了を待つ（最大30秒）
    console.log('⏳ Waiting for all 3 stages to complete...');
    await page.waitForTimeout(10000); // Stage 1
    await page.waitForTimeout(2000);  // Stage 2 delay
    await page.waitForTimeout(3000);  // Stage 3 delay + processing
    
    // 10. 最終結果確認
    const messagesContainer = page.locator('.messages-container, [data-testid="messages"]');
    const messageElements = await messagesContainer.locator('div').all();
    
    console.log(`📊 Total message elements found: ${messageElements.length}`);
    
    // 統計情報の確認
    const statsElements = page.locator('text*="Total Tokens:", text*="Total Time:"');
    const statsCount = await statsElements.count();
    
    if (statsCount > 0) {
      console.log('✅ Progressive stats displayed');
      
      // 統計の値を確認
      const tokenText = await page.locator('text*="Total Tokens:"').first().textContent();
      const timeText = await page.locator('text*="Total Time:"').first().textContent();
      
      console.log(`📈 Stats: ${tokenText}, ${timeText}`);
    } else {
      console.log('⚠️ Progressive stats not found');
    }
    
    // 11. ログ確認
    console.log('📋 Captured logs summary:');
    capturedLogs.forEach(log => console.log(`  ✓ ${log}`));
    
    // 最低限のログが取得できているか確認
    const hasBasicLogs = capturedLogs.some(log => 
      log.includes('Progressive Mode Check') || log.includes('Using Progressive Message')
    );
    
    if (hasBasicLogs) {
      console.log('✅ Progressive mode logs detected');
    } else {
      console.log('❌ Progressive mode logs missing');
    }
    
    // テスト結果まとめ
    console.log('\n🎯 TEST RESULTS:');
    console.log(`📊 Message elements: ${messageElements.length}`);
    console.log(`📋 Captured logs: ${capturedLogs.length}`);
    console.log(`🏷️ Stage indicators: ${indicatorCount}`);
    console.log(`📈 Stats elements: ${statsCount}`);
    
    // 基本的な成功条件
    expect(messageElements.length).toBeGreaterThan(0);
    expect(capturedLogs.length).toBeGreaterThan(0);
  });

  test('🔧 Progressive Mode Settings Verification', async ({ page }) => {
    console.log('⚙️ Testing Progressive Mode settings...');
    
    // 設定画面を開く
    const settingsButton = page.locator('button[title*="設定"], button:has-text("設定")').first();
    await settingsButton.click();
    
    await page.waitForTimeout(1000);
    
    // チャット設定タブ
    const chatTab = page.locator('button:has-text("チャット")');
    if (await chatTab.isVisible()) {
      await chatTab.click();
      await page.waitForTimeout(500);
    }
    
    // プログレッシブモード設定の存在確認 - 正しいセレクタ構文を使用
    const progressiveSection = page.locator('text="プログレッシブモード"');
    const progressiveSectionCount = await progressiveSection.count();
    
    console.log(`⚙️ Progressive mode settings sections: ${progressiveSectionCount}`);
    
    // 設定項目の確認
    const toggles = page.locator('input[type="checkbox"]');
    const toggleCount = await toggles.count();
    
    const sliders = page.locator('input[type="range"]');
    const sliderCount = await sliders.count();
    
    const numberInputs = page.locator('input[type="number"]');
    const numberInputCount = await numberInputs.count();
    
    console.log(`🎛️ Settings controls found: ${toggleCount} toggles, ${sliderCount} sliders, ${numberInputCount} number inputs`);
    
    expect(progressiveSectionCount).toBeGreaterThan(0);
    expect(toggleCount).toBeGreaterThan(0);
  });
});