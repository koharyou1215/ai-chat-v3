'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { SuperClaudeCommand } from '@/types/superclaude.types';

interface SuperClaudeCommandEditorProps {
  command?: SuperClaudeCommand;
  onSave?: (command: SuperClaudeCommand) => void;
  onCancel?: () => void;
}

export function SuperClaudeCommandEditor({ command, onSave, onCancel }: SuperClaudeCommandEditorProps) {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Command Editor</h2>
      <p className="text-muted-foreground">Command editor implementation coming soon...</p>
    </Card>
  );
}