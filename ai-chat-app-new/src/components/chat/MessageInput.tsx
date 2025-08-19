'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Mic, 
  Sparkles, 
  Lightbulb, 
  Plus, 
  User,
  Settings,
  Bot,
  Shield,
  History,
  Image as ImageIcon,
  Paperclip,
  Code
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

export const MessageInput: React.FC = () => {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false); // ★ 新しいstateを追加
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { 
    sendMessage, 
    is_generating,
    currentInputText,
    setCurrentInputText,
    setShowCharacterGallery,
    setShowPersonaGallery,
    setShowHistoryModal,
    setShowSettingsModal,
    setShowVoiceSettingsModal,
    setShowSuggestionModal,
    generateSuggestions,
    enhanceText,
    getActiveSession,
    systemPrompts,
  } = useAppStore();
  
  const hasMessage = currentInputText.trim().length > 0;

  const handleSuggestClick = async () => {
    console.log("💡 Suggest button clicked!");
    const session = getActiveSession();
    if (!session) return;

    setShowSuggestionModal(true);
    
    const recentMessages = session.messages.slice(-6);
    const customPrompt = systemPrompts.replySuggestion && systemPrompts.replySuggestion.trim() !== '' 
      ? systemPrompts.replySuggestion 
      : undefined;
        
    await generateSuggestions(recentMessages, customPrompt);
  };

  const handleEnhanceClick = async () => {
    console.log("✨ Enhance button clicked!");
    if (!hasMessage) return;
    
    setIsEnhancing(true);
    try {
        const session = getActiveSession();
        const recentMessages = session ? session.messages.slice(-6) : [];
        const enhancedText = await enhanceText(
          currentInputText,
          recentMessages,
          systemPrompts.textEnhancement
        );
        setCurrentInputText(enhancedText);
    } catch (error) {
        console.error("Failed to enhance text:", error);
        // TODO: Show error toast
    } finally {
        setIsEnhancing(false);
    }
  };

  const handleSend = async () => {
    if (!hasMessage || is_generating) return;
    
    await sendMessage(currentInputText);
    setCurrentInputText('');
  };

  const handleImageUpload = () => {
    // 画像アップロードロジックをここに追加
    console.log("Image upload clicked");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !is_generating) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [currentInputText]);

  return (
    <div className="relative p-4 border-t border-white/10">
      <AnimatePresence>
        {showActionMenu && (
          <ActionMenu 
            onClose={() => setShowActionMenu(false)}
            onCharacterClick={() => setShowCharacterGallery(true)}
            onPersonaClick={() => setShowPersonaGallery(true)}
            onModelClick={() => setShowSettingsModal(true, 'api')}
            onVoiceClick={() => setShowVoiceSettingsModal(true)}
            onHistoryClick={() => setShowHistoryModal(true)}
            onChatSettingsClick={() => setShowSettingsModal(true, 'ai')}
            onDetailedSettingsClick={() => setShowSettingsModal(true, 'developer')}
          />
        )}
      </AnimatePresence>

      <div className="relative flex items-end gap-2 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-3">
        {/* 左側ボタンエリア */}
        <div className="flex gap-1">
          <InputButton icon={Paperclip} onClick={handleImageUpload} tooltip="画像を添付" />
        </div>

        <textarea
          ref={textareaRef}
          value={currentInputText}
          onChange={(e) => setCurrentInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力..."
          className="flex-1 bg-transparent text-white/90 placeholder-white/30 resize-none outline-none max-h-[120px]"
          rows={1}
        />
        
        <div className="flex gap-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={hasMessage ? 'enhance' : 'suggest'}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              {hasMessage ? (
                <InputButton 
                  icon={Sparkles} 
                  onClick={handleEnhanceClick} 
                  tooltip="文章強化" 
                  isLoading={isEnhancing} // ★ isLoadingプロパティを追加
                />
              ) : (
                <InputButton 
                  icon={Lightbulb} 
                  onClick={handleSuggestClick} 
                  tooltip="返信提案" 
                />
              )}
            </motion.div>
          </AnimatePresence>
          
          <InputButton icon={Mic} onClick={() => {}} tooltip="音声入力" />

          <AnimatePresence mode="wait">
            <motion.div
              key={hasMessage ? 'send' : 'menu'}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              {hasMessage ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={is_generating}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                >
                  {is_generating ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </motion.button>
              ) : (
                <InputButton
                  icon={Plus}
                  onClick={() => setShowActionMenu(!showActionMenu)}
                  tooltip="メニュー"
                  active={showActionMenu}
                  rotation={showActionMenu ? 135 : 0}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const ActionMenu = ({ 
  onClose,
  onCharacterClick,
  onPersonaClick,
  onModelClick,
  onVoiceClick,
  onHistoryClick,
  onChatSettingsClick,
  onDetailedSettingsClick
}: { 
  onClose: () => void;
  onCharacterClick: () => void;
  onPersonaClick: () => void;
  onModelClick: () => void;
  onVoiceClick: () => void;
  onHistoryClick: () => void;
  onChatSettingsClick: () => void;
  onDetailedSettingsClick: () => void;
}) => {
  const menuItems = [
    { icon: User, label: 'キャラクター', action: onCharacterClick },
    { icon: Shield, label: 'ペルソナ', action: onPersonaClick },
    { icon: Bot, label: 'モデル', action: onModelClick },
    { icon: Mic, label: '音声', action: onVoiceClick },
    { icon: ImageIcon, label: '画像', action: () => {} }, // TODO
    { icon: History, label: 'チャット履歴', action: onHistoryClick },
    { icon: Settings, label: 'チャット設定', action: onChatSettingsClick },
    { icon: Code, label: '詳細設定', action: onDetailedSettingsClick },
  ];

  const handleItemClick = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-24 right-4 bg-slate-800 border border-white/10 rounded-2xl shadow-lg p-2 grid grid-cols-4 gap-2"
    >
      {menuItems.map((item) => (
        <motion.button
          key={item.label}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleItemClick(item.action)}
          className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-white/10 transition-colors w-20 h-20"
        >
          <item.icon className="w-6 h-6 text-white/70 mb-1" />
          <span className="text-xs text-white/60">{item.label}</span>
        </motion.button>
      ))}
    </motion.div>
  );
};

const InputButton: React.FC<{
  icon: React.ElementType;
  onClick: () => void;
  active?: boolean;
  tooltip?: string;
  rotation?: number;
  isLoading?: boolean; // ★ isLoadingプロパティを追加
}> = ({ icon: Icon, onClick, active, tooltip, rotation = 0, isLoading }) => (
  <div className="relative group">
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'p-2 rounded-lg transition-colors',
        active
          ? 'bg-purple-500/20 text-purple-400'
          : 'hover:bg-white/10 text-white/50 hover:text-white/70'
      )}
    >
      <motion.div 
        animate={{ rotate: rotation }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <Icon className="w-5 h-5" />
      </motion.div>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </motion.button>
    {tooltip && (
      <div className="absolute bottom-full mb-2 px-2 py-1 bg-black/70 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {tooltip}
      </div>
    )}
  </div>
);