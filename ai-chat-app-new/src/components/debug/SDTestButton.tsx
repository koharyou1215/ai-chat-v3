"use client";

import React, { useState } from "react";
import { Image } from "lucide-react";

export function SDTestButton() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string>("");

  const testSD = async () => {
    setTesting(true);
    setResult("テスト中...");

    try {
      // 最小限のパラメータでテスト
      const response = await fetch("/api/sd/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: "a simple test, 1girl",
          negative_prompt: "bad quality",
          width: 512,
          height: 512,
          steps: 10,
          cfg_scale: 7,
          sampler_name: "Euler",
          seed: -1,
          restore_faces: false,
          enable_hr: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.images && data.images[0]) {
          setResult("✅ SD API動作確認OK！画像を生成しました");
          // 画像を表示
          const img = document.createElement("img");
          img.src = `data:image/png;base64,${data.images[0]}`;
          img.alt = "SD API生成画像";
          img.style.maxWidth = "200px";
          img.style.marginTop = "10px";
          const container = document.getElementById("sd-test-result");
          if (container) {
            container.innerHTML = "";
            container.appendChild(img);
          }
        } else {
          setResult("⚠️ レスポンスに画像が含まれていません");
        }
      } else {
        const error = await response.json();
        setResult(`❌ エラー: ${error.error}`);
      }
    } catch (error) {
      setResult(
        `❌ 接続エラー: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-gray-900 p-4 rounded-lg shadow-xl max-w-sm">
      <h3 className="text-white font-bold mb-2">SD API テスト</h3>
      <button
        onClick={testSD}
        disabled={testing}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-md transition-colors"
        aria-label="SD APIテスト実行">
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image size={16} aria-hidden="true" />
        {testing ? "テスト中..." : "テスト実行"}
      </button>
      <div className="mt-2 text-sm text-white">{result}</div>
      <div id="sd-test-result"></div>
    </div>
  );
}
