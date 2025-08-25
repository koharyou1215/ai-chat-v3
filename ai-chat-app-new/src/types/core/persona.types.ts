// src/types/core/persona.types.ts

import { BaseEntity } from './base.types';

export interface Persona extends BaseEntity {
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
}

export type PersonaInput = Omit<Persona, 'id' | 'created_at' | 'updated_at' | 'version'>;

export type PersonaUpdate = Partial<PersonaInput>;
