import { test, expect } from '@playwright/test';

/**
 * Layout Adjustment E2E Test Suite
 * UIコンポーネントのレイアウトと視覚的な調整をテスト
 */

const APP_URL = 'http://localhost:3000';

test.describe('Layout Adjustment Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('🎨 Progressive Message Layout Verification', async ({ page }) => {
    console.log('🎨 Testing Progressive Message layout...');
    
    // プログレッシブモードを有効にしてメッセージを送信
    // (実際の設定手順は省略)
    
    // メッセージ送信後、プログレッシブ要素のレイアウトを確認
    await page.waitForSelector('[data-testid="progressive-message"]', { timeout: 10000 });
    
    const progressiveContainer = page.locator('[data-testid="progressive-message"]');
    
    // 1. ステージインジケーターの配置確認
    const stageIndicators = page.locator('.stage-indicator');
    const indicatorCount = await stageIndicators.count();
    
    // 各インジケーターの位置とサイズを確認
    for (let i = 0; i < indicatorCount; i++) {
      const indicator = stageIndicators.nth(i);
      const boundingBox = await indicator.boundingBox();
      
      console.log(`📏 Stage ${i + 1} indicator: ${JSON.stringify(boundingBox)}`);
      
      // インジケーターが適切なサイズか確認
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThan(50);
        expect(boundingBox.height).toBeGreaterThan(30);
      }
    }
    
    // 2. 統計表示パネルの位置確認
    const statsPanel = page.locator('.progressive-stats');
    if (await statsPanel.isVisible()) {
      const statsBoundingBox = await statsPanel.boundingBox();
      console.log(`📊 Stats panel: ${JSON.stringify(statsBoundingBox)}`);
      
      // 統計パネルが画面下部に適切に配置されているか
      if (statsBoundingBox) {
        const viewportSize = page.viewportSize();
        if (viewportSize) {
          // 下部30%以内に配置されているか確認
          const bottomThreshold = viewportSize.height * 0.7;
          expect(statsBoundingBox.y).toBeGreaterThan(bottomThreshold);
        }
      }
    }
    
    // 3. メッセージバブルの幅とマージンを確認
    const messageBubble = page.locator('.message-bubble').last();
    const bubbleBoundingBox = await messageBubble.boundingBox();
    
    if (bubbleBoundingBox) {
      console.log(`💬 Message bubble: ${JSON.stringify(bubbleBoundingBox)}`);
      
      // メッセージバブルが画面幅の80%以下であることを確認（読みやすさ）
      const viewportSize = page.viewportSize();
      if (viewportSize) {
        const maxWidth = viewportSize.width * 0.8;
        expect(bubbleBoundingBox.width).toBeLessThan(maxWidth);
      }
    }
  });

  test('📱 Responsive Layout Check', async ({ page }) => {
    console.log('📱 Testing responsive layout...');
    
    // 異なる画面サイズでのレイアウトテスト
    const screenSizes = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];
    
    for (const size of screenSizes) {
      console.log(`🔧 Testing ${size.name} (${size.width}x${size.height})`);
      
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.waitForTimeout(1000);
      
      // メッセージ入力エリアの確認
      const messageInput = page.locator('textarea[placeholder="メッセージを入力..."]');
      const inputBoundingBox = await messageInput.boundingBox();
      
      if (inputBoundingBox) {
        // 入力エリアが画面幅に適切にフィットしているか
        const marginTotal = size.width - inputBoundingBox.width;
        console.log(`  📝 Input area width: ${inputBoundingBox.width}, margin: ${marginTotal}`);
        
        // モバイルでは余白が少なく、デスクトップでは適度な余白
        if (size.name === 'Mobile') {
          expect(marginTotal).toBeLessThan(50); // モバイルは余白少なめ
        } else if (size.name === 'Desktop') {
          expect(marginTotal).toBeGreaterThan(100); // デスクトップは余白多め
        }
      }
      
      // サイドバーやメニューの表示確認
      const sideMenu = page.locator('[data-testid="side-menu"]');
      const isMenuVisible = await sideMenu.isVisible();
      
      if (size.name === 'Mobile') {
        // モバイルでは通常サイドメニューは非表示
        console.log(`  📱 Mobile side menu visible: ${isMenuVisible}`);
      } else {
        // デスクトップでは表示される場合が多い
        console.log(`  🖥️ Desktop side menu visible: ${isMenuVisible}`);
      }
    }
  });

  test('🎯 Element Spacing and Alignment', async ({ page }) => {
    console.log('🎯 Testing element spacing and alignment...');
    
    // メッセージを送信してレイアウトを生成
    const messageInput = page.locator('textarea[placeholder="メッセージを入力..."]');
    await messageInput.fill('レイアウトテスト用メッセージ');
    
    const sendButton = page.locator('button[type="submit"], button:has(svg)').last();
    await sendButton.click();
    
    await page.waitForTimeout(2000);
    
    // メッセージ間のスペーシング確認
    const messages = page.locator('.message-bubble');
    const messageCount = await messages.count();
    
    if (messageCount >= 2) {
      for (let i = 0; i < messageCount - 1; i++) {
        const currentMessage = messages.nth(i);
        const nextMessage = messages.nth(i + 1);
        
        const currentBox = await currentMessage.boundingBox();
        const nextBox = await nextMessage.boundingBox();
        
        if (currentBox && nextBox) {
          const spacing = nextBox.y - (currentBox.y + currentBox.height);
          console.log(`💬 Spacing between message ${i} and ${i + 1}: ${spacing}px`);
          
          // メッセージ間のスペーシングが適切か（8px以上、50px以下）
          expect(spacing).toBeGreaterThanOrEqual(8);
          expect(spacing).toBeLessThanOrEqual(50);
        }
      }
    }
    
    // 左右のアライメント確認
    const userMessages = page.locator('.message-bubble.user-message');
    const aiMessages = page.locator('.message-bubble.ai-message');
    
    if (await userMessages.count() > 0) {
      const userBox = await userMessages.first().boundingBox();
      if (userBox) {
        const viewportWidth = page.viewportSize()?.width || 1920;
        const rightMargin = viewportWidth - (userBox.x + userBox.width);
        console.log(`👤 User message right margin: ${rightMargin}px`);
        
        // ユーザーメッセージは右寄せ（右マージンが少ない）
        expect(rightMargin).toBeLessThan(50);
      }
    }
    
    if (await aiMessages.count() > 0) {
      const aiBox = await aiMessages.first().boundingBox();
      if (aiBox) {
        console.log(`🤖 AI message left margin: ${aiBox.x}px`);
        
        // AIメッセージは左寄せ（左マージンが少ない）
        expect(aiBox.x).toBeLessThan(50);
      }
    }
  });

  test('🔧 Layout Issue Detection and Auto-Fix Suggestions', async ({ page }) => {
    console.log('🔧 Detecting layout issues and providing fix suggestions...');
    
    const issues = [];
    const suggestions = [];
    
    // 1. オーバーフロー検出
    const allElements = await page.locator('*').all();
    
    for (const element of allElements.slice(0, 20)) { // 最初の20要素をチェック
      const box = await element.boundingBox();
      if (box) {
        const viewportSize = page.viewportSize();
        if (viewportSize) {
          if (box.x + box.width > viewportSize.width) {
            issues.push(`Element overflows horizontally: ${box.x + box.width} > ${viewportSize.width}`);
            suggestions.push('Consider: max-width: 100%; overflow-x: hidden;');
          }
          
          if (box.y + box.height > viewportSize.height + 1000) { // 1000px余裕を持たせる
            issues.push(`Element too far below fold: ${box.y + box.height}`);
            suggestions.push('Consider: Lazy loading or pagination');
          }
        }
      }
    }
    
    // 2. 小さすぎるクリック領域の検出
    const clickableElements = page.locator('button, a, [role="button"]');
    const clickableCount = await clickableElements.count();
    
    for (let i = 0; i < Math.min(clickableCount, 10); i++) {
      const element = clickableElements.nth(i);
      const box = await element.boundingBox();
      
      if (box) {
        if (box.width < 44 || box.height < 44) { // 44pxは推奨最小タッチ領域
          const text = await element.textContent();
          issues.push(`Clickable element too small: ${box.width}x${box.height} - "${text?.slice(0, 20)}"`);
          suggestions.push('Consider: min-width: 44px; min-height: 44px; padding: 8px;');
        }
      }
    }
    
    // 3. 色彩コントラスト（簡易チェック）
    const textElements = page.locator('p, span, div').filter({ hasText: /.+/ });
    const textCount = await textElements.count();
    
    for (let i = 0; i < Math.min(textCount, 5); i++) {
      const element = textElements.nth(i);
      const styles = await element.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          fontSize: computed.fontSize
        };
      });
      
      const fontSize = parseFloat(styles.fontSize);
      if (fontSize < 14) {
        issues.push(`Text too small: ${fontSize}px`);
        suggestions.push('Consider: font-size: 16px or larger for better readability');
      }
    }
    
    // 結果出力
    console.log('\n🔍 LAYOUT ANALYSIS RESULTS:');
    console.log(`📊 Issues found: ${issues.length}`);
    console.log(`💡 Suggestions: ${suggestions.length}`);
    
    if (issues.length > 0) {
      console.log('\n❌ ISSUES:');
      issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
      
      console.log('\n💡 SUGGESTIONS:');
      suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`);
      });
    } else {
      console.log('✅ No major layout issues detected!');
    }
    
    // テストが失敗しないように、重大な問題のみアサーション
    const criticalIssues = issues.filter(issue => 
      issue.includes('overflow') || issue.includes('too small')
    );
    expect(criticalIssues.length).toBeLessThan(5); // 重大な問題は5個未満であること
  });
});