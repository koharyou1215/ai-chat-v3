# DropdownMenu Implementation Extraction

## Missing Imports to Add
```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  RotateCcw,
  MessageSquare,
  RefreshCw,
  Copy,
  ImageIcon,
  Volume2,
  Trash2,
  Edit3
} from "lucide-react";
```

## Missing Action Handler (to be added)
```typescript
// 🔧 Enhanced rollback with better error handling
const handleRollback = useCallback(async () => {
  if (
    window.confirm(
      "この地点まで会話をロールバックしますか？これより後のメッセージは全て削除されます。"
    )
  ) {
    try {
      console.log("🔄 Rollback initiated", {
        messageId: message.id,
        sessionId: message.session_id,
        isGroupChat,
        active_group_session_id,
      });

      if (isGroupChat && message.session_id) {
        // グループチャットの場合
        console.log("📥 Using group rollback for message:", message.id);
        rollbackGroupSession(message.id);
        console.log("✅ Group rollback completed to message:", message.id);
      } else if (!isGroupChat && typeof activeSessionId === "string") {
        // ソロチャットの場合
        console.log("👤 Using solo rollback for message:", message.id);
        rollbackSession(message.id);
        console.log("✅ Solo rollback completed to message:", message.id);
      } else {
        // Fallback: detect session type from message
        console.warn("⚠️ Ambiguous session context, attempting detection...");
        if (message.session_id && groupSessions.has(message.session_id)) {
          console.log(
            "🔍 Detected group session from message, using group rollback"
          );
          rollbackGroupSession(message.id);
        } else if (typeof activeSessionId === "string") {
          console.log("🔍 Fallback to solo rollback");
          rollbackSession(message.id);
        } else {
          throw new Error("Unable to determine session context for rollback");
        }
      }
    } catch (error) {
      console.error("❌ Rollback failed:", error);
      alert(
        `ロールバックに失敗しました: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}, [
  message.id,
  message.session_id,
  rollbackSession,
  rollbackGroupSession,
  isGroupChat,
  active_group_session_id,
  activeSessionId,
  groupSessions,
  sessions,
]);
```

## Missing Store Selectors (to be added)
```typescript
// Missing from current implementation:
const rollbackGroupSession = useAppStore((state) => state.rollbackGroupSession);
const groupSessions = useAppStore((state) => state.groupSessions);
const sessions = useAppStore((state) => state.sessions);
```

## Dynamic Menu Items Generation Logic
```typescript
// ドロップダウンメニューの内容
const dropdownItems = useMemo(() => {
  const items = [];

  if (message.role === "assistant") {
    // アシスタントメッセージ用メニュー項目
    items.push(
      <DropdownMenuItem key="rollback" onClick={handleRollback}>
        <RotateCcw className="h-4 w-4 mr-2" />
        ロールバック
      </DropdownMenuItem>,
      <DropdownMenuItem key="continue" onClick={handleContinue}>
        <MessageSquare className="h-4 w-4 mr-2" />
        続きを生成
      </DropdownMenuItem>,
      <DropdownMenuItem key="regenerate" onClick={handleRegenerate}>
        <RefreshCw className="h-4 w-4 mr-2" />
        再生成
      </DropdownMenuItem>,
      <DropdownMenuItem
        key="copy"
        onClick={() => copyToClipboard(message.content || "")}>
        <Copy className="h-4 w-4 mr-2" />
        コピー
      </DropdownMenuItem>,
      <DropdownMenuItem
        key="image-generate"
        onClick={handleGenerateImage}
        disabled={isGeneratingImage}>
        <ImageIcon
          className={cn("h-4 w-4 mr-2", isGeneratingImage && "animate-pulse")}
        />
        {isGeneratingImage ? "画像生成中..." : "画像を生成"}
      </DropdownMenuItem>,
      <DropdownMenuItem
        key="read-aloud"
        onClick={handleReadAloud}
        disabled={!message.content || !message.content.trim()}>
        <Volume2
          className={cn(
            "h-4 w-4 mr-2",
            isSpeaking && "animate-pulse text-blue-500"
          )}
        />
        {isSpeaking ? "読み上げ中..." : "読み上げ"}
      </DropdownMenuItem>,
      <DropdownMenuItem
        key="delete"
        onClick={handleDelete}
        className="text-red-600">
        <Trash2 className="h-4 w-4 mr-2" />
        削除
      </DropdownMenuItem>
    );
  }

  if (message.role === "user") {
    // ユーザーメッセージ用メニュー項目
    items.push(
      <DropdownMenuItem
        key="copy"
        onClick={() => copyToClipboard(message.content || "")}>
        <Copy className="h-4 w-4 mr-2" />
        コピー
      </DropdownMenuItem>,
      <DropdownMenuItem key="edit" onClick={handleEdit}>
        <Edit3 className="h-4 w-4 mr-2" />
        編集
      </DropdownMenuItem>
    );
  }

  return items;
}, [
  message.role,
  message.content,
  message.id,
  handleRollback,
  handleContinue,
  handleRegenerate,
  handleDelete,
  isSpeaking,
  handleGenerateImage,
  isGeneratingImage,
  handleReadAloud,
  handleEdit,
]);
```

## DropdownMenu UI Component to Replace Current Menu
```typescript
{/* Replace the current inline menu with this DropdownMenu */}
{showActions && (
  <div className="mt-3 flex justify-end">
    <div className="flex items-center gap-1">
      {/* Tracker toggle button (if exists) */}
      {hasTrackers && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowTrackers(!showTrackers)}
          className={cn(
            "h-6 w-6 p-0 hover:bg-white/10 opacity-60 hover:opacity-100",
            showTrackers && "bg-white/10 opacity-100"
          )}>
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform duration-200",
              showTrackers && "rotate-180"
            )}
          />
        </Button>
      )}

      {/* Main action dropdown menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-white/10 opacity-60 hover:opacity-100 transition-all duration-200">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="top"
          className={cn(
            "min-w-[180px] z-50",
            "bg-gray-900/95 border-gray-700",
            "backdrop-blur-sm shadow-2xl",
            "animate-in slide-in-from-top-2 fade-in-0 duration-200"
          )}
          sideOffset={8}
          avoidCollisions={true}
          collisionPadding={16}>
          {dropdownItems}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
)}
```

## Current Implementation to Replace

The current implementation has an inline menu structure starting around line 798:

```typescript
{/* Current inline menu implementation to be replaced */}
{(showMenu || isLatest) && (
  <div className="absolute bottom-0 z-50 flex flex-col gap-0.5 pointer-events-auto">
    {/* Multiple individual buttons */}
    <button onClick={handleCopy}>...</button>
    <button onClick={handleSpeak}>...</button>
    <button onClick={handleEdit}>...</button>
    <button onClick={handleRegenerate}>...</button>
    <button onClick={handleContinue}>...</button>
    <button onClick={handleGenerateImage}>...</button>
    <button onClick={handleDelete}>...</button>
    <button onClick={handleRollback}>...</button>
  </div>
)}
```

This should be completely replaced with the DropdownMenu implementation above.

## Missing Actions to Restore

1. **Rollback Functionality**: The current version is missing the rollback action entirely
2. **Read Aloud Handler**: Needs to be connected properly to the audio playback system
3. **Group Chat Support**: The rollback needs to handle both group and solo sessions

## Integration Notes

- Preserve all existing functionality and styling from current version
- Add the missing store selectors for group sessions and rollback
- Implement the handleRollback function with enhanced error handling
- Replace the inline menu completely with the DropdownMenu structure
- Maintain the current hover/show logic but apply it to the dropdown trigger
- Keep all existing action handlers (regenerate, continue, copy, etc.)