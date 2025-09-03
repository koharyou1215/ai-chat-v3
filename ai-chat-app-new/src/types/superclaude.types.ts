// SuperClaude command and persona types

// SuperClaude Commands
export interface SuperClaudeCommand {
  id: string;
  name: string;
  command: string; // e.g., "/sg:think", "/sg:code", etc.
  category: 'analysis' | 'code' | 'research' | 'workflow' | 'ai-mode' | 'custom';
  description: string;
  template: string; // The actual prompt template
  parameters?: CommandParameter[];
  examples?: CommandExample[];
  flags?: string[]; // e.g., ["--think", "--morph", "--seq"]
  isBuiltin?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CommandParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  description: string;
  required?: boolean;
  default?: any;
  options?: string[]; // for select/multiselect types
}

export interface CommandExample {
  input: string;
  output: string;
  description?: string;
}

// Enhanced Persona with SuperClaude integration
export interface SuperClaudePersona {
  id: string;
  name: string;
  description: string;
  role?: string;
  
  // SuperClaude specific
  defaultCommands?: string[]; // Default commands for this persona
  autoFlags?: string[]; // Auto-applied flags
  specialization?: string; // e.g., "backend", "frontend", "devops"
  
  // Behavioral settings
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  
  // Custom prompts
  systemPrompt?: string;
  contextPrompt?: string;
  
  // NSFW settings (from existing system)
  nsfw_persona?: {
    consent_level?: string;
    preferred_scenarios?: string[];
    kinks?: string[];
    limits?: string[];
  };
  
  isBuiltin?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Command Presets - Common workflow combinations
export interface CommandPreset {
  id: string;
  name: string;
  description: string;
  commands: string[]; // List of command IDs
  category: 'development' | 'analysis' | 'creative' | 'custom';
  icon?: string;
}

// SuperClaude Session Context
export interface SuperClaudeContext {
  activePersona?: SuperClaudePersona;
  activeCommands: SuperClaudeCommand[];
  flags: string[];
  variables: Record<string, any>; // Dynamic variables for templates
  history: CommandHistory[];
}

export interface CommandHistory {
  command: string;
  timestamp: Date;
  result?: string;
  success: boolean;
}

// Built-in Commands Library
export const BUILTIN_COMMANDS: SuperClaudeCommand[] = [
  // Analysis Commands
  {
    id: 'sg-think',
    name: 'Deep Think',
    command: '/sg:think',
    category: 'analysis',
    description: 'Structured multi-step analysis with ~4K tokens',
    template: `Task: {task}
Flags: --think --seq
🎭 Auto-Persona: Analysis Expert
⚠️ Critical Rules:
- Structured analysis required
- Evidence-based reasoning
- Multi-perspective evaluation`,
    parameters: [
      {
        name: 'task',
        type: 'string',
        description: 'The task or problem to analyze',
        required: true
      }
    ],
    flags: ['--think', '--seq'],
    isBuiltin: true
  },
  {
    id: 'sg-ultrathink',
    name: 'Ultra Think',
    command: '/sg:ultrathink',
    category: 'analysis',
    description: 'Maximum depth analysis with ~32K tokens',
    template: `Task: {task}
Flags: --ultrathink --seq --morph
🎭 Auto-Persona: System Architect
⚠️ Critical Rules:
- Maximum depth analysis
- System-wide impact assessment
- Long-term perspective evaluation`,
    parameters: [
      {
        name: 'task',
        type: 'string',
        description: 'Complex system or architectural analysis',
        required: true
      }
    ],
    flags: ['--ultrathink', '--seq', '--morph'],
    isBuiltin: true
  },
  
  // Code Commands
  {
    id: 'sg-code',
    name: 'Code Implementation',
    command: '/sg:code',
    category: 'code',
    description: 'Implement feature with best practices',
    template: `Task: {feature}
Language/Framework: {language}
Flags: --morph --validate
🎭 Auto-Persona: {language} Expert
⚠️ Critical Rules:
- Complete implementation required
- Follow existing patterns
- Include error handling
- Write clean, maintainable code`,
    parameters: [
      {
        name: 'feature',
        type: 'string',
        description: 'Feature to implement',
        required: true
      },
      {
        name: 'language',
        type: 'select',
        description: 'Programming language',
        required: true,
        options: ['TypeScript', 'Python', 'JavaScript', 'React', 'Vue', 'Go', 'Rust']
      }
    ],
    flags: ['--morph', '--validate'],
    isBuiltin: true
  },
  {
    id: 'sg-refactor',
    name: 'Refactor Code',
    command: '/sg:refactor',
    category: 'code',
    description: 'Refactor code with pattern improvements',
    template: `Task: Refactor {target}
Flags: --loop --iterations 3 --morph --validate
🎭 Auto-Persona: Refactoring Expert
⚠️ Critical Rules:
- Preserve functionality
- Improve code quality
- Apply SOLID principles
- Update tests if needed`,
    parameters: [
      {
        name: 'target',
        type: 'string',
        description: 'Code or module to refactor',
        required: true
      }
    ],
    flags: ['--loop', '--iterations', '3', '--morph', '--validate'],
    isBuiltin: true
  },
  {
    id: 'sg-debug',
    name: 'Debug & Fix',
    command: '/sg:debug',
    category: 'code',
    description: 'Debug and fix issues systematically',
    template: `Task: Debug {issue}
Flags: --think-hard --introspect --seq
🎭 Auto-Persona: Debugging Expert
⚠️ Critical Rules:
- Root cause analysis first
- Systematic investigation
- Never skip validation
- Document findings`,
    parameters: [
      {
        name: 'issue',
        type: 'string',
        description: 'Issue or error to debug',
        required: true
      }
    ],
    flags: ['--think-hard', '--introspect', '--seq'],
    isBuiltin: true
  },
  
  // Research Commands
  {
    id: 'sg-research',
    name: 'Research Topic',
    command: '/sg:research',
    category: 'research',
    description: 'Comprehensive research with sources',
    template: `Research: {topic}
Depth: {depth}
Flags: --c7 --seq
🎭 Auto-Persona: Research Analyst
Requirements:
- Gather from multiple sources
- Verify information accuracy
- Provide citations
- Summarize key findings`,
    parameters: [
      {
        name: 'topic',
        type: 'string',
        description: 'Topic to research',
        required: true
      },
      {
        name: 'depth',
        type: 'select',
        description: 'Research depth',
        required: false,
        default: 'standard',
        options: ['quick', 'standard', 'comprehensive']
      }
    ],
    flags: ['--c7', '--seq'],
    isBuiltin: true
  },
  
  // Workflow Commands
  {
    id: 'sg-plan',
    name: 'Project Planning',
    command: '/sg:plan',
    category: 'workflow',
    description: 'Create detailed project plan',
    template: `Project: {project}
Scope: {scope}
Flags: --task-manage --delegate
🎭 Auto-Persona: Project Manager
Deliverables:
- Task breakdown structure
- Timeline estimation
- Resource requirements
- Risk assessment`,
    parameters: [
      {
        name: 'project',
        type: 'string',
        description: 'Project description',
        required: true
      },
      {
        name: 'scope',
        type: 'select',
        description: 'Project scope',
        required: false,
        default: 'module',
        options: ['file', 'module', 'project', 'system']
      }
    ],
    flags: ['--task-manage', '--delegate'],
    isBuiltin: true
  },
  {
    id: 'sg-review',
    name: 'Code Review',
    command: '/sg:review',
    category: 'workflow',
    description: 'Comprehensive code review',
    template: `Review: {target}
Focus: {focus}
Flags: --think --validate
🎭 Auto-Persona: Code Reviewer
Review Checklist:
- Code quality and style
- Security vulnerabilities
- Performance issues
- Test coverage
- Documentation`,
    parameters: [
      {
        name: 'target',
        type: 'string',
        description: 'Code to review',
        required: true
      },
      {
        name: 'focus',
        type: 'multiselect',
        description: 'Review focus areas',
        required: false,
        options: ['security', 'performance', 'quality', 'architecture', 'testing']
      }
    ],
    flags: ['--think', '--validate'],
    isBuiltin: true
  },
  
  // AI Mode Commands
  {
    id: 'sg-brainstorm',
    name: 'Brainstorm Ideas',
    command: '/sg:brainstorm',
    category: 'ai-mode',
    description: 'Creative brainstorming session',
    template: `Topic: {topic}
Flags: --brainstorm
🎭 Auto-Persona: Creative Thinker
Process:
- Explore multiple perspectives
- Generate diverse ideas
- Challenge assumptions
- Synthesize insights`,
    parameters: [
      {
        name: 'topic',
        type: 'string',
        description: 'Topic to brainstorm',
        required: true
      }
    ],
    flags: ['--brainstorm'],
    isBuiltin: true
  },
  {
    id: 'sg-optimize',
    name: 'Optimize Performance',
    command: '/sg:optimize',
    category: 'ai-mode',
    description: 'Performance optimization analysis',
    template: `Target: {target}
Metric: {metric}
Flags: --orchestrate --uc
🎭 Auto-Persona: Performance Engineer
Optimization Goals:
- Identify bottlenecks
- Measure improvements
- Balance trade-offs
- Document changes`,
    parameters: [
      {
        name: 'target',
        type: 'string',
        description: 'System or code to optimize',
        required: true
      },
      {
        name: 'metric',
        type: 'select',
        description: 'Optimization metric',
        required: false,
        default: 'speed',
        options: ['speed', 'memory', 'bandwidth', 'battery', 'all']
      }
    ],
    flags: ['--orchestrate', '--uc'],
    isBuiltin: true
  }
];

// Built-in Personas
export const BUILTIN_PERSONAS: SuperClaudePersona[] = [
  {
    id: 'backend-expert',
    name: 'Backend Developer',
    description: 'Expert in server-side development, APIs, and databases',
    specialization: 'backend',
    defaultCommands: ['/sg:code', '/sg:debug', '/sg:optimize'],
    autoFlags: ['--morph', '--validate'],
    systemPrompt: 'You are an expert backend developer with deep knowledge of server architecture, databases, and API design.',
    isBuiltin: true
  },
  {
    id: 'frontend-expert',
    name: 'Frontend Developer',
    description: 'Specialist in UI/UX, React, and modern web development',
    specialization: 'frontend',
    defaultCommands: ['/sg:code', '/sg:refactor'],
    autoFlags: ['--magic', '--validate'],
    systemPrompt: 'You are a frontend development expert specializing in React, TypeScript, and modern UI/UX patterns.',
    isBuiltin: true
  },
  {
    id: 'devops-expert',
    name: 'DevOps Engineer',
    description: 'Infrastructure, CI/CD, and deployment specialist',
    specialization: 'devops',
    defaultCommands: ['/sg:plan', '/sg:optimize'],
    autoFlags: ['--orchestrate', '--validate'],
    systemPrompt: 'You are a DevOps engineer expert in infrastructure, automation, and deployment strategies.',
    isBuiltin: true
  },
  {
    id: 'security-expert',
    name: 'Security Analyst',
    description: 'Security auditing and vulnerability assessment',
    specialization: 'security',
    defaultCommands: ['/sg:review', '/sg:debug'],
    autoFlags: ['--think-hard', '--validate'],
    systemPrompt: 'You are a security expert focused on identifying vulnerabilities and implementing secure coding practices.',
    isBuiltin: true
  },
  {
    id: 'architect',
    name: 'System Architect',
    description: 'System design and architectural decisions',
    specialization: 'architecture',
    defaultCommands: ['/sg:ultrathink', '/sg:plan'],
    autoFlags: ['--ultrathink', '--seq'],
    systemPrompt: 'You are a system architect with expertise in designing scalable, maintainable software systems.',
    isBuiltin: true
  }
];

// Command Presets
export const COMMAND_PRESETS: CommandPreset[] = [
  {
    id: 'full-stack-dev',
    name: 'Full Stack Development',
    description: 'Complete development workflow',
    commands: ['sg-plan', 'sg-code', 'sg-debug', 'sg-review', 'sg-optimize'],
    category: 'development',
    icon: '🚀'
  },
  {
    id: 'bug-fix',
    name: 'Bug Investigation',
    description: 'Debug and fix issues',
    commands: ['sg-debug', 'sg-think', 'sg-refactor'],
    category: 'development',
    icon: '🐛'
  },
  {
    id: 'analysis-suite',
    name: 'Deep Analysis',
    description: 'Comprehensive analysis tools',
    commands: ['sg-think', 'sg-ultrathink', 'sg-research'],
    category: 'analysis',
    icon: '🔍'
  },
  {
    id: 'creative-session',
    name: 'Creative Session',
    description: 'Brainstorming and ideation',
    commands: ['sg-brainstorm', 'sg-plan'],
    category: 'creative',
    icon: '💡'
  }
];