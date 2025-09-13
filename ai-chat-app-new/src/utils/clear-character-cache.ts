/**
 * Utility to clear stale character data from LocalStorage
 * This is a one-time cleanup for users who have old character data cached
 */
export function clearCharacterCache() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }

  try {
    const storageKey = 'ai-chat-v3-storage';
    const storedData = localStorage.getItem(storageKey);

    if (!storedData) {
      return;
    }

    const parsed = JSON.parse(storedData);

    if (parsed && parsed.state) {
      // Remove character-related data from state
      if ('characters' in parsed.state) {
        delete parsed.state.characters;
        console.log('🧹 Cleared stale characters from LocalStorage');
      }

      if ('isCharactersLoaded' in parsed.state) {
        delete parsed.state.isCharactersLoaded;
        console.log('🧹 Cleared isCharactersLoaded flag from LocalStorage');
      }

      // Save the cleaned data back
      localStorage.setItem(storageKey, JSON.stringify(parsed));
      console.log('✅ Character cache cleanup completed');
    }
  } catch (error) {
    console.error('Failed to clear character cache:', error);
  }
}

// Auto-run on import for immediate cleanup
if (typeof window !== 'undefined') {
  clearCharacterCache();
}