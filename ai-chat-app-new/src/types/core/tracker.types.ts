// src/types/core/tracker.types.ts

import { BaseEntity, UUID, Timestamp, WithMetadata } from './base.types';

/**
 * 統合トラッカー定義
 */
export interface TrackerDefinition extends BaseEntity {
  name: string;
  display_name: string;
  description: string;
  category: TrackerCategory;
  type: TrackerType;
  config: TrackerConfig;
  rules?: TrackerRules;
  visualization?: TrackerVisualization;
}

export type TrackerCategory = 'relationship' | 'status' | 'condition' | 'emotion' | 'progress';

export type TrackerType = 'numeric' | 'state' | 'boolean' | 'text' | 'composite';

export type TrackerConfig = 
  | NumericTrackerConfig
  | StateTrackerConfig
  | BooleanTrackerConfig
  | TextTrackerConfig
  | CompositeTrackerConfig;

export interface NumericTrackerConfig {
  type: 'numeric';
  initial_value: number;
  min_value: number;
  max_value: number;
  step: number;
  unit?: string;
  display_type?: 'number' | 'stars' | 'bar' | 'gauge';
  milestones?: Array<{
    value: number;
    label: string;
    effect?: string;
  }>;
}

export interface StateTrackerConfig {
  type: 'state';
  initial_state: string;
  possible_states: StateDefinition[];
  transitions?: StateTransition[];
}

export interface StateDefinition {
  id: string;
  label: string;
  color?: string;
  icon?: string;
  description?: string;
}

export interface StateTransition {
  from: string;
  to: string;
  condition?: string;
  probability?: number;
}

export interface BooleanTrackerConfig {
    type: 'boolean';
    initial_value: boolean;
    true_label?: string;
    false_label?: string;
    true_color?: string;
    false_color?: string;
}

export interface TextTrackerConfig {
    type: 'text';
    initial_value: string;
    max_length?: number;
    multiline?: boolean;
    placeholder?: string;
}

export interface CompositeTrackerConfig {
    type: 'composite';
    // Define composite tracker config if needed
}

export interface TrackerRules {
  auto_update: boolean;
  update_triggers: UpdateTrigger[];
  constraints?: TrackerConstraint[];
  dependencies?: TrackerDependency[];
}

export interface UpdateTrigger {
  type: 'keyword' | 'emotion' | 'time' | 'message_count' | 'custom';
  condition: unknown;
  action: UpdateAction;
}

export interface UpdateAction {
  operation: 'set' | 'increment' | 'decrement' | 'multiply';
  value: unknown;
  reason?: string;
}

export interface TrackerConstraint {
  type: 'min' | 'max' | 'range' | 'enum';
  value: unknown;
}

export interface TrackerDependency {
  tracker_id: UUID;
  condition: string;
  action: 'enable' | 'disable' | 'update';
}

export interface TrackerVisualization {
  display_type: 'bar' | 'gauge' | 'text' | 'icon' | 'chart';
  show_in_sidebar: boolean;
  show_in_chat: boolean;
  animate_changes: boolean;
  custom_component?: string;
}

/**
 * トラッカーインスタンス（実行時）
 */
export interface TrackerInstance extends BaseEntity {
  definition_id: UUID;
  session_id: UUID;
  character_id: UUID;
  current_value: unknown;
  history: TrackerHistoryEntry[];
  last_updated: Timestamp;
  metadata: Record<string, unknown>;
}

export interface TrackerState {
  id: UUID;
  definition_id: UUID;
  value: unknown;
  history: TrackerHistoryEntry[];
}

export interface TrackerHistoryEntry extends BaseEntity, WithMetadata {
  timestamp: Timestamp;
  value: unknown;
  changed_by: 'user' | 'ai' | 'system';
  reason?: string;
}

export type NumericTrackerValue = Record<string, never>;
// export interface NumericTrackerValue {}

export type StateTrackerValue = Record<string, never>;
// export interface StateTrackerValue {}
