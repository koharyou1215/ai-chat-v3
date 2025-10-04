# Golden Master Testing for Prompt Quality Guarantee

## 🎯 Purpose

**Absolute guarantee**: The refactored code produces **character-by-character identical** prompts to the original implementation.

## 📋 Strategy

1. **Generate Baseline**: Capture 1000 prompts from current implementation
2. **Character-by-Character Copy**: Extract sections without any logic changes
3. **Validate**: New implementation must match 100% of golden master cases
4. **Zero Tolerance**: Any difference = immediate rollback

## 🚀 Workflow

### Step 1: Generate Golden Master

```bash
# Generate baseline from CURRENT implementation
npm run generate-golden-master

# Output:
# - tests/golden-master/prompts-golden-master.json
# - tests/golden-master/golden-master-metadata.json
```

**⚠️ CRITICAL**: Only run this BEFORE making any changes to `conversation-manager.ts`

### Step 2: Implement Refactoring

Follow the character-by-character copy approach:

```typescript
// ❌ WRONG: Reconstructing logic
class PersonaSection {
  build(context) {
    return `Name: ${context.persona.name}...`; // NEW logic = risk
  }
}

// ✅ RIGHT: Exact copy
class PersonaSection {
  build(context) {
    // 🔒 Copied from conversation-manager.ts line 549-571
    const { persona } = context;
    let prompt = "";

    if (persona) {
      console.log("🎭 [ConversationManager] Persona found:", persona.name, persona.other_settings);
      prompt += "<persona_information>\n";
      prompt += `Name: ${persona.name}\n`;
      // ... exact copy continues
    }

    return prompt;
  }
}
```

### Step 3: Run Validation

```bash
# Test new implementation against golden master
npm test tests/golden-master/compare-prompts.test.ts

# Expected: 1000/1000 passing
# Accepted: 0 failures
```

### Step 4: Rollback if Needed

```bash
# If ANY test fails:
git reset --hard HEAD
git checkout refactor/phase0-shared-services

# Investigate root cause before retrying
```

## 📊 Test Coverage

### Test Categories (1000 cases)

- **Minimal** (10%): No character, no persona
- **Character Only** (20%): Character data only
- **Persona Only** (10%): Persona data only
- **Full Context** (30%): Character + Persona
- **Custom Prompts** (15%): System & jailbreak prompts
- **Edge Cases** (10%): Special characters, unicode
- **Disabled Prompts** (5%): Disabled system settings

### Validation Levels

1. ✅ **Exact String Match**: `newPrompt === goldenPrompt`
2. ✅ **MD5 Hash Match**: `md5(new) === md5(golden)`
3. ✅ **Length Match**: `new.length === golden.length`
4. ✅ **Character-by-Character**: Detailed diff reporting

## 🔒 Success Criteria

### Required (100% compliance)

- [ ] All 1000 tests passing
- [ ] Zero character differences
- [ ] MD5 hashes match exactly
- [ ] No test skips or ignores

### Metrics

- **Pass Rate**: 100.0%
- **Tolerance**: 0 characters
- **Rollback Threshold**: Any single failure

## 📁 File Structure

```
tests/golden-master/
├── README.md                          # This file
├── test-data-generator.ts             # Test case generation
├── generate-golden-master.ts          # Baseline generator
├── compare-prompts.test.ts            # Validation test
├── prompts-golden-master.json         # Baseline prompts (generated)
└── golden-master-metadata.json        # Metadata (generated)
```

## 🎓 Why This Approach?

### Problem with Traditional Refactoring

```typescript
// Refactoring seems simple but introduces subtle bugs:
- Different string concatenation order
- Missing whitespace
- Different variable names causing scope issues
- Implicit behavior changes
```

### Golden Master Advantage

```typescript
// Character-by-character copy = zero behavior change
- Exact copy of existing code
- Only file organization changes
- 100% behavior preservation guarantee
- Instant validation feedback
```

## 🚨 Common Issues

### Issue: Test Failures

**Symptoms**: Some tests failing with character differences

**Causes**:
1. CRLF vs LF line endings
2. Whitespace differences
3. Variable replacement order
4. Implicit dependencies

**Solution**:
```bash
# Check line endings
git config core.autocrlf false

# Re-generate golden master
npm run generate-golden-master

# Compare again
npm test tests/golden-master/compare-prompts.test.ts
```

### Issue: Can't Generate Golden Master

**Symptoms**: Error during generation

**Causes**:
1. ConversationManager dependencies missing
2. Mock store not configured
3. File system permissions

**Solution**:
```bash
# Check dependencies
npm install

# Verify conversation-manager exists
ls -la src/services/memory/conversation-manager.ts

# Check file permissions
chmod +w tests/golden-master/
```

## 🎯 Next Steps

After Golden Master validation passes:

1. ✅ Commit refactored code
2. ✅ Update documentation
3. ✅ Create Phase 1 completion report
4. ✅ Proceed to Phase 2 (chat-message-operations)

## 📚 References

- [NEXT_SESSION_INSTRUCTIONS.md](../../claudedocs/NEXT_SESSION_INSTRUCTIONS.md)
- [CONVERSATION_MANAGER_DISTRIBUTION_PLAN.md](../../claudedocs/CONVERSATION_MANAGER_DISTRIBUTION_PLAN.md)
- [THREE_FILE_REFACTORING_MASTER_PLAN.md](../../claudedocs/THREE_FILE_REFACTORING_MASTER_PLAN.md)
