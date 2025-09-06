// src/types/core/persona.types.ts

import { BaseEntity } from './base.types';

export interface Persona extends Omit<BaseEntity, 'created_at'> {
  name: string;
  description: string;
  role: string;
  traits: string[];
  likes: string[];
  dislikes: string[];
  other_settings: string;
  avatar_url?: string;
  personality?: string;
  speaking_style?: string;
  background?: string;
  color_theme?: string;
  is_active?: boolean;
  is_default?: boolean;
  // 感情分析用プロパティ追加
  preferences?: Record<string, any>;
  // ソート用プロパティ追加 - override BaseEntity's required created_at
  created_at: string;
}

export type PersonaInput = Omit<Persona, 'id' | 'created_at' | 'updated_at' | 'version'>;

export type PersonaUpdate = Partial<PersonaInput>;