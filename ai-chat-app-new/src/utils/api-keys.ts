// API Key utility functions for secure API key management

/**
 * Get an API key from environment variables
 * Provides a centralized way to access API keys with proper error handling
 */
export function getApiKey(keyName: string): string {
  const key = process.env[keyName];
  
  if (!key) {
    throw new Error(`${keyName} is not set in environment variables`);
  }
  
  return key;
}

/**
 * Check if an API key is available
 */
export function hasApiKey(keyName: string): boolean {
  return !!process.env[keyName];
}

/**
 * Get multiple API keys at once
 */
export function getApiKeys(keyNames: string[]): Record<string, string> {
  const keys: Record<string, string> = {};
  
  for (const keyName of keyNames) {
    const key = process.env[keyName];
    if (key) {
      keys[keyName] = key;
    }
  }
  
  return keys;
}

/**
 * Check if all required API keys are available
 */
export function validateApiKeys(requiredKeys: string[]): { valid: boolean; missing: string[] } {
  const missing = requiredKeys.filter(key => !process.env[key]);
  
  return {
    valid: missing.length === 0,
    missing
  };
}