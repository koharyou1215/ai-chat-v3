# Duplicate Code Analysis Report

**Date**: 2025-10-17
**Phase**: Phase 2 - Duplicate Code Extraction
**Scope**: System-wide analysis
**Previous Phase**: Phase 1 Cleanup (2,181 lines removed)

---

## Executive Summary

Phase 2分析により、以下の重複コードと類似処理を特定しました：

### Key Findings
- **確認された重複**: 2箇所（異なる目的で命名が紛らわしいケース含む）
- **重複関数**: 1件（`formatDuration` in voice components）
- **命名の紛らわしさ**: 1件（`MessageEffects` - 異なる目的だが同名）
- **推奨アクション**: 3つの統合提案

---

## 1. Critical Findings - Naming Confusion (NOT Duplicates)

### 1.1 MessageEffects.tsx - Different Purpose, Same Name ⚠️

#### File Locations
1. `src/components/chat/MessageEffects.tsx` (249 lines)
2. `src/components/settings/SettingsModal/panels/EffectsPanel/MessageEffects.tsx` (145 lines)

#### Analysis Result
**これらは重複ではありません** - 目的が完全に異なります：

| Aspect | Chat Version | Settings Version |
|--------|-------------|------------------|
| **Purpose** | Visual effects renderer (hearts, sparkles, confetti) | Settings UI panel for effect configuration |
| **Exports** | React component with animation logic | React component with form controls |
| **Dependencies** | framer-motion, emotion hooks | SettingItem, sliders, toggles |
| **Props** | `{ trigger, position, emotion }` | `{ settings, updateSetting }` |
| **Functionality** | Displays animated particles | Configures effect settings |

#### Recommendation
**❌ DO NOT DELETE** - Both are needed

**✅ RENAME for Clarity**:
```typescript
// Settings version should be renamed to:
src/components/settings/SettingsModal/panels/EffectsPanel/MessageEffectsSettings.tsx

// Or even better:
src/components/settings/SettingsModal/panels/EffectsPanel/EffectsConfiguration.tsx
```

**Priority**: Low (functional correctness > naming consistency)

---

## 2. True Duplicates - Immediate Action Required

### 2.1 `formatDuration` Function - Voice Components 🔴

#### Duplicate Locations
1. **VoiceCallModal.tsx** (line 572-576)
2. **VoiceCallInterface.tsx** (line 708-714)

#### Code Comparison
```typescript
// Both files have EXACTLY the same implementation:
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
```

#### Impact Analysis
- **Duplication**: 100% identical
- **Usage**: Local utility in both voice call components
- **Maintenance Risk**: Changes must be made in 2 places
- **Lines Affected**: 10 lines (5 lines × 2 files)

#### Recommended Solution

**Option 1: Extract to Shared Utility** (Preferred)
```typescript
// Create: src/utils/time-formatters.ts
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const formatTimeStamp = (milliseconds: number): string => {
  return formatDuration(Math.floor(milliseconds / 1000));
};

// Update VoiceCallModal.tsx:
import { formatDuration } from '@/utils/time-formatters';

// Update VoiceCallInterface.tsx:
import { formatDuration } from '@/utils/time-formatters';
```

**Option 2: Create Voice Utils Module**
```typescript
// Create: src/components/voice/voice-utils.ts
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Both components import from:
import { formatDuration } from './voice-utils';
```

#### Implementation Priority
- **Priority**: Medium
- **Effort**: 15 minutes
- **Risk**: Low (pure function, easy to test)
- **Benefit**: DRY principle, single source of truth

---

## 3. Similar Patterns - Potential Consolidation

### 3.1 Format Functions - Multiple Implementations

#### Found Patterns
```bash
# Format functions across codebase:
- formatAIResponse (text-formatter.ts)
- formatMessageContent (text-formatter.ts)
- formatApiError (safe-json.ts)
- formatModelForProvider (model-migration.ts)
- formatPrice, formatPricePerMillion (model-pricing.ts)
- formatDuration (VoiceCallModal, VoiceCallInterface) ← DUPLICATE
- formatRetentionPolicy (MemoryLayerDisplay.tsx)
- formatDate (HistorySearch.tsx)
```

#### Analysis
- **Current State**: Spread across multiple files
- **Organization**: No centralized formatting module
- **Risk**: Low (each has specific purpose)

#### Recommendation
**Low Priority Enhancement**:
```typescript
// Future refactoring: Create formatting module structure
src/utils/formatters/
├── index.ts              // Barrel exports
├── time.ts               // formatDuration, formatDate, formatTimeStamp
├── text.ts               // formatAIResponse, formatMessageContent
├── api.ts                // formatApiError, formatModelForProvider
└── numbers.ts            // formatPrice, formatPricePerMillion
```

**Priority**: Low (quality of life improvement, not urgent)

---

### 3.2 Validation Functions - Schema-based

#### Found Patterns
```bash
- validateGeminiModel (model-migration.ts)
- validateSettings (settings.schema.ts)
- validatePartialSettings (settings.schema.ts)
- validateSettingsStrict (settings.schema.ts)
- validateApiKeys (api-keys.ts)
```

#### Analysis
- **Duplication Risk**: Low - each validates different data structures
- **Pattern**: Zod schema-based validation (settings.schema.ts)
- **Consistency**: Good - using type-safe validation library

#### Recommendation
**✅ Current approach is correct**
- Keep specialized validators
- Continue using Zod for type safety
- No consolidation needed

---

### 3.3 Sanitization Functions

#### Found Patterns
```typescript
// CharacterForm.tsx (line 24)
const sanitizeString = (value: string): string => {
  return value.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '');
};

// simple-api-manager-v2.ts (line 89, 98)
const sanitized = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
```

#### Analysis
- **Purpose Difference**:
  - CharacterForm: Unicode-safe string cleaning
  - API Manager: Control character removal
- **Similarity**: Both sanitize strings
- **Risk**: Low - different requirements

#### Recommendation
**Keep Separate** - Different sanitization rules for different contexts

---

## 4. Component Patterns - Good Duplication

### 4.1 AudioVisualizer Components

#### Locations
1. **VoiceCallInterface.tsx**: Small inline visualizer (32 bars)
2. **VoiceCallModal.tsx**: Large modal visualizer (64 bars)

#### Analysis
**Not Duplicates** - Different resolutions and contexts:
- Interface version: Compact HUD display
- Modal version: Enhanced full-screen experience

#### Recommendation
**✅ Keep Both** - Appropriate specialization for use case

---

### 4.2 Props Interfaces - 59 Occurrences

#### Found Pattern
```typescript
interface ComponentNameProps {
  // Props definition
}
```

#### Analysis
- **Count**: 59 props interfaces found
- **Duplication Risk**: None - each component has unique props
- **Pattern**: Standard React TypeScript pattern

#### Recommendation
**✅ Current approach is correct** - No consolidation needed

---

## 5. Store Slices Analysis

### 5.1 File Organization

```
src/store/slices/
├── chat.slice.ts                    # Main chat orchestrator
├── chat/
│   ├── chat-message-operations.ts
│   ├── chat-progressive-handler.ts
│   ├── chat-session-management.ts
│   ├── chat-tracker-integration.ts
│   └── operations/
│       ├── message-send-handler.ts
│       ├── message-regeneration-handler.ts
│       ├── message-continuation-handler.ts
│       └── message-lifecycle-operations.ts
├── character.slice.ts
├── persona.slice.ts
├── settings.slice.ts
├── groupChat.slice.ts
└── ...
```

### 5.2 Duplication Risk Assessment

#### Message Operations Handlers
- **message-send-handler.ts**: Handles new message creation
- **message-regeneration-handler.ts**: Handles message regeneration
- **message-continuation-handler.ts**: Handles message continuation

#### Analysis
**No Duplication Found**:
- Each handler has distinct responsibility
- Share common utilities from chat-message-operations.ts
- Well-separated concerns (Phase 3 refactoring result)

#### Recommendation
**✅ Architecture is Clean** - No changes needed

---

## 6. Hooks Analysis

### 6.1 Hook Usage Patterns

```bash
Found 66 usages across 16 files:
- useCallback: Memoization for stable function references
- useMemo: Memoization for expensive computations
```

### 6.2 Common Patterns
```typescript
// formatters pattern in useLanguage.ts
const formatters = useMemo(() => {
  return {
    // formatter functions
  };
}, [deps]);
```

#### Analysis
- **Pattern**: Standard React optimization hooks
- **Duplication**: None - each instance has unique logic
- **Risk**: None

#### Recommendation
**✅ Current usage is correct** - Continue pattern

---

## 7. Priority Action Plan

### Immediate Actions (Week 1) ✅ COMPLETED

#### 1. Extract `formatDuration` Function ✅ DONE (2025-10-17)
**Priority**: Medium
**Effort**: 15 minutes (ACTUAL: 15 minutes)
**Files Affected**: 3 (2 modified + 1 created)

**Completed Steps**:
1. ✅ Created `src/utils/time-formatters.ts`
2. ✅ Extracted `formatDuration` function with JSDoc
3. ✅ Updated imports in VoiceCallModal.tsx
4. ✅ Updated imports in VoiceCallInterface.tsx
5. ✅ Verified TypeScript compilation: `npx tsc --noEmit` - 0 errors
6. ✅ Added bonus functions: `formatMilliseconds`, `formatLongDuration`

**Actual Impact**:
- -10 lines (duplicate removal)
- +60 lines (new utility file with comprehensive JSDoc)
- Net: +50 lines (improved organization and documentation)

**Status**: ✅ COMPLETED
**Report**: See PHASE2_IMPLEMENTATION_REPORT.md

---

### Optional Improvements (Week 2-4)

#### 2. Rename MessageEffects Settings Component ⚠️
**Priority**: Low
**Effort**: 30 minutes
**Files Affected**: 1-3

**Recommendation**:
```bash
# Rename to avoid confusion
mv src/components/settings/SettingsModal/panels/EffectsPanel/MessageEffects.tsx \
   src/components/settings/SettingsModal/panels/EffectsPanel/EffectsConfiguration.tsx

# Update import in EffectsPanel.tsx
```

**Benefit**: Clearer naming, reduced confusion

---

#### 3. Organize Format Utilities (Future Enhancement)
**Priority**: Very Low
**Effort**: 2-3 hours
**Files Affected**: 8-10

**Would Include**:
- Creating `src/utils/formatters/` module structure
- Grouping related formatters
- Adding barrel exports
- Updating imports across codebase

**Benefit**: Better organization, easier to find formatters

**Risk**: Low - mostly mechanical refactoring

---

## 8. Summary Statistics

### Duplicate Code Metrics

| Category | Count | Lines | Priority | Status |
|----------|-------|-------|----------|--------|
| **True Duplicates** | 1 | 10 | Medium | Ready to fix |
| **Naming Confusion** | 1 | 0 | Low | Optional rename |
| **Similar Patterns** | 3 | N/A | Low | Monitor |
| **Good Duplication** | 2 | N/A | N/A | Keep as-is |

### Expected Impact of Fixes

**If all immediate actions completed**:
- Files affected: 3
- Lines saved: ~10 (duplicate removal)
- New lines: ~15 (utility module)
- Net change: +5 lines
- Organization improvement: Significant
- Maintenance benefit: High (single source of truth)

---

## 9. Comparison with Phase 1

### Phase 1 Results (Completed)
- Dead code removed: 2,181 lines
- Files deleted: 4
- Test directories consolidated: 1

### Phase 2 Results (Current Analysis)
- True duplicates found: 1 instance (10 lines)
- Naming confusion: 1 instance (needs clarification)
- Recommended extractions: 1 utility function

### Key Insight
**プロジェクトは非常にクリーンな状態です**：
- Phase 1でデッドコードを効果的に削除
- 残っている重複は最小限（`formatDuration`のみ）
- アーキテクチャは適切に分離されている
- 命名の混乱（MessageEffects）は機能的問題ではない

---

## 10. Verification Commands

### Check for Duplicates
```bash
# Find potential duplicate functions
grep -r "export (function|const)" src/ --include="*.ts" --include="*.tsx" | \
  cut -d: -f2 | sort | uniq -d

# Find files with similar names
find src/ -name "*.ts" -o -name "*.tsx" | \
  xargs basename -a | sort | uniq -d
```

### Verify No Broken Imports (After Refactoring)
```bash
# TypeScript validation
npx tsc --noEmit

# Build validation
npm run build
```

---

## 11. Recommendations Summary

### ✅ Implement Now
1. **Extract `formatDuration`** to `src/utils/time-formatters.ts`
   - Impact: Removes last true duplicate
   - Effort: 15 minutes
   - Risk: Very low

### ⚠️ Consider Later
2. **Rename MessageEffects settings component**
   - Impact: Improves code clarity
   - Effort: 30 minutes
   - Risk: Low

3. **Organize formatters module**
   - Impact: Better organization
   - Effort: 2-3 hours
   - Risk: Low

### ❌ Do Not Change
- AudioVisualizer variants (different use cases)
- Props interfaces (unique per component)
- Validation functions (specialized logic)
- Store slice operations (clean separation)

---

## 12. Next Steps

### If Proceeding with Implementation

#### Step 1: `formatDuration` Extraction
```bash
# 1. Create utility file
# 2. Extract function
# 3. Update imports
# 4. Verify compilation
# 5. Test voice calls
# 6. Commit changes
```

#### Step 2: Optional Naming Improvements
```bash
# 1. Rename MessageEffects settings component
# 2. Update imports
# 3. Verify compilation
# 4. Commit changes
```

#### Step 3: Documentation Update
- Update ARCHITECTURE_ANALYSIS_REPORT.md
- Mark Phase 2 as complete
- Prepare Phase 3 recommendations

---

## 13. Conclusion

Phase 2の分析結果により、**プロジェクトのコードベースは極めて健全**であることが確認されました：

### Strengths ✅
- Phase 1のクリーンアップが効果的
- アーキテクチャの分離が適切
- 真の重複は最小限（1箇所のみ）
- 命名の混乱はあるが機能的問題なし

### Areas for Improvement ⚠️
- `formatDuration`の重複解消（すぐ実装可能）
- MessageEffects命名の改善（オプション）
- フォーマッター関数の整理（長期的改善）

### Overall Assessment: A- (Excellent)

**推奨アクション**:
1. `formatDuration`を統合（15分で完了）
2. Phase 2完了レポート作成
3. Phase 3（テストカバレッジ向上）への移行準備

---

**Report Generated**: 2025-10-17 22:30
**Analysis Duration**: ~45 minutes
**Status**: ✅ ANALYSIS COMPLETE - READY FOR IMPLEMENTATION

