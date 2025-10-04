"use client";

import React, { useState } from "react";
import { Upload, Download, RefreshCw } from "lucide-react";
import { useAppStore } from "@/store";

/**
 * キャラクター管理パネル
 * キャラクターのインポート、エクスポート、再読み込みを管理
 */
export const CharacterManagementPanel: React.FC = () => {
  const {
    characters,
    addCharacter,
    loadCharactersFromPublic,
    isCharactersLoaded,
  } = useAppStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  const handleJsonUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("ファイルを読み込み中...");

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);

          // キャラクターデータを検証
          if (!json.name) {
            throw new Error("キャラクターファイルに名前が含まれていません");
          }

          // 新しいIDを生成
          const characterId = `imported-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;

          // Character型に変換
          const character = {
            id: characterId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            version: 1,
            name: json.name || "名前なし",
            age: json.age || "不明",
            occupation: json.occupation || "不明",
            catchphrase: json.catchphrase || json.first_message || "",
            personality: json.personality || "",
            external_personality: json.external_personality || "",
            internal_personality: json.internal_personality || "",
            strengths: Array.isArray(json.strengths)
              ? json.strengths
              : typeof json.strengths === "string"
              ? json.strengths.split(",").map((s: string) => s.trim())
              : [],
            weaknesses: Array.isArray(json.weaknesses)
              ? json.weaknesses
              : typeof json.weaknesses === "string"
              ? json.weaknesses.split(",").map((s: string) => s.trim())
              : [],
            hobbies: Array.isArray(json.hobbies)
              ? json.hobbies
              : typeof json.hobbies === "string"
              ? json.hobbies.split(",").map((s: string) => s.trim())
              : [],
            likes: Array.isArray(json.likes)
              ? json.likes
              : typeof json.likes === "string"
              ? json.likes.split(",").map((s: string) => s.trim())
              : [],
            dislikes: Array.isArray(json.dislikes)
              ? json.dislikes
              : typeof json.dislikes === "string"
              ? json.dislikes.split(",").map((s: string) => s.trim())
              : [],
            appearance: json.appearance || "",
            avatar_url: json.avatar_url || "",
            background_url: json.background_url || "/images/default-bg.jpg",
            speaking_style: json.speaking_style || "",
            first_person: json.first_person || "私",
            second_person: json.second_person || "あなた",
            verbal_tics: Array.isArray(json.verbal_tics)
              ? json.verbal_tics
              : typeof json.verbal_tics === "string"
              ? json.verbal_tics.split(",").map((s: string) => s.trim())
              : [],
            background: json.background || "",
            scenario: json.scenario || "",
            system_prompt: json.system_prompt || "",
            first_message: json.first_message || "",
            tags: Array.isArray(json.tags)
              ? json.tags
              : typeof json.tags === "string"
              ? json.tags.split(",").map((s: string) => s.trim())
              : [],
            trackers: Array.isArray(json.trackers) ? json.trackers : [],
            nsfw_profile: json.nsfw_profile,
            statistics: {
              usage_count: 0,
              last_used: new Date().toISOString(),
              favorite_count: 0,
              average_session_length: 0,
            },
          };

          // キャラクターを追加
          addCharacter(character);

          setUploadStatus(
            `✅ キャラクター「${character.name}」を正常にインポートしました`
          );

          // 3秒後にステータスをクリア
          setTimeout(() => {
            setUploadStatus("");
          }, 3000);
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          setUploadStatus(
            `❌ ファイルの解析に失敗しました: ${
              parseError instanceof Error ? parseError.message : "不明なエラー"
            }`
          );
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error("File upload error:", error);
      setUploadStatus(
        `❌ ファイルの読み込みに失敗しました: ${
          error instanceof Error ? error.message : "不明なエラー"
        }`
      );
    } finally {
      setIsUploading(false);
      // ファイル入力をリセット
      event.target.value = "";
    }
  };

  const handleRefreshCharacters = async () => {
    setIsUploading(true);
    setUploadStatus("キャラクターを再読み込み中...");

    try {
      await loadCharactersFromPublic();
      setUploadStatus("✅ キャラクターの再読み込みが完了しました");

      setTimeout(() => {
        setUploadStatus("");
      }, 3000);
    } catch (error) {
      console.error("Refresh error:", error);
      setUploadStatus(
        `❌ 再読み込みに失敗しました: ${
          error instanceof Error ? error.message : "不明なエラー"
        }`
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleExportCharacters = () => {
    try {
      const charactersArray = Array.from(characters.values());
      const dataStr = JSON.stringify(charactersArray, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });

      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `characters-export-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setUploadStatus("✅ キャラクターをエクスポートしました");
      setTimeout(() => setUploadStatus(""), 3000);
    } catch (error) {
      console.error("Export error:", error);
      setUploadStatus(
        `❌ エクスポートに失敗しました: ${
          error instanceof Error ? error.message : "不明なエラー"
        }`
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">
          キャラクター管理
        </h3>
        <p className="text-gray-400 text-sm">
          キャラクターのインポート、エクスポート、再読み込みを行えます
        </p>
      </div>

      {/* ステータス表示 */}
      {uploadStatus && (
        <div
          className={`p-3 rounded-lg text-sm ${
            uploadStatus.startsWith("✅")
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}>
          {uploadStatus}
        </div>
      )}

      {/* アクションボタン */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* JSONファイルアップロード */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white">
            JSONファイルをインポート
          </label>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleJsonUpload}
              disabled={isUploading}
              className="hidden"
              id="character-json-upload"
            />
            <label
              htmlFor="character-json-upload"
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                isUploading
                  ? "border-gray-500 text-gray-400 cursor-not-allowed"
                  : "border-purple-400/50 text-purple-400 hover:border-purple-400 hover:bg-purple-400/10"
              }`}>
              <Upload className="w-4 h-4" />
              <span className="text-sm">
                {isUploading ? "処理中..." : "ファイルを選択"}
              </span>
            </label>
          </div>
        </div>

        {/* キャラクター再読み込み */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white">
            キャラクターを再読み込み
          </label>
          <button
            onClick={handleRefreshCharacters}
            disabled={isUploading}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
              isUploading
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}>
            <RefreshCw
              className={`w-4 h-4 ${isUploading ? "animate-spin" : ""}`}
            />
            <span className="text-sm">
              {isUploading ? "読み込み中..." : "再読み込み"}
            </span>
          </button>
        </div>

        {/* キャラクターエクスポート */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white">
            キャラクターをエクスポート
          </label>
          <button
            onClick={handleExportCharacters}
            disabled={isUploading || characters.size === 0}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
              isUploading || characters.size === 0
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}>
            <Download className="w-4 h-4" />
            <span className="text-sm">
              {characters.size === 0 ? "キャラクターなし" : "エクスポート"}
            </span>
          </button>
        </div>
      </div>

      {/* キャラクター統計 */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h4 className="text-lg font-medium text-white mb-3">
          キャラクター統計
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-400">総キャラクター数</div>
            <div className="text-white font-semibold">{characters.size}</div>
          </div>
          <div>
            <div className="text-gray-400">読み込み状態</div>
            <div
              className={`font-semibold ${
                isCharactersLoaded ? "text-green-400" : "text-yellow-400"
              }`}>
              {isCharactersLoaded ? "完了" : "読み込み中"}
            </div>
          </div>
          <div>
            <div className="text-gray-400">アバター設定済み</div>
            <div className="text-white font-semibold">
              {
                Array.from(characters.values()).filter((c) => c.avatar_url)
                  .length
              }
            </div>
          </div>
          <div>
            <div className="text-gray-400">背景設定済み</div>
            <div className="text-white font-semibold">
              {
                Array.from(characters.values()).filter(
                  (c) =>
                    c.background_url &&
                    c.background_url !== "/images/default-bg.jpg"
                ).length
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
