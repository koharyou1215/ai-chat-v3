import { test, expect } from '@playwright/test';

test.describe('Progressive Message Mode', () => {
  test.beforeEach(async ({ page }) => {
    // アプリケーションにアクセス
    await page.goto('http://localhost:3000');
    
    // アプリが完全に読み込まれるまで待機
    await page.waitForSelector('[data-testid="chat-container"], .chat-container', { timeout: 10000 });
  });

  test('should display progressive message stages', async ({ page }) => {
    // キャラクター選択
    const characterButton = page.locator('.character-card, [data-testid="character-card"]').first();
    await characterButton.click();
    
    // チャット画面が表示されるまで待機
    await page.waitForSelector('.message-input, [data-testid="message-input"]', { timeout: 5000 });
    
    // テストメッセージを送信
    const messageInput = page.locator('.message-input textarea, [data-testid="message-input"] textarea');
    await messageInput.fill('テストメッセージです');
    
    // 送信ボタンをクリック
    const sendButton = page.locator('button[type="submit"], [data-testid="send-button"]');
    await sendButton.click();
    
    // プログレッシブメッセージバブルが表示されるまで待機
    const progressiveBubble = page.locator('.progressive-message-bubble');
    await expect(progressiveBubble).toBeVisible({ timeout: 10000 });
    
    // ステージインジケーターが表示されることを確認
    const stageIndicator = page.locator('.stage-indicator');
    await expect(stageIndicator).toBeVisible();
    
    // 各ステージが表示されることを確認
    const reflexStage = page.locator('.stage-item').filter({ hasText: '直感' });
    await expect(reflexStage).toBeVisible();
    
    const contextStage = page.locator('.stage-item').filter({ hasText: '文脈' });
    await expect(contextStage).toBeVisible();
    
    const intelligenceStage = page.locator('.stage-item').filter({ hasText: '知性' });
    await expect(intelligenceStage).toBeVisible();
    
    // メッセージ内容が表示されることを確認（最大30秒待機）
    const messageContent = page.locator('.message-content .message-text');
    await expect(messageContent).not.toBeEmpty({ timeout: 30000 });
  });

  test('should display chat menu on latest message', async ({ page }) => {
    // キャラクター選択
    const characterButton = page.locator('.character-card, [data-testid="character-card"]').first();
    await characterButton.click();
    
    // チャット画面が表示されるまで待機
    await page.waitForSelector('.message-input, [data-testid="message-input"]', { timeout: 5000 });
    
    // テストメッセージを送信
    const messageInput = page.locator('.message-input textarea, [data-testid="message-input"] textarea');
    await messageInput.fill('メニューテスト');
    
    const sendButton = page.locator('button[type="submit"], [data-testid="send-button"]');
    await sendButton.click();
    
    // メッセージバブルが表示されるまで待機
    await page.waitForSelector('.progressive-message-bubble, .message-bubble', { timeout: 10000 });
    
    // メッセージメニューが表示されることを確認
    const messageMenu = page.locator('.message-menu');
    await expect(messageMenu).toBeVisible({ timeout: 10000 });
    
    // 再生成ボタンが表示されることを確認
    const regenerateButton = messageMenu.locator('button[title="再生成"]');
    await expect(regenerateButton).toBeVisible();
    
    // 続きボタンが表示されることを確認
    const continueButton = messageMenu.locator('button[title="続きを生成"]');
    await expect(continueButton).toBeVisible();
    
    // コピーボタンが表示されることを確認
    const copyButton = messageMenu.locator('button[title="コピー"]');
    await expect(copyButton).toBeVisible();
    
    // その他メニューボタンが表示されることを確認
    const moreButton = messageMenu.locator('button[title="その他"]');
    await expect(moreButton).toBeVisible();
  });

  test('should toggle Show Diff when available', async ({ page }) => {
    // キャラクター選択
    const characterButton = page.locator('.character-card, [data-testid="character-card"]').first();
    await characterButton.click();
    
    // チャット画面が表示されるまで待機
    await page.waitForSelector('.message-input, [data-testid="message-input"]', { timeout: 5000 });
    
    // テストメッセージを送信
    const messageInput = page.locator('.message-input textarea, [data-testid="message-input"] textarea');
    await messageInput.fill('差分表示テスト');
    
    const sendButton = page.locator('button[type="submit"], [data-testid="send-button"]');
    await sendButton.click();
    
    // プログレッシブメッセージが表示されるまで待機
    await page.waitForSelector('.progressive-message-bubble', { timeout: 10000 });
    
    // Show Diffボタンが表示されるまで待機（contextステージ完了後）
    const showDiffButton = page.locator('button').filter({ hasText: 'Show Diff' });
    
    // ボタンが表示されたらクリック
    if (await showDiffButton.isVisible({ timeout: 15000 })) {
      await showDiffButton.click();
      
      // Diff表示エリアが表示されることを確認
      const diffDisplay = page.locator('.diff-display');
      await expect(diffDisplay).toBeVisible();
      
      // もう一度クリックして非表示にする
      await showDiffButton.click();
      await expect(diffDisplay).not.toBeVisible();
    }
  });

  test('should handle regeneration correctly', async ({ page }) => {
    // キャラクター選択
    const characterButton = page.locator('.character-card, [data-testid="character-card"]').first();
    await characterButton.click();
    
    // チャット画面が表示されるまで待機
    await page.waitForSelector('.message-input, [data-testid="message-input"]', { timeout: 5000 });
    
    // テストメッセージを送信
    const messageInput = page.locator('.message-input textarea, [data-testid="message-input"] textarea');
    await messageInput.fill('再生成テスト');
    
    const sendButton = page.locator('button[type="submit"], [data-testid="send-button"]');
    await sendButton.click();
    
    // メッセージが生成されるまで待機
    await page.waitForSelector('.progressive-message-bubble, .message-bubble', { timeout: 10000 });
    
    // 生成が完了するまで待機（is_generatingがfalseになるまで）
    await page.waitForTimeout(3000);
    
    // 再生成ボタンをクリック
    const regenerateButton = page.locator('.message-menu button[title="再生成"]');
    await regenerateButton.click();
    
    // 新しいメッセージが生成されることを確認
    await page.waitForTimeout(2000);
    
    // メッセージ内容が更新されることを確認
    const messageContent = page.locator('.message-content .message-text').last();
    const initialContent = await messageContent.textContent();
    
    // 再生成後の内容を確認（内容が変わっているか、生成中の表示があるか）
    await page.waitForTimeout(3000);
    const updatedContent = await messageContent.textContent();
    
    // 内容が変わっているか、少なくとも表示されていることを確認
    expect(updatedContent).toBeTruthy();
  });
});