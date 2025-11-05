// scripts/schemas/character.schema.ts

import { z } from 'zod';

/**
 * Tracker Definition Schema (flexible for backward compatibility)
 */
const TrackerDefinitionSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(['number', 'boolean', 'string', 'state', 'list', 'numeric']).optional(),
  initial_value: z.union([
    z.number(),
    z.boolean(),
    z.string(),
    z.array(z.string()),
    z.record(z.unknown()), // For complex objects
  ]).optional(),
  possible_states: z.array(z.union([z.string(), z.number()])).optional(),
  min_value: z.number().optional(),
  max_value: z.number().optional(),
  unit: z.string().optional(),
  is_visible: z.boolean().optional(),
}).passthrough(); // Allow additional properties

/**
 * NSFW Profile Schema
 */
const NSFWProfileSchema = z.object({
  persona: z.string().optional(),
  libido_level: z.string().optional(),
  situation: z.string().optional(),
  mental_state: z.string().optional(),
  kinks: z.array(z.string()).optional(),
});

/**
 * Color Theme Schema
 */
const ColorThemeSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  gradient: z.string().optional(),
});

/**
 * Character Schema (for manifest generation validation)
 *
 * This schema validates the minimum required fields for a character JSON file.
 * Made flexible for backward compatibility with existing character files.
 */
export const CharacterFileSchema = z.object({
  // Core fields (only name is strictly required)
  id: z.string().optional(),
  name: z.string().min(1, 'Character name is required'),
  age: z.string().optional(),
  occupation: z.string().optional(),
  catchphrase: z.string().optional(),

  // Personality fields (all optional for backward compatibility)
  personality: z.string().optional(),
  external_personality: z.string().optional(),
  internal_personality: z.string().optional(),
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),

  // Preferences
  hobbies: z.array(z.string()).optional(),
  likes: z.array(z.string()).optional(),
  dislikes: z.array(z.string()).optional(),

  // Appearance (allow null for backward compatibility)
  appearance: z.string().optional(),
  avatar_url: z.string().nullable().optional(),
  background_url: z.string().nullable().optional(),
  background_url_desktop: z.string().nullable().optional(),
  background_url_mobile: z.string().nullable().optional(),
  background_video_url: z.string().nullable().optional(),
  background_video_url_desktop: z.string().nullable().optional(),
  background_video_url_mobile: z.string().nullable().optional(),
  image_prompt: z.string().optional(),
  negative_prompt: z.string().optional(),

  // Dialogue style
  speaking_style: z.string().optional(),
  first_person: z.string().optional(),
  second_person: z.string().optional(),
  verbal_tics: z.array(z.string()).optional(),

  // Background & scenario
  background: z.string().optional(),
  scenario: z.string().optional(),

  // AI settings
  system_prompt: z.string().optional(),
  first_message: z.string().optional(),

  // Metadata (optional for backward compatibility)
  tags: z.array(z.string()).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  version: z.number().optional(),

  // Trackers (flexible validation)
  trackers: z.array(TrackerDefinitionSchema).optional(),

  // Optional fields
  description: z.string().optional(),
  identity: z.string().optional(),
  dialogue_style: z.string().optional(),
  nsfw_profile: NSFWProfileSchema.optional(),
  is_favorite: z.boolean().optional(),
  is_active: z.boolean().optional(),
  color_theme: ColorThemeSchema.optional(),
}).passthrough(); // Allow additional properties for flexibility

export type CharacterFile = z.infer<typeof CharacterFileSchema>;

/**
 * Manifest Entry Schema (minimal info for manifest.json)
 */
export const CharacterManifestEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  filename: z.string(),
});

export type CharacterManifestEntry = z.infer<typeof CharacterManifestEntrySchema>;
