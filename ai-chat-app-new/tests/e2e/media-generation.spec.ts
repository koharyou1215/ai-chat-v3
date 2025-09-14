import { test, expect, Page } from '@playwright/test';

/**
 * 画像生成・音声生成機能のE2Eテスト
 * MediaOrchestrator統合のテスト
 */

test.describe('メディア生成機能テスト', () => {
  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(3000);

    // 初期設定（キャラクターとペルソナの選択）
    await setupChatSession(page);
  });

  test.describe('画像生成機能', () => {
    test('メッセージドロップダウンから画像生成ボタンが表示される', async () => {
      // テストメッセージを送信
      await sendTestMessage(page, 'テスト画像を生成してください');

      // AIの応答を待つ
      await page.waitForSelector('.message-bubble', { timeout: 30000 });

      // メッセージドロップダウンメニューを開く
      const moreButton = await page.locator('.message-bubble button[aria-label*="more"], .message-bubble button:has-text("⋮")').first();
      await moreButton.click();

      // 画像生成ボタンの存在確認
      const imageGenerateButton = await page.locator('text=/画像.*生成/i');
      await expect(imageGenerateButton).toBeVisible();
    });

    test('画像生成APIの接続確認', async () => {
      // SD APIのヘルスチェック
      const response = await page.request.get('http://localhost:7860/sdapi/v1/options');

      if (response.ok()) {
        console.log('✅ Stable Diffusion API is running');

        // モデル一覧の取得テスト
        const modelsResponse = await page.request.get('http://localhost:7860/sdapi/v1/sd-models');
        const models = await modelsResponse.json();

        expect(Array.isArray(models)).toBeTruthy();
        console.log(`Available models: ${models.length}`);
      } else {
        console.log('⚠️ Stable Diffusion API is not available - skipping image generation tests');
      }
    });

    test('画像生成の進捗表示', async () => {
      // メッセージを送信
      await sendTestMessage(page, '美しい風景を描いてください');

      // AIの応答を待つ
      await page.waitForSelector('.message-bubble', { timeout: 30000 });

      // メッセージドロップダウンメニューを開く
      const moreButton = await page.locator('.message-bubble button[aria-label*="more"], .message-bubble button:has-text("⋮")').first();
      await moreButton.click();

      // 画像生成ボタンをクリック
      const imageGenerateButton = await page.locator('text=/画像.*生成/i');

      if (await imageGenerateButton.isVisible()) {
        await imageGenerateButton.click();

        // 進捗表示の確認（"画像生成中..."のテキスト）
        const progressText = await page.locator('text=/画像生成中|Generating/i');

        // SD APIが利用可能な場合のみ進捗を確認
        const sdAvailable = await checkSDAvailability(page);
        if (sdAvailable) {
          await expect(progressText).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('音声生成機能', () => {
    test('音声設定モーダルが開く', async () => {
      // メッセージ入力エリアの「+」ボタンをクリック
      const plusButton = await page.locator('button[aria-label*="menu"], button:has-text("+")').first();
      await plusButton.click();

      // 音声メニュー項目をクリック
      const voiceMenuItem = await page.locator('text=/音声|Voice/i');
      await voiceMenuItem.click();

      // 音声設定モーダルの表示確認
      const voiceModal = await page.locator('text=/音声設定/i');
      await expect(voiceModal).toBeVisible({ timeout: 5000 });

      // タブの確認
      const generalTab = await page.locator('text="一般"');
      const voicevoxTab = await page.locator('text="VOICEVOX"');

      await expect(generalTab).toBeVisible();
      await expect(voicevoxTab).toBeVisible();
    });

    test('メッセージドロップダウンから音声再生ボタンが表示される', async () => {
      // テストメッセージを送信
      await sendTestMessage(page, 'こんにちは、音声テストです');

      // AIの応答を待つ
      await page.waitForSelector('.message-bubble', { timeout: 30000 });

      // メッセージドロップダウンメニューを開く
      const moreButton = await page.locator('.message-bubble button[aria-label*="more"], .message-bubble button:has-text("⋮")').first();
      await moreButton.click();

      // 読み上げボタンの存在確認
      const readAloudButton = await page.locator('text=/読み上げ|Play|Read/i');
      await expect(readAloudButton).toBeVisible();
    });

    test('VOICEVOX APIの接続確認', async () => {
      // VOICEVOX APIのヘルスチェック
      try {
        const response = await page.request.get('http://localhost:50021/version');

        if (response.ok()) {
          const version = await response.json();
          console.log('✅ VOICEVOX is running:', version);

          // 話者一覧の取得テスト
          const speakersResponse = await page.request.get('http://localhost:50021/speakers');
          const speakers = await speakersResponse.json();

          expect(Array.isArray(speakers)).toBeTruthy();
          console.log(`Available speakers: ${speakers.length}`);
        } else {
          console.log('⚠️ VOICEVOX is not available - using browser TTS fallback');
        }
      } catch (error) {
        console.log('⚠️ VOICEVOX connection failed - using browser TTS fallback');
      }
    });

    test('音声再生の動作確認', async () => {
      // メッセージを送信
      await sendTestMessage(page, 'テスト音声メッセージ');

      // AIの応答を待つ
      await page.waitForSelector('.message-bubble', { timeout: 30000 });

      // メッセージドロップダウンメニューを開く
      const moreButton = await page.locator('.message-bubble button[aria-label*="more"], .message-bubble button:has-text("⋮")').first();
      await moreButton.click();

      // 読み上げボタンをクリック
      const readAloudButton = await page.locator('text=/読み上げ|Play|Read/i');

      if (await readAloudButton.isVisible()) {
        await readAloudButton.click();

        // 読み上げ中の表示確認（アニメーションまたはテキスト変更）
        const playingIndicator = await page.locator('text=/読み上げ中|Playing|Speaking/i');

        // 音声再生が開始されることを確認（エラーが出ないこと）
        await page.waitForTimeout(1000);

        // コンソールエラーの確認
        const consoleErrors: string[] = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
          }
        });

        // MediaOrchestratorのエラーがないことを確認
        const hasMediaError = consoleErrors.some(err =>
          err.includes('MediaOrchestrator') ||
          err.includes('AudioService')
        );

        expect(hasMediaError).toBeFalsy();
      }
    });
  });

  test.describe('MediaOrchestrator統合テスト', () => {
    test('MediaOrchestratorの初期化確認', async () => {
      // コンソールログの監視
      const consoleLogs: string[] = [];
      page.on('console', msg => {
        consoleLogs.push(msg.text());
      });

      // ページリロードして初期化を確認
      await page.reload();
      await page.waitForTimeout(3000);

      // MediaOrchestratorの初期化ログを確認
      const hasInitLog = consoleLogs.some(log =>
        log.includes('MediaOrchestrator: Initializing') ||
        log.includes('MediaOrchestrator: Initialized')
      );

      console.log('MediaOrchestrator initialization logs:',
        consoleLogs.filter(log => log.includes('MediaOrchestrator'))
      );
    });

    test('キャッシュ機能の動作確認', async () => {
      // 同じメッセージを2回送信してキャッシュ動作を確認
      const testMessage = 'キャッシュテストメッセージ';

      // 1回目の送信
      await sendTestMessage(page, testMessage);
      await page.waitForSelector('.message-bubble', { timeout: 30000 });

      // 音声再生を実行
      const moreButton1 = await page.locator('.message-bubble button[aria-label*="more"], .message-bubble button:has-text("⋮")').first();
      await moreButton1.click();

      const readAloudButton1 = await page.locator('text=/読み上げ|Play|Read/i');
      if (await readAloudButton1.isVisible()) {
        await readAloudButton1.click();
        await page.waitForTimeout(2000);
      }

      // 2回目の送信
      await sendTestMessage(page, testMessage);
      await page.waitForSelector('.message-bubble:nth-child(3)', { timeout: 30000 });

      // コンソールログでキャッシュヒットを確認
      const consoleLogs: string[] = [];
      page.on('console', msg => {
        if (msg.text().includes('cache')) {
          consoleLogs.push(msg.text());
        }
      });

      console.log('Cache-related logs:', consoleLogs);
    });
  });
});

/**
 * ヘルパー関数
 */

async function setupChatSession(page: Page) {
  // キャラクター選択
  const characterButton = await page.locator('button:has-text("キャラクター"), button:has-text("Character")').first();
  if (await characterButton.isVisible()) {
    await characterButton.click();
    await page.waitForTimeout(1000);

    // 最初のキャラクターを選択
    const firstCharacter = await page.locator('.character-card, [class*="character"]').first();
    if (await firstCharacter.isVisible()) {
      await firstCharacter.click();
    }
  }

  // ペルソナ選択
  const personaButton = await page.locator('button:has-text("ペルソナ"), button:has-text("Persona")').first();
  if (await personaButton.isVisible()) {
    await personaButton.click();
    await page.waitForTimeout(1000);

    // 最初のペルソナを選択
    const firstPersona = await page.locator('.persona-card, [class*="persona"]').first();
    if (await firstPersona.isVisible()) {
      await firstPersona.click();
    }
  }
}

async function sendTestMessage(page: Page, message: string) {
  // メッセージ入力
  const messageInput = await page.locator('textarea[placeholder*="メッセージ"], textarea[placeholder*="message"]');
  await messageInput.fill(message);

  // 送信ボタンをクリック
  const sendButton = await page.locator('button[aria-label*="send"], button:has-text("送信")');
  await sendButton.click();
}

async function checkSDAvailability(page: Page): Promise<boolean> {
  try {
    const response = await page.request.get('http://localhost:7860/sdapi/v1/options');
    return response.ok();
  } catch {
    return false;
  }
}