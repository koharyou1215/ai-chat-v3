'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lightbulb, Copy, Edit, Check, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

interface SuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  isLoading?: boolean;
  title?: string;
  onRegenerate?: () => void;
}

export const SuggestionModal: React.FC<SuggestionModalProps> = ({
  isOpen,
  onClose,
  suggestions,
  onSelect,
  isLoading = false,
  title = '返信候補',
  onRegenerate
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedSuggestions, setEditedSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setEditedSuggestions(suggestions);
      setSelectedIndex(null);
      setEditingIndex(null);
    }
  }, [isOpen, suggestions]);

  const handleSelect = (index: number) => {
    const suggestion = editedSuggestions[index];
    onSelect(suggestion);
    onClose();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: Add toast notification
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col bg-slate-900/50 backdrop-blur-xl border border-purple-400/20">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  {title}
                </div>
                {onRegenerate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRegenerate}
                    disabled={isLoading}
                    className="text-white/60 hover:text-white disabled:opacity-50"
                    title="新しい提案を生成"
                  >
                    <RotateCcw className={cn("w-4 h-4 mr-1", isLoading && "animate-spin")} />
                    再生成
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-3 p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400" />
                </div>
              ) : (
                editedSuggestions.map((suggestion, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: index * 0.1 } }}
                    className={cn(
                      'p-4 rounded-lg cursor-pointer transition-all border',
                      selectedIndex === index 
                        ? 'border-purple-400 bg-purple-500/10' 
                        : 'border-purple-400/30 hover:border-purple-400/50'
                    )}
                    onClick={() => editingIndex !== index && setSelectedIndex(index)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-purple-300">
                          提案 {index + 1}
                        </span>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopy(suggestion)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingIndex(index)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {editingIndex === index ? (
                        <Textarea 
                          value={suggestion} 
                          onChange={(e) => {
                            const newSuggestions = [...editedSuggestions];
                            newSuggestions[index] = e.target.value;
                            setEditedSuggestions(newSuggestions);
                          }}
                          className="bg-slate-800"
                          rows={3}
                        />
                      ) : (
                        <p className="text-sm text-white/90 whitespace-pre-wrap">{suggestion}</p>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-purple-400/20">
              <Button variant="ghost" onClick={onClose}>キャンセル</Button>
              <Button
                onClick={() => selectedIndex !== null && handleSelect(selectedIndex)}
                disabled={selectedIndex === null}
              >
                <Check className="w-4 h-4 mr-1" />
                選択して使用
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
};
