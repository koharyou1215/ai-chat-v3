# Type Definitions

## `Message`

```typescript
export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  character_id?: string;
  character_name?: string;
  timestamp: string;
  edited?: boolean;
  edited_at?: string;
  regenerated?: boolean;
  voice_url?: string;
  attachments?: MessageAttachment[];
  metadata?: MessageMetadata;
  reactions?: MessageReaction[];
  memo?: string;
  is_bookmarked?: boolean;
  is_deleted?: boolean;
  parent_message_id?: string;
  branch_messages?: Message[];
  importance?: number;
  pinned?: boolean;
  embedding?: number[];
}
```

## `Tracker`

```typescript
export type TrackerType = 'numeric' | 'state' | 'boolean' | 'text';

export interface BaseTracker {
  name: string;
  display_name: string;
  type: TrackerType;
  category: TrackerCategory;
  persistent: boolean;
  description: string;
  current_value?: TrackerValue;
  visible?: boolean;
  editable?: boolean;
}

// ... other tracker types (Numeric, State, Boolean, Text)
```

## `ChatSession`

```typescript
export interface ChatSession {
  id: string;
  character_id: string;
  persona_id: string;
  character: Character;
  persona: Persona;
  messages: Message[];
  tracker_set: TrackerSet;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  title?: string;
  summary?: string;
  is_pinned?: boolean;
  is_archived?: boolean;
  metadata?: ChatMetadata;
  conversation_manager_data?: any;
}
```

## `MemoryCard`

```typescript
export interface MemoryCard {
  id: string;
  session_id: string;
  character_id?: string;
  original_message_id: string;
  original_content: string;
  title: string;
  summary: string;
  keywords: string[];
  category: MemoryCategory;
  importance: number;
  confidence: number;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  is_pinned: boolean;
  is_hidden: boolean;
  user_notes?: string;
  auto_tags: string[];
  emotion_tags?: string[];
  context_tags?: string[];
}
```
