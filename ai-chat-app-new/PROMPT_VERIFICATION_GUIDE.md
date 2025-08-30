# 🎯 AI Chat V3 - Prompt Verification Guide

## 📋 Quick Reference for Development & Deployment

This guide provides a **fast, systematic approach** to verify that all AI prompts are correctly structured and contain all required information for consistent character behavior.

---

## ⚡ Quick Verification Checklist

### **Before Every Deployment** ✅

- [ ] **Character Information**: Name, personality, speaking style are populated
- [ ] **Persona Integration**: User context is properly defined and referenced  
- [ ] **Tracker Values**: Character state reflects current session values
- [ ] **Memory System**: Pinned memories and context are accessible
- [ ] **System Instructions**: Core behavioral rules are intact

---

## 🏗️ Required Prompt Structure (Exact Order)

Every AI prompt **must** contain these sections in this **exact sequence**:

```
1. AI/User Definition          → AI={{char}}, User={{user}}
2. System Instructions         → <system_instructions>...</system_instructions>
3. Character Information       → <character_information>...</character_information>
4. Persona Information         → <persona_information>...</persona_information>
5. Memory System Information   → <pinned_memory_cards>, <relevant_memory_cards>
6. Tracker Information         → <character_trackers>...</character_trackers>
7. Context & History          → Recent conversation flow
8. Current Interaction        → User input and response context
```

---

## 🔍 Section-by-Section Verification

### 1. **System Instructions** (Critical - Never Skip)
```xml
<system_instructions>
## Core Rules
- Character consistency enforcement
- Knowledge limitation boundaries  
- No meta-commentary about AI nature
- Natural dialogue requirements
</system_instructions>
```
**✅ Must Have**: Behavioral constraints, character boundary enforcement

### 2. **Character Information** (Essential for Personality)
```xml
<character_information>
## Basic Information
Name: [character.name]
Personality: [character.personality]
Speaking Style: [character.speaking_style]

## Communication Details
First Person: [character.first_person]
Second Person: [character.second_person]
Verbal Tics: [character.verbal_tics]

## Context
Background: [character.background]
Current Scenario: [character.scenario]

## Special Context (NSFW Profile)
Context Profile: [character.nsfw_profile.persona_profile]
Libido Level: [character.nsfw_profile.libido_level]
Preferences: [character.nsfw_profile.kinks]
</character_information>
```
**✅ Must Have**: Name, personality, speaking_style (minimum required)
**🔧 Processing**: Variable replacement applied via `replaceVariablesInCharacter()`
**🔧 Enhanced**: Now includes complete NSFW profile fields from Character Form

### 3. **Persona Information** (User Context)
```xml
<persona_information>
Name: [persona.name]
Role: [persona.role] 
Description: [persona.description]
Additional Settings: [persona.other_settings]
</persona_information>
```
**✅ Must Have**: Always present (even if default persona)
**🔧 Enhanced**: Now includes `other_settings` for additional persona customization
**⚠️ Warning Sign**: If missing, character loses user awareness

### 4. **Memory System** (Context Continuity)
```xml
<pinned_memory_cards>
[category] title: summary
Keywords: keyword1, keyword2, keyword3
</pinned_memory_cards>

<relevant_memory_cards>
[category] title: summary  
Keywords: keyword1, keyword2, keyword3
</relevant_memory_cards>
```
**✅ Must Work**: References past conversations and important events
**🔧 System**: Managed by ConversationManager

### 5. **Tracker Information** (Character State)
```xml
<character_trackers>
## [Tracker Name]
Current Value: [value] (Range: [min]-[max])
Description: [behavioral impact explanation]
</character_trackers>
```
**✅ Must Reflect**: Current session character state and development
**🔧 System**: Managed by TrackerManager

---

## ⚠️ Common Failure Patterns & Quick Fixes

| **Problem** | **Symptoms** | **Quick Fix** |
|-------------|--------------|---------------|
| **Missing Character Info** | Generic responses, no personality | Check character data loading |
| **Lost Persona Context** | AI ignores user's role/name | Verify persona selection integration |
| **Broken Trackers** | Behavior doesn't match tracker values | Ensure TrackerManager initialization |
| **Memory Not Working** | No reference to past conversations | Check ConversationManager setup |
| **Inconsistent Speaking** | Wrong first/second person usage | Verify character.speaking_style data |

---

## 🛠️ Development Testing Methods

### **Method 1: Enable Debug Logging**
```bash
# Add to .env.local
NODE_ENV="development"
```
**Expected Output**: Full prompt content in terminal during chat

### **Method 2: Check APIManager Logs**  
Look for these log patterns:
```
🤖 ===== API Manager Generate =====
🎯 System prompt (1920 chars): AI=CharacterName, User=PersonaName...
```

### **Method 3: Response Quality Check**
- ✅ Character uses correct speaking style
- ✅ Character acknowledges user's persona/role
- ✅ Behavior reflects current tracker values  
- ✅ References relevant memories when appropriate

---

## 🚨 Deployment Verification (2-Minute Check)

### **Critical Path Test**
1. **Start new chat session**
2. **Select character with trackers** 
3. **Send test message**
4. **Verify response contains**:
   - Character's unique speaking style ✅
   - Reference to user persona ✅ 
   - Behavioral consistency with trackers ✅

### **Red Flags** 🚩
- Generic/bland character responses
- AI refers to user as generic "you" instead of persona name
- Character behavior contradicts tracker states
- No memory of previous conversations

---

## 📁 Key Implementation Files

| **Component** | **File Path** | **Responsibility** |
|---------------|---------------|-------------------|
| **Prompt Builder** | `src/services/prompt-builder.service.ts` | Main orchestration |
| **Prompt Generator** | `src/services/memory/conversation-manager.ts` | Core prompt assembly |
| **Character State** | `src/services/tracker/tracker-manager.ts` | Tracker value management |
| **Data Processing** | `src/utils/variable-replacer.ts` | Character variable replacement |
| **Chat Integration** | `src/store/slices/chat.slice.ts` | Prompt building integration |
| **API Communication** | `src/services/api-manager.ts` | Final prompt delivery |

---

## 💡 Quick Debugging Commands

```bash
# Check current prompt structure (if logging enabled)
npm run dev
# Then send a chat message and check terminal output

# Verify character data integrity
# Look for: character.json files in public/characters/

# Check persona integration  
# Look for: persona selection in chat interface

# Validate tracker functionality
# Look for: tracker values in right panel of chat interface
```

---

## ✅ Success Indicators

**🎯 Perfect Integration**:
- Character responds with unique personality traits
- User is addressed by persona name/role
- Character behavior aligns with tracker states
- Conversation context is maintained across sessions
- No generic AI-like responses

**⚡ Quick Test Message**: `"How do you feel about our current situation?"`
- Should trigger personality, tracker state, and context references

---

This guide ensures **rapid verification** that all prompt systems are working correctly without needing complex debugging tools or extensive code changes.