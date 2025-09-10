# Chat.slice.ts 移行戦略書

## 🎯 移行目標
既存の機能を維持しながら、段階的にコードを新アーキテクチャに移行

## ⚠️ リスク評価マトリックス

| リスク | 影響度 | 発生確率 | 対策 | 優先度 |
|--------|--------|----------|------|--------|
| **実行時エラー** | 高 | 中 | Feature Flag + カナリアリリース | P0 |
| **パフォーマンス劣化** | 高 | 低 | ベンチマーク + プロファイリング | P1 |
| **開発速度低下** | 中 | 高 | ドキュメント + ペアプロ | P1 |
| **テスト不足** | 高 | 中 | 段階的テスト追加 | P0 |
| **ロールバック困難** | 高 | 低 | Git分岐戦略 | P2 |

## 🔐 安全な移行手順

### Step 1: 準備フェーズ（Day 1-2）
```bash
# 1. 専用ブランチ作成
git checkout -b refactor/chat-slice-phase1

# 2. 現状のスナップショット
npm run test:coverage > baseline-coverage.txt
npm run build -- --profile > baseline-performance.txt

# 3. Feature Flag設定
echo "NEXT_PUBLIC_USE_NEW_CHAT_ARCHITECTURE=false" >> .env.local
```

### Step 2: Phase 1実装（Day 3-7）
```typescript
// src/store/slices/chat.slice.ts
import { ChatErrorHandler } from '@/services/chat/error-handler.service';
import { getSessionSafely, createMapSafely } from '@/utils/chat/map-helpers';

// 段階的に新しいユーティリティを使用
const handleError = (error: unknown) => {
  if (process.env.NEXT_PUBLIC_USE_NEW_CHAT_ARCHITECTURE === 'true') {
    // 新しいエラーハンドラー
    const chatError = ChatErrorHandler.createChatError(error, 'send');
    set({ lastError: chatError });
    ChatErrorHandler.showUserFriendlyError(chatError.message);
  } else {
    // 既存のエラー処理
    console.error('AI応答生成エラー:', error);
  }
};
```

### Step 3: 並行運用期間（Day 8-14）
```typescript
// Feature Flagによる切り替え
export const createChatSlice = (set, get) => {
  const useNewArchitecture = process.env.NEXT_PUBLIC_USE_NEW_CHAT_ARCHITECTURE === 'true';
  
  if (useNewArchitecture) {
    // 新アーキテクチャ
    return createNewChatSlice(set, get);
  } else {
    // 既存実装
    return createLegacyChatSlice(set, get);
  }
};
```

### Step 4: 段階的切り替え（Day 15-21）
```typescript
// A/Bテストによる段階的切り替え
const getUserPercentage = (userId: string): number => {
  // ユーザーIDからパーセンテージを計算
  return parseInt(userId.slice(-2), 16) / 255 * 100;
};

const shouldUseNewArchitecture = (userId: string, rolloutPercentage: number): boolean => {
  return getUserPercentage(userId) < rolloutPercentage;
};

// 10% → 25% → 50% → 100%と段階的に増やす
```

## 📊 メトリクス監視

### パフォーマンス指標
```typescript
// src/utils/performance-monitor.ts
export class PerformanceMonitor {
  static measureChatOperation(operation: string, fn: () => void) {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;
    
    // メトリクス送信
    if (window.analytics) {
      window.analytics.track('ChatPerformance', {
        operation,
        duration,
        architecture: process.env.NEXT_PUBLIC_USE_NEW_CHAT_ARCHITECTURE
      });
    }
    
    // 閾値超過アラート
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${operation} took ${duration}ms`);
    }
  }
}
```

### エラー率監視
```typescript
// src/services/chat/metrics.service.ts
export class ChatMetrics {
  private static errorCount = 0;
  private static successCount = 0;
  
  static recordSuccess() {
    this.successCount++;
    this.reportMetrics();
  }
  
  static recordError(error: unknown) {
    this.errorCount++;
    this.reportMetrics();
    
    // エラー率が閾値を超えたら自動ロールバック
    const errorRate = this.errorCount / (this.errorCount + this.successCount);
    if (errorRate > 0.05) { // 5%以上のエラー率
      this.triggerRollback();
    }
  }
  
  private static triggerRollback() {
    console.error('High error rate detected. Triggering rollback...');
    // Feature Flagを無効化
    localStorage.setItem('FORCE_LEGACY_CHAT', 'true');
    window.location.reload();
  }
}
```

## 🔄 ロールバック計画

### 即時ロールバック手順
1. **Feature Flag無効化**
   ```bash
   # .env.localを更新
   NEXT_PUBLIC_USE_NEW_CHAT_ARCHITECTURE=false
   ```

2. **緊急デプロイ**
   ```bash
   git checkout main
   npm run build
   npm run deploy:emergency
   ```

3. **ユーザー通知**
   ```typescript
   toast.info('システムメンテナンス中です。一時的に旧バージョンに戻しています。');
   ```

### 部分的ロールバック
```typescript
// 特定機能のみロールバック
const featureFlags = {
  useNewErrorHandler: false,  // ロールバック
  useNewMapHelpers: true,      // 維持
  useNewMessageSender: false,  // ロールバック
};
```

## 📈 成功判定基準

### Phase 1完了条件
- [ ] エラー率 < 1%
- [ ] パフォーマンス劣化 < 5%
- [ ] テストカバレッジ > 80%
- [ ] ユーザークレーム 0件

### Phase 2移行条件
- [ ] Phase 1が2週間安定稼働
- [ ] ロールバック実施 0回
- [ ] 開発チーム承認 100%

## 🚦 Go/No-Go判定

### Go条件
✅ すべての成功判定基準を満たす
✅ パフォーマンステストパス
✅ セキュリティレビューパス
✅ ステークホルダー承認

### No-Go条件
❌ クリティカルバグ発見
❌ パフォーマンス劣化 > 10%
❌ ユーザー影響あり

## 📝 チェックリスト

### 実装前
- [ ] ベースライン測定完了
- [ ] テスト環境準備
- [ ] ロールバック手順確認
- [ ] チーム周知完了

### 実装中
- [ ] 日次進捗レビュー
- [ ] メトリクス監視
- [ ] エラーログ確認
- [ ] パフォーマンス測定

### 実装後
- [ ] 本番環境監視（24時間）
- [ ] ユーザーフィードバック収集
- [ ] パフォーマンスレポート作成
- [ ] 振り返り会実施

## 🆘 緊急連絡先

| 役割 | 担当 | 連絡方法 |
|------|------|----------|
| Tech Lead | - | Slack: #tech-lead |
| DevOps | - | PagerDuty |
| QA Lead | - | Slack: #qa |
| Product Owner | - | Email |

## 📚 参考資料
- [Martin Fowler - Strangler Fig Pattern](https://martinfowler.com/bliki/StranglerFigApplication.html)
- [Feature Flags Best Practices](https://launchdarkly.com/blog/feature-flag-best-practices/)
- [Safe Refactoring Techniques](https://refactoring.guru/refactoring/techniques)