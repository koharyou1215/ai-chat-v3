'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { SuperClaudePersona } from '@/types/superclaude.types';

interface SuperClaudePersonaEditorProps {
  persona?: SuperClaudePersona;
  onSave?: (persona: SuperClaudePersona) => void;
  onCancel?: () => void;
}

export function SuperClaudePersonaEditor({ persona, onSave, onCancel }: SuperClaudePersonaEditorProps) {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Persona Editor</h2>
      <p className="text-muted-foreground">Persona editor implementation coming soon...</p>
    </Card>
  );
}