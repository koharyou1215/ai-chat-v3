/**
 * Character ID Generator - Stable ID Generation from Filename
 *
 * Generates stable, filesystem-based IDs for characters to prevent
 * ID inconsistencies between LocalStorage and file system.
 *
 * Problem: Previously, IDs were generated from character names,
 * which could change, causing session binding failures.
 *
 * Solution: Generate IDs from filenames (which are stable).
 */

/**
 * Generate a stable character ID from filename
 *
 * Priority:
 * 1. Use existing ID from JSON if valid
 * 2. Generate from filename (stable, unchanging)
 * 3. Fallback to name-based ID if filename unavailable
 *
 * @param characterData - Character JSON data
 * @param filename - Character JSON filename (e.g., "emma-noble.json")
 * @returns Stable character ID
 *
 * @example
 * generateStableCharacterID({ name: "Emma" }, "emma-noble.json")
 * // Returns: "emma-noble"
 *
 * generateStableCharacterID({ id: "emma-123", name: "Emma" }, "emma-noble.json")
 * // Returns: "emma-123" (existing ID preserved)
 */
export function generateStableCharacterID(
  characterData: { id?: string; name?: string },
  filename: string
): string {
  // Priority 1: Use existing ID if valid (not empty, not 'unknown')
  if (
    characterData.id &&
    characterData.id.trim() !== '' &&
    characterData.id !== 'unknown'
  ) {
    return characterData.id;
  }

  // Priority 2: Generate from filename (most stable)
  if (filename && filename.trim() !== '') {
    // Remove .json extension and sanitize
    const baseId = filename
      .replace(/\.json$/i, '')  // Remove .json
      .trim();

    if (baseId !== '') {
      return baseId;
    }
  }

  // Priority 3: Fallback to name-based ID
  if (characterData.name && characterData.name.trim() !== '') {
    return characterData.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '');  // Remove special characters
  }

  // Last resort: timestamp-based unique ID
  return `character-${Date.now()}`;
}

/**
 * Validate character ID format
 *
 * @param id - Character ID to validate
 * @returns True if ID is valid
 */
export function isValidCharacterID(id: string): boolean {
  return (
    id !== undefined &&
    id !== null &&
    id.trim() !== '' &&
    id !== 'unknown'
  );
}

/**
 * Extract filename from file path
 *
 * @param filePath - Full file path
 * @returns Filename only
 *
 * @example
 * extractFilename("/public/characters/emma-noble.json")
 * // Returns: "emma-noble.json"
 */
export function extractFilename(filePath: string): string {
  if (!filePath || filePath.trim() === '') {
    return '';
  }

  // Handle both Unix and Windows paths
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1] || '';
}
