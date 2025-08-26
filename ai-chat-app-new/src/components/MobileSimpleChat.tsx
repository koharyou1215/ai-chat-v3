'use client';

import React, { useState, useEffect } from 'react';
import { Send, Settings, Menu, X } from 'lucide-react';

export const MobileSimpleChat: React.FC = () => {
  const [messages, setMessages] = useState<Array<{id: number, text: string, isUser: boolean}>>([]);
  const [input, setInput] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  // 初期メッセージ
  useEffect(() => {
    setMessages([
      { id: 1, text: "モバイル専用チャットが起動しました！", isUser: false }
    ]);
  }, []);

  const sendMessage = () => {
    if (!input.trim()) return;
    
    const userMessage = { id: Date.now(), text: input, isUser: true };
    const aiResponse = { id: Date.now() + 1, text: `「${input}」について考えています...（モバイル簡易版）`, isUser: false };
    
    setMessages(prev => [...prev, userMessage, aiResponse]);
    setInput('');
  };

  return (
    <div 
      className="flex flex-col bg-slate-900 text-white"
      style={{ 
        height: '100vh', 
        width: '100vw', 
        position: 'fixed', 
        top: 0, 
        left: 0,
        zIndex: 1000
      }}
    >
      {/* ヘッダー */}
      <div className="bg-slate-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowMenu(!showMenu)}>
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">AI Chat Mobile</h1>
        </div>
        <Settings className="w-6 h-6" />
      </div>

      {/* メニュー */}
      {showMenu && (
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <button 
            onClick={() => {
              localStorage.setItem('safe-mode', 'false');
              window.location.reload();
            }}
            className="w-full text-left p-2 hover:bg-slate-700 rounded"
          >
            🔄 通常版に戻る
          </button>
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="w-full text-left p-2 hover:bg-slate-700 rounded text-red-400"
          >
            🗑️ データリセット
          </button>
        </div>
      )}

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                message.isUser
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-white'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
      </div>

      {/* 入力エリア */}
      <div className="bg-slate-800 p-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="メッセージを入力..."
          className="flex-1 bg-slate-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          onClick={sendMessage}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* デバッグ情報 */}
      <div className="bg-slate-900 text-xs text-gray-400 p-2 text-center">
        モバイル簡易版 | 画面: {window.innerWidth}x{window.innerHeight}
      </div>
    </div>
  );
};

export default MobileSimpleChat;