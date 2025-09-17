'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Copy, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface EnhancementModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  enhancedText: string;
  onSelect: (text: string) => void;
  isLoading?: boolean;
}

export const EnhancementModal: React.FC<EnhancementModalProps> = ({
  isOpen,
  onClose,
  originalText,
  enhancedText,
  onSelect,
  isLoading = false
}) => {
  const [editedText, setEditedText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEditedText(enhancedText || originalText);
    }
  }, [isOpen, enhancedText, originalText]);

  const handleSelect = () => {
    onSelect(editedText);
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedText);
  };

  // Continue enhancement (append continuation) handler
  const handleContinue = async () => {
    if (isLoading) return;
    try {
      // Trigger store action to continue enhancement
      const { continueEnhancementForModal } = (await import("@/store")).getState().suggestionSlice || (await import("@/store")).getState();
      // Fallback: call via window store if available
      if (typeof continueEnhancementForModal === "function") {
        await continueEnhancementForModal();
        // After continuation, try to read updated enhancedText from store
        const enhanced = (await import("@/store")).getState().enhancedText;
        setEditedText(enhanced || editedText);
      } else {
        console.warn("continueEnhancementForModal not found in store");
      }
    } catch (error) {
      console.error("Continue enhancement failed:", error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogPortal>
            <DialogOverlay className="z-[99]" />
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col bg-slate-900/50 backdrop-blur-xl border border-purple-400/20 z-[100]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5" />
                文章強化
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 p-4">
              {/* 元の文章 */}
              <div>
                <label className="text-sm font-medium text-white/70 mb-2 block">
                  元の文章
                </label>
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <p className="text-sm text-white/80 whitespace-pre-wrap">
                    {originalText}
                  </p>
                </div>
              </div>

              {/* 強化された文章（編集可能） */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white/70">
                    強化された文章
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopy}
                    className="text-white/60 hover:text-white h-7 px-2"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    コピー
                  </Button>
                </div>
                
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400" />
                    <span className="ml-3 text-sm text-white/60">文章を強化中...</span>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="min-h-[120px] bg-slate-800 border-purple-400/30 focus:border-purple-400 text-white"
                      placeholder="強化された文章を編集..."
                    />
                  </motion.div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-purple-400/20">
              <Button variant="ghost" onClick={onClose}>
                キャンセル
              </Button>
              <Button variant="ghost" onClick={handleContinue} disabled={isLoading}>
                続きを出して
              </Button>
              <Button
                onClick={handleSelect}
                disabled={isLoading || !editedText.trim()}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Check className="w-4 h-4 mr-1" />
                使用する
              </Button>
            </div>
          </DialogContent>
          </DialogPortal>
        </Dialog>
      )}
    </AnimatePresence>
  );
};