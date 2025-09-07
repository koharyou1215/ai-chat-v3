import { test, expect } from '@playwright/test';

/**
 * Progressive Mode Layout Test Suite
 * プログレッシブモードのレイアウト専用テスト
 */

const APP_URL = 'http://localhost:3000';

test.describe('Progressive Mode Layout Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // コンソールログを監視
    page.on('console', msg => {
      if (msg.type() === 'log' && (
        msg.text().includes('Progressive') || 
        msg.text().includes('Stage') ||
        msg.text().includes('🚀') ||
        msg.text().includes('✨')
      )) {
        console.log(`🎯 CONSOLE: ${msg.text()}`);
      }
    });
  });

  test('🎨 Progressive Message Layout Structure', async ({ page }) => {
    console.log('🎨 Testing Progressive Message layout structure...');
    
    // メッセージを送信してプログレッシブモードを動作させる
    const messageInput = page.locator('textarea[placeholder="メッセージを入力..."]');
    await expect(messageInput).toBeVisible({ timeout: 10000 });
    
    const testMessage = 'プログレッシブモードレイアウトテスト';
    await messageInput.fill(testMessage);
    
    const sendButton = page.locator('button').last();
    await sendButton.click();
    console.log('✅ Test message sent');
    
    // プログレッシブメッセージの要素が表示されるまで待機
    await page.waitForTimeout(3000);
    
    // 1. ステージインジケーターの構造確認
    const stageIndicators = page.locator('[data-testid="stage-indicators"]');
    
    if (await stageIndicators.isVisible()) {
      console.log('✅ Stage indicators found');
      
      // 各ステージドットの確認
      const stageDots = {
        reflex: page.locator('[data-testid="stage-dot-reflex"]'),
        context: page.locator('[data-testid="stage-dot-context"]'), 
        intelligence: page.locator('[data-testid="stage-dot-intelligence"]')
      };
      
      // 赤→緑→白の順序確認
      for (const [stageName, dot] of Object.entries(stageDots)) {
        if (await dot.isVisible()) {
          const classes = await dot.getAttribute('class');
          console.log(`🔍 ${stageName} stage dot classes: ${classes}`);
          
          // 色の確認
          switch (stageName) {
            case 'reflex':
              expect(classes).toContain('bg-red-500');
              break;
            case 'context':
              expect(classes).toContain('bg-green-500');
              break;
            case 'intelligence':
              expect(classes).toContain('bg-white');
              break;
          }
        }
      }
      
      // ステージインジケーターのレイアウト確認
      const indicatorBox = await stageIndicators.boundingBox();
      if (indicatorBox) {
        console.log(`📏 Stage indicators: ${indicatorBox.width}x${indicatorBox.height}`);
        
        // 適切な高さか確認
        expect(indicatorBox.height).toBeGreaterThan(40);
        expect(indicatorBox.height).toBeLessThan(100);
      }
    } else {
      console.log('⚠️ Stage indicators not found - Progressive mode may not be active');
    }
    
    // 2. メッセージメニューの配置確認
    const messageMenu = page.locator('.message-menu');
    if (await messageMenu.isVisible()) {
      console.log('✅ Message menu found');
      
      const menuBox = await messageMenu.boundingBox();
      if (menuBox) {
        console.log(`📏 Message menu: ${menuBox.width}x${menuBox.height} at (${menuBox.x}, ${menuBox.y})`);
        
        // メニューが右上に配置されているか確認
        const messageContainer = page.locator('.progressive-message-bubble').last();
        const containerBox = await messageContainer.boundingBox();
        
        if (containerBox) {
          // メニューがメッセージコンテナの右上付近にあるか
          const isRightAligned = menuBox.x + menuBox.width >= containerBox.x + containerBox.width - 50;
          const isTopAligned = menuBox.y <= containerBox.y + 50;
          
          expect(isRightAligned).toBeTruthy();
          expect(isTopAligned).toBeTruthy();
          
          console.log(`✅ Menu properly positioned: right=${isRightAligned}, top=${isTopAligned}`);
        }
      }
      
      // メニューボタンの存在確認
      const menuButtons = {
        regenerate: page.locator('button[title="再生成"]'),
        continue: page.locator('button[title="続きを生成"]'),
        copy: page.locator('button[title="コピー"]'),
        more: page.locator('button[title="その他"]')
      };
      
      let buttonCount = 0;
      for (const [name, button] of Object.entries(menuButtons)) {
        if (await button.isVisible()) {
          buttonCount++;
          console.log(`✅ ${name} button found`);
        }
      }
      
      expect(buttonCount).toBeGreaterThan(0);
      console.log(`📊 Total menu buttons: ${buttonCount}`);
    }
    
    // 3. 統計情報パネルの確認（開発モード）
    const statsPanel = page.locator('.metadata');
    if (await statsPanel.isVisible()) {
      console.log('✅ Statistics panel found');
      
      const statsBox = await statsPanel.boundingBox();
      if (statsBox) {
        console.log(`📊 Stats panel: ${statsBox.width}x${statsBox.height}`);
        
        // パネルの幅が適切か
        expect(statsBox.width).toBeGreaterThan(200);
      }
      
      // Show/Hide Diffボタンの確認
      const diffToggle = page.locator('[data-testid="diff-toggle-button"]');
      if (await diffToggle.isVisible()) {
        const buttonText = await diffToggle.textContent();
        console.log(`🔘 Diff toggle button: "${buttonText}"`);
        
        // デフォルトで "Show Diff" になっているか確認
        expect(buttonText).toBe('Show Diff');
        console.log('✅ Default state is "Show Diff" (Hidden)');
      }
    }
  });

  test('📱 Progressive Mode Responsive Layout', async ({ page }) => {
    console.log('📱 Testing Progressive Mode responsive behavior...');
    
    const screenSizes = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];
    
    for (const size of screenSizes) {
      console.log(`🔧 Testing ${size.name} (${size.width}x${size.height})`);
      
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.waitForTimeout(1000);
      
      // メッセージ送信
      const messageInput = page.locator('textarea[placeholder="メッセージを入力..."]');
      await messageInput.fill(`${size.name}レスポンシブテスト`);
      
      const sendButton = page.locator('button').last();
      await sendButton.click();
      
      await page.waitForTimeout(2000);
      
      // ステージインジケーターのレスポンシブ確認
      const stageIndicators = page.locator('[data-testid="stage-indicators"]');
      if (await stageIndicators.isVisible()) {
        const indicatorBox = await stageIndicators.boundingBox();
        
        if (indicatorBox) {
          console.log(`  📏 ${size.name} indicators: ${indicatorBox.width}px wide`);
          
          // モバイルでは幅が画面に収まっているか
          if (size.name === 'Mobile') {
            expect(indicatorBox.width).toBeLessThan(size.width - 40); // 40px余白
          }
          
          // インジケーターが縦に重なっていないか（高さチェック）
          expect(indicatorBox.height).toBeLessThan(120); // 複数行にならない
        }
      }
      
      // メニューボタンのサイズ確認
      const menuButtons = page.locator('.message-menu button');
      const buttonCount = await menuButtons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const button = menuButtons.nth(i);
        const buttonBox = await button.boundingBox();
        
        if (buttonBox) {
          // タッチフレンドリーなサイズか確認（44px以上）
          const isTouch = size.name === 'Mobile';
          const minSize = isTouch ? 44 : 32;
          
          expect(buttonBox.width).toBeGreaterThanOrEqual(minSize);
          expect(buttonBox.height).toBeGreaterThanOrEqual(minSize);
          
          if (i === 0) { // 最初のボタンのみログ出力
            console.log(`  🔘 ${size.name} button: ${buttonBox.width}x${buttonBox.height}px (min: ${minSize}px)`);
          }
        }
      }
    }
  });

  test('🔧 Progressive Mode Show/Hide Diff Functionality', async ({ page }) => {
    console.log('🔧 Testing Show/Hide Diff functionality...');
    
    // 開発モード確認（NODE_ENV=development）
    const isDevMode = await page.evaluate(() => process.env.NODE_ENV === 'development');
    
    if (!isDevMode) {
      console.log('⚠️ Not in development mode, skipping diff tests');
      return;
    }
    
    // メッセージ送信
    const messageInput = page.locator('textarea[placeholder="メッセージを入力..."]');
    await messageInput.fill('Diffテスト用メッセージ');
    
    const sendButton = page.locator('button').last();
    await sendButton.click();
    
    // 統計パネルが表示されるまで待機
    await page.waitForTimeout(3000);
    
    const diffToggle = page.locator('[data-testid="diff-toggle-button"]');
    
    if (await diffToggle.isVisible()) {
      // 1. 初期状態の確認（Hide Diff状態）
      let buttonText = await diffToggle.textContent();
      expect(buttonText).toBe('Show Diff');
      console.log('✅ Initial state: "Show Diff" (diff hidden)');
      
      // diff表示エリアが非表示か確認
      const diffDisplay = page.locator('.diff-display');
      let isDiffVisible = await diffDisplay.isVisible();
      expect(isDiffVisible).toBe(false);
      console.log('✅ Diff display initially hidden');
      
      // 2. Show Diffクリック
      await diffToggle.click();
      await page.waitForTimeout(500);
      
      buttonText = await diffToggle.textContent();
      expect(buttonText).toBe('Hide Diff');
      console.log('✅ After click: "Hide Diff" (diff shown)');
      
      // diff表示エリアが表示されているか確認
      isDiffVisible = await diffDisplay.isVisible();
      if (isDiffVisible) {
        console.log('✅ Diff display now visible');
        
        // diff内容の確認
        const additions = page.locator('.diff-display .additions');
        const deletions = page.locator('.diff-display .deletions');
        
        if (await additions.isVisible()) {
          const addText = await additions.textContent();
          console.log(`📝 Additions: ${addText?.slice(0, 50)}...`);
        }
        
        if (await deletions.isVisible()) {
          const delText = await deletions.textContent();
          console.log(`📝 Deletions: ${delText?.slice(0, 50)}...`);
        }
      } else {
        console.log('⚠️ Diff display not shown after toggle');
      }
      
      // 3. Hide Diffクリック（元に戻す）
      await diffToggle.click();
      await page.waitForTimeout(500);
      
      buttonText = await diffToggle.textContent();
      expect(buttonText).toBe('Show Diff');
      console.log('✅ After second click: back to "Show Diff" (diff hidden)');
      
      isDiffVisible = await diffDisplay.isVisible();
      expect(isDiffVisible).toBe(false);
      console.log('✅ Diff display hidden again');
      
    } else {
      console.log('⚠️ Diff toggle button not found - may not be in development mode');
    }
  });

  test('⚡ Progressive Mode Performance & Animation', async ({ page }) => {
    console.log('⚡ Testing Progressive Mode performance and animations...');
    
    // メッセージ送信
    const messageInput = page.locator('textarea[placeholder="メッセージを入力..."]');
    await messageInput.fill('アニメーションテスト');
    
    const sendButton = page.locator('button').last();
    await sendButton.click();
    
    // アニメーション観察
    await page.waitForTimeout(1000);
    
    const stageDots = page.locator('[data-testid^="stage-dot-"]');
    const dotCount = await stageDots.count();
    
    if (dotCount > 0) {
      console.log(`✅ Found ${dotCount} stage dots`);
      
      // アニメーション状態の確認
      for (let i = 0; i < dotCount; i++) {
        const dot = stageDots.nth(i);
        const transform = await dot.evaluate(el => 
          window.getComputedStyle(el).transform
        );
        
        console.log(`🎭 Dot ${i} transform: ${transform}`);
        
        // CSS transitionの確認
        const transition = await dot.evaluate(el => 
          window.getComputedStyle(el).transition
        );
        
        if (transition && transition !== 'none') {
          console.log(`✅ Dot ${i} has transitions: ${transition}`);
        }
      }
    }
    
    // パフォーマンス測定
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        totalTime: navigation.loadEventEnd - navigation.navigationStart
      };
    });
    
    console.log('📊 Performance Metrics:');
    console.log(`  DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
    console.log(`  Load Complete: ${performanceMetrics.loadComplete}ms`);
    console.log(`  Total Time: ${performanceMetrics.totalTime}ms`);
    
    // パフォーマンス閾値チェック
    expect(performanceMetrics.totalTime).toBeLessThan(10000); // 10秒以内
    console.log('✅ Performance within acceptable range');
  });
});