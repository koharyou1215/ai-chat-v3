// src/utils/memory-debug.ts (新規作成)
export const memoryDebugLog = {
  autoMemory: (context: string, data: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AutoMemory:${context}]`, data);
    }
  },
  vectorStore: (context: string, data: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[VectorStore:${context}]`, data);
    }
  },
  mem0: (context: string, data: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Mem0:${context}]`, data);
    }
  }
};
