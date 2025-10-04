# Phase 1 Integration Guide: generatePromptV2

**Date**: 2025-10-04
**Branch**: `refactor/phase1-conversation-manager`
**Status**: ✅ **INTEGRATED - READY FOR TESTING**

---

## 🎯 Integration Complete

`generatePromptV2()` method has been successfully integrated into `ConversationManager` using **Option A (Parallel Validation)** strategy.

---

## 📊 What Was Integrated

### Code Location

**File**: `src/services/memory/conversation-manager.ts`
**Lines**: 758-778
**Method**: `async generatePromptV2(...): Promise<string>`

### Implementation

```typescript
/**
 * プロンプトの生成 (リファクタリング版)
 *
 * 🔒 Phase 1: Section-based implementation
 * Strategy: Character-by-character exact copy via modular sections
 * Purpose: Parallel validation of refactored prompt generation
 */
async generatePromptV2(
  userInput: string,
  character?: Character,
  persona?: Persona,
  systemSettings?: {
    systemPrompts: {
      system?: string;
      jailbreak?: string;
    };
    enableSystemPrompt: boolean;
    enableJailbreakPrompt: boolean;
  }
): Promise<string> {
  return generatePromptRefactored.call(
    this,
    userInput,
    character,
    persona,
    systemSettings
  );
}
```

### Dependencies

✅ **All integrated successfully**:
- `generatePromptRefactored` from `./conversation-manager/integration`
- 10 section classes from `./conversation-manager/sections`
- `PromptBuilder` orchestrator
- Type-safe imports

---

## 🔍 Integration Strategy: Option A

### Why Option A (Parallel Validation)?

**Advantages**:
1. ✅ **Zero Risk**: Original `generatePrompt()` remains unchanged
2. ✅ **Side-by-Side Testing**: Can compare outputs directly
3. ✅ **Easy Rollback**: Just remove V2 method if needed
4. ✅ **Gradual Migration**: Can switch consumers one by one
5. ✅ **Production Safety**: Original code path unaffected

**Workflow**:
```
User Request
    ↓
ConversationManager
    ├─→ generatePrompt()   (Original - Production)
    └─→ generatePromptV2() (Refactored - Testing)
```

Both methods available → Test in parallel → Migrate when confident

---

## 🚀 Usage Examples

### Basic Usage

```typescript
import { ConversationManager } from '@/services/memory/conversation-manager';

// Create manager
const manager = new ConversationManager({
  characterId: 'my-character',
  userId: 'my-user',
});

// Use refactored version
const prompt = await manager.generatePromptV2(
  "Hello, how are you?",
  character,
  persona,
  systemSettings
);

console.log('Generated prompt:', prompt);
```

### Side-by-Side Comparison

```typescript
// Generate with both implementations
const promptOriginal = await manager.generatePrompt(
  userInput,
  character,
  persona,
  systemSettings
);

const promptRefactored = await manager.generatePromptV2(
  userInput,
  character,
  persona,
  systemSettings
);

// Validate exact match
console.log('Match:', promptOriginal === promptRefactored);
console.log('Length V1:', promptOriginal.length);
console.log('Length V2:', promptRefactored.length);

// MD5 comparison
import crypto from 'crypto';
const md5V1 = crypto.createHash('md5').update(promptOriginal).digest('hex');
const md5V2 = crypto.createHash('md5').update(promptRefactored).digest('hex');
console.log('MD5 Match:', md5V1 === md5V2);
```

### Integration in Chat Service

```typescript
// Example: Using V2 for testing in chat service
class ChatService {
  async generateResponse(userInput: string) {
    const manager = this.getConversationManager();

    // Use V2 (refactored) for new sessions
    const useRefactored = this.isTestMode || this.isNewSession;

    const prompt = useRefactored
      ? await manager.generatePromptV2(
          userInput,
          this.currentCharacter,
          this.userPersona,
          this.systemSettings
        )
      : await manager.generatePrompt(
          userInput,
          this.currentCharacter,
          this.userPersona,
          this.systemSettings
        );

    return this.sendToLLM(prompt);
  }
}
```

---

## 📋 Validation Checklist

### Pre-Integration ✅ (Completed)

- [x] All section files created
- [x] PromptBuilder implemented
- [x] Integration layer created
- [x] TypeScript errors: 0
- [x] Import paths corrected
- [x] Type definitions validated

### Post-Integration (Your Tasks)

#### Immediate Validation
- [ ] Can import `ConversationManager`
- [ ] `generatePromptV2()` method exists
- [ ] No runtime errors when calling V2
- [ ] Output is non-empty string

#### Comparison Testing
- [ ] V1 and V2 produce identical output (minimal test)
- [ ] V1 and V2 match with character data
- [ ] V1 and V2 match with full context
- [ ] Character-by-character comparison passes
- [ ] MD5 hashes match

#### Edge Cases
- [ ] Empty user input handling
- [ ] Missing character data
- [ ] Missing persona data
- [ ] Disabled system prompts
- [ ] Special characters in input
- [ ] Unicode characters
- [ ] Very long inputs

#### Performance
- [ ] V2 execution time within acceptable range
- [ ] No memory leaks
- [ ] No excessive console logging
- [ ] Async behavior correct

---

## 🎯 Migration Path

### Phase 1: Testing (Current)

**Status**: Side-by-side validation
**Duration**: 1-2 weeks recommended

```typescript
// Test mode: Use V2 for specific users/sessions
if (config.enablePromptV2Testing && user.isTestUser) {
  return await manager.generatePromptV2(...);
} else {
  return await manager.generatePrompt(...);
}
```

**Metrics to Track**:
- Output match rate (should be 100%)
- Performance difference
- Error rates
- User-reported issues

### Phase 2: Gradual Rollout

**Status**: Waiting for Phase 1 validation
**Duration**: 2-4 weeks

```typescript
// Percentage-based rollout
const useV2 = Math.random() < config.v2RolloutPercentage;
return useV2
  ? await manager.generatePromptV2(...)
  : await manager.generatePrompt(...);
```

**Rollout Schedule**:
- Week 1: 10% of requests
- Week 2: 25% of requests
- Week 3: 50% of requests
- Week 4: 100% of requests

### Phase 3: Full Migration

**Status**: Future
**Duration**: 1 week

```typescript
// Replace method body
async generatePrompt(...): Promise<string> {
  // Redirect to refactored implementation
  return this.generatePromptV2(...);
}

// Deprecate V2 (no longer needed)
/** @deprecated Use generatePrompt() - now uses refactored implementation */
async generatePromptV2(...): Promise<string> {
  return this.generatePrompt(...);
}
```

### Phase 4: Cleanup

**Status**: Future
**Action**: Remove old implementation after 100% confidence

---

## 🚨 Rollback Plan

### If Issues Detected

**Immediate Action**:
```typescript
// Quick rollback: Switch all traffic to V1
const FORCE_USE_V1 = true; // Emergency flag

if (FORCE_USE_V1) {
  return await manager.generatePrompt(...);
}
```

**Code Rollback**:
```bash
# Revert integration commit
git revert HEAD

# Or remove V2 method manually
git checkout HEAD~1 -- src/services/memory/conversation-manager.ts
```

**Monitoring**:
- Track error rates
- Monitor performance metrics
- Review user feedback
- Check prompt quality

---

## 📊 Success Metrics

### Validation Phase

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Output Match Rate | 100% | V1 === V2 comparison |
| Performance Overhead | <5% | Execution time comparison |
| Error Rate | 0% | Exception tracking |
| Type Safety | 0 errors | `npx tsc --noEmit` |

### Rollout Phase

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Production Errors | 0 | Error monitoring |
| User Satisfaction | ≥Current | User feedback |
| Response Quality | ≥Current | LLM output quality |
| Latency | ≤Current + 5% | Response time tracking |

---

## 🔧 Troubleshooting

### Issue: TypeScript Errors

**Symptoms**: Compilation fails after integration

**Solution**:
```bash
# Re-check types
npx tsc --noEmit

# Common fixes:
# - Verify import paths
# - Check type definitions
# - Ensure all section files exist
```

### Issue: Runtime Errors

**Symptoms**: Exception when calling V2

**Debug Steps**:
1. Check browser/server console for stack trace
2. Verify all dependencies are imported
3. Ensure ConversationManager is properly initialized
4. Review section file exports

**Common Causes**:
- Missing section file
- Incorrect import path
- Type assertion failure
- Async/await issue

### Issue: Output Mismatch

**Symptoms**: V1 !== V2

**Debug Steps**:
```typescript
// Find first difference
for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
  if (v1[i] !== v2[i]) {
    console.log('First diff at position:', i);
    console.log('V1 char:', v1[i], 'code:', v1.charCodeAt(i));
    console.log('V2 char:', v2[i], 'code:', v2.charCodeAt(i));
    console.log('Context V1:', v1.substring(i-50, i+50));
    console.log('Context V2:', v2.substring(i-50, i+50));
    break;
  }
}
```

**Common Causes**:
- Line ending differences (CRLF vs LF)
- Variable replacement order
- Missing console.log statement
- Async timing issue

### Issue: Performance Degradation

**Symptoms**: V2 is significantly slower

**Debug Steps**:
1. Profile section execution times
2. Check for unnecessary async operations
3. Review memory allocation
4. Verify no duplicated work

**Optimization**:
```typescript
// Add performance tracking
console.time('Section: Character Info');
const charInfo = this.characterInfo.build(...);
console.timeEnd('Section: Character Info');
```

---

## 📚 Related Documentation

- **Completion Report**: `claudedocs/PHASE1_PROMPT_CONSOLIDATION_COMPLETION_REPORT.md`
- **Validation Guide**: `tests/manual/phase1-validation.md`
- **Golden Master README**: `tests/golden-master/README.md`
- **Next Session Instructions**: `claudedocs/NEXT_SESSION_INSTRUCTIONS.md`

---

## 📞 Next Steps

### 1. Manual Validation (Immediate)

Follow steps in `tests/manual/phase1-validation.md`:
- Test minimal case
- Test with character data
- Test full context
- Compare outputs

### 2. Create Test Script (Recommended)

```typescript
// scripts/test-prompt-v2.ts
async function testPromptV2() {
  const manager = createManager();

  const testCases = [
    { name: 'Minimal', args: ['Hello'] },
    { name: 'With Character', args: ['Hello', testCharacter] },
    { name: 'Full Context', args: ['Hello', testCharacter, testPersona, testSettings] },
  ];

  for (const test of testCases) {
    const v1 = await manager.generatePrompt(...test.args);
    const v2 = await manager.generatePromptV2(...test.args);
    console.log(`${test.name}: ${v1 === v2 ? '✅' : '❌'}`);
  }
}
```

### 3. Monitor Production (After Rollout)

- Set up error tracking
- Monitor performance metrics
- Collect user feedback
- Track output quality

### 4. Iterate & Improve

Based on validation results:
- Fix any discovered issues
- Optimize performance if needed
- Update documentation
- Plan full migration

---

## 🎊 Conclusion

**Integration Status**: ✅ **COMPLETE**

**What's Available**:
- `generatePromptV2()` method in ConversationManager
- Side-by-side testing capability
- Zero-risk parallel validation
- Easy rollback if needed

**What's Next**:
- Manual validation testing
- Production monitoring setup
- Gradual rollout planning
- Full migration preparation

**Confidence Level**: **HIGH**
- Zero TypeScript errors
- Character-level copy strategy
- Comprehensive test infrastructure
- Clear rollback plan

---

**Ready for validation testing!** 🚀

Please refer to `tests/manual/phase1-validation.md` for detailed testing instructions.
