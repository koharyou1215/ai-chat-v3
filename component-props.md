# Component Props

## `RichMessageProps`

```typescript
interface RichMessageProps {
  content: string;
  role: 'user' | 'assistant';
  characterColor?: string;
  enableEffects?: boolean;
  typingSpeed?: number;
}
```

## `MobileOptimizedInputProps`

```typescript
interface MobileOptimizedInputProps {
  onSendMessage: (message: string) => void;
  onShowSuggestions: () => void;
  onEnhanceText: () => void;
  className?: string;
}
```

## `CharacterCardProps`

```typescript
interface CharacterCardProps {
  character: Character;
  isSelected?: boolean;
  onSelect: (character: Character) => void;
  onEdit: (character: Character) => void;
  className?: string;
}
```

## `SettingsModalProps`

```typescript
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}
```

## `SuggestionModalProps`

```typescript
interface SuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  isLoading?: boolean;
  title?: string;
}
```
