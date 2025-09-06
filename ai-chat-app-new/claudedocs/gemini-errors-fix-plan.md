# Gemini API Errors - Analysis & Fix Plan

## Error Analysis

The user reported three critical errors in the Gemini inspiration functionality:

### 1. OpenRouter API Error: Invalid Model ID
```
Error: OpenRouter API error: google/gemini-1.5-flash-8b is not a valid model ID
```

**Root Cause**: The system is trying to send an invalid Gemini model "google/gemini-1.5-flash-8b" to OpenRouter API. This model doesn't exist on OpenRouter.

**Location**: `src/services/simple-api-manager-v2.ts:generateWithOpenRouter()`

### 2. Gemini API Quota Exceeded
```
Error: Gemini API error: Quota exceeded for quota metric 'Generate Content API requests per minute'
```

**Root Cause**: Direct Gemini API has hit rate limits.

**Location**: `src/services/api/gemini-client.ts:generateMessage()`

### 3. JSON Syntax Error
```
SyntaxError: Expected double-quoted property name in JSON at position 548 (line 13 column 1)
```

**Root Cause**: Malformed JSON response being parsed somewhere in the inspiration service.

## Current Analysis Findings

### ✅ Good: Model Validation Exists
The `GeminiClient.setModel()` method has proper validation:
- Filters out invalid suffixes like "-8b"
- Maps old model names (1.5 -> 2.5)
- Only allows valid models: `gemini-2.5-flash`, `gemini-2.5-flash-light`, `gemini-2.5-pro`

### ❌ Problem: Invalid Model Still Reaching OpenRouter
Despite validation, the invalid model "google/gemini-1.5-flash-8b" is being sent to OpenRouter API.

### ❌ Problem: No Error Handling for Rate Limits
Quota exceeded errors aren't properly handled with user-friendly messages.

## Fix Strategy

### Phase 1: Model Validation Fix (CRITICAL)

1. **Strengthen Model Validation in SimpleAPIManagerV2**
   - Add model validation before sending to OpenRouter
   - Reject invalid models with clear error messages
   - Log model transformation attempts

2. **Add Model Sanitization**
   - Clean up any stored invalid models in settings
   - Provide fallback to valid models

### Phase 2: Error Handling Improvements (HIGH PRIORITY)

1. **Improve Rate Limit Handling**
   - Better error messages for quota exceeded
   - Suggest alternative models or retry timing
   - Add user-friendly error display

2. **JSON Parsing Safety**
   - Add try-catch around JSON parsing
   - Validate JSON responses before parsing
   - Provide fallback for malformed responses

### Phase 3: User Experience (MEDIUM PRIORITY)

1. **Settings UI Validation**
   - Prevent selection of invalid models in UI
   - Show model availability status
   - Auto-correct invalid saved models

## Implementation Priority

### Immediate Fix (Next 10 minutes):
1. Add model validation in `generateWithOpenRouter()`
2. Fix JSON parsing in inspiration service
3. Improve error messages

### Follow-up (Next hour):
1. Add model sanitization on app startup
2. Improve settings UI model validation
3. Add comprehensive error handling

## Code Changes Required

### 1. SimpleAPIManagerV2 Enhancement
```typescript
private validateModel(model: string): string {
  // Remove invalid prefixes/suffixes
  let cleanModel = model.replace(/^google\//, '').replace(/-8b$/, '');
  
  // Map old to new models
  const modelMap = {
    'gemini-1.5-flash': 'gemini-2.5-flash',
    'gemini-1.5-flash-light': 'gemini-2.5-flash-light',
    'gemini-1.5-pro': 'gemini-2.5-pro'
  };
  
  cleanModel = modelMap[cleanModel] || cleanModel;
  
  // Validate against allowed models
  const allowedModels = ['gemini-2.5-flash', 'gemini-2.5-flash-light', 'gemini-2.5-pro'];
  
  if (this.isGeminiModel(cleanModel) && !allowedModels.includes(cleanModel)) {
    console.warn(`Invalid Gemini model: ${model} -> defaulting to gemini-2.5-flash`);
    return 'gemini-2.5-flash';
  }
  
  return cleanModel;
}
```

### 2. JSON Parsing Safety
```typescript
private safeJSONParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('JSON Parse Error:', error);
    console.error('Invalid JSON text:', text.substring(0, 200));
    return null;
  }
}
```

### 3. Better Error Messages
```typescript
private handleGeminiError(error: any): string {
  if (error.message?.includes('Quota exceeded')) {
    return 'Gemini API使用制限に達しました。しばらく待ってから再試行するか、OpenRouter経由でご利用ください。';
  }
  if (error.message?.includes('not a valid model')) {
    return '選択されたモデルは利用できません。設定画面で有効なモデルを選択してください。';
  }
  return `API エラー: ${error.message}`;
}
```

This plan addresses all three critical errors while improving the overall robustness of the Gemini API integration.