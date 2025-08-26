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
  Bot as _Bot,
  Shield,
  History,
  Image as ImageIcon,
  Paperclip,
  Code as _Code,
  X,
  Cpu,
  Phone,
  Users
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
// import imageCompression from 'browser-image-compression'; // 静的インポートを削除

export const MessageInput: React.FC = () => {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  const hasContent = hasMessage || selectedImage;

  const handleSuggestClick = async () => {
    console.log("💡 Suggest button clicked!");
    const session = getActiveSession();
    if (!session) return;

    setShowSuggestionModal(true);
    
    const recentMessages = session.messages.slice(-6);
    const customPrompt = systemPrompts.replySuggestion && systemPrompts.replySuggestion.trim() !== '' 
      ? systemPrompts.replySuggestion 
      : undefined;
    
    const character = session.participants.characters[0];
    const user = session.participants.user;
        
    await generateSuggestions(recentMessages, character, user, customPrompt);
  };

  const handleEnhanceClick = async () => {
    console.log("✨ Enhance button clicked!");
    if (!hasMessage) return;
    
    setIsEnhancing(true);
    try {
        const session = getActiveSession();
        if (!session) {
            alert('セッションが見つかりません。ページをリロードしてみてください。');
            return;
        }
        const recentMessages = session ? session.messages.slice(-6) : [];
        const enhancedText = await enhanceText(
          currentInputText,
          recentMessages,
          session.participants.user,
          systemPrompts.textEnhancement
        );
        setCurrentInputText(enhancedText);
    } catch (error) {
        console.error("Failed to enhance text:", error);
        // ユーザーに具体的なエラーメッセージを表示
        const errorMessage = error instanceof Error 
          ? error.message 
          : '文章強化中に予期しないエラーが発生しました。しばらく時間をおいて再試行してください。';
        alert(errorMessage);
    } finally {
        setIsEnhancing(false);
    }
  };

  const handleSend = async () => {
    if ((!hasMessage && !selectedImage) || is_generating) return;
    
    await sendMessage(currentInputText, selectedImage || undefined);
    setCurrentInputText('');
    setSelectedImage(null);
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    console.log('🔄 File upload started:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    setIsUploading(true);
    try {
      let processedFile = file;
      // 画像ファイルサイズ制限チェック（圧縮なしで安全な実装）
      if (file.type.startsWith('image/')) {
        const maxSize = 5 * 1024 * 1024; // 5MB制限
        if (file.size > maxSize) {
          console.warn('⚠️ Image too large, uploading without compression');
          alert('画像サイズが大きいため、アップロードに時間がかかる場合があります。');
        }
        processedFile = file;
      }

      const formData = new FormData();
      formData.append('file', processedFile);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('📤 Upload response:', result);
      
      if (result.success) {
        setSelectedImage(result.url);
        console.log('✅ Image uploaded successfully:', result.url);
        
        // Success notification (could be implemented as toast)
        if (typeof window !== 'undefined') {
          console.log('🎉 Upload success notification');
        }
      } else {
        console.error('❌ Upload failed:', result.error);
        
        // Error notification 
        alert(`アップロードに失敗しました:\n${result.error}`);
      }
    } catch (error) {
      console.error('💥 Upload error:', error);
      
      // Network error notification
      alert('ネットワークエラーが発生しました。\nインターネット接続を確認してください。');
    } finally {
      setIsUploading(false);
      console.log('🔄 Upload process completed');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
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
    <div className="relative p-3 md:p-4 border-t border-transparent bg-slate-900/50 backdrop-blur-md z-[41]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      <AnimatePresence>
        {showActionMenu && (
          <ActionMenu 
            onClose={() => setShowActionMenu(false)}
            onCharacterClick={() => setShowCharacterGallery(true)}
            onPersonaClick={() => setShowPersonaGallery(true)}
            onModelClick={() => {
              console.log("AI設定クリック: setShowSettingsModal(true, 'ai') を呼び出します");
              setShowSettingsModal(true, 'ai');
            }}
            onVoiceClick={() => setShowSettingsModal(true, 'voice')}
            onImageClick={handleImageUpload}
            onHistoryClick={() => setShowHistoryModal(true)}
            onChatSettingsClick={() => setShowSettingsModal(true, 'chat')}
          />
        )}
      </AnimatePresence>

      {/* 画像プレビューエリア */}
      {selectedImage && (
        <div className="mb-3 p-3 bg-white/5 rounded-xl border border-purple-400/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">添付画像:</span>
            <button
              onClick={handleClearImage}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <img
            src={selectedImage}
            alt="Uploaded preview"
            className="max-w-full max-h-32 rounded-lg object-contain"
          />
        </div>
      )}

      <div className="relative flex items-end gap-2 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 p-2 md:p-3">
        {/* 左側ボタンエリア - 画像アップロードボタンを削除してスペースを確保 */}
        <div className="flex gap-1">
          <VoiceCallButton />
          <GroupModeButton />
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
          

          <AnimatePresence mode="wait">
            <motion.div
              key={hasContent ? 'send' : 'menu'}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              {hasContent ? (
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
  onImageClick,
  onHistoryClick,
  onChatSettingsClick,
}: { 
  onClose: () => void;
  onCharacterClick: () => void;
  onPersonaClick: () => void;
  onModelClick: () => void;
  onVoiceClick: () => void;
  onImageClick: () => void;
  onHistoryClick: () => void;
  onChatSettingsClick: () => void;
}) => {
  const menuItems = [
    { icon: User, label: 'キャラクター', action: onCharacterClick },
    { icon: Shield, label: 'ペルソナ', action: onPersonaClick },
    { icon: Cpu, label: 'AI設定', action: onModelClick },
    { icon: Mic, label: '音声', action: onVoiceClick },
    { icon: Paperclip, label: '画像添付', action: onImageClick },
    { icon: History, label: 'チャット履歴', action: onHistoryClick },
    { icon: Settings, label: 'チャット設定', action: onChatSettingsClick },
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
      className="absolute bottom-24 right-4 bg-slate-800 border border-purple-400/20 rounded-2xl shadow-lg p-2 grid grid-cols-4 gap-2"
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

// 音声通話ボタンコンポーネント
const VoiceCallButton: React.FC = () => {
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [isVoiceCallModalOpen, setIsVoiceCallModalOpen] = useState(false);
  
  return (
    <InputButton 
      icon={Phone} 
      onClick={() => setIsVoiceCallActive(!isVoiceCallActive)} 
      tooltip={isVoiceCallActive ? "音声通話を終了" : "音声通話を開始"}
      active={isVoiceCallActive}
    />
  );
};

// グループモードボタンコンポーネント
const GroupModeButton: React.FC = () => {
  const { is_group_mode, setGroupMode } = useAppStore();
  
  return (
    <InputButton 
      icon={Users} 
      onClick={() => setGroupMode(!is_group_mode)} 
      tooltip={is_group_mode ? "個人チャットに切り替え" : "グループチャットに切り替え"}
      active={is_group_mode}
    />
  );
};