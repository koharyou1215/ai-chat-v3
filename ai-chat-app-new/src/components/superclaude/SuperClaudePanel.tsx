'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Copy,
  Edit,
  Trash2,
  Play,
  Settings,
  Download,
  Upload,
  Command,
  User,
  Sparkles,
  Code,
  Brain,
  Workflow,
  Zap,
  History
} from 'lucide-react';
import { SuperClaudeManager } from '@/services/superclaude-manager';
import {
  SuperClaudeCommand,
  SuperClaudePersona,
  CommandPreset
} from '@/types/superclaude.types';

interface SuperClaudePanelProps {
  onExecuteCommand?: (command: string) => void;
  className?: string;
}

export function SuperClaudePanel({ onExecuteCommand, className }: SuperClaudePanelProps) {
  const manager = SuperClaudeManager.getInstance();
  const [activeTab, setActiveTab] = useState('commands');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommand, setSelectedCommand] = useState<SuperClaudeCommand | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<SuperClaudePersona | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<CommandPreset | null>(null);
  const [commands, setCommands] = useState<SuperClaudeCommand[]>([]);
  const [personas, setPersonas] = useState<SuperClaudePersona[]>([]);
  const [presets, setPresets] = useState<CommandPreset[]>([]);
  const [commandParams, setCommandParams] = useState<Record<string, any>>({});
  const [context, setContext] = useState(manager.getContext());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setCommands(manager.getAllCommands());
    setPersonas(manager.getAllPersonas());
    setPresets(manager.getAllPresets());
    setContext(manager.getContext());
  };

  const handleExecuteCommand = (command: SuperClaudeCommand) => {
    try {
      const result = manager.executeCommand(command.command, commandParams);
      if (onExecuteCommand) {
        onExecuteCommand(result);
      }
      toast.success(`Command executed: ${command.name}`);
      setCommandParams({});
    } catch (error) {
      toast.error(`Failed to execute command: ${error}`);
    }
  };

  const handleApplyPersona = (persona: SuperClaudePersona) => {
    try {
      manager.setActivePersona(persona.id);
      setContext(manager.getContext());
      toast.success(`Persona activated: ${persona.name}`);
    } catch (error) {
      toast.error(`Failed to apply persona: ${error}`);
    }
  };

  const handleApplyPreset = (preset: CommandPreset) => {
    try {
      manager.applyPreset(preset.id);
      setContext(manager.getContext());
      toast.success(`Preset applied: ${preset.name}`);
    } catch (error) {
      toast.error(`Failed to apply preset: ${error}`);
    }
  };

  const handleCopyCommand = (command: SuperClaudeCommand) => {
    const fullCommand = manager.executeCommand(command.command, commandParams);
    navigator.clipboard.writeText(fullCommand);
    toast.success('Command copied to clipboard');
  };

  const handleExportConfig = () => {
    const config = manager.exportConfig();
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'superclaude-config.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Configuration exported');
  };

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = e.target?.result as string;
        manager.importConfig(config);
        loadData();
        toast.success('Configuration imported');
      } catch (error) {
        toast.error(`Failed to import config: ${error}`);
      }
    };
    reader.readAsText(file);
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      'analysis': <Brain className="w-4 h-4" />,
      'code': <Code className="w-4 h-4" />,
      'research': <Search className="w-4 h-4" />,
      'workflow': <Workflow className="w-4 h-4" />,
      'ai-mode': <Sparkles className="w-4 h-4" />,
      'custom': <Zap className="w-4 h-4" />
    };
    return icons[category] || <Command className="w-4 h-4" />;
  };

  const filteredCommands = commands.filter(cmd => {
    // Markdownファイルを除外
    const cmdStr = JSON.stringify(cmd).toLowerCase();
    if (cmdStr.includes('.md') || cmdStr.includes('markdown')) {
      return false;
    }
    
    return cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           cmd.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
           cmd.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredPersonas = personas.filter(persona => {
    // Markdownファイルを除外
    const personaStr = JSON.stringify(persona).toLowerCase();
    if (personaStr.includes('.md') || personaStr.includes('markdown')) {
      return false;
    }
    
    return persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           persona.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Command className="w-5 h-5" />
          SuperClaude Command Center
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportConfig}
            title="Export Configuration"
          >
            <Download className="w-4 h-4" />
          </Button>
          <label htmlFor="import-config" className="cursor-pointer">
            <div className="inline-block">
              <Button
                variant="outline"
                size="sm"
                title="Import Configuration"
                asChild
              >
                <span>
                  <Upload className="w-4 h-4" />
                </span>
              </Button>
            </div>
            <Input
              id="import-config"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportConfig}
            />
          </label>
        </div>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search commands, personas, or presets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="commands">Commands</TabsTrigger>
          <TabsTrigger value="personas">Personas</TabsTrigger>
          <TabsTrigger value="presets">Presets</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="commands" className="mt-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredCommands.map((cmd) => (
                <Card
                  key={cmd.id}
                  className={`p-3 cursor-pointer hover:bg-accent/50 transition-colors ${
                    selectedCommand?.id === cmd.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedCommand(cmd)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(cmd.category)}
                        <span className="font-medium">{cmd.name}</span>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {cmd.command}
                        </code>
                        {cmd.isBuiltin && (
                          <span className="text-xs bg-primary/10 text-primary px-1 py-0.5 rounded">
                            Built-in
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {cmd.description}
                      </p>
                      {cmd.flags && cmd.flags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {cmd.flags.map((flag) => (
                            <span
                              key={flag}
                              className="text-xs bg-secondary px-1 py-0.5 rounded"
                            >
                              {flag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyCommand(cmd);
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExecuteCommand(cmd);
                        }}
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {selectedCommand?.id === cmd.id && cmd.parameters && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      {cmd.parameters.map((param) => (
                        <div key={param.name}>
                          <label htmlFor={param.name} className="text-sm font-medium">
                            {param.name}
                            {param.required && <span className="text-red-500">*</span>}
                          </label>
                          {param.type === 'select' ? (
                            <select
                              id={param.name}
                              className="w-full mt-1 p-2 border rounded"
                              value={commandParams[param.name] || param.default || ''}
                              onChange={(e) =>
                                setCommandParams({
                                  ...commandParams,
                                  [param.name]: e.target.value
                                })
                              }
                            >
                              <option value="">Select...</option>
                              {param.options?.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              id={param.name}
                              type={param.type === 'number' ? 'number' : 'text'}
                              placeholder={param.description}
                              value={commandParams[param.name] || ''}
                              onChange={(e) =>
                                setCommandParams({
                                  ...commandParams,
                                  [param.name]: e.target.value
                                })
                              }
                              className="mt-1"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="personas" className="mt-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredPersonas.map((persona) => (
                <Card
                  key={persona.id}
                  className={`p-3 cursor-pointer hover:bg-accent/50 transition-colors ${
                    context.activePersona?.id === persona.id
                      ? 'ring-2 ring-primary'
                      : ''
                  }`}
                  onClick={() => setSelectedPersona(persona)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{persona.name}</span>
                        {persona.specialization && (
                          <span className="text-xs bg-secondary px-1 py-0.5 rounded">
                            {persona.specialization}
                          </span>
                        )}
                        {persona.isBuiltin && (
                          <span className="text-xs bg-primary/10 text-primary px-1 py-0.5 rounded">
                            Built-in
                          </span>
                        )}
                        {context.activePersona?.id === persona.id && (
                          <span className="text-xs bg-green-500/10 text-green-500 px-1 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {persona.description}
                      </p>
                      {persona.autoFlags && persona.autoFlags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {persona.autoFlags.map((flag) => (
                            <span
                              key={flag}
                              className="text-xs bg-secondary px-1 py-0.5 rounded"
                            >
                              {flag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={
                        context.activePersona?.id === persona.id
                          ? 'default'
                          : 'outline'
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyPersona(persona);
                      }}
                    >
                      {context.activePersona?.id === persona.id
                        ? 'Active'
                        : 'Apply'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="presets" className="mt-4">
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-2 gap-3">
              {presets.map((preset) => (
                <Card
                  key={preset.id}
                  className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleApplyPreset(preset)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{preset.icon}</span>
                    <span className="font-medium">{preset.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {preset.description}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    {preset.commands.length} commands
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {context.history.slice().reverse().map((entry, index) => (
                <Card key={index} className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        <code className="text-sm">{entry.command}</code>
                        <span
                          className={`text-xs px-1 py-0.5 rounded ${
                            entry.success
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-red-500/10 text-red-500'
                          }`}
                        >
                          {entry.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(entry.result || entry.command);
                        toast.success('Copied to clipboard');
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {context.activePersona && (
        <div className="mt-4 p-3 bg-accent/20 rounded">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">
                Active Persona: {context.activePersona.name}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                manager.setActivePersona(null);
                setContext(manager.getContext());
                toast.success('Persona deactivated');
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {context.flags.length > 0 && (
        <div className="mt-2 p-3 bg-accent/20 rounded">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">Active Flags:</span>
            {context.flags.map((flag) => (
              <span
                key={flag}
                className="text-xs bg-secondary px-2 py-1 rounded flex items-center gap-1"
              >
                {flag}
                <button
                  className="ml-1 hover:text-red-500"
                  onClick={() => {
                    manager.removeFlag(flag);
                    setContext(manager.getContext());
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}