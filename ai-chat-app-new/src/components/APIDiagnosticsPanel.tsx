"use client";

import { useEffect, useState } from "react";
import { diagnoseAPIConfiguration, APIDiagnosticsResult } from "@/utils/api-diagnostics";

/**
 * API診断パネル
 * 開発環境でのデバッグ用
 */
export default function APIDiagnosticsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<APIDiagnosticsResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = () => {
    setIsRunning(true);
    try {
      const result = diagnoseAPIConfiguration();
      setDiagnostics(result);
      console.log("🔍 Diagnostics result:", result);
    } catch (error) {
      console.error("Failed to run diagnostics:", error);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    // 初回実行
    runDiagnostics();
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[9999] bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
        title="API診断パネルを開く"
      >
        🔍 API診断
      </button>
    );
  }

  const issues: string[] = [];

  if (diagnostics) {
    if (!diagnostics.hasGeminiKey && !diagnostics.hasOpenRouterKey) {
      issues.push("API キーが見つかりません");
    }

    if (diagnostics.useDirectGeminiAPI && !diagnostics.hasGeminiKey) {
      issues.push("Gemini API 直接使用が有効ですが、API キーが設定されていません");
    }

    if (!diagnostics.useDirectGeminiAPI && !diagnostics.hasOpenRouterKey) {
      issues.push("OpenRouter モードですが、API キーが設定されていません");
    }

    if (!diagnostics.apiConfigFound) {
      issues.push("API 設定が見つかりません");
    }

    if (diagnostics.geminiKeyLength > 0 && diagnostics.geminiKeyLength < 30) {
      issues.push("Gemini API キーが短すぎます（無効の可能性）");
    }

    if (diagnostics.openRouterKeyLength > 0 && diagnostics.openRouterKeyLength < 30) {
      issues.push("OpenRouter API キーが短すぎます（無効の可能性）");
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-96 bg-slate-800/95 backdrop-blur-md rounded-lg shadow-2xl border border-purple-400/30 overflow-hidden">
      {/* ヘッダー */}
      <div className="bg-purple-600 text-white px-4 py-3 flex justify-between items-center">
        <h3 className="font-bold">🔍 API 診断パネル</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-purple-700 rounded px-2 py-1 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* コンテンツ */}
      <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
        {/* 再診断ボタン */}
        <button
          onClick={runDiagnostics}
          disabled={isRunning}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white px-4 py-2 rounded transition-colors"
        >
          {isRunning ? "診断中..." : "🔄 再診断"}
        </button>

        {diagnostics ? (
          <>
            {/* タイムスタンプ */}
            <div className="text-xs text-white/60">
              {new Date(diagnostics.timestamp).toLocaleString('ja-JP')}
            </div>

            {/* ストレージサイズ */}
            <div className="bg-slate-700/50 rounded p-3">
              <div className="text-white/80 text-sm mb-1">ストレージサイズ</div>
              <div className="text-white font-mono">
                {(diagnostics.storageSize / 1024).toFixed(2)} KB
              </div>
            </div>

            {/* APIキー状態 */}
            <div className="bg-slate-700/50 rounded p-3 space-y-2">
              <div className="text-white/80 text-sm mb-2">API キー</div>

              <div className="flex items-center justify-between">
                <span className="text-white text-sm">Gemini API</span>
                <span className={`text-sm ${diagnostics.hasGeminiKey ? 'text-green-400' : 'text-red-400'}`}>
                  {diagnostics.hasGeminiKey ? '✅ 設定済み' : '❌ 未設定'}
                  {diagnostics.hasGeminiKey && (
                    <span className="ml-2 text-white/60">({diagnostics.geminiKeyLength} 文字)</span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white text-sm">OpenRouter API</span>
                <span className={`text-sm ${diagnostics.hasOpenRouterKey ? 'text-green-400' : 'text-red-400'}`}>
                  {diagnostics.hasOpenRouterKey ? '✅ 設定済み' : '❌ 未設定'}
                  {diagnostics.hasOpenRouterKey && (
                    <span className="ml-2 text-white/60">({diagnostics.openRouterKeyLength} 文字)</span>
                  )}
                </span>
              </div>
            </div>

            {/* API設定 */}
            <div className="bg-slate-700/50 rounded p-3 space-y-2">
              <div className="text-white/80 text-sm mb-2">API 設定</div>

              <div className="flex items-center justify-between">
                <span className="text-white text-sm">プロバイダー</span>
                <span className="text-white font-mono text-sm">{diagnostics.currentProvider}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white text-sm">モデル</span>
                <span className="text-white font-mono text-sm truncate max-w-[180px]" title={diagnostics.currentModel}>
                  {diagnostics.currentModel}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white text-sm">Gemini 直接 API</span>
                <span className={`text-sm ${diagnostics.useDirectGeminiAPI ? 'text-green-400' : 'text-white/60'}`}>
                  {diagnostics.useDirectGeminiAPI ? 'ON' : 'OFF'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white text-sm">API 設定</span>
                <span className={`text-sm ${diagnostics.apiConfigFound ? 'text-green-400' : 'text-red-400'}`}>
                  {diagnostics.apiConfigFound ? '✅' : '❌'}
                </span>
              </div>
            </div>

            {/* 問題検出 */}
            {issues.length > 0 && (
              <div className="bg-red-900/30 border border-red-400/30 rounded p-3">
                <div className="text-red-400 text-sm font-bold mb-2">⚠️ 検出された問題</div>
                <ul className="space-y-1">
                  {issues.map((issue, index) => (
                    <li key={index} className="text-red-300 text-sm">
                      • {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {issues.length === 0 && (
              <div className="bg-green-900/30 border border-green-400/30 rounded p-3">
                <div className="text-green-400 text-sm">
                  ✅ 問題は検出されませんでした
                </div>
              </div>
            )}

            {/* 推奨アクション */}
            {issues.length > 0 && (
              <div className="bg-blue-900/30 border border-blue-400/30 rounded p-3">
                <div className="text-blue-400 text-sm font-bold mb-2">💡 推奨アクション</div>
                <div className="text-blue-300 text-sm space-y-1">
                  {(!diagnostics.hasGeminiKey && !diagnostics.hasOpenRouterKey) && (
                    <p>• 設定画面（歯車アイコン）→「AI」タブで API キーを入力してください</p>
                  )}
                  {(diagnostics.useDirectGeminiAPI && !diagnostics.hasGeminiKey) && (
                    <p>• Gemini API キーを設定するか、OpenRouter モードに切り替えてください</p>
                  )}
                  {(!diagnostics.useDirectGeminiAPI && !diagnostics.hasOpenRouterKey) && (
                    <p>• OpenRouter API キーを設定するか、Gemini 直接 API モードに切り替えてください</p>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-white/60 text-center py-8">
            診断データがありません
          </div>
        )}
      </div>
    </div>
  );
}
