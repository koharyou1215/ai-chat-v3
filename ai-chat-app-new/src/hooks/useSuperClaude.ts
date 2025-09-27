// React Hook for SuperClaude Integration
// Provides easy access to SuperClaude functionality in React components

import { useState, useEffect, useCallback } from "react";
import { superClaudeManager, SuperClaudeConfig } from "@/services/superclaude-workflows";
import { superClaudeIntegration } from "@/services/superclaude-integration.service";
import { useAppStore } from "@/store";

export const useSuperClaude = () => {
  const [config, setConfig] = useState<SuperClaudeConfig>(
    superClaudeManager.getConfig()
  );
  const [isActive, setIsActive] = useState(false);
  const { currentInputText, setCurrentInputText } = useAppStore();

  // Load configuration on mount
  useEffect(() => {
    superClaudeIntegration.loadSuperClaudeConfig();
    const loadedConfig = superClaudeManager.getConfig();
    setConfig(loadedConfig);
    setIsActive(superClaudeIntegration.isSuperClaudeActive());
  }, []);

  // Update active state when config changes
  useEffect(() => {
    setIsActive(superClaudeIntegration.isSuperClaudeActive());
  }, [config]);

  // Select workflow
  const selectWorkflow = useCallback((workflowId: string | null) => {
    superClaudeManager.setWorkflow(workflowId);
    const newConfig = superClaudeManager.getConfig();
    setConfig(newConfig);

    // Save to localStorage
    localStorage.setItem("superClaudeConfig", JSON.stringify(newConfig));
  }, []);

  // Toggle command
  const toggleCommand = useCallback((commandId: string) => {
    const currentConfig = superClaudeManager.getConfig();
    if (currentConfig.additionalCommands.includes(commandId)) {
      superClaudeManager.removeCommand(commandId);
    } else {
      superClaudeManager.addCommand(commandId);
    }

    const newConfig = superClaudeManager.getConfig();
    setConfig(newConfig);

    // Save to localStorage
    localStorage.setItem("superClaudeConfig", JSON.stringify(newConfig));
  }, []);

  // Toggle alpha context
  const toggleAlphaContext = useCallback((contextId: string) => {
    superClaudeManager.toggleAlphaContext(contextId);
    const newConfig = superClaudeManager.getConfig();
    setConfig(newConfig);

    // Save to localStorage
    localStorage.setItem("superClaudeConfig", JSON.stringify(newConfig));
  }, []);

  // Generate prompt and append to current input
  const generateAndAppendPrompt = useCallback(() => {
    const prompt = superClaudeManager.generatePrompt();
    if (prompt) {
      const currentText = currentInputText || "";
      const newText = currentText ? `${currentText}\n\n${prompt}` : prompt;
      setCurrentInputText(newText);
    }
    return prompt;
  }, [currentInputText, setCurrentInputText]);

  // Enhance message with SuperClaude context
  const enhanceMessage = useCallback((message: string): string => {
    return superClaudeIntegration.enhanceInputWithSuperClaude(message);
  }, []);

  // Reset configuration
  const reset = useCallback(() => {
    superClaudeIntegration.clearSuperClaudeConfig();
    setConfig(superClaudeManager.getConfig());
  }, []);

  // Get workflow information
  const getWorkflow = useCallback((workflowId: string) => {
    return superClaudeManager.getWorkflow(workflowId);
  }, []);

  // Check if a specific workflow is selected
  const isWorkflowSelected = useCallback((workflowId: string): boolean => {
    return config.selectedWorkflow === workflowId;
  }, [config.selectedWorkflow]);

  // Check if a command is active
  const isCommandActive = useCallback((commandId: string): boolean => {
    return config.additionalCommands.includes(commandId);
  }, [config.additionalCommands]);

  // Check if an alpha context is active
  const isAlphaContextActive = useCallback((contextId: string): boolean => {
    return config.alphaContexts.includes(contextId);
  }, [config.alphaContexts]);

  // Get the current prompt that would be generated
  const getCurrentPrompt = useCallback((): string => {
    return superClaudeManager.generatePrompt();
  }, []);

  return {
    // State
    config,
    isActive,

    // Workflow management
    selectWorkflow,
    isWorkflowSelected,
    getWorkflow,

    // Command management
    toggleCommand,
    isCommandActive,

    // Alpha context management
    toggleAlphaContext,
    isAlphaContextActive,

    // Prompt generation
    generateAndAppendPrompt,
    getCurrentPrompt,
    enhanceMessage,

    // Utility
    reset,
  };
};

// Hook for automatically enhancing messages with SuperClaude
export const useSuperClaudeMessageEnhancement = () => {
  const { enhanceMessage, isActive } = useSuperClaude();
  const originalSendMessage = useAppStore((state) => state.sendMessage);
  const originalSendProgressiveMessage = useAppStore((state) => state.sendProgressiveMessage);

  // Wrap sendMessage to include SuperClaude enhancements
  const sendMessageWithSuperClaude = useCallback(
    async (message: string, image?: string) => {
      const enhancedMessage = isActive ? enhanceMessage(message) : message;
      return originalSendMessage(enhancedMessage, image);
    },
    [isActive, enhanceMessage, originalSendMessage]
  );

  // Wrap sendProgressiveMessage to include SuperClaude enhancements
  const sendProgressiveMessageWithSuperClaude = useCallback(
    async (message: string, image?: string) => {
      const enhancedMessage = isActive ? enhanceMessage(message) : message;
      return originalSendProgressiveMessage(enhancedMessage, image);
    },
    [isActive, enhanceMessage, originalSendProgressiveMessage]
  );

  return {
    sendMessage: sendMessageWithSuperClaude,
    sendProgressiveMessage: sendProgressiveMessageWithSuperClaude,
    isEnhancementActive: isActive,
  };
};

export default useSuperClaude;