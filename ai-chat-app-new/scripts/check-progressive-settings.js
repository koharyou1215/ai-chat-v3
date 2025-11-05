// プログレッシブ応答設定の確認スクリプト
console.log("=".repeat(60));
console.log("プログレッシブ応答設定の確認");
console.log("=".repeat(60));

// LocalStorageから統一設定を取得
const unifiedSettings = localStorage.getItem('unified-settings');
if (unifiedSettings) {
  try {
    const settings = JSON.parse(unifiedSettings);
    console.log("\n✅ unified-settings found:");
    console.log("  - chat.progressiveMode:", JSON.stringify(settings.chat?.progressiveMode, null, 2));
  } catch (e) {
    console.error("❌ Failed to parse unified-settings:", e);
  }
} else {
  console.log("\n❌ unified-settings not found in localStorage");
}

// Zustandストアの状態を取得
const zustandStore = localStorage.getItem('ai-chat-v3-storage');
if (zustandStore) {
  try {
    const store = JSON.parse(zustandStore);
    console.log("\n✅ ai-chat-v3-storage found:");
    console.log("  - state.chat:", store.state?.chat ? "exists" : "not found");
    if (store.state?.chat) {
      console.log("  - chat.progressiveMode:", JSON.stringify(store.state.chat.progressiveMode, null, 2));
    }
  } catch (e) {
    console.error("❌ Failed to parse ai-chat-v3-storage:", e);
  }
} else {
  console.log("\n❌ ai-chat-v3-storage not found in localStorage");
}

console.log("\n" + "=".repeat(60));
