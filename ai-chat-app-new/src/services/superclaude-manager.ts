import {
  SuperClaudeCommand,
  SuperClaudePersona,
  CommandPreset,
  SuperClaudeContext,
  CommandHistory,
  BUILTIN_COMMANDS,
  BUILTIN_PERSONAS,
  COMMAND_PRESETS
} from '@/types/superclaude.types';

export class SuperClaudeManager {
  private static instance: SuperClaudeManager;
  private commands: Map<string, SuperClaudeCommand> = new Map();
  private personas: Map<string, SuperClaudePersona> = new Map();
  private presets: Map<string, CommandPreset> = new Map();
  private context: SuperClaudeContext = {
    activeCommands: [],
    flags: [],
    variables: {},
    history: []
  };

  private constructor() {
    this.initializeBuiltins();
    this.loadCustomItems();
  }

  static getInstance(): SuperClaudeManager {
    if (!SuperClaudeManager.instance) {
      SuperClaudeManager.instance = new SuperClaudeManager();
    }
    return SuperClaudeManager.instance;
  }

  private initializeBuiltins() {
    // Load built-in commands
    BUILTIN_COMMANDS.forEach(cmd => {
      this.commands.set(cmd.id, cmd);
    });

    // Load built-in personas
    BUILTIN_PERSONAS.forEach(persona => {
      this.personas.set(persona.id, persona);
    });

    // Load presets
    COMMAND_PRESETS.forEach(preset => {
      this.presets.set(preset.id, preset);
    });
  }

  private loadCustomItems() {
    // Load custom commands from localStorage
    const customCommands = this.getFromStorage<SuperClaudeCommand[]>('superclaude_commands') || [];
    customCommands.forEach(cmd => {
      if (!cmd.isBuiltin) {
        this.commands.set(cmd.id, cmd);
      }
    });

    // Load custom personas from localStorage
    const customPersonas = this.getFromStorage<SuperClaudePersona[]>('superclaude_personas') || [];
    customPersonas.forEach(persona => {
      if (!persona.isBuiltin) {
        this.personas.set(persona.id, persona);
      }
    });

    // Load saved context
    const savedContext = this.getFromStorage<Partial<SuperClaudeContext>>('superclaude_context');
    if (savedContext) {
      this.context = {
        ...this.context,
        ...savedContext,
        history: savedContext.history || []
      };
    }
  }

  private saveToStorage<T>(key: string, data: T) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
    }
  }

  private getFromStorage<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Failed to load ${key}:`, error);
      return null;
    }
  }

  // Command Management
  getAllCommands(): SuperClaudeCommand[] {
    return Array.from(this.commands.values());
  }

  getCommand(id: string): SuperClaudeCommand | undefined {
    return this.commands.get(id);
  }

  getCommandByName(command: string): SuperClaudeCommand | undefined {
    return Array.from(this.commands.values()).find(cmd => cmd.command === command);
  }

  addCommand(command: SuperClaudeCommand): void {
    if (command.isBuiltin) {
      throw new Error('Cannot modify built-in commands');
    }
    
    command.id = command.id || `custom-${Date.now()}`;
    command.createdAt = command.createdAt || new Date();
    command.updatedAt = new Date();
    
    this.commands.set(command.id, command);
    this.saveCustomCommands();
  }

  updateCommand(id: string, updates: Partial<SuperClaudeCommand>): void {
    const command = this.commands.get(id);
    if (!command) {
      throw new Error('Command not found');
    }
    if (command.isBuiltin) {
      throw new Error('Cannot modify built-in commands');
    }

    const updated = {
      ...command,
      ...updates,
      id: command.id, // Preserve ID
      isBuiltin: false, // Ensure it stays custom
      updatedAt: new Date()
    };

    this.commands.set(id, updated);
    this.saveCustomCommands();
  }

  deleteCommand(id: string): void {
    const command = this.commands.get(id);
    if (!command) {
      throw new Error('Command not found');
    }
    if (command.isBuiltin) {
      throw new Error('Cannot delete built-in commands');
    }

    this.commands.delete(id);
    this.saveCustomCommands();
  }

  private saveCustomCommands() {
    const customCommands = Array.from(this.commands.values()).filter(cmd => !cmd.isBuiltin);
    this.saveToStorage('superclaude_commands', customCommands);
  }

  // Persona Management
  getAllPersonas(): SuperClaudePersona[] {
    return Array.from(this.personas.values());
  }

  getPersona(id: string): SuperClaudePersona | undefined {
    return this.personas.get(id);
  }

  addPersona(persona: SuperClaudePersona): void {
    if (persona.isBuiltin) {
      throw new Error('Cannot modify built-in personas');
    }

    persona.id = persona.id || `custom-persona-${Date.now()}`;
    persona.createdAt = persona.createdAt || new Date();
    persona.updatedAt = new Date();

    this.personas.set(persona.id, persona);
    this.saveCustomPersonas();
  }

  updatePersona(id: string, updates: Partial<SuperClaudePersona>): void {
    const persona = this.personas.get(id);
    if (!persona) {
      throw new Error('Persona not found');
    }
    if (persona.isBuiltin) {
      throw new Error('Cannot modify built-in personas');
    }

    const updated = {
      ...persona,
      ...updates,
      id: persona.id,
      isBuiltin: false,
      updatedAt: new Date()
    };

    this.personas.set(id, updated);
    this.saveCustomPersonas();
  }

  deletePersona(id: string): void {
    const persona = this.personas.get(id);
    if (!persona) {
      throw new Error('Persona not found');
    }
    if (persona.isBuiltin) {
      throw new Error('Cannot delete built-in personas');
    }

    this.personas.delete(id);
    this.saveCustomPersonas();
  }

  setActivePersona(id: string | null): void {
    if (id === null) {
      this.context.activePersona = undefined;
    } else {
      const persona = this.personas.get(id);
      if (!persona) {
        throw new Error('Persona not found');
      }
      this.context.activePersona = persona;
      
      // Apply persona's auto flags
      if (persona.autoFlags) {
        this.context.flags = [...new Set([...this.context.flags, ...persona.autoFlags])];
      }
    }
    this.saveContext();
  }

  private saveCustomPersonas() {
    const customPersonas = Array.from(this.personas.values()).filter(p => !p.isBuiltin);
    this.saveToStorage('superclaude_personas', customPersonas);
  }

  // Preset Management
  getAllPresets(): CommandPreset[] {
    return Array.from(this.presets.values());
  }

  getPreset(id: string): CommandPreset | undefined {
    return this.presets.get(id);
  }

  applyPreset(id: string): void {
    const preset = this.presets.get(id);
    if (!preset) {
      throw new Error('Preset not found');
    }

    const commands = preset.commands
      .map(cmdId => this.commands.get(cmdId))
      .filter(cmd => cmd !== undefined) as SuperClaudeCommand[];

    this.context.activeCommands = commands;
    this.saveContext();
  }

  // Context Management
  getContext(): SuperClaudeContext {
    return { ...this.context };
  }

  setFlags(flags: string[]): void {
    this.context.flags = flags;
    this.saveContext();
  }

  addFlag(flag: string): void {
    if (!this.context.flags.includes(flag)) {
      this.context.flags.push(flag);
      this.saveContext();
    }
  }

  removeFlag(flag: string): void {
    this.context.flags = this.context.flags.filter(f => f !== flag);
    this.saveContext();
  }

  setVariable(key: string, value: any): void {
    this.context.variables[key] = value;
    this.saveContext();
  }

  clearVariables(): void {
    this.context.variables = {};
    this.saveContext();
  }

  addToHistory(command: string, result?: string, success: boolean = true): void {
    this.context.history.push({
      command,
      timestamp: new Date(),
      result,
      success
    });

    // Keep only last 100 entries
    if (this.context.history.length > 100) {
      this.context.history = this.context.history.slice(-100);
    }

    this.saveContext();
  }

  private saveContext() {
    this.saveToStorage('superclaude_context', {
      activePersona: this.context.activePersona,
      flags: this.context.flags,
      variables: this.context.variables,
      history: this.context.history
    });
  }

  // Command Execution
  executeCommand(commandStr: string, variables: Record<string, any> = {}): string {
    // Parse command and extract parameters
    const [cmdName, ...args] = commandStr.split(' ');
    const command = this.getCommandByName(cmdName);

    if (!command) {
      throw new Error(`Command not found: ${cmdName}`);
    }

    // Merge variables
    const allVariables = {
      ...this.context.variables,
      ...variables
    };

    // Parse arguments into variables
    if (command.parameters) {
      command.parameters.forEach((param, index) => {
        if (args[index]) {
          allVariables[param.name] = args[index];
        } else if (param.required && !allVariables[param.name]) {
          throw new Error(`Required parameter missing: ${param.name}`);
        }
      });
    }

    // Replace variables in template
    let result = command.template;
    Object.entries(allVariables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, String(value));
    });

    // Apply flags
    const flags = [...new Set([...this.context.flags, ...(command.flags || [])])];
    if (flags.length > 0) {
      result = `${result}\n\nActive Flags: ${flags.join(' ')}`;
    }

    // Apply active persona context
    if (this.context.activePersona) {
      if (this.context.activePersona.systemPrompt) {
        result = `${this.context.activePersona.systemPrompt}\n\n${result}`;
      }
      if (this.context.activePersona.contextPrompt) {
        result = `${result}\n\n${this.context.activePersona.contextPrompt}`;
      }
    }

    // Add to history
    this.addToHistory(commandStr, result, true);

    return result;
  }

  // Quick command builder
  buildQuickCommand(
    task: string,
    options: {
      analysis?: 'think' | 'think-hard' | 'ultrathink';
      mode?: 'code' | 'debug' | 'refactor' | 'review' | 'research';
      flags?: string[];
      persona?: string;
    } = {}
  ): string {
    let template = `Task: ${task}\n`;

    // Add analysis level
    if (options.analysis) {
      const analysisFlags = {
        'think': ['--think', '--seq'],
        'think-hard': ['--think-hard', '--introspect', '--seq'],
        'ultrathink': ['--ultrathink', '--seq', '--morph']
      };
      options.flags = [...(options.flags || []), ...analysisFlags[options.analysis]];
    }

    // Add mode-specific configuration
    if (options.mode) {
      const modeConfig = {
        'code': '🎭 Implementation Mode\n⚠️ Complete implementation required',
        'debug': '🎭 Debug Mode\n⚠️ Root cause analysis required',
        'refactor': '🎭 Refactor Mode\n⚠️ Preserve functionality',
        'review': '🎭 Review Mode\n⚠️ Comprehensive analysis',
        'research': '🎭 Research Mode\n⚠️ Evidence required'
      };
      template += `\n${modeConfig[options.mode]}\n`;
    }

    // Add flags
    if (options.flags && options.flags.length > 0) {
      template += `\nFlags: ${options.flags.join(' ')}`;
    }

    // Apply persona if specified
    if (options.persona) {
      const persona = this.getPersona(options.persona);
      if (persona) {
        this.setActivePersona(options.persona);
        if (persona.systemPrompt) {
          template = `${persona.systemPrompt}\n\n${template}`;
        }
      }
    }

    return template;
  }

  // Export/Import functionality
  exportConfig(): string {
    const config = {
      commands: Array.from(this.commands.values()).filter(cmd => !cmd.isBuiltin),
      personas: Array.from(this.personas.values()).filter(p => !p.isBuiltin),
      context: this.context
    };
    return JSON.stringify(config, null, 2);
  }

  importConfig(configStr: string): void {
    try {
      const config = JSON.parse(configStr);
      
      // Import custom commands
      if (config.commands) {
        config.commands.forEach((cmd: SuperClaudeCommand) => {
          if (!cmd.isBuiltin) {
            this.commands.set(cmd.id, cmd);
          }
        });
        this.saveCustomCommands();
      }

      // Import custom personas
      if (config.personas) {
        config.personas.forEach((persona: SuperClaudePersona) => {
          if (!persona.isBuiltin) {
            this.personas.set(persona.id, persona);
          }
        });
        this.saveCustomPersonas();
      }

      // Import context (optional)
      if (config.context) {
        this.context = {
          ...this.context,
          ...config.context
        };
        this.saveContext();
      }
    } catch (error) {
      throw new Error(`Failed to import config: ${error}`);
    }
  }
}