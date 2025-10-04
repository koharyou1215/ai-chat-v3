"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";

/**
 * 言語・地域設定パネル
 * 言語、タイムゾーン、日付・時刻形式、通貨を管理
 */
export const LanguagePanel: React.FC = () => {
  const { languageSettings, updateLanguageSettings } = useAppStore();

  const languages = [
    { code: "ja", name: "日本語", flag: "🇯🇵" },
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "zh", name: "中文", flag: "🇨🇳" },
    { code: "ko", name: "한국어", flag: "🇰🇷" },
  ];

  const timezones = [
    { value: "Asia/Tokyo", label: "東京 (UTC+9)" },
    { value: "America/New_York", label: "ニューヨーク (UTC-5)" },
    { value: "Europe/London", label: "ロンドン (UTC+0)" },
    { value: "Asia/Shanghai", label: "上海 (UTC+8)" },
    { value: "Asia/Seoul", label: "ソウル (UTC+9)" },
  ];

  const dateFormats = [
    { value: "YYYY/MM/DD", label: "2024/12/25" },
    { value: "MM/DD/YYYY", label: "12/25/2024" },
    { value: "DD/MM/YYYY", label: "25/12/2024" },
    { value: "YYYY-MM-DD", label: "2024-12-25" },
  ];

  const currencies = [
    { value: "JPY", label: "日本円 (¥)" },
    { value: "USD", label: "米ドル ($)" },
    { value: "EUR", label: "ユーロ (€)" },
    { value: "CNY", label: "人民元 (¥)" },
    { value: "KRW", label: "韓国ウォン (₩)" },
  ];

  const getCurrentTime = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: languageSettings.timezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: languageSettings.timeFormat === "12",
    };
    return now.toLocaleTimeString(
      languageSettings.language === "ja" ? "ja-JP" : "en-US",
      options
    );
  };

  const getCurrentDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: languageSettings.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };
    return now.toLocaleDateString(
      languageSettings.language === "ja" ? "ja-JP" : "en-US",
      options
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white mb-4">言語・地域設定</h3>

      {/* 現在の時刻表示 */}
      <div className="p-4 bg-slate-800/50 rounded-lg border border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">
          現在の設定プレビュー
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">現在時刻:</span>
            <span className="ml-2 text-white font-mono">
              {getCurrentTime()}
            </span>
          </div>
          <div>
            <span className="text-gray-400">現在日付:</span>
            <span className="ml-2 text-white font-mono">
              {getCurrentDate()}
            </span>
          </div>
        </div>
      </div>

      {/* 言語選択 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          表示言語
        </label>
        <div className="grid grid-cols-2 gap-3">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() =>
                updateLanguageSettings({
                  language: lang.code as "ja" | "en" | "zh" | "ko",
                })
              }
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                languageSettings.language === lang.code
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                  : "bg-slate-800/50 border-gray-700 text-white/80 hover:bg-slate-700/50"
              )}>
              <span className="text-lg">{lang.flag}</span>
              <span className="font-medium">{lang.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* タイムゾーン設定 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          タイムゾーン
        </label>
        <select
          value={languageSettings.timezone}
          onChange={(e) => updateLanguageSettings({ timezone: e.target.value })}
          className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500">
          {timezones.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {/* 日付形式設定 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          日付形式
        </label>
        <select
          value={languageSettings.dateFormat}
          onChange={(e) =>
            updateLanguageSettings({ dateFormat: e.target.value })
          }
          className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500">
          {dateFormats.map((format) => (
            <option key={format.value} value={format.value}>
              {format.label}
            </option>
          ))}
        </select>
      </div>

      {/* 時刻形式設定 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          時刻形式
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => updateLanguageSettings({ timeFormat: "24" })}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg border transition-colors",
              languageSettings.timeFormat === "24"
                ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                : "bg-slate-800/50 border-gray-700 text-white/80 hover:bg-slate-700/50"
            )}>
            24時間表示 (18:30)
          </button>
          <button
            onClick={() => updateLanguageSettings({ timeFormat: "12" })}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg border transition-colors",
              languageSettings.timeFormat === "12"
                ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                : "bg-slate-800/50 border-gray-700 text-white/80 hover:bg-slate-700/50"
            )}>
            12時間表示 (6:30 PM)
          </button>
        </div>
      </div>

      {/* 通貨設定 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">通貨</label>
        <select
          value={languageSettings.currency}
          onChange={(e) => updateLanguageSettings({ currency: e.target.value })}
          className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500">
          {currencies.map((currency) => (
            <option key={currency.value} value={currency.value}>
              {currency.label}
            </option>
          ))}
        </select>
      </div>

      {/* 追加情報 */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <h4 className="text-sm font-medium text-blue-300 mb-2">💡 ヒント</h4>
        <ul className="text-xs text-blue-200 space-y-1">
          <li>• 言語設定はアプリケーション全体に反映されます</li>
          <li>• タイムゾーンはメッセージの時刻表示に影響します</li>
          <li>• 設定は自動的に保存されます</li>
        </ul>
      </div>
    </div>
  );
};
