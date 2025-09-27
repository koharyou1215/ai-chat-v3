"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ChevronRight,
  ChevronDown,
  Command,
  Layers,
  Settings2,
  X,
  Check,
  RefreshCw,
  Copy,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WORKFLOW_TEMPLATES,
  ADDITIONAL_COMMANDS,
  ALPHA_CONTEXTS,
  superClaudeManager,
  SuperClaudeConfig,
  WorkflowTemplate,
} from "@/services/superclaude-workflows";

interface SuperClaudePanelProps {
  onGeneratePrompt?: (prompt: string) => void;
  onClose?: () => void;
  className?: string;
}

export const SuperClaudePanel: React.FC<SuperClaudePanelProps> = ({
  onGeneratePrompt,
  onClose,
  className,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [additionalCommands, setAdditionalCommands] = useState<string[]>([]);
  const [alphaContexts, setAlphaContexts] = useState<string[]>([]);
  const [customFlags, setCustomFlags] = useState<string>("");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [config, setConfig] = useState<SuperClaudeConfig>(
    superClaudeManager.getConfig()
  );

  // Load saved configuration on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem("superClaudeConfig");
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        superClaudeManager.loadConfig(parsedConfig);
        setConfig(parsedConfig);
        setSelectedWorkflow(parsedConfig.selectedWorkflow);
        setAdditionalCommands(parsedConfig.additionalCommands || []);
        setAlphaContexts(parsedConfig.alphaContexts || []);
        setCustomFlags(parsedConfig.customFlags?.join(" ") || "");
      } catch (error) {
        console.error("Failed to load SuperClaude config:", error);
      }
    }
  }, []);

  // Save configuration when it changes
  useEffect(() => {
    const newConfig: SuperClaudeConfig = {
      selectedWorkflow,
      additionalCommands,
      alphaContexts,
      customFlags: customFlags.split(" ").filter(Boolean),
    };
    superClaudeManager.loadConfig(newConfig);
    setConfig(newConfig);

    // Save to localStorage (with debounce to prevent persistence bug)
    const timeoutId = setTimeout(() => {
      localStorage.setItem("superClaudeConfig", JSON.stringify(newConfig));
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [selectedWorkflow, additionalCommands, alphaContexts, customFlags]);

  const handleWorkflowSelect = (workflowId: string) => {
    // Fix: Allow changing workflow even after initial selection
    if (selectedWorkflow === workflowId) {
      // If clicking the same workflow, deselect it
      setSelectedWorkflow(null);
    } else {
      setSelectedWorkflow(workflowId);
    }
  };

  const handleCommandToggle = (commandId: string) => {
    setAdditionalCommands((prev) =>
      prev.includes(commandId)
        ? prev.filter((c) => c !== commandId)
        : [...prev, commandId]
    );
  };

  const handleContextToggle = (contextId: string) => {
    setAlphaContexts((prev) =>
      prev.includes(contextId)
        ? prev.filter((c) => c !== contextId)
        : [...prev, contextId]
    );
  };

  const handleGeneratePrompt = () => {
    const prompt = superClaudeManager.generatePrompt();
    if (onGeneratePrompt) {
      onGeneratePrompt(prompt);
    }
  };

  const handleCopyPrompt = async () => {
    const prompt = superClaudeManager.generatePrompt();
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (error) {
      console.error("Failed to copy prompt:", error);
    }
  };

  const handleReset = () => {
    setSelectedWorkflow(null);
    setAdditionalCommands([]);
    setAlphaContexts([]);
    setCustomFlags("");
    superClaudeManager.reset();
    localStorage.removeItem("superClaudeConfig");
  };

  const getWorkflowIcon = (workflow: WorkflowTemplate) => {
    return workflow.icon || "🚀";
  };

  return (
    <motion.div
      className={cn(
        "bg-slate-800/90 backdrop-blur-lg border border-purple-400/30 rounded-lg shadow-xl",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Sparkles className="text-purple-400" size={20} />
          <span className="text-white font-medium">SuperClaude Workflow</span>
          {selectedWorkflow && (
            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
              {WORKFLOW_TEMPLATES.find((w) => w.id === selectedWorkflow)?.nameJa}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X size={16} className="text-white/60" />
            </button>
          )}
          {expanded ? (
            <ChevronDown size={16} className="text-white/60" />
          ) : (
            <ChevronRight size={16} className="text-white/60" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4 border-t border-purple-400/20">
              {/* Workflow Templates */}
              <div>
                <h3 className="text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
                  <Wand2 size={14} />
                  ワークフローテンプレート
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {WORKFLOW_TEMPLATES.map((workflow) => (
                    <button
                      key={workflow.id}
                      onClick={() => handleWorkflowSelect(workflow.id)}
                      className={cn(
                        "p-3 rounded-lg border transition-all text-left",
                        selectedWorkflow === workflow.id
                          ? "bg-purple-500/20 border-purple-400 text-purple-200"
                          : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span>{getWorkflowIcon(workflow)}</span>
                        <span className="text-xs font-medium truncate">
                          {workflow.nameJa}
                        </span>
                      </div>
                      <div className="text-xs text-white/50 truncate">
                        {workflow.descriptionJa}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Commands */}
              <div>
                <h3 className="text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
                  <Command size={14} />
                  追加コマンド
                </h3>
                <div className="flex flex-wrap gap-2">
                  {ADDITIONAL_COMMANDS.map((command) => (
                    <button
                      key={command.id}
                      onClick={() => handleCommandToggle(command.id)}
                      className={cn(
                        "px-3 py-1 rounded-md text-xs transition-all flex items-center gap-1",
                        additionalCommands.includes(command.id)
                          ? "bg-blue-500/20 border border-blue-400 text-blue-300"
                          : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
                      )}
                    >
                      {additionalCommands.includes(command.id) && (
                        <Check size={10} />
                      )}
                      {command.id}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alpha Contexts */}
              <div>
                <h3 className="text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
                  <Layers size={14} />
                  αコンテキスト管理
                </h3>
                <div className="space-y-2">
                  {ALPHA_CONTEXTS.map((context) => (
                    <label
                      key={context.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={alphaContexts.includes(context.id)}
                        onChange={() => handleContextToggle(context.id)}
                        className="w-4 h-4 rounded border-white/30 bg-white/10 text-purple-500 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm text-white/80">{context.name}</div>
                        <div className="text-xs text-white/50">
                          {context.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Flags */}
              <div>
                <h3 className="text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
                  <Settings2 size={14} />
                  カスタムフラグ
                </h3>
                <input
                  type="text"
                  value={customFlags}
                  onChange={(e) => setCustomFlags(e.target.value)}
                  placeholder="--flag1 --flag2 value"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-400"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs text-white/60 hover:text-white transition-colors flex items-center gap-1"
                >
                  <RefreshCw size={12} />
                  リセット
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyPrompt}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-md text-xs transition-colors flex items-center gap-1"
                  >
                    {copiedPrompt ? (
                      <>
                        <Check size={12} />
                        コピー済み
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        プロンプトをコピー
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleGeneratePrompt}
                    className="px-4 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-md text-xs font-medium transition-colors"
                  >
                    プロンプト生成
                  </button>
                </div>
              </div>

              {/* Preview */}
              {(selectedWorkflow || additionalCommands.length > 0 || alphaContexts.length > 0) && (
                <div className="p-3 bg-black/30 rounded-lg border border-white/10">
                  <div className="text-xs text-white/50 mb-2">生成されるプロンプト:</div>
                  <pre className="text-xs text-white/80 whitespace-pre-wrap font-mono">
                    {superClaudeManager.generatePrompt() || "（空）"}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SuperClaudePanel;