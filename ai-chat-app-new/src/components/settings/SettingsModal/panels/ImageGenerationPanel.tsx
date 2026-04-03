import React from "react";
import { useAppStore } from "@/store";
import { Image, Settings, Key, Server } from "lucide-react";

export const ImageGenerationPanel: React.FC = () => {
    const { unifiedSettings, updateCategory } = useAppStore();
    const settings = unifiedSettings.imageGeneration;

    const updateSettings = (updates: Partial<typeof settings>) => {
        updateCategory("imageGeneration", updates);
    };

    const updateRunwareSettings = (updates: Partial<typeof settings.runware>) => {
        updateSettings({
            runware: {
                ...settings.runware,
                ...updates,
            },
        });
    };

    const updateSDSettings = (updates: Partial<typeof settings.stableDiffusion>) => {
        updateSettings({
            stableDiffusion: {
                ...settings.stableDiffusion,
                ...updates,
            },
        });
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Image className="w-6 h-6 text-purple-400" />
                画像生成設定
            </h3>

            {/* プロバイダー選択 */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">
                    生成プロバイダー
                </label>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => updateSettings({ provider: "runware" })}
                        className={`p-4 rounded-xl border transition-all ${settings.provider === "runware"
                            ? "bg-purple-500/20 border-purple-500 text-white"
                            : "bg-slate-800/50 border-white/10 text-gray-400 hover:bg-slate-800"
                            }`}
                    >
                        <div className="flex flex-col items-center gap-2">
                            <Server className="w-6 h-6" />
                            <span className="font-medium">Runware API</span>
                        </div>
                    </button>

                    <button
                        onClick={() => updateSettings({ provider: "stable-diffusion" })}
                        className={`p-4 rounded-xl border transition-all ${settings.provider === "stable-diffusion"
                            ? "bg-purple-500/20 border-purple-500 text-white"
                            : "bg-slate-800/50 border-white/10 text-gray-400 hover:bg-slate-800"
                            }`}
                    >
                        <div className="flex flex-col items-center gap-2">
                            <Settings className="w-6 h-6" />
                            <span className="font-medium">Stable Diffusion (Local)</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Runware設定 */}
            {settings.provider === "runware" && (
                <div className="space-y-4 p-4 bg-slate-800/30 rounded-xl border border-white/10">
                    <h4 className="text-lg font-medium text-white flex items-center gap-2">
                        <Server className="w-5 h-5 text-purple-400" />
                        Runware設定
                    </h4>

                    {/* APIキー */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">
                            APIキー
                        </label>
                        <div className="relative">
                            <input
                                type="password"
                                value={settings.runware?.apiKey ?? ""}
                                onChange={(e) => {
                                    const newApiKey = e.target.value;
                                    if (newApiKey !== settings.runware?.apiKey) {
                                        updateRunwareSettings({ apiKey: newApiKey });
                                    }
                                }}
                                className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                                placeholder="Runware API Key"
                            />
                            <Key className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-400">
                            Runwareのダッシュボードから取得したAPIキーを入力してください。
                        </p>
                    </div>

                    {/* モデル選択 */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">
                            モデル
                        </label>
                        <input
                            type="text"
                            value={settings.runware.modelId}
                            onChange={(e) => updateRunwareSettings({ modelId: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            placeholder="bytedance:5@0"
                        />
                        <p className="text-xs text-gray-400">
                            例: bytedance:5@0, runware:100@1
                        </p>
                    </div>

                    {/* 画像サイズ */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300">
                                幅 (Width)
                            </label>
                            <input
                                type="number"
                                value={settings.runware.width}
                                onChange={(e) => updateRunwareSettings({ width: parseInt(e.target.value) || 512 })}
                                min="128"
                                max="4096"
                                step="64"
                                className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300">
                                高さ (Height)
                            </label>
                            <input
                                type="number"
                                value={settings.runware.height}
                                onChange={(e) => updateRunwareSettings({ height: parseInt(e.target.value) || 512 })}
                                min="128"
                                max="4096"
                                step="64"
                                className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            />
                        </div>
                    </div>

                    {/* ステップ数とCFG Scale */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300">
                                ステップ数
                            </label>
                            <input
                                type="number"
                                value={settings.runware.steps}
                                onChange={(e) => updateRunwareSettings({ steps: parseInt(e.target.value) || 20 })}
                                min="1"
                                max="150"
                                className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            />
                            <p className="text-xs text-gray-400">推奨: 15-30</p>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300">
                                CFG Scale
                            </label>
                            <input
                                type="number"
                                value={settings.runware.cfgScale}
                                onChange={(e) => updateRunwareSettings({ cfgScale: parseFloat(e.target.value) || 7 })}
                                min="1"
                                max="30"
                                step="0.5"
                                className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            />
                            <p className="text-xs text-gray-400">推奨: 5-10</p>
                        </div>
                    </div>

                    {/* サンプラー */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">
                            サンプラー
                        </label>
                        <input
                            type="text"
                            value={settings.runware.sampler}
                            onChange={(e) => updateRunwareSettings({ sampler: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            placeholder="DPM++ 2M Karras"
                        />
                        <p className="text-xs text-gray-400">
                            例: DPM++ 2M Karras, Euler a, DDIM
                        </p>
                    </div>

                    {/* カスタムプロンプト追加 */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">
                            カスタムプロンプト追加
                        </label>
                        <textarea
                            value={settings.runware.customQualityTags}
                            onChange={(e) => updateRunwareSettings({ customQualityTags: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 resize-none"
                            placeholder="例: 8k, highly detailed, cinematic lighting"
                        />
                        <p className="text-xs text-gray-400">
                            自動生成されるプロンプトに追加するタグをカンマ区切りで入力
                        </p>
                    </div>
                </div>
            )}

            {/* Stable Diffusion設定 */}
            {settings.provider === "stable-diffusion" && (
                <div className="space-y-4 p-4 bg-slate-800/30 rounded-xl border border-white/10">
                    <h4 className="text-lg font-medium text-white flex items-center gap-2">
                        <Settings className="w-5 h-5 text-purple-400" />
                        Stable Diffusion設定
                    </h4>

                    <p className="text-sm text-gray-300">
                        ローカルのStable Diffusion WebUI (Automatic1111) を使用します。
                        <br />
                        <code className="bg-slate-900 px-1 py-0.5 rounded text-xs">--api</code> フラグを付けて起動してください。
                    </p>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">
                            モデルID (Checkpoint)
                        </label>
                        <input
                            type="text"
                            value={settings.stableDiffusion.modelId}
                            onChange={(e) => updateSDSettings({ modelId: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            placeholder="stable-diffusion-v1-5"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
