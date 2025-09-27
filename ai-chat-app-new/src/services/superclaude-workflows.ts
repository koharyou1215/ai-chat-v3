// SuperClaude Workflow Templates with Optimized MCP Flags
// Each workflow has specific MCP server combinations for optimal performance

export interface WorkflowTemplate {
  id: string;
  name: string;
  nameJa: string;
  description: string;
  descriptionJa: string;
  icon: string;
  category: 'analysis' | 'development' | 'refactoring' | 'testing' | 'documentation' | 'optimization';
  flags: string[];
  commands?: string[];
  prompt?: string;
  color: string;
}

export interface SuperClaudeConfig {
  selectedWorkflow: string | null;
  additionalCommands: string[];
  alphaContexts: string[];
  customFlags: string[];
}

// Optimized workflow templates with specific MCP configurations
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'bug-fix',
    name: 'Bug Fix Flow',
    nameJa: '🐛 バグ修正フロー',
    description: 'Systematic bug diagnosis and resolution',
    descriptionJa: 'バグの診断と修正を体系的に実行',
    icon: '🐛',
    category: 'development',
    flags: ['--think-hard', '--seq', '--morph', '--validate', '--serena'],
    commands: ['/sc:analyze', '/sc:implement', '/sc:test'],
    color: 'red',
  },
  {
    id: 'refactoring',
    name: 'Refactoring Flow',
    nameJa: '♻️ リファクタリングフロー',
    description: 'Code improvement and optimization',
    descriptionJa: 'コードの改善と最適化',
    icon: '♻️',
    category: 'refactoring',
    flags: ['--ultrathink', '--morph', '--seq', '--validate', '--loop', '--iterations', '3'],
    commands: ['/sc:analyze', '/sc:improve', '/sc:test'],
    color: 'green',
  },
  {
    id: 'performance',
    name: 'Performance Optimization',
    nameJa: '⚡ パフォーマンス最適化フロー',
    description: 'Performance analysis and optimization',
    descriptionJa: 'パフォーマンス測定と最適化',
    icon: '⚡',
    category: 'optimization',
    flags: ['--think-hard', '--seq', '--morph', '--serena', '--validate'],
    commands: ['/sc:analyze', '/sc:improve', '/sc:build'],
    color: 'yellow',
  },
  {
    id: 'feature-dev',
    name: 'Feature Development',
    nameJa: '✨ 機能開発フロー',
    description: 'New feature implementation',
    descriptionJa: '新機能の実装',
    icon: '✨',
    category: 'development',
    flags: ['--think', '--magic', '--morph', '--validate', '--delegate', 'auto'],
    commands: ['/sc:design', '/sc:implement', '/sc:test'],
    color: 'blue',
  },
  {
    id: 'architecture',
    name: 'Architecture Review',
    nameJa: '🏗️ アーキテクチャレビュー',
    description: 'System architecture analysis',
    descriptionJa: 'システムアーキテクチャの分析',
    icon: '🏗️',
    category: 'analysis',
    flags: ['--ultrathink', '--seq', '--c7', '--serena', '--validate'],
    commands: ['/sc:analyze', '/sc:design', '/sc:document'],
    color: 'purple',
  },
  {
    id: 'security-audit',
    name: 'Security Audit',
    nameJa: '🛡️ セキュリティ監査',
    description: 'Security vulnerability assessment',
    descriptionJa: 'セキュリティ脆弱性の評価',
    icon: '🛡️',
    category: 'analysis',
    flags: ['--ultrathink', '--seq', '--validate', '--safe-mode'],
    commands: ['/sc:analyze', '/sc:troubleshoot', '/sc:document'],
    color: 'orange',
  },
  {
    id: 'test-coverage',
    name: 'Test Coverage',
    nameJa: '🧪 テストカバレッジ',
    description: 'Comprehensive testing workflow',
    descriptionJa: '包括的なテストワークフロー',
    icon: '🧪',
    category: 'testing',
    flags: ['--think', '--play', '--seq', '--validate', '--loop'],
    commands: ['/sc:test', '/sc:analyze', '/sc:implement'],
    color: 'teal',
  },
  {
    id: 'documentation',
    name: 'Documentation',
    nameJa: '📚 ドキュメント作成',
    description: 'Comprehensive documentation generation',
    descriptionJa: '包括的なドキュメント生成',
    icon: '📚',
    category: 'documentation',
    flags: ['--think', '--c7', '--serena', '--validate'],
    commands: ['/sc:index', '/sc:document', '/sc:explain'],
    color: 'indigo',
  },
  {
    id: 'ui-development',
    name: 'UI Development',
    nameJa: '🎨 UI開発',
    description: 'Frontend and UI component development',
    descriptionJa: 'フロントエンドとUIコンポーネント開発',
    icon: '🎨',
    category: 'development',
    flags: ['--magic', '--play', '--morph', '--validate'],
    commands: ['/sc:design', '/sc:implement', '/sc:test'],
    color: 'pink',
  },
  {
    id: 'brainstorm',
    name: 'Brainstorming',
    nameJa: '💡 ブレインストーミング',
    description: 'Interactive requirements discovery',
    descriptionJa: 'インタラクティブな要件探索',
    icon: '💡',
    category: 'analysis',
    flags: ['--brainstorm', '--think', '--seq'],
    commands: ['/sc:brainstorm', '/sc:design', '/sc:workflow'],
    color: 'cyan',
  },
  {
    id: 'cleanup',
    name: 'Code Cleanup',
    nameJa: '🧹 コードクリーンアップ',
    description: 'Remove dead code and optimize structure',
    descriptionJa: '不要コードの削除と構造の最適化',
    icon: '🧹',
    category: 'refactoring',
    flags: ['--think', '--morph', '--validate', '--safe-mode'],
    commands: ['/sc:cleanup', '/sc:analyze', '/sc:test'],
    color: 'gray',
  },
  {
    id: 'migration',
    name: 'Migration',
    nameJa: '🚀 マイグレーション',
    description: 'System or library migration',
    descriptionJa: 'システムやライブラリの移行',
    icon: '🚀',
    category: 'development',
    flags: ['--ultrathink', '--seq', '--morph', '--validate', '--delegate', 'auto'],
    commands: ['/sc:analyze', '/sc:implement', '/sc:test'],
    color: 'violet',
  }
];

// Additional commands that can be added to workflows
export const ADDITIONAL_COMMANDS = [
  { id: '/sc:workflow', name: 'Workflow Generation', description: 'Generate implementation workflows' },
  { id: '/sc:troubleshoot', name: 'Troubleshooting', description: 'Diagnose and resolve issues' },
  { id: '/sc:spawn', name: 'Task Orchestration', description: 'Intelligent task breakdown' },
  { id: '/sc:reflect', name: 'Task Reflection', description: 'Validate using analysis' },
  { id: '/sc:estimate', name: 'Estimation', description: 'Development time estimates' },
  { id: '/sc:git', name: 'Git Operations', description: 'Intelligent commit messages' },
  { id: '/sc:build', name: 'Build & Package', description: 'Build and compilation' },
  { id: '/sc:save', name: 'Session Save', description: 'Save session context' },
  { id: '/sc:load', name: 'Session Load', description: 'Load project context' },
];

// Alpha context options for advanced features
export const ALPHA_CONTEXTS = [
  { id: 'memory', name: 'Memory System', description: 'Advanced memory management' },
  { id: 'emotion', name: 'Emotional Intelligence', description: 'Emotional context awareness' },
  { id: 'persona', name: 'Persona System', description: 'Character personality system' },
  { id: 'tracker', name: 'Progress Tracking', description: 'Task and progress tracking' },
  { id: 'scenario', name: 'Scenario Engine', description: 'Dynamic scenario generation' },
  { id: 'multimodal', name: 'Multimodal Input', description: 'Image and voice processing' },
  { id: 'collaboration', name: 'Collaboration Mode', description: 'Multi-agent collaboration' },
  { id: 'learning', name: 'Learning Mode', description: 'Adaptive learning system' },
];

// Default SuperClaude configuration
export const DEFAULT_SUPERCLAUDE_CONFIG: SuperClaudeConfig = {
  selectedWorkflow: null,
  additionalCommands: [],
  alphaContexts: [],
  customFlags: [],
};

// Utility functions for workflow management
export class SuperClaudeWorkflowManager {
  private config: SuperClaudeConfig;

  constructor(config?: SuperClaudeConfig) {
    this.config = config || { ...DEFAULT_SUPERCLAUDE_CONFIG };
  }

  // Get workflow by ID
  getWorkflow(id: string): WorkflowTemplate | undefined {
    return WORKFLOW_TEMPLATES.find(w => w.id === id);
  }

  // Set selected workflow
  setWorkflow(workflowId: string | null): void {
    this.config.selectedWorkflow = workflowId;
  }

  // Add additional command
  addCommand(commandId: string): void {
    if (!this.config.additionalCommands.includes(commandId)) {
      this.config.additionalCommands.push(commandId);
    }
  }

  // Remove additional command
  removeCommand(commandId: string): void {
    this.config.additionalCommands = this.config.additionalCommands.filter(
      c => c !== commandId
    );
  }

  // Toggle alpha context
  toggleAlphaContext(contextId: string): void {
    const index = this.config.alphaContexts.indexOf(contextId);
    if (index === -1) {
      this.config.alphaContexts.push(contextId);
    } else {
      this.config.alphaContexts.splice(index, 1);
    }
  }

  // Generate complete prompt with workflow, commands, and contexts
  generatePrompt(): string {
    const parts: string[] = [];

    // Add workflow information
    if (this.config.selectedWorkflow) {
      const workflow = this.getWorkflow(this.config.selectedWorkflow);
      if (workflow) {
        parts.push(`# Workflow: ${workflow.nameJa}`);

        // Add workflow-specific commands
        if (workflow.commands && workflow.commands.length > 0) {
          parts.push(`## Commands: ${workflow.commands.join(', ')}`);
        }

        // Add workflow flags
        if (workflow.flags && workflow.flags.length > 0) {
          parts.push(`## Flags: ${workflow.flags.join(' ')}`);
        }

        // Add custom prompt if available
        if (workflow.prompt) {
          parts.push(`\n${workflow.prompt}`);
        }
      }
    }

    // Add additional commands
    if (this.config.additionalCommands.length > 0) {
      parts.push(`\n## Additional Commands: ${this.config.additionalCommands.join(', ')}`);
    }

    // Add alpha contexts
    if (this.config.alphaContexts.length > 0) {
      const contexts = this.config.alphaContexts
        .map(id => ALPHA_CONTEXTS.find(c => c.id === id))
        .filter(Boolean)
        .map(c => `- ${c!.name}: ${c!.description}`)
        .join('\n');

      parts.push(`\n## Alpha Contexts:\n${contexts}`);
    }

    // Add custom flags
    if (this.config.customFlags.length > 0) {
      parts.push(`\n## Custom Flags: ${this.config.customFlags.join(' ')}`);
    }

    return parts.join('\n');
  }

  // Reset configuration
  reset(): void {
    this.config = { ...DEFAULT_SUPERCLAUDE_CONFIG };
  }

  // Get current configuration
  getConfig(): SuperClaudeConfig {
    return { ...this.config };
  }

  // Load configuration
  loadConfig(config: SuperClaudeConfig): void {
    this.config = { ...config };
  }

  // Get optimal flags for a specific task
  getOptimalFlags(taskType: string): string[] {
    switch (taskType) {
      case 'analysis':
        return ['--ultrathink', '--seq', '--serena'];
      case 'ui':
        return ['--magic', '--play'];
      case 'refactoring':
        return ['--morph', '--validate'];
      case 'testing':
        return ['--play', '--seq'];
      case 'documentation':
        return ['--c7', '--serena'];
      case 'performance':
        return ['--seq', '--think-hard'];
      default:
        return ['--think', '--validate'];
    }
  }
}

// Export singleton instance
export const superClaudeManager = new SuperClaudeWorkflowManager();