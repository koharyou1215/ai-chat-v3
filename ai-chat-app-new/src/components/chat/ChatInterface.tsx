'use client';

import React, { useRef, useEffect, useState } from 'react';
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
import { CharacterGalleryModal } from '../character/CharacterGalleryModal';
import { PersonaGalleryModal } from '../persona/PersonaGalleryModal';
import { SettingsModal } from '../settings/SettingsModal';
import { ChatHistoryModal } from '../history/ChatHistoryModal';
import { VoiceSettingsModal } from '../voice/VoiceSettingsModal';
import { CharacterForm } from '../character/CharacterForm';
import { SuggestionModal } from './SuggestionModal';
import { GroupChatInterface } from './GroupChatInterface';
import ChatSidebar from './ChatSidebar'; // インポートを修正
import { cn } from '@/lib/utils';

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
        createGroupSession,
    } = useAppStore();
    const session = getActiveSession();
    const character = getSelectedCharacter(); // character を取得
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'memory' | 'tracker' | 'history' | 'layers'>('memory');
    
    // グループチャットセッションの取得
    const activeGroupSession = active_group_session_id ? groupSessions.get(active_group_session_id) : null;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [session?.messages]);

    if (!session) {
        return (
            <div className="flex h-screen bg-slate-900 text-white">
                <AnimatePresence>
                    {isLeftSidebarOpen && <ChatSidebar />}
                </AnimatePresence>
                <div className="flex-1 flex flex-col items-center justify-center">
                    <EmptyState />
                </div>
            </div>
        );
    }
    
    const sidePanelTabs = [
        { key: 'memory' as const, icon: Brain, label: 'メモリー', component: <MemoryGallery session_id={session.id} character_id={session.participants.characters[0]?.id} /> },
        { key: 'tracker' as const, icon: BarChart3, label: 'トラッカー', component: <TrackerDisplay session_id={session.id} character_id={session.participants.characters[0]?.id} /> },
        { key: 'history' as const, icon: History, label: '履歴検索', component: <HistorySearch session_id={session.id} /> },
        { key: 'layers' as const, icon: Layers, label: '記憶層', component: <MemoryLayerDisplay session_id={session.id} /> },
    ];

    return (
        <div className="flex h-full bg-slate-900 text-white">
            <AnimatePresence>
                {isLeftSidebarOpen && <ChatSidebar />}
            </AnimatePresence>
            <div className="flex-1 flex flex-col relative">
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
                        <div className="absolute inset-0 w-full h-full bg-black/40" />
                    </div>
                )}

                <div className={cn("relative z-10 flex flex-col h-full transition-all duration-300", isRightPanelOpen ? 'w-[calc(100%-400px)]' : 'w-full')}>
                    <ChatHeader />
                    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
                        <AnimatePresence mode="popLayout" initial={false}>
                            {session.messages.map((message, index) => (
                                <MessageBubble
                                    key={message.id}
                                    message={message}
                                    previousMessage={index > 0 ? session.messages[index - 1] : undefined}
                                    isLatest={index === session.messages.length - 1}
                                />
                            ))}
                        </AnimatePresence>
                        
                        {is_generating && <ThinkingIndicator />}
                        
                        <div ref={messagesEndRef} />
                    </div>
                    <MessageInput />
                </div>

                <AnimatePresence>
                    {isRightPanelOpen && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 400, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="bg-slate-800 border-l border-white/10 flex flex-col h-full absolute right-0 top-0"
                        >
                            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white">記憶情報</h3>
                                <button onClick={() => setRightPanelOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex p-2 bg-slate-900/50 border-b border-white/10">
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
                                    {sidePanelTabs.map(tab => (
                                        activeTab === tab.key && (
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
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* モーダル群 */}
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
                {showCharacterForm && (
                    <CharacterForm
                        isOpen={showCharacterForm}
                        onClose={closeCharacterForm}
                        character={editingCharacter}
                        onSave={saveCharacter}
                        mode="character"
                    />
                )}
            </div>
        </div>
    );
};
