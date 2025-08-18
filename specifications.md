# 1. 🤖 AI Chat Application Specifications

## 1.1. Project Management Rules

*   **Single Application**: This project is a single Next.js App Router application.
*   **Root Directory**: `/ai-chat-app`
*   **File Modifications**: Always review the current content before adding or modifying existing files.
*   **New Files**: Check for duplicates before creating new files.
*   **Type Definitions**: Consolidate all type definitions in `src/types/core/*.types.ts`.
*   **Components**: Place components in `src/components/*` organized by feature.
*   **Store**: Use Zustand slices for state management in `src/store/slices/*`.

## 1.2. Development Guidelines

*   **Schema Validation**: Use Zod for schema validation (`src/lib/schemas`).
*   **API Logic**: Centralize API communication logic in `src/services/api/apiClient.ts`.
*   **State Management**: Divide Zustand store into feature-specific slices (e.g., `chatSlice`, `characterSlice`).
*   **Component Structure**:
    *   Consider splitting components that exceed 200 lines.
    *   Separate complex UI with more than 3 states into its own component.
*   **API Key Management**:
    *   **Production**: Use Vercel environment variables only.
    *   **Development**: Input API keys in the application settings.

# 2. 📝 Prompt Design

## 2.1. Prompt Construction Order

1.  **Jailbreak Prompt** (enabled in settings)
2.  **AI/Character/User Definitions**: `AI={{char}}`, `User={{user}}`
3.  **Character Information**
4.  **Persona Information**
5.  **Memory System Information**: Pinned memories, long-term memory (vector search), session summary, working memory.
6.  **Tracker Information**
7.  **Chat History** (last 3 rounds)
8.  **System Prompt** (editable in settings)
9.  **Character-specific System Prompt**

## 2.2. Image Generation Prompts

*   **Character Settings**: Define the basic appearance, clothing, and fixed elements.
*   **Chat History**: Dynamically generate prompts for expressions, poses, and situations based on the conversation.
*   **Optimization**: Separate tags, add weight to conversation-based prompts, and dynamically build prompts based on context.
