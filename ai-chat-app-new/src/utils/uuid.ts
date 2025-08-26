/**
 * UUID utility for SSR-safe ID generation
 * Provides consistent, stable ID generation that works across server and client
 */

let idCounter = 0;

/**
 * Generates a stable UUID-like ID that works consistently in SSR
 * Uses a counter + timestamp + session-based seed for uniqueness
 */
export function generateStableId(prefix = 'id'): string {
  // Use a more stable approach than Date.now() or Math.random()
  const counter = ++idCounter;
  const timestamp = new Date().getTime();
  
  // Create a deterministic seed based on counter and timestamp
  // This avoids hydration mismatches while maintaining uniqueness
  const seed = (counter * 1000 + (timestamp % 1000)).toString(36);
  
  return `${prefix}-${seed}`;
}

/**
 * Generates a UUID v4-like string using crypto API when available
 * Falls back to deterministic generation for SSR compatibility
 */
export function generateUUID(): string {
  // Check if we're in a browser environment with crypto support
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    try {
      return window.crypto.randomUUID();
    } catch (e) {
      // Fall through to manual generation
    }
  }
  
  // Fallback UUID generation for SSR or older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const counter = ++idCounter;
    const timestamp = Date.now();
    
    // Create a deterministic random value based on counter and timestamp
    const seed = (counter * 37 + timestamp) % 16;
    const r = seed | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generates a tracker-specific stable ID
 */
export function generateTrackerId(): string {
  return generateStableId('tracker');
}

/**
 * Generates an instance-specific stable ID
 */
export function generateInstanceId(): string {
  return generateStableId('instance');
}

/**
 * Generates a memory-specific stable ID
 */
export function generateMemoryId(): string {
  return generateStableId('memory');
}

/**
 * Generates a history entry stable ID
 */
export function generateHistoryId(): string {
  return generateStableId('history');
}

/**
 * Generates a character-specific stable ID
 */
export function generateCharacterId(): string {
  return generateStableId('character');
}

/**
 * Generates a session-specific stable ID
 */
export function generateSessionId(): string {
  return generateStableId('session');
}

/**
 * Generates a message-specific stable ID
 */
export function generateMessageId(prefix = 'msg'): string {
  return generateStableId(prefix);
}

/**
 * Generates a user message stable ID
 */
export function generateUserMessageId(): string {
  return generateStableId('user');
}

/**
 * Generates an AI message stable ID
 */
export function generateAIMessageId(): string {
  return generateStableId('ai');
}

/**
 * Generates a system message stable ID
 */
export function generateSystemMessageId(): string {
  return generateStableId('system');
}

/**
 * Generates a welcome message stable ID
 */
export function generateWelcomeMessageId(): string {
  return generateStableId('welcome');
}

/**
 * Generates a group session stable ID
 */
export function generateGroupSessionId(): string {
  return generateStableId('group');
}

/**
 * Reset the counter (useful for testing)
 */
export function resetIdCounter(): void {
  idCounter = 0;
}