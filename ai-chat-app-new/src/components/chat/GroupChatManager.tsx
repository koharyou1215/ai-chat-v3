import React, { useState } from 'react';
import { useAppStore } from '@/store';
import { Trash2, Plus, Users, X, Clock, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';

export function GroupChatManager() {
  const {
    groupSessions,
    active_group_session_id,
    setActiveGroupSessionId,
    deleteGroupSession,
    clearGroupSession,
    getAllGroupSessions,
    is_group_mode,
    setGroupMode
  } = useAppStore();

  const [showManager, setShowManager] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const sessions = getAllGroupSessions();

  const handleDeleteSession = (sessionId: string) => {
    if (confirmDelete === sessionId) {
      deleteGroupSession(sessionId);
      setConfirmDelete(null);
      if (active_group_session_id === sessionId) {
        // 削除後、最初のセッションをアクティブにする
        const remainingSessions = sessions.filter(s => s.id !== sessionId);
        if (remainingSessions.length > 0) {
          setActiveGroupSessionId(remainingSessions[0].id);
        } else {
          setGroupMode(false);
        }
      }
    } else {
      setConfirmDelete(sessionId);
      // 3秒後に確認をリセット
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const handleClearSession = (sessionId: string) => {
    clearGroupSession(sessionId);
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveGroupSessionId(sessionId);
    setGroupMode(true);
    setShowManager(false);
  };

  if (!is_group_mode) return null;

  return (
    <>
      {/* 管理ボタン */}
      <button
        onClick={() => setShowManager(!showManager)}
        className="fixed top-20 right-4 z-50 p-2 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700 transition-all"
        title="グループチャット管理"
      >
        <Users className="w-5 h-5" />
      </button>

      {/* 管理モーダル */}
      {showManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-6 h-6" />
                グループチャット管理
              </h2>
              <button
                onClick={() => setShowManager(false)}
                className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* セッションリスト */}
            <div className="overflow-y-auto max-h-[60vh] p-4">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  グループチャットセッションがありません
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map(session => {
                    const isActive = session.id === active_group_session_id;
                    const characterNames = session.characters.map(c => c.name).join(', ');
                    const lastMessage = session.messages[session.messages.length - 1];
                    const createdDate = new Date(session.created_at);

                    return (
                      <div
                        key={session.id}
                        className={`p-4 rounded-lg border transition-all ${
                          isActive
                            ? 'bg-purple-600/20 border-purple-500'
                            : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* セッション名 */}
                            <h3
                              className="font-medium text-white mb-1 cursor-pointer hover:text-purple-400"
                              onClick={() => handleSelectSession(session.id)}
                            >
                              {session.name || `グループチャット #${session.id.slice(0, 8)}`}
                            </h3>

                            {/* キャラクター */}
                            <div className="text-sm text-gray-400 mb-2">
                              <span className="inline-flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {characterNames}
                              </span>
                            </div>

                            {/* メタ情報 */}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(createdDate, 'yyyy/MM/dd HH:mm')}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {session.message_count} メッセージ
                              </span>
                              {session.scenario && (
                                <span className="text-purple-400">
                                  📖 {session.scenario.title}
                                </span>
                              )}
                            </div>

                            {/* 最後のメッセージ */}
                            {lastMessage && (
                              <div className="mt-2 text-xs text-gray-400 truncate">
                                最後: {lastMessage.content.slice(0, 100)}...
                              </div>
                            )}
                          </div>

                          {/* アクション */}
                          <div className="flex items-center gap-2 ml-4">
                            {!isActive && (
                              <button
                                onClick={() => handleSelectSession(session.id)}
                                className="p-2 text-purple-400 hover:bg-purple-600/20 rounded-lg transition-colors"
                                title="選択"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleClearSession(session.id)}
                              className="p-2 text-yellow-400 hover:bg-yellow-600/20 rounded-lg transition-colors"
                              title="メッセージクリア"
                            >
                              🔄
                            </button>

                            <button
                              onClick={() => handleDeleteSession(session.id)}
                              className={`p-2 rounded-lg transition-colors ${
                                confirmDelete === session.id
                                  ? 'bg-red-600 text-white'
                                  : 'text-red-400 hover:bg-red-600/20'
                              }`}
                              title={confirmDelete === session.id ? '確認: もう一度クリック' : '削除'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* フッター */}
            <div className="p-4 border-t border-gray-700">
              <button
                onClick={() => {
                  // 新しいグループチャット作成
                  // ここでキャラクター選択モーダルを開く
                  setShowManager(false);
                  // TODO: キャラクター選択モーダルを開く処理
                }}
                className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                新しいグループチャットを作成
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}