/**
 * ================================
 * 🚨 重要: プロジェクト管理ルール
 * ================================
 * 
 * 1. このプロジェクトは単一のNext.js App Routerアプリケーションです
 * 2. ルートディレクトリ: /ai-chat-app
 * 3. 既存ファイルを編集する際は必ず現在の内容を確認してから追記・修正
 * 4. 新規ファイル作成時は既存ファイルとの重複を確認
 * 5. 型定義は src/types/core/*.types.ts に集約
 * 6. コンポーネントは src/components/* に機能別に配置
 * 7. ストアは src/store/slices/* でスライス分割
 * 
 * ファイル作成・編集前のチェックリスト:
 * □ 同名ファイルが存在しないか確認
 * □ 類似機能のファイルが存在しないか確認
 * □ インポートパスが正しいか確認 (@/ エイリアス使用)
 * □ 型定義の重複がないか確認
 */

/**
 * 基本識別子型
 */
export type UUID = string;
export type Timestamp = string; // ISO 8601
export type UnixTime = number;

/**
 * 基本エンティティ
 */
export interface BaseEntity {
  id: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
  version: number; // 楽観的ロック用
}

/**
 * 削除可能エンティティ
 */
export interface SoftDeletable {
  deleted_at?: Timestamp;
  is_deleted: boolean;
}

/**
 * メタデータ付きエンティティ
 */
export interface WithMetadata<T = Record<string, unknown>> {
  metadata: T;
}

/**
 * 統一メッセージ型は message.types.ts で定義されています
 * 循環参照を避けるため、ここでは基本型のみ定義
 */
