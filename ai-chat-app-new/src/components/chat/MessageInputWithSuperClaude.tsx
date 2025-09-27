"use client";

import React, { useState, useCallback } from "react";
import { MessageInput } from "./MessageInput";
import { SuperClaudePanel } from "../superclaude/SuperClaudePanel";
import { superClaudeManager } from "@/services/superclaude-workflows";
import { useAppStore } from "@/store";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2 } from "lucide-react";

export const MessageInputWithSuperClaude: React.FC = React.memo(() => {
  const [showSuperClaude, setShowSuperClaude] = useState(false);
  const { currentInputText, setCurrentInputText } = useAppStore();

  // Handle prompt generation from SuperClaude
  const handleGeneratePrompt = useCallback((prompt: string) => {
    // Append the generated prompt to the current input text
    const currentText = currentInputText || "";
    const newText = currentText ? `${currentText}\n\n${prompt}` : prompt;
    setCurrentInputText(newText);

    // Hide the SuperClaude panel after generating
    setShowSuperClaude(false);
  }, [currentInputText, setCurrentInputText]);

  return (
    <>
      {/* SuperClaude Panel */}
      <AnimatePresence>
        {showSuperClaude && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-[500px] z-[42]"
            style={{ marginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
          >
            <SuperClaudePanel
              onGeneratePrompt={handleGeneratePrompt}
              onClose={() => setShowSuperClaude(false)}
              className="shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* SuperClaude Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowSuperClaude(!showSuperClaude)}
        className={`fixed bottom-24 right-4 p-3 rounded-full shadow-lg transition-all z-[41] ${
          showSuperClaude
            ? "bg-purple-500 text-white"
            : "bg-slate-800 text-purple-400 hover:bg-purple-500 hover:text-white"
        }`}
        style={{ marginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
      >
        <Wand2 size={20} />
      </motion.button>

      {/* Original MessageInput */}
      <MessageInput />
    </>
  );
});

MessageInputWithSuperClaude.displayName = "MessageInputWithSuperClaude";

export default MessageInputWithSuperClaude;