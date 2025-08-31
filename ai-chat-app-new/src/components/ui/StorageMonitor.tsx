'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HardDrive, Trash2, AlertTriangle, Info } from 'lucide-react';
import { StorageCleaner } from '@/utils/storage-cleaner';

export const StorageMonitor: React.FC = () => {
  const [storageInfo, setStorageInfo] = useState<{
    totalMB: number;
    percentage: number;
    items: { key: string; sizeMB: number }[];
    details?: any;
  } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const checkStorage = () => {
    if (typeof window === 'undefined' || !localStorage) {
      return;
    }

    let totalSize = 0;
    const items: { key: string; sizeMB: number }[] = [];
    
    // 各アイテムのサイズを計算
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const value = localStorage.getItem(key) || '';
          const itemSize = value.length + key.length;
          totalSize += itemSize;
          items.push({
            key,
            sizeMB: itemSize / (1024 * 1024)
          });
        } catch (e) {
          console.warn(`Failed to read ${key}:`, e);
        }
      }
    }
    
    // サイズ順にソート
    items.sort((a, b) => b.sizeMB - a.sizeMB);
    
    // ai-chat-v3-storageの詳細
    let details: any = null;
    try {
      const mainStorage = localStorage.getItem('ai-chat-v3-storage');
      if (mainStorage) {
        const data = JSON.parse(mainStorage);
        if (data.state) {
          details = {
            sessions: 0,
            characters: 0,
            memoryCards: 0,
            messages: 0
          };
          
          // セッション数とメッセージ数
          if (data.state.sessions) {
            if (data.state.sessions._type === 'map' && data.state.sessions.value) {
              details.sessions = data.state.sessions.value.length;
              data.state.sessions.value.forEach(([, session]: [any, any]) => {
                details!.messages += session.messages?.length || 0;
              });
            } else if (typeof data.state.sessions === 'object') {
              details.sessions = Object.keys(data.state.sessions).length;
              Object.values(data.state.sessions).forEach((session: any) => {
                details!.messages += session.messages?.length || 0;
              });
            }
          }
          
          // キャラクター数
          if (data.state.characters) {
            if (Array.isArray(data.state.characters)) {
              details.characters = data.state.characters.length;
            } else if (data.state.characters._type === 'map' && data.state.characters.value) {
              details.characters = data.state.characters.value.length;
            } else if (typeof data.state.characters === 'object') {
              details.characters = Object.keys(data.state.characters).length;
            }
          }
          
          // メモリーカード数
          if (data.state.memoryCards && Array.isArray(data.state.memoryCards)) {
            details.memoryCards = data.state.memoryCards.length;
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse storage:', e);
    }
    
    const info = {
      totalMB: totalSize / (1024 * 1024),
      percentage: (totalSize / (5 * 1024 * 1024)) * 100,
      items: items.slice(0, 5),
      details
    };
    
    setStorageInfo(info);
    setIsOpen(true);
  };

  const clearStorage = () => {
    if (confirm('すべてのデータを削除しますか？この操作は取り消せません。')) {
      localStorage.clear();
      alert('ストレージをクリアしました。ページを再読み込みしてください。');
      window.location.reload();
    }
  };

  const runCleanup = () => {
    StorageCleaner.cleanupLocalStorage();
    alert('クリーンアップを実行しました。');
    checkStorage(); // 再チェック
  };

  return (
    <>
      {/* ストレージチェックボタン */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={checkStorage}
        className="fixed bottom-4 left-4 p-3 bg-purple-600 text-white rounded-full shadow-lg z-50"
        title="ストレージ使用状況"
      >
        <HardDrive className="w-5 h-5" />
      </motion.button>

      {/* モーダル */}
      {isOpen && storageInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-auto"
          >
            <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
              <HardDrive className="w-6 h-6" />
              ストレージ使用状況
            </h2>

            {/* 使用量メーター */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>使用量: {storageInfo.totalMB.toFixed(2)} MB</span>
                <span>{storageInfo.percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    storageInfo.percentage > 80
                      ? 'bg-red-500'
                      : storageInfo.percentage > 60
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                制限: 約5-10 MB（ブラウザにより異なる）
              </div>
            </div>

            {/* 警告 */}
            {storageInfo.percentage > 80 && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-300">
                  ストレージ容量が不足しています。データを削除するか、クリーンアップを実行してください。
                </div>
              </div>
            )}

            {/* 詳細情報 */}
            {storageInfo.details && (
              <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">データ内訳</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-400">セッション数:</div>
                  <div className="text-white">{storageInfo.details.sessions}</div>
                  <div className="text-gray-400">メッセージ総数:</div>
                  <div className="text-white">{storageInfo.details.messages}</div>
                  <div className="text-gray-400">キャラクター数:</div>
                  <div className="text-white">{storageInfo.details.characters}</div>
                  <div className="text-gray-400">メモリーカード数:</div>
                  <div className="text-white">{storageInfo.details.memoryCards}</div>
                </div>
              </div>
            )}

            {/* 大きいアイテム */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">大きいアイテム</h3>
              <div className="space-y-1">
                {storageInfo.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-400 truncate max-w-[200px]">
                      {item.key}
                    </span>
                    <span className="text-white">
                      {item.sizeMB.toFixed(3)} MB
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex gap-2">
              <button
                onClick={runCleanup}
                className="flex-1 py-2 px-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Info className="w-4 h-4" />
                クリーンアップ
              </button>
              <button
                onClick={clearStorage}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                全削除
              </button>
            </div>

            {/* 閉じるボタン */}
            <button
              onClick={() => setIsOpen(false)}
              className="w-full mt-4 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              閉じる
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
};