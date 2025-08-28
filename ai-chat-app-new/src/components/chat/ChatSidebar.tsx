'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// import { useRouter } from 'next/navigation'; // 일단 주석 처리
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Edit3,
  Clock,
  MessageSquare,
  Download,
  Users,
  User,
  X,
  Pin,
  Save,
  Archive,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { UnifiedChatSession } from '@/types';
import { GroupChatSession } from '@/types/core/group-chat.types';

const ChatSidebar: React.FC = () => {
  // const router = useRouter(); // 일단 주석 처리
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  const {
    active_session_id,
    sessions,
    createSession,
    setActiveSessionId,
    deleteSession,
    updateSession,
    exportActiveConversation,
    saveSessionToHistory,
    pinSession,
    getSelectedCharacter,
    getSelectedPersona,
    // グループセッション関連
    groupSessions,
    active_group_session_id,
    setActiveGroupSession,
    is_group_mode,
    setGroupMode,
    // キャラクター・ペルソナ状態管理
    setSelectedCharacterId,
    activatePersona,
    toggleGroupCreationModal, // 追加
    // グループチャット作成
    createGroupSession,
    characters,
  } = useAppStore();
  
  const currentCharacter = getSelectedCharacter();
  const currentPersona = getSelectedPersona();

  // 統合されたセッション一覧（通常セッション + グループセッション）
  const allSessions = useMemo(() => {
    const regularSessions = Array.from(sessions.values()).map(session => ({
      ...session,
      type: 'individual' as const,
      displayName: session.session_info.title || 'Untitled Chat',
      isPinned: session.isPinned || false
    }));
    
    const groupSessionsList = Array.from(groupSessions.values()).map(groupSession => ({
      ...groupSession,
      type: 'group' as const,
      displayName: groupSession.name,
      session_info: { title: groupSession.name }, // 互換性のため
      message_count: groupSession.message_count
    }));
    
    return [...regularSessions, ...groupSessionsList];
  }, [sessions, groupSessions]);

  const filteredSessions = useMemo(() => 
    allSessions
    .filter(session => {
      if (!searchQuery) return true;
      const lastMessage = session.messages[session.messages.length - 1];
      return session.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [allSessions, searchQuery]
  );

  const handleNewChat = async () => {
    if (is_group_mode) {
      // グループモードの場合：グループ作成モーダルを開く
      toggleGroupCreationModal(true);
    } else {
      // 通常モードの場合：ソロチャット作成
      if (!currentCharacter || !currentPersona) {
        alert("キャラクターとペルソナを選択してください。");
        return;
      }
      console.log('🔄 Creating new individual chat...');
      createSession(currentCharacter, currentPersona);
      console.log('✅ New individual chat created');
    }
  };

  const handleSelectSession = (sessionId: string) => {
    console.log('🔄 Switching to session:', sessionId);
    
    // セッションタイプを特定
    const isGroupSession = sessionId.startsWith('group-');
    
    if (isGroupSession) {
      // グループセッションの場合
      if (sessionId !== active_group_session_id || !is_group_mode) {
        const groupSession = groupSessions.get(sessionId);
        if (groupSession) {
          console.log('📱 Switching to group session:', {
            sessionId,
            name: groupSession.name,
            characterCount: groupSession.characters.length,
            persona: groupSession.persona.name
          });
          
          // グループモードに切り替え & 排他制御
          setActiveSessionId(null); 
          setGroupMode(true);
          setActiveGroupSession(sessionId);
          
          // キャラクターとペルソナの状態も同期（グループの場合は最初のキャラクター）
          if (groupSession.characters.length > 0) {
            setSelectedCharacterId(groupSession.characters[0].id);
          }
          activatePersona(groupSession.persona.id);
        }
      }
    } else {
      // 通常セッションの場合
      if (sessionId !== active_session_id || is_group_mode) {
        const session = sessions.get(sessionId);
        if (session) {
          console.log('👤 Switching to individual session:', {
            sessionId,
            title: session.session_info.title,
            characterId: session.participants.characters[0]?.id,
            personaId: session.participants.user.id
          });
          
          // 通常モードに切り替え & 排他制御
          setActiveGroupSession(null);
          setGroupMode(false);
          setActiveSessionId(sessionId);
          
          // キャラクターとペルソナの状態も同期
          if (session.participants.characters.length > 0) {
            setSelectedCharacterId(session.participants.characters[0].id);
          }
          activatePersona(session.participants.user.id);
        }
      }
    }
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this chat session?')) {
      deleteSession(sessionId);
      // Navigation logic might need adjustment based on app routing
    }
  };

  const handleRenameSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const session = sessions.get(sessionId);
    if (!session) return;
    const newTitle = prompt('Enter new title:', session.session_info.title);
    if (newTitle && newTitle.trim()) {
      updateSession({ id: sessionId, session_info: { ...session.session_info, title: newTitle.trim() } });
    }
  };

  const handleExportSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // exportActiveConversation exports the *active* session. We might need a new action to export a specific session.
    // For now, let's just use the existing one if the session is active.
    if (sessionId === active_session_id) {
        exportActiveConversation();
    } else {
        alert("You can only export the active session for now.");
    }
  };
  
  const handleSaveToHistory = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await saveSessionToHistory(sessionId);
  };
  
  const handlePinSession = (sessionId: string, isPinned: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    pinSession(sessionId, !isPinned);
  };

  const getSessionPreview = (session: UnifiedChatSession) => {
    const lastMessage = session.messages[session.messages.length - 1];
    if (!lastMessage) return 'No messages yet';
    const content = lastMessage.content;
    return content.length > 50 ? `${content.substring(0, 50)}...` : content;
  };

  // モバイルでのスワイプジェスチャー処理
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    
    if (isLeftSwipe) {
      // 左スワイプでサイドバーを閉じる
      useAppStore.getState().toggleLeftSidebar();
    }
  };

  return (
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: 320 }}
      exit={{ width: 0 }}
      transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
      className={cn(
        "flex flex-col bg-slate-800 border-r border-purple-400/20 text-white overflow-hidden flex-shrink-0",
        "fixed md:relative top-0 left-0 z-[45] h-screen"
      )}
      style={{ width: 320, height: 'calc(var(--vh, 1vh) * 100)' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-purple-400/20 flex-shrink-0">
        <h2 className="text-lg font-semibold">
          Chat History
        </h2>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNewChat}
            className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            title="New Chat"
          >
            <Plus size={16} />
          </motion.button>
          {/* モバイルでのみ閉じるボタンを表示 */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => useAppStore.getState().toggleLeftSidebar()}
            className="p-2 text-white rounded-lg hover:bg-white/20 transition-colors"
            title="Close Sidebar"
          >
            <X size={16} />
          </motion.button>
        </div>
      </div>

      {/* Current Context */}
      {(currentCharacter || currentPersona) && (
        <div className="p-4 bg-slate-900/50 border-b border-purple-400/20">
          <div className="text-xs text-slate-400 mb-2">Current Context</div>
          <div className="space-y-2">
            {currentCharacter && (
              <div className="flex items-center gap-2">
                {currentCharacter.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentCharacter.avatar_url}
                    alt={currentCharacter.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs">
                    {currentCharacter.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium truncate">
                  {currentCharacter.name}
                </span>
              </div>
            )}
            {currentPersona && (
              <div className="flex items-center gap-2">
                {currentPersona.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentPersona.avatar_url}
                    alt={currentPersona.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                    {currentPersona.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium truncate">
                  {currentPersona.name}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="p-4 border-b border-purple-400/20">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-700 border border-purple-400/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto">
        {filteredSessions.length === 0 ? (
          <div className="p-4 text-center text-slate-500">
            {searchQuery ? 'No chats found' : 'No chat history yet'}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredSessions.map((session) => {
              const isGroupSession = session.type === 'group';
              const isActive = isGroupSession 
                ? (session.id === active_group_session_id && is_group_mode)
                : (session.id === active_session_id && !is_group_mode);
              const messageCount = session.messages.length;
              
              return (
                <motion.div
                  key={session.id}
                  whileHover={{ scale: 1.02 }}
                  className={cn(
                    "relative group cursor-pointer rounded-lg p-3 transition-colors",
                    isActive
                      ? "bg-purple-500/20"
                      : "hover:bg-white/5"
                  )}
                  onClick={() => handleSelectSession(session.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {/* ピン留めアイコン */}
                        {session.isPinned && (
                          <Pin size={12} className="text-yellow-400 flex-shrink-0" />
                        )}
                        {/* セッションタイプを示すアイコン */}
                        {isGroupSession ? (
                          <Users size={12} className="text-purple-400 flex-shrink-0" />
                        ) : (
                          <User size={12} className="text-blue-400 flex-shrink-0" />
                        )}
                        
                        <h3 className={cn(
                          "font-medium text-sm truncate",
                           isActive ? "text-purple-300" : "text-white"
                        )}>
                          {session.displayName}
                        </h3>
                        
                        {/* グループセッションの場合、参加者数を表示 */}
                        {isGroupSession && 'active_character_ids' in session && (
                          <span className="text-xs text-purple-300 bg-purple-500/20 px-1 py-0.5 rounded">
                            {session.active_character_ids.size}人
                          </span>
                        )}
                      </div>
                      
                      <p className={cn(
                        "text-xs truncate mb-2",
                         isActive ? "text-slate-300" : "text-slate-400"
                      )}>
                        {getSessionPreview(session)}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3 text-slate-400">
                          <span className="flex items-center gap-1">
                            <MessageSquare size={10} />
                            {messageCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(session.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Session Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSessionId(selectedSessionId === session.id ? null : session.id);
                        }}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                        title="More actions"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </div>
                    
                    {/* Actions Menu */}
                    <AnimatePresence>
                      {selectedSessionId === session.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute top-8 right-0 z-10 bg-slate-700 rounded-lg shadow-lg border border-purple-400/20 py-1 min-w-32"
                        >
                          <button
                            onClick={(e) => handlePinSession(session.id, session.isPinned, e)}
                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-white/10 flex items-center gap-2"
                          >
                            <Pin size={12} />
                            {session.isPinned ? 'Unpin' : 'Pin'}
                          </button>
                          <button
                            onClick={(e) => handleSaveToHistory(session.id, e)}
                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-white/10 flex items-center gap-2"
                          >
                            <Save size={12} />
                            Save to History
                          </button>
                          <button
                            onClick={(e) => handleRenameSession(session.id, e)}
                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-white/10 flex items-center gap-2"
                          >
                            <Edit3 size={12} />
                            Rename
                          </button>
                          <button
                            onClick={(e) => handleExportSession(session.id, e)}
                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-white/10 flex items-center gap-2"
                          >
                            <Download size={12} />
                            Export
                          </button>
                          <div className="border-t border-purple-400/20 my-1" />
                          <button
                            onClick={(e) => {
                              handleDeleteSession(session.id, e);
                              setSelectedSessionId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-red-500/20 text-red-400 flex items-center gap-2"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-purple-400/20 flex-shrink-0">
        <div className="text-xs text-slate-400 text-center">
          {sessions.size} individual • {groupSessions.size} groups • {sessions.size + groupSessions.size} total
        </div>
      </div>
    </motion.div>
  );
};

export default ChatSidebar;