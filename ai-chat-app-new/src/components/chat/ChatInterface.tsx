'use client';

import React, { useRef, useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { ChatHeader } from './ChatHeader';
import { Bot, Brain, X, BarChart3, History, Layers } from 'lucide-react';
import { MemoryGallery } from '../memory/MemoryGallery';
import { TrackerDisplay } from '../tracker/TrackerDisplay';
import { HistorySearch } from '../history/HistorySearch';
import { MemoryLayerDisplay } from '../memory/MemoryLayerDisplay';

const CharacterGalleryModal = lazy(() => import('../character/CharacterGalleryModal').then(module => ({ default: module.CharacterGalleryModal })));
const PersonaGalleryModal = lazy(() => import('../persona/PersonaGalleryModal').then(module => ({ default: module.PersonaGalleryModal })));
const SettingsModal = lazy(() => import('../settings/SettingsModal').then(module => ({ default: module.SettingsModal })));
const ChatHistoryModal = lazy(() => import('../history/ChatHistoryModal').then(module => ({ default: module.ChatHistoryModal })));
const VoiceSettingsModal = lazy(() => import('../voice/VoiceSettingsModal').then(module => ({ default: module.VoiceSettingsModal })));
const CharacterForm = lazy(() => import('../character/CharacterForm').then(module => ({ default: module.CharacterForm })));
const SuggestionModal = lazy(() => import('./SuggestionModal').then(module => ({ default: module.SuggestionModal })));

import { GroupChatInterface } from './GroupChatInterface';
import ChatSidebar from './ChatSidebar';
import { ClientOnlyProvider } from '../ClientOnlyProvider';
import { cn } from '@/lib/utils';
import { Character, UnifiedChatSession } from '@/types';
import useVH from '@/hooks/useVH';

const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center text-white/50">
        <Bot size={48} className="mb-4" />
        <h2 className="text-xl font-semibold">セッションがありません</h2>
        <p>キャラクターを選択して会話を始めましょう。</p>
    </div>
);

const ThinkingIndicator = () => (
    <div className="flex items-center justify-center p-4">
        <div className="flex items-center space-x-2">
            <motion.div
                className="w-2 h-2 bg-purple-400 rounded-full"
                animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                }}
                transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
            <motion.div
                className="w-2 h-2 bg-purple-400 rounded-full"
                animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                }}
                transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.2
                }}
            />
            <motion.div
                className="w-2 h-2 bg-purple-400 rounded-full"
                animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                }}
                transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.4
                }}
            />
            <span className="text-sm text-white/60">AIが考え中...</span>
        </div>
    </div>
);

export const ChatInterface: React.FC = () => {
    const { 
        getActiveSession, 
        is_generating,
        showSettingsModal,
        setShowSettingsModal,
        initialSettingsTab,
        showCharacterForm,
        editingCharacter,
        closeCharacterForm,
        saveCharacter,
        showSuggestionModal,
        setShowSuggestionModal,
        suggestions,
        isGeneratingSuggestions,
        setCurrentInputText,
        isLeftSidebarOpen, // isLeftSidebarOpen をストアから取得
        isRightPanelOpen, // isRightPanelOpen をストアから取得
        setRightPanelOpen, // setRightPanelOpen をストアから取得
        getSelectedCharacter, // getSelectedCharacter をストアから取得
        is_group_mode,
        group_generating,
        active_group_session_id,
        groupSessions,
        createGroupSession: _createGroupSession,
    } = useAppStore();
    useVH(); // VHフックを呼び出し
    const [session, setSession] = useState<UnifiedChatSession | null>(null);
    const character = getSelectedCharacter(); // character を取得
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'memory' | 'tracker' | 'history' | 'layers'>('memory');
    
    // SSR対応: useEffectでセッション取得
    useEffect(() => {
        const activeSession = getActiveSession();
        setSession(activeSession);
    }, [getActiveSession, active_group_session_id, is_group_mode]);
    
    // グループチャットセッションの取得
    const activeGroupSession = active_group_session_id ? groupSessions.get(active_group_session_id) : null;

    // キャラクターIDを安全に取得
    const currentCharacterId = useMemo(() => {
        if (is_group_mode && activeGroupSession) {
            return activeGroupSession.character_ids[0];
        }
        if (session && session.participants.characters.length > 0) {
            return session.participants.characters[0].id;
        }
        return undefined;
    }, [is_group_mode, activeGroupSession, session]);
    
    // セッションの決定（グループセッションまたは通常セッション）
    const displaySession = is_group_mode ? activeGroupSession : session;
    const currentMessages = displaySession?.messages || [];
    const displaySessionId = displaySession?.id || '';

    const sidePanelTabs = useMemo(() => [
        { key: 'memory' as const, icon: Brain, label: 'メモリー', component: <MemoryGallery session_id={displaySessionId} character_id={currentCharacterId!} /> },
        { key: 'tracker' as const, icon: BarChart3, label: 'トラッカー', component: <TrackerDisplay session_id={displaySessionId} character_id={currentCharacterId!} /> },
        { key: 'history' as const, icon: History, label: '履歴検索', component: <HistorySearch session_id={displaySessionId} /> },
        { key: 'layers' as const, icon: Layers, label: '記憶層', component: <MemoryLayerDisplay session_id={displaySessionId} /> },
    ], [displaySessionId, currentCharacterId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [session?.messages, activeGroupSession?.messages]);

    // グループモードかつアクティブなグループセッションがない場合
    if (is_group_mode && !activeGroupSession) {
        return (
            <div className="flex bg-slate-900 text-white" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
                <ClientOnlyProvider fallback={null}>
                    <AnimatePresence>
                        {isLeftSidebarOpen && <ChatSidebar />}
                    </AnimatePresence>
                </ClientOnlyProvider>
                <div className="flex-1 flex flex-col">
                    <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md" style={{paddingTop: 'env(safe-area-inset-top)'}}>
                        <ChatHeader />
                    </div>
                    <div className="flex-1 overflow-y-auto" style={{paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)'}}>
                        <GroupChatInterface 
                            onStartGroupChat={(_name, _characterIds, _mode) => {
                                // This will be handled by the GroupChatInterface component itself
                            }}
                        />
                    </div>
                </div>
                
                {/* モーダル群 */}
                <Suspense fallback={null}>
                    <CharacterGalleryModal />
                    <PersonaGalleryModal />
                </Suspense>
            </div>
        );
    }

    // 通常モードかつセッションがない場合
    if (!is_group_mode && !session) {
        return (
            <div className="flex bg-slate-900 text-white" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
                <ClientOnlyProvider fallback={null}>
                    <AnimatePresence>
                        {isLeftSidebarOpen && <ChatSidebar />}
                    </AnimatePresence>
                </ClientOnlyProvider>
                <div className="flex-1 flex flex-col items-center justify-center">
                    <EmptyState />
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex bg-slate-900 text-white overflow-hidden" style={{ height: 'calc(var(--vh, 1vh) * 100)', position: 'relative' }}>
            <ClientOnlyProvider fallback={null}>
                <AnimatePresence>
                    {isLeftSidebarOpen && <ChatSidebar />}
                </AnimatePresence>
            </ClientOnlyProvider>
            
            <div className={cn("flex flex-1 min-w-0", isLeftSidebarOpen ? "md:ml-80" : "ml-0")}>
                {/* メインコンテンツエリア */}
                <div className="flex-1 flex flex-col min-w-0 relative h-full">
                    {/* Background Image */}
                    {character?.background_url && (
                        <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
                            {character.background_url.endsWith('.mp4') || character.background_url.includes('video') ? (
                                <video
                                    src={character.background_url}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="w-full h-full object-contain object-center"
                                />
                            ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img 
                                    src={character.background_url} 
                                    alt="background" 
                                    className="w-full h-full object-contain object-center"
                                />
                            )}
                            <div className="absolute inset-0 w-full h-full bg-black/30" />
                        </div>
                    )}

                    <div className="relative z-10 flex flex-col h-full">
                        {/* Safe Area対応ヘッダー (固定) */}
                        <div 
                            className="fixed top-0 z-40 bg-slate-900/95 backdrop-blur-md transition-all duration-300" 
                            style={{
                                paddingTop: 'env(safe-area-inset-top)',
                                left: isLeftSidebarOpen ? '320px' : '0',
                                right: '0',
                                width: isLeftSidebarOpen ? 'calc(100vw - 320px)' : '100vw'
                            }}
                        >
                            <ChatHeader />
                        </div>
                        <div 
                            className="flex-1 overflow-y-auto px-3 md:px-4 space-y-3 md:space-y-4" 
                            style={{
                                paddingTop: 'calc(env(safe-area-inset-top) + 80px)', // ヘッダー高さ分（少し余裕を持たせる）
                                paddingBottom: 'calc(env(safe-area-inset-bottom) + 100px)' // 入力欄高さ分（少し余裕を持たせる）
                            }}
                        >
                            <AnimatePresence mode="popLayout" initial={false}>
                                {currentMessages.map((message, index) => (
                                    <MessageBubble
                                        key={message.id}
                                        message={message}
                                        previousMessage={index > 0 ? currentMessages[index - 1] : undefined}
                                        isLatest={index === currentMessages.length - 1}
                                        isGroupChat={is_group_mode}
                                    />
                                ))}
                            </AnimatePresence>
                            
                            {(is_generating || group_generating) && <ThinkingIndicator />}
                            
                            <div ref={messagesEndRef} />
                        </div>
                        {/* Safe Area対応メッセージ入力欄 (固定) */}
                        <div 
                            className="fixed bottom-0 z-41 bg-slate-900/95 backdrop-blur-md transition-all duration-300" 
                            style={{
                                paddingBottom: 'env(safe-area-inset-bottom)',
                                left: isLeftSidebarOpen ? '320px' : '0',
                                right: '0',
                                width: isLeftSidebarOpen ? 'calc(100vw - 320px)' : '100vw'
                            }}
                        >
                            <MessageInput />
                        </div>
                    </div>
                </div>

                {/* 右サイドパネル */}
                <ClientOnlyProvider fallback={null}>
                    <AnimatePresence>
                        {isRightPanelOpen && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 400, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="bg-slate-800 border-l border-purple-400/20 flex flex-col h-full flex-shrink-0"
                            >
                                <div className="p-4 border-b border-purple-400/20 flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-white">記憶情報</h3>
                                    <button onClick={() => setRightPanelOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex p-2 bg-slate-900/50 border-b border-purple-400/20">
                                    {sidePanelTabs.map(tab => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-2 p-2 rounded-lg text-sm transition-colors",
                                                activeTab === tab.key ? 'bg-purple-500/20 text-purple-300' : 'text-white/60 hover:bg-white/10'
                                            )}
                                        >
                                            <tab.icon className="w-4 h-4" />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex-1 overflow-y-auto p-4">
                                    <AnimatePresence mode="wait">
                                        <Suspense fallback={<div>Loading...</div>}>
                                            {sidePanelTabs.map(tab => (
                                                activeTab === tab.key && displaySession && (
                                                    <motion.div
                                                        key={tab.key}
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -20 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        {tab.component}
                                                    </motion.div>
                                                )
                                            ))}
                                        </Suspense>
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </ClientOnlyProvider>

                {/* モーダル群 */}
                <Suspense fallback={null}>
                    <CharacterGalleryModal />
                    <PersonaGalleryModal />
                    <SettingsModal 
                        isOpen={showSettingsModal} 
                        onClose={() => setShowSettingsModal(false)}
                        initialTab={initialSettingsTab}
                    />
                    <ChatHistoryModal />
                    <VoiceSettingsModal />
                    <SuggestionModal
                        isOpen={showSuggestionModal}
                        onClose={() => setShowSuggestionModal(false)}
                        suggestions={suggestions}
                        isLoading={isGeneratingSuggestions}
                        onSelect={(suggestion) => {
                            setCurrentInputText(suggestion);
                        }}
                    />
                    {showCharacterForm && editingCharacter && 'age' in editingCharacter && (
                        <CharacterForm
                            isOpen={showCharacterForm}
                            onClose={closeCharacterForm}
                            character={editingCharacter as Character}
                            persona={null}
                            onSave={(data) => saveCharacter(data as Character)}
                            mode="character"
                        />
                    )}
                </Suspense>
            </div>
        </div>
    );
};
