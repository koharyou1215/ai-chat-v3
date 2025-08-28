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
import { CharacterGalleryModal, CharacterGalleryModalProps } from '../character/CharacterGalleryModal'; // lazyをやめて直接インポート
import { ScenarioSetupModal } from './ScenarioSetupModal';

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
import { Character } from '@/types/core/character.types';
import useVH from '@/hooks/useVH';

// メッセージ入力欄ラッパーコンポーネント
const MessageInputWrapper: React.FC = () => {
    return <MessageInput />;
};

const EmptyState = () => {
    const { 
        characters, 
        personas, 
        createSession, 
        getSelectedPersona,
        toggleLeftSidebar,
        isCharactersLoaded,
        isPersonasLoaded,
    } = useAppStore();

    const handleQuickStart = async () => {
        // 最初のキャラクターとアクティブなペルソナを取得
        const firstCharacter = characters.values().next().value;
        const activePersona = getSelectedPersona();

        if (firstCharacter && activePersona) {
            try {
                await createSession(firstCharacter, activePersona);
                console.log('✅ セッションを自動作成しました');
            } catch (error) {
                console.error('❌ セッション作成エラー:', error);
                alert('セッションの作成に失敗しました。ページをリロードしてください。');
            }
        } else {
            console.warn('⚠️ キャラクターまたはペルソナが見つかりません');
            alert('キャラクターまたはペルソナが読み込まれていません。サイドバーから選択してください。');
            toggleLeftSidebar();
        }
    };

    return (
        <div 
            className="flex flex-col items-center justify-center h-full text-center text-white/50 space-y-6"
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                width: '100%',
                color: 'rgba(255, 255, 255, 0.5)',
                // 背景色を削除 - 背景画像を透けて見せる
            }}
        >
            <Bot size={48} className="mb-4" />
            <h2 className="text-xl font-semibold" style={{ fontSize: '1.25rem', fontWeight: 600 }}>セッションがありません</h2>
            <p>キャラクターを選択して会話を始めましょう。</p>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <button
                    onClick={() => toggleLeftSidebar()}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                    <Bot size={20} />
                    キャラクターを選択
                </button>
                
                {isCharactersLoaded && isPersonasLoaded && characters.size > 0 && (
                    <button
                        onClick={handleQuickStart}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        ⚡
                        クイックスタート
                    </button>
                )}
            </div>
            
            {(!isCharactersLoaded || !isPersonasLoaded) && (
                <p className="text-sm text-white/30 mt-4">データを読み込み中...</p>
            )}
        </div>
    );
};

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

// SSR安全なチャットインターフェースコンテンツ
const ChatInterfaceContent: React.FC = () => {
    // keyboard hook removed for simplicity
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
        generateSuggestions,
        systemPrompts,
        setCurrentInputText,
        isLeftSidebarOpen, // isLeftSidebarOpen をストアから取得
        isRightPanelOpen, // isRightPanelOpen をストアから取得
        setRightPanelOpen, // setRightPanelOpen をストアから取得
        getSelectedCharacter, // getSelectedCharacter をストアから取得
        is_group_mode,
        group_generating,
        active_group_session_id,
        groupSessions,
        updateGroupMembers, // 追加
        createGroupSession, // createGroupSession をストアから取得
        isGroupMemberModalOpen, // 追加
        toggleGroupMemberModal, // 追加
        isGroupCreationModalOpen, // 新規作成用モーダル状態を取得
        toggleGroupCreationModal, // 新規作成用アクションを取得
        isScenarioModalOpen, // 追加
        toggleScenarioModal, // 追加
    } = useAppStore();
    useVH(); // Safari対応版のVHフックを使用
    const session = getActiveSession();
    const character = getSelectedCharacter(); // character を取得
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'memory' | 'tracker' | 'history' | 'layers'>('memory');
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
    const [stagingGroupMembers, setStagingGroupMembers] = useState<Character[]>([]); // 追加

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
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
    const currentMessages = displaySession && displaySession.messages ? displaySession.messages : [];
    const displaySessionId = displaySession && displaySession.id ? displaySession.id : '';

    const sidePanelTabs = useMemo(() => [
        { key: 'memory' as const, icon: Brain, label: 'メモリー', component: <MemoryGallery session_id={displaySessionId} character_id={currentCharacterId!} /> },
        { key: 'tracker' as const, icon: BarChart3, label: 'トラッカー', component: <TrackerDisplay session_id={displaySessionId} character_id={currentCharacterId!} /> },
        { key: 'history' as const, icon: History, label: '履歴検索', component: <HistorySearch session_id={displaySessionId} /> },
        { key: 'layers' as const, icon: Layers, label: '記憶層', component: <MemoryLayerDisplay session_id={displaySessionId} /> },
    ], [displaySessionId, currentCharacterId]);

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Extract complex expressions for dependency array
    const sessionMessages = session && session.messages ? session.messages : null;
    const groupSessionMessages = activeGroupSession && activeGroupSession.messages ? activeGroupSession.messages : null;

    useEffect(() => {
        scrollToBottom();
    }, [sessionMessages, groupSessionMessages]);

    // グループモードかつアクティブなグループセッションがない場合
    if (is_group_mode && !activeGroupSession) {
        return (
            <div className="flex bg-slate-900 text-white" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
                <ClientOnlyProvider fallback={null}>
                    <AnimatePresence>
                        {isLeftSidebarOpen && <ChatSidebar />}
                    </AnimatePresence>
                </ClientOnlyProvider>
                
                {/* グループチャット設定画面 */}
                <div className="flex-1 flex flex-col">
                    <ChatHeader />
                    <div className="flex-1">
                        <GroupChatInterface />
                    </div>
                </div>
                
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
                        onRegenerate={async () => {
                            const session = getActiveSession();
                            if (!session) return;
                            
                            const recentMessages = session.messages.slice(-6);
                            const customPrompt = systemPrompts.replySuggestion && systemPrompts.replySuggestion.trim() !== '' 
                                ? systemPrompts.replySuggestion 
                                : undefined;
                            
                            const character = session.participants.characters[0];
                            const user = session.participants.user;
                            
                            await generateSuggestions(recentMessages, character, user, customPrompt, true);
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
                <AnimatePresence>
                    {isGroupMemberModalOpen && activeGroupSession && (
                      <CharacterGalleryModal
                        isGroupEditingMode={true}
                        activeGroupMembers={activeGroupSession.characters}
                        onUpdateGroupMembers={(newCharacters) => {
                          if (active_group_session_id) {
                            updateGroupMembers(active_group_session_id, newCharacters);
                          }
                          toggleGroupMemberModal(false);
                        }}
                        onClose={() => toggleGroupMemberModal(false)}
                      />
                    )}
                    {isGroupCreationModalOpen && (
                      <CharacterGalleryModal
                        isGroupCreationMode={true}
                        onCreateGroup={(newMembers) => {
                          setStagingGroupMembers(newMembers);
                          toggleGroupCreationModal(false);
                          toggleScenarioModal(true); // シナリオモーダルを開く
                        }}
                        onClose={() => toggleGroupCreationModal(false)}
                      />
                    )}
                    {isScenarioModalOpen && (
                      <ScenarioSetupModal
                        isOpen={isScenarioModalOpen}
                        onClose={() => toggleScenarioModal(false)}
                        onSubmit={async (scenario) => {
                          const persona = useAppStore.getState().getSelectedPersona();
                          if (persona && stagingGroupMembers.length >= 2) {
                            const groupName = scenario.title !== 'スキップ' 
                              ? scenario.title 
                              : `${stagingGroupMembers.map(c => c.name).join('、')}とのチャット`;
                            
                            await createGroupSession(stagingGroupMembers, persona, 'sequential', groupName, scenario);
                            
                            // 状態更新がUIに反映されるのを待つために少し遅延させる
                            setTimeout(() => {
                              toggleScenarioModal(false);
                              setStagingGroupMembers([]); // ステージングメンバーをクリア
                            }, 100);
                          } else {
                            alert('ペルソナが選択されていないか、メンバーが2人未満です。');
                          }
                        }}
                        members={stagingGroupMembers}
                      />
                    )}
                </AnimatePresence>
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
        <div 
            className="flex bg-slate-900 text-white h-screen" 
            style={{ 
                height: 'calc(var(--vh, 1vh) * 100)'
            }}
        >
            {/* 全画面背景画像 - 最背面に配置 */}
            {character && character.background_url && (
                <div className="fixed inset-0 w-full h-full overflow-hidden z-0">
                    {character.background_url.endsWith('.mp4') || character.background_url.includes('video') ? (
                        <video
                            src={character.background_url}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                            src={character.background_url} 
                            alt="background" 
                            className="w-full h-full object-cover"
                        />
                    )}
                    <div className="absolute inset-0 bg-black/30" />
                </div>
            )}

            <ClientOnlyProvider fallback={null}>
                <AnimatePresence>
                    {isLeftSidebarOpen && <ChatSidebar />}
                </AnimatePresence>
            </ClientOnlyProvider>
            
            {/* モバイルでサイドバーが開いているときの背景オーバーレイ */}
            {isLeftSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => useAppStore.getState().toggleLeftSidebar()}
                />
            )}
            
            <div 
                className={cn(
                    "flex flex-1 min-w-0 relative z-10",
                    // モバイルではマージンなし、デスクトップでは320pxマージン
                    isLeftSidebarOpen ? "ml-0 md:ml-80" : "ml-0"
                )}
                style={{
                    // Safari用の明示的なスタイル（背景色を削除）
                    display: 'flex',
                    flexGrow: 1,
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    // backgroundColor を削除 - 透明にして背景画像を透けて見せる
                }}
            >
                {/* メインコンテンツエリア */}
                <div className="flex-1 flex flex-col min-w-0 relative">
                    {/* ヘッダー */}
                    <ChatHeader />
                    
                    {/* メッセージリスト専用コンテナ - 透明な背景でスクロール */}
                    <div 
                        className="flex-1 overflow-y-auto px-3 md:px-4 py-4 space-y-3 md:space-y-4 scrollbar-thin scrollbar-thumb-purple-400/20 scrollbar-track-transparent z-10 messages-container" 
                        style={{ 
                            position: 'fixed',
                            top: 0,
                            left: windowWidth >= 768 && isLeftSidebarOpen ? '320px' : '0',
                            right: 0,
                            bottom: 0,
                            paddingTop: windowWidth <= 768 ? '100px' : '90px', 
                            paddingBottom: windowWidth <= 768 ? '120px' : '100px',
                            backgroundColor: 'transparent'
                        }}
                    >
                        {currentMessages.length > 0 ? (
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
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-white/50">
                                <Bot size={48} className="mb-4" />
                                <h2 className="text-xl font-semibold mb-2">まだメッセージがありません</h2>
                                <p>新しい会話を始めましょう</p>
                            </div>
                        )}
                        
                        {(is_generating || group_generating) && <ThinkingIndicator />}
                        
                        <div ref={messagesEndRef} />
                    </div>

                    {/* メッセージ入力欄 */}
                    <MessageInputWrapper />
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
                                className="bg-slate-800 border-l border-purple-400/20 flex flex-col h-full flex-shrink-0 z-[60]"
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
                        onRegenerate={async () => {
                            const session = getActiveSession();
                            if (!session) return;
                            
                            const recentMessages = session.messages.slice(-6);
                            const customPrompt = systemPrompts.replySuggestion && systemPrompts.replySuggestion.trim() !== '' 
                                ? systemPrompts.replySuggestion 
                                : undefined;
                            
                            const character = session.participants.characters[0];
                            const user = session.participants.user;
                            
                            await generateSuggestions(recentMessages, character, user, customPrompt, true);
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
                <AnimatePresence>
                    {isGroupMemberModalOpen && activeGroupSession && (
                      <CharacterGalleryModal
                        isGroupEditingMode={true}
                        activeGroupMembers={activeGroupSession.characters}
                        onUpdateGroupMembers={(newCharacters) => {
                          if (active_group_session_id) {
                            updateGroupMembers(active_group_session_id, newCharacters);
                          }
                          toggleGroupMemberModal(false);
                        }}
                        onClose={() => toggleGroupMemberModal(false)}
                      />
                    )}
                    {isGroupCreationModalOpen && (
                      <CharacterGalleryModal
                        isGroupCreationMode={true}
                        onCreateGroup={(newMembers) => {
                          setStagingGroupMembers(newMembers);
                          toggleGroupCreationModal(false);
                          toggleScenarioModal(true); // シナリオモーダルを開く
                        }}
                        onClose={() => toggleGroupCreationModal(false)}
                      />
                    )}
                    {isScenarioModalOpen && (
                      <ScenarioSetupModal
                        isOpen={isScenarioModalOpen}
                        onClose={() => toggleScenarioModal(false)}
                        onSubmit={async (scenario) => {
                          const persona = useAppStore.getState().getSelectedPersona();
                          if (persona && stagingGroupMembers.length >= 2) {
                            const groupName = scenario.title !== 'スキップ' 
                              ? scenario.title 
                              : `${stagingGroupMembers.map(c => c.name).join('、')}とのチャット`;
                            
                            await createGroupSession(stagingGroupMembers, persona, 'sequential', groupName, scenario);
                            
                            // 状態更新がUIに反映されるのを待つために少し遅延させる
                            setTimeout(() => {
                              toggleScenarioModal(false);
                              setStagingGroupMembers([]); // ステージングメンバーをクリア
                            }, 100);
                          } else {
                            alert('ペルソナが選択されていないか、メンバーが2人未満です。');
                          }
                        }}
                        members={stagingGroupMembers}
                      />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

// メインのChatInterfaceコンポーネント（Safari対応版）
export const ChatInterface: React.FC = () => {
    try {
        return (
            <ClientOnlyProvider fallback={
                <div className="flex bg-slate-900 text-white overflow-hidden items-center justify-center" 
                     style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
                    <div className="text-white/50 text-center">
                        <div className="animate-pulse">読み込み中...</div>
                    </div>
                </div>
            }>
                <ChatInterfaceContent />
            </ClientOnlyProvider>
        );
    } catch (error) {
        return (
            <div className="flex bg-slate-900 text-white overflow-hidden items-center justify-center" 
                 style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
                <div className="text-white/50 text-center">
                    <div>エラーが発生しました: {String(error)}</div>
                </div>
            </div>
        );
    }
};