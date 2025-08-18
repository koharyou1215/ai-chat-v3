'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Edit3,
  Clock,
  MessageSquare,
  Pin,
  Archive,
  Download,
  X
} from 'lucide-react';
import { useChat, useCharacters, usePersonas, useUI } from '@/store';
import { cn } from '@/lib/utils';

const ChatSidebar: React.FC = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  
  const {
    currentSessionId,
    sessions,
    createSession,
    switchSession,
    deleteSession,
    updateSessionTitle,
    clearSession,
    exportSession,
    searchMessages
  } = useChat();
  
  const { getCurrentCharacter } = useCharacters();
  const { getCurrentPersona } = usePersonas();
  const { panels, responsive, togglePanel } = useUI();
  
  const currentCharacter = getCurrentCharacter();
  const currentPersona = getCurrentPersona();

  // Filter and sort sessions
  const filteredSessions = Object.values(sessions)
    .filter(session => {
      if (!searchQuery) return true;
      return session.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             session.messages?.[session.messages.length - 1]?.content.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const handleNewChat = () => {
    const sessionId = createSession(
      currentCharacter?.id, 
      currentPersona?.id
    );
    router.push(`/chat/${sessionId}`);
    
    // Close sidebar on mobile
    if (responsive.isMobile) {
      togglePanel('sidebarOpen');
    }
  };

  const handleSelectSession = (sessionId: string) => {
    if (sessionId !== currentSessionId) {
      switchSession(sessionId);
      router.push(`/chat/${sessionId}`);
    }
    
    // Close sidebar on mobile
    if (responsive.isMobile) {
      togglePanel('sidebarOpen');
    }
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this chat session?')) {
      deleteSession(sessionId);
      
      // Navigate to new chat if we deleted the current session
      if (sessionId === currentSessionId) {
        const remainingSessions = Object.keys(sessions).filter(id => id !== sessionId);
        if (remainingSessions.length > 0) {
          router.push(`/chat/${remainingSessions[0]}`);
        } else {
          router.push('/chat');
        }
      }
    }
  };

  const handleRenameSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const session = sessions[sessionId];
    const newTitle = prompt('Enter new title:', session.title);
    if (newTitle && newTitle.trim()) {
      updateSessionTitle(sessionId, newTitle.trim());
    }
  };

  const handleExportSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const sessionData = exportSession(sessionId);
    if (sessionData) {
      const blob = new Blob([JSON.stringify(sessionData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${sessionId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const getSessionPreview = (session: any) => {
    const messages = Object.values(session.messages || {}) as any[];
    const lastMessage = messages[messages.length - 1];
    
    if (!lastMessage) return 'No messages yet';
    
    const content = lastMessage.content;
    return content.length > 50 ? `${content.substring(0, 50)}...` : content;
  };

  return (
    <motion.div
      initial={{ x: -320 }}
      animate={{ x: 0 }}
      exit={{ x: -320 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      className={cn(
        "flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700",
        responsive.isMobile ? "fixed inset-y-0 left-0 z-50 w-80" : "w-80"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Chat History
        </h2>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNewChat}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            title="New Chat"
          >
            <Plus size={16} />
          </motion.button>
          {responsive.isMobile && (
            <button
              onClick={() => togglePanel('sidebarOpen')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Current Context */}
      {(currentCharacter || currentPersona) && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Current Context</div>
          <div className="space-y-2">
            {currentCharacter && (
              <div className="flex items-center gap-2">
                {currentCharacter.avatar_url ? (
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
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {currentCharacter.name}
                </span>
              </div>
            )}
            {currentPersona && (
              <div className="flex items-center gap-2">
                {currentPersona.avatar_url ? (
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
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {currentPersona.name}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto">
        {filteredSessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {searchQuery ? 'No chats found' : 'No chat history yet'}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredSessions.map((session) => {
              const isActive = session.id === currentSessionId;
              const messageCount = Object.keys(session.messages || {}).length;
              
              return (
                <motion.div
                  key={session.id}
                  whileHover={{ scale: 1.02 }}
                  className={cn(
                    "relative group cursor-pointer rounded-lg p-3 transition-colors",
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-700"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                  onClick={() => handleSelectSession(session.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={cn(
                          "font-medium text-sm truncate",
                          isActive
                            ? "text-blue-900 dark:text-blue-100"
                            : "text-gray-900 dark:text-white"
                        )}>
                          {session.title}
                        </h3>
                        {session.is_pinned && (
                          <Pin size={12} className="text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      
                      <p className={cn(
                        "text-xs truncate mb-2",
                        isActive
                          ? "text-blue-700 dark:text-blue-300"
                          : "text-gray-600 dark:text-gray-400"
                      )}>
                        {getSessionPreview(session)}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "flex items-center gap-1",
                            isActive
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-gray-500 dark:text-gray-400"
                          )}>
                            <MessageSquare size={10} />
                            {messageCount}
                          </span>
                          <span className={cn(
                            "flex items-center gap-1",
                            isActive
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-gray-500 dark:text-gray-400"
                          )}>
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
                          className="absolute top-8 right-0 z-10 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 min-w-32"
                          onMouseLeave={() => setSelectedSessionId(null)}
                        >
                          <button
                            onClick={(e) => handleRenameSession(session.id, e)}
                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                          >
                            <Edit3 size={12} />
                            Rename
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Toggle pin
                              setSelectedSessionId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                          >
                            <Pin size={12} />
                            {session.is_pinned ? 'Unpin' : 'Pin'}
                          </button>
                          <button
                            onClick={(e) => handleExportSession(session.id, e)}
                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                          >
                            <Download size={12} />
                            Export
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Archive session
                              setSelectedSessionId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                          >
                            <Archive size={12} />
                            Archive
                          </button>
                          <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
                          <button
                            onClick={(e) => {
                              handleDeleteSession(session.id, e);
                              setSelectedSessionId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2"
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
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {Object.keys(sessions).length} total conversations
        </div>
      </div>
    </motion.div>
  );
};

export default ChatSidebar;