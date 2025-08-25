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
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { UnifiedChatSession } from '@/types';

const ChatSidebar: React.FC = () => {
  // const router = useRouter(); // 일단 주석 처리
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  
  const {
    active_session_id,
    sessions,
    createSession,
    setActiveSessionId,
    deleteSession,
    updateSession,
    exportActiveConversation,
    getSelectedCharacter,
    getSelectedPersona,
  } = useAppStore();
  
  const currentCharacter = getSelectedCharacter();
  const currentPersona = getSelectedPersona();

  const filteredSessions = useMemo(() => 
    Array.from(sessions.values())
    .filter(session => {
      if (!searchQuery) return true;
      const lastMessage = session.messages[session.messages.length - 1];
      return session.session_info.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [sessions, searchQuery]
  );

  const handleNewChat = () => {
    if (currentCharacter && currentPersona) {
      createSession(currentCharacter, currentPersona);
      // router.push(`/chat/${sessionId}`);
    } else {
        alert("Please select a character and persona first.");
    }
  };

  const handleSelectSession = (sessionId: string) => {
    if (sessionId !== active_session_id) {
      setActiveSessionId(sessionId);
      // router.push(`/chat/${sessionId}`);
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

  const getSessionPreview = (session: UnifiedChatSession) => {
    const lastMessage = session.messages[session.messages.length - 1];
    if (!lastMessage) return 'No messages yet';
    const content = lastMessage.content;
    return content.length > 50 ? `${content.substring(0, 50)}...` : content;
  };

  return (
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: 320 }}
      exit={{ width: 0 }}
      transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
      className={cn(
        "flex flex-col bg-slate-800 border-r border-purple-400/20 text-white overflow-hidden flex-shrink-0"
      )}
      style={{ width: 320 }} // Add fixed width to prevent collapsing during animation
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
              const isActive = session.id === active_session_id;
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
                        <h3 className={cn(
                          "font-medium text-sm truncate",
                           isActive ? "text-purple-300" : "text-white"
                        )}>
                          {session.session_info.title}
                        </h3>
                        {/* Pinned logic needs to be implemented in the store first */}
                        {/* {session.is_pinned && (
                          <Pin size={12} className="text-blue-500 flex-shrink-0" />
                        )} */}
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
                          onMouseLeave={() => setSelectedSessionId(null)}
                        >
                          <button
                            onClick={(e) => handleRenameSession(session.id, e)}
                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-white/10 flex items-center gap-2"
                          >
                            <Edit3 size={12} />
                            Rename
                          </button>
                          {/* Pinned, Archive features need store implementation */}
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
          {sessions.size} total conversations
        </div>
      </div>
    </motion.div>
  );
};

export default ChatSidebar;