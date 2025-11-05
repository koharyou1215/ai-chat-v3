// scripts/schemas/persona.schema.ts

import { z } from 'zod';

/**
 * Persona Schema (for manifest generation validation)
 * Made flexible for backward compatibility
 */
export const PersonaFileSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Persona name is required'),
  role: z.string().optional(),
  other_settings: z.string().optional(),
  avatar_path: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  version: z.number().optional(),
}).passthrough(); // Allow additional properties

export type PersonaFile = z.infer<typeof PersonaFileSchema>;

/**
 * Persona Manifest Entry Schema
 */
export const PersonaManifestEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  other_settings: z.string(),
  avatar_path: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  version: z.number(),
});

export type PersonaManifestEntry = z.infer<typeof PersonaManifestEntrySchema>;
