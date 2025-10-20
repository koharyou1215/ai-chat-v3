/**
 * セッションストレージ保護機能のテスト
 * トラッカー値とメモリーカードがキャラクター定義ファイルに保存されないことを確認
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { sessionStorageService } from '@/services/session-storage.service';
import { generateStableId } from '@/utils/uuid';
import type { TrackerInstance, MemoryCard } from '@/types';

describe('Session Storage Protection Tests', () => {
  const testSessionId = generateStableId('session');
  const testCharacterId = 'char-123';

  beforeEach(() => {
    // セッションストレージをクリア
    sessionStorageService.clearSessionData(testSessionId);
  });

  describe('Tracker Value Protection', () => {
    it('should store tracker values in session storage, not in character definitions', () => {
      // テスト用のトラッカーインスタンス
      const testTracker: TrackerInstance = {
        id: generateStableId('instance'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        definition_id: 'def-123',
        session_id: testSessionId,
        character_id: testCharacterId,
        current_value: 100,
        history: [],
        last_updated: new Date().toISOString(),
        metadata: {}
      };

      // セッションストレージに保存
      sessionStorageService.saveTrackerInstance(testSessionId, testTracker);

      // セッションから取得できることを確認
      const sessionTrackers = sessionStorageService.getSessionTrackers(testSessionId);
      expect(sessionTrackers.has(testTracker.id)).toBe(true);
      expect(sessionTrackers.get(testTracker.id)?.current_value).toBe(100);

      // トラッカー定義から実行時の値を削除する処理を検証
      const definitions = sessionStorageService.extractTrackerDefinitions({
        trackers: [{
          id: 'tracker-1',
          name: 'affection',
          type: 'numeric',
          initial_value: 0,
          current_value: 50, // これは削除される
          value: 50, // これも削除される
          history: [], // これも削除される
          last_updated: '2024-01-01' // これも削除される
        }]
      });

      // current_value, value, history, last_updated が削除されていることを確認
      expect(definitions[0]).not.toHaveProperty('current_value');
      expect(definitions[0]).not.toHaveProperty('value');
      expect(definitions[0]).not.toHaveProperty('history');
      expect(definitions[0]).not.toHaveProperty('last_updated');
      expect(definitions[0]).toHaveProperty('name');
      expect(definitions[0]).toHaveProperty('type');
      expect(definitions[0]).toHaveProperty('initial_value');
    });

    it('should update tracker values only in session storage', () => {
      const instanceId = generateStableId('instance');
      const testTracker: TrackerInstance = {
        id: instanceId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        definition_id: 'def-123',
        session_id: testSessionId,
        character_id: testCharacterId,
        current_value: 0,
        history: [],
        last_updated: new Date().toISOString(),
        metadata: {}
      };

      // 初期値を保存
      sessionStorageService.saveTrackerInstance(testSessionId, testTracker);

      // 値を更新
      sessionStorageService.updateTrackerValue(testSessionId, instanceId, 75, 'テスト更新');

      // 更新された値を確認
      const updatedTrackers = sessionStorageService.getSessionTrackers(testSessionId);
      const updatedTracker = updatedTrackers.get(instanceId);
      expect(updatedTracker?.current_value).toBe(75);
      expect(updatedTracker?.history?.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Card Protection', () => {
    it('should store memory cards in session storage, not in character definitions', () => {
      // テスト用のメモリーカード
      const testMemoryCard: MemoryCard = {
        id: generateStableId('memory'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        session_id: testSessionId,
        character_id: testCharacterId,
        title: 'Test Memory',
        summary: 'A test memory card',
        keywords: ['test'],
        category: 'general' as any,
        source_message_ids: [],
        original_message_ids: [],
        original_content: 'Test content',
        auto_tags: [],
        importance: {
          score: 5,
          factors: {
            emotional_weight: 5,
            repetition_count: 1,
            user_emphasis: 5,
            ai_judgment: 5
          }
        },
        confidence: 0.8,
        is_edited: false,
        is_verified: false,
        is_pinned: false,
        is_hidden: false,
        metadata: {}
      };

      // セッションストレージに保存
      sessionStorageService.saveMemoryCard(testSessionId, testMemoryCard);

      // セッションから取得できることを確認
      const sessionMemoryCards = sessionStorageService.getSessionMemoryCards(testSessionId);
      expect(sessionMemoryCards.has(testMemoryCard.id)).toBe(true);
      expect(sessionMemoryCards.get(testMemoryCard.id)?.title).toBe('Test Memory');
    });
  });

  describe('Session Data Export/Import', () => {
    it('should export and import session data correctly', () => {
      // テストデータを作成
      const testTracker: TrackerInstance = {
        id: generateStableId('instance'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        definition_id: 'def-123',
        session_id: testSessionId,
        character_id: testCharacterId,
        current_value: 42,
        history: [],
        last_updated: new Date().toISOString(),
        metadata: {}
      };

      const testMemoryCard: MemoryCard = {
        id: generateStableId('memory'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        session_id: testSessionId,
        character_id: testCharacterId,
        title: 'Export Test',
        summary: 'Testing export/import',
        keywords: ['export', 'test'],
        category: 'general' as any,
        source_message_ids: [],
        original_message_ids: [],
        original_content: 'Export test content',
        auto_tags: [],
        importance: {
          score: 7,
          factors: {
            emotional_weight: 5,
            repetition_count: 1,
            user_emphasis: 5,
            ai_judgment: 5
          }
        },
        confidence: 0.9,
        is_edited: false,
        is_verified: false,
        is_pinned: true,
        is_hidden: false,
        metadata: {}
      };

      // データを保存
      sessionStorageService.saveTrackerInstance(testSessionId, testTracker);
      sessionStorageService.saveMemoryCard(testSessionId, testMemoryCard);

      // エクスポート
      const exportedData = sessionStorageService.exportSessionData(testSessionId);
      expect(exportedData.trackers.length).toBe(1);
      expect(exportedData.memoryCards.length).toBe(1);
      expect(exportedData.trackers[0].current_value).toBe(42);
      expect(exportedData.memoryCards[0].title).toBe('Export Test');

      // 別のセッションにインポート
      const newSessionId = generateStableId('session');
      sessionStorageService.mergeSessionData(newSessionId, exportedData);

      // インポートされたデータを確認
      const importedTrackers = sessionStorageService.getSessionTrackers(newSessionId);
      const importedMemoryCards = sessionStorageService.getSessionMemoryCards(newSessionId);
      expect(importedTrackers.size).toBe(1);
      expect(importedMemoryCards.size).toBe(1);
    });
  });

  describe('Session Cleanup', () => {
    it('should clean up old session data', () => {
      // 古いセッションデータを作成
      const oldTracker: TrackerInstance = {
        id: generateStableId('instance'),
        created_at: '2020-01-01T00:00:00Z',
        updated_at: '2020-01-01T00:00:00Z',
        version: 1,
        definition_id: 'old-def',
        session_id: 'old-session',
        character_id: 'old-char',
        current_value: 999,
        history: [],
        last_updated: '2020-01-01T00:00:00Z',
        metadata: {}
      };

      sessionStorageService.saveTrackerInstance('old-session', oldTracker);

      // 新しいセッションデータも作成
      const newTracker: TrackerInstance = {
        id: generateStableId('instance'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        definition_id: 'new-def',
        session_id: 'new-session',
        character_id: 'new-char',
        current_value: 111,
        history: [],
        last_updated: new Date().toISOString(),
        metadata: {}
      };

      sessionStorageService.saveTrackerInstance('new-session', newTracker);

      // 30日以上古いセッションをクリーンアップ
      sessionStorageService.cleanupOldSessions(30);

      // 古いセッションが削除され、新しいセッションが残っていることを確認
      const oldSessionData = sessionStorageService.getSessionTrackers('old-session');
      const newSessionData = sessionStorageService.getSessionTrackers('new-session');
      expect(oldSessionData.size).toBe(0);
      expect(newSessionData.size).toBe(1);
    });
  });

  describe('Statistics', () => {
    it('should provide correct session statistics', () => {
      // テストデータを追加
      for (let i = 0; i < 3; i++) {
        const tracker: TrackerInstance = {
          id: generateStableId('instance'),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
          definition_id: `def-${i}`,
          session_id: testSessionId,
          character_id: testCharacterId,
          current_value: i * 10,
          history: [],
          last_updated: new Date().toISOString(),
          metadata: {}
        };
        sessionStorageService.saveTrackerInstance(testSessionId, tracker);
      }

      for (let i = 0; i < 2; i++) {
        const memoryCard: MemoryCard = {
          id: generateStableId('memory'),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
          session_id: testSessionId,
          character_id: testCharacterId,
          title: `Memory ${i}`,
          summary: `Summary ${i}`,
          keywords: [`keyword${i}`],
          category: 'general' as any,
          source_message_ids: [],
          original_message_ids: [],
          original_content: `Content ${i}`,
          auto_tags: [],
          importance: {
            score: 5,
            factors: {
              emotional_weight: 5,
              repetition_count: 1,
              user_emphasis: 5,
              ai_judgment: 5
            }
          },
          confidence: 0.8,
          is_edited: false,
          is_verified: false,
          is_pinned: false,
          is_hidden: false,
          metadata: {}
        };
        sessionStorageService.saveMemoryCard(testSessionId, memoryCard);
      }

      // 統計情報を取得
      const stats = sessionStorageService.getSessionStatistics(testSessionId);
      expect(stats.trackerCount).toBe(3);
      expect(stats.memoryCardCount).toBe(2);
      expect(stats.lastUpdated).toBeTruthy();
    });
  });
});