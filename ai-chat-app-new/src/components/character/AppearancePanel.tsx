"use client";

import React from "react";
import Image from "next/image";
import { Textarea } from "@/components/ui/textarea";
import { Character } from "@/types/core/character.types";
import { Persona } from "@/types/core/persona.types";
import { useFileUpload } from "@/hooks/useFileUpload";

// 親コンポーネントから受け取るpropsの型を定義
interface AppearancePanelProps {
  formData: Character | null;
  setFormData: React.Dispatch<React.SetStateAction<Character | Persona | null>>;
}

export const AppearancePanel: React.FC<AppearancePanelProps> = ({
  formData,
  setFormData,
}) => {
  const { uploadFile, isUploading } = useFileUpload();

  const handleFileUpload = async (file: File, field: "background_url") => {
    console.log("Starting file upload:", {
      field,
      fileName: file.name,
      fileSize: file.size,
    });

    try {
      const url = await uploadFile(file);
      console.log("File upload successful, URL:", url);
      setFormData((prev) =>
        prev ? { ...(prev as Character), [field]: url } : prev
      );
    } catch (error) {
      console.error("An error occurred during file upload:", error);
      alert(`ファイルアップロードエラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 p-6 rounded-xl border border-indigo-700/30">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
          <span className="text-indigo-400 text-lg">🖼️</span>
        </div>
        <h4 className="text-lg font-semibold text-white">外見</h4>
        <p className="text-sm text-slate-400">キャラクターのビジュアル設定</p>
      </div>
      <div className="grid grid-cols-1 gap-6">
        {/* 背景画像アップロード */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">背景画像</label>
          <div className="bg-slate-800/50 border-2 border-dashed border-slate-600 rounded-lg p-4">
            {formData?.background_url ? (
              <div className="relative">
                <Image
                  src={formData.background_url}
                  alt="Background"
                  width={400}
                  height={128}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  onClick={() =>
                    setFormData((prev) =>
                      prev
                        ? { ...(prev as Character), background_url: undefined }
                        : prev
                    )
                  }
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-lg text-xs">
                  削除
                </button>
              </div>
            ) : (
              <div
                className="text-center py-8 cursor-pointer touch-manipulation min-h-[120px] sm:min-h-[160px]"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add("bg-slate-700/50");
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("bg-slate-700/50");
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("bg-slate-700/50");
                  const files = Array.from(e.dataTransfer.files);
                  if (files[0] && files[0].type.startsWith("image/")) {
                    await handleFileUpload(files[0], "background_url");
                  }
                }}
                onTouchStart={(e) => {
                  // モバイル環境でのタッチ開始時の視覚的フィードバック
                  if ("ontouchstart" in window) {
                    e.currentTarget.classList.add("bg-slate-700/50");
                  }
                }}
                onTouchEnd={(e) => {
                  // タッチ終了時の視覚的フィードバックをクリア
                  if ("ontouchstart" in window) {
                    e.currentTarget.classList.remove("bg-slate-700/50");
                  }
                }}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      await handleFileUpload(file, "background_url");
                    }
                  };
                  // モバイル環境でのタッチ操作を最適化
                  if ("ontouchstart" in window) {
                    setTimeout(() => {
                      input.click();
                    }, 100);
                  } else {
                    input.click();
                  }
                }}>
                <div className="text-slate-400 mb-2">
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
                  ) : (
                    <>
                      <svg
                        className="mx-auto h-12 w-12"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48">
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p className="text-sm">
                        <span className="hidden sm:inline">
                          クリックまたはドラッグ＆ドロップで画像をアップロード
                        </span>
                        <span className="sm:hidden">
                          タップで画像をアップロード
                        </span>
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 外見の詳細 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            外見の詳細
          </label>
          <Textarea
            placeholder="身長、髪型、服装、特徴的な外見など詳しく記述してください..."
            value={formData?.appearance || ""}
            onChange={(e) =>
              setFormData((prev) =>
                prev ? { ...prev, appearance: e.target.value } : prev
              )
            }
            rows={6}
            className="bg-slate-800/50 border-slate-600 focus:border-indigo-400 resize-none"
          />
        </div>
      </div>
    </div>
  );
};
