/**
 * クリップボードユーティリティ
 * モバイル環境を含むクロスプラットフォーム対応
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // モダンブラウザのClipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // フォールバック: execCommand を使用（古いブラウザ/モバイル対応）
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // スタイル設定（画面外に配置）
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    let successful = false;
    try {
      successful = document.execCommand('copy');
    } catch (err) {
      console.error("execCommand copy failed:", err);
    }

    document.body.removeChild(textArea);

    if (!successful) {
      throw new Error("Copy to clipboard failed");
    }

    return true;
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);

    // 最終フォールバック: プロンプトを表示
    if (typeof window !== 'undefined') {
      // モバイルでは選択可能なテキストエリアを表示
      const fallbackMessage = "クリップボードへのコピーに失敗しました。手動でテキストを選択してコピーしてください。";

      // トーストやアラートで通知（実装に応じて調整）
      if (typeof alert === 'function') {
        alert(fallbackMessage + "\n\n" + text);
      }
    }

    return false;
  }
}

/**
 * クリップボードから読み取り（Permissions APIを使用）
 */
export async function readFromClipboard(): Promise<string | null> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      const text = await navigator.clipboard.readText();
      return text;
    }
  } catch (err) {
    console.error("Failed to read from clipboard:", err);
  }

  return null;
}

/**
 * クリップボード機能が利用可能かチェック
 */
export function isClipboardSupported(): boolean {
  return !!(
    (navigator.clipboard && window.isSecureContext) ||
    document.queryCommandSupported?.('copy')
  );
}