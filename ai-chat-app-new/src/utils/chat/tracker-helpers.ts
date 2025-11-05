/**
 * Tracker管理ヘルパー関数
 *
 * 共通のTrackerManager取得ロジックを提供
 * Phase 3 Refactoring: getTrackerManagerSafely統合
 */

import { TrackerManager } from '@/services/tracker/tracker-manager';

/**
 * TrackerManager を安全に取得
 *
 * Map または Object から指定されたキーでTrackerManagerを取得します。
 * 存在しない場合や無効な引数の場合は undefined を返します。
 *
 * @param trackerManagers - Map<string, TrackerManager> または Record<string, TrackerManager>
 * @param key - 取得するTrackerManagerのキー（通常はsessionId）
 * @returns TrackerManager または undefined
 *
 * @example
 * ```typescript
 * const trackerManager = getTrackerManagerSafely(state.trackerManagers, sessionId);
 * if (trackerManager) {
 *   const trackerInfo = trackerManager.getTrackersForPrompt(characterId);
 * }
 * ```
 */
export function getTrackerManagerSafely(
  trackerManagers: Map<string, TrackerManager> | Record<string, TrackerManager> | undefined,
  key: string
): TrackerManager | undefined {
  if (!trackerManagers || !key) {
    return undefined;
  }

  if (trackerManagers instanceof Map) {
    return trackerManagers.get(key);
  } else if (typeof trackerManagers === "object") {
    return trackerManagers[key];
  }

  return undefined;
}
