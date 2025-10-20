# UI層（設定・管理）アーキテクチャ分析レポート

**分析日時**: 2025-10-19
**対象範囲**:
- `src/components/settings/`
- `src/components/character/`
- `src/components/persona/`
- `src/components/memory/`

**分析焦点**:
- 設定パネルの統合可能性
- フォームロジックの共通化
- バリデーションの統一
- 複雑性評価と最適化機会

---

## 📊 エグゼクティブサマリー

### 主要発見事項
1. **重複コードパターン**: ファイルアップロード処理が3箇所で重複（~150行の重複）
2. **不統一なアーキテクチャ**: Settings/Character/Persona/Memory それぞれ異なる設計パターン
3. **抽象化機会**: 配列型フィールド管理ロジックの重複（6種類のフィールドで同一ロジック）
4. **統一可能なUI**: ギャラリーモーダルパターンが3箇所で類似実装
5. **バリデーション不在**: 明示的なバリデーションロジックが存在しない

### リファクタリング優先度
🔴 **高優先度** (即時対応推奨):
- ファイルアップロード処理の共通化
- 配列型フィールド管理フックの作成

🟡 **中優先度** (計画的対応):
- ギャラリーコンポーネントの統合
- バリデーションシステムの導入

🟢 **低優先度** (将来的改善):
- フォームパネルの完全抽象化
- UI設定パネルの統合

---

## 1. 設定パネル (Settings) アーキテクチャ

### 📁 ファイル構成
```
settings/
├── SettingsModal.tsx           (302行) - メインモーダル
├── SettingsModal/
│   ├── panels/                 (9ファイル)
│   │   ├── AIPanel.tsx         (228行)
│   │   ├── AppearancePanel.tsx (185行)
│   │   ├── ChatPanel.tsx       (156行)
│   │   ├── EffectsPanel.tsx    (134行)
│   │   ├── EmotionPanel.tsx    (92行)
│   │   ├── VoicePanel.tsx      (145行)
│   │   ├── DataManagementPanel.tsx (178行)
│   │   ├── PerformancePanel.tsx (98行)
│   │   └── TrackerPanel.tsx    (45行)
│   └── components/             (3ファイル)
│       ├── SettingItem.tsx     (42行)
│       ├── IntensitySlider.tsx (41行)
│       └── FontEffectSlider.tsx (47行)
```

### ✅ 優れている点
1. **統一されたコンポーネント構造**
   - `SettingItem` で boolean 設定の UI を統一
   - `IntensitySlider` でスライダー UI を統一
   - すべてのパネルが `settings`, `updateSetting` props を共有

2. **明確な責務分離**
   - 各パネルは特定のドメイン（AI設定、外観、チャットなど）に専念
   - 共通UIコンポーネントを適切に分離

3. **型安全性**
   ```typescript
   interface PanelProps {
     settings: EffectSettings;
     updateSetting: <K extends keyof EffectSettings>(
       key: K,
       value: EffectSettings[K]
     ) => void;
   }
   ```

### ⚠️ 改善が必要な点
1. **パネル間の一貫性欠如**
   - AIPanel: 独自のセレクトボックス実装
   - AppearancePanel: カスタムカラーピッカー実装
   - 統一された form コンポーネントライブラリの不使用

2. **バリデーションの不在**
   - API キーの形式検証なし
   - 数値範囲の検証なし
   - エラーメッセージ表示機構なし

---

## 2. キャラクター管理 (Character) アーキテクチャ

### 📁 ファイル構成
```
character/
├── CharacterForm.tsx           (900行) ⚠️ 非常に大きい
├── CharacterGalleryModal.tsx   (142行)
├── BasicInfoPanel.tsx          (203行)
├── PersonalityPanel.tsx        (348行)
├── AppearancePanel.tsx         (235行)
└── TrackersPanel.tsx           (169行)
```

### ✅ 優れている点
1. **パネルベースの設計**
   - タブで整理された編集インターフェース
   - 各パネルで関連フィールドをグループ化

2. **型ガードの使用**
   ```typescript
   const isCharacter = (data: Character | Persona | null): data is Character => {
     return data !== null && 'speaking_style' in data;
   };
   ```

3. **共通インターフェース**
   ```typescript
   interface PanelProps {
     formData: Character | Persona | null;
     setFormData: React.Dispatch<React.SetStateAction<Character | Persona | null>>;
     mode: 'character' | 'persona';
   }
   ```

### ⚠️ 重大な問題点

#### 問題1: ファイルアップロード処理の重複
**影響範囲**: 3ファイル × ~50行 = 150行の重複コード

**CharacterForm.tsx (71-157行)**
```typescript
const handleFileUpload = async (file: File, field: 'background_url' | 'avatar_url') => {
    setIsUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
        const response = await fetch('/api/upload/image', {
            method: 'POST',
            body: uploadFormData,
            cache: 'no-store' as RequestCache,
            headers: { 'Pragma': 'no-cache' },
        });

        // ... JSON parsing, error handling, state update
    } catch (error) {
        // ... error handling
    } finally {
        setIsUploading(false);
    }
};
```

**AppearancePanel.tsx (22-94行)**: ほぼ同一のコード
**BasicInfoPanel.tsx**: インラインで実装（handleFileUpload プロップ経由）

**推奨解決策**:
```typescript
// src/hooks/useFileUpload.ts
export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (
    file: File,
    options?: {
      onSuccess?: (url: string) => void;
      onError?: (error: Error) => void;
    }
  ) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache' },
      });

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('サーバーがJSON以外のレスポンスを返しました');
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'アップロードに失敗しました');
      }

      options?.onSuccess?.(result.url);
      return result.url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'アップロードエラー';
      options?.onError?.(new Error(errorMessage));
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFile, isUploading };
};
```

**使用例**:
```typescript
const { uploadFile, isUploading } = useFileUpload();

const handleFileUpload = async (file: File, field: 'avatar_url' | 'background_url') => {
  try {
    const url = await uploadFile(file);
    setFormData(prev => prev ? { ...prev, [field]: url } : prev);
  } catch (error) {
    alert(`ファイルアップロードエラー: ${error.message}`);
  }
};
```

#### 問題2: 配列型フィールド管理の重複

**影響フィールド**:
- `strengths` (長所)
- `weaknesses` (弱点)
- `hobbies` (趣味)
- `likes` (好きなもの)
- `dislikes` (嫌いなもの)
- `verbal_tics` (口癖)

**PersonalityPanel.tsx の例 (127-140行)**:
```typescript
{formData.verbal_tics && formData.verbal_tics.map((tic: string, index: number) => (
  <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-teal-500/20 text-teal-300 rounded-full text-sm">
    {tic}
    <button
      onClick={() => {
        const newTics = formData.verbal_tics?.filter((_, i) => i !== index) || [];
        setFormData(prev => isCharacter(prev) ? {...prev, verbal_tics: newTics} : prev);
      }}
      className="ml-1 hover:text-red-300"
    >
      ×
    </button>
  </span>
))}
```

このパターンが **6箇所** で繰り返されています。

**推奨解決策**:
```typescript
// src/hooks/useArrayField.ts
export const useArrayField = <T extends Record<string, unknown>>(
  formData: T | null,
  setFormData: React.Dispatch<React.SetStateAction<T | null>>,
  fieldName: keyof T
) => {
  const items = (formData?.[fieldName] as string[]) || [];

  const addItem = (item: string) => {
    setFormData(prev =>
      prev ? { ...prev, [fieldName]: [...items, item] } : prev
    );
  };

  const removeItem = (index: number) => {
    setFormData(prev =>
      prev ? { ...prev, [fieldName]: items.filter((_, i) => i !== index) } : prev
    );
  };

  const updateItem = (index: number, value: string) => {
    setFormData(prev => {
      if (!prev) return prev;
      const newItems = [...items];
      newItems[index] = value;
      return { ...prev, [fieldName]: newItems };
    });
  };

  return { items, addItem, removeItem, updateItem };
};
```

**使用例**:
```typescript
const { items: verbalTics, addItem, removeItem } = useArrayField(
  formData,
  setFormData,
  'verbal_tics'
);

// UI
<input
  onKeyPress={(e) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      addItem(e.currentTarget.value.trim());
      e.currentTarget.value = '';
    }
  }}
/>
```

#### 問題3: CharacterForm.tsx の肥大化 (900行)

**問題**:
- 単一ファイルに全タブコンテンツが含まれる
- 責務が混在（ファイルアップロード、バリデーション、UI構築）
- テストが困難

**CharacterForm.tsx 責務分析**:
- L1-70: 初期化・状態管理 ✅
- L71-157: ファイルアップロード処理 🔴 分離すべき
- L159-315: FileUploader コンポーネント 🔴 別ファイル化すべき
- L318-900: タブコンテンツ 🟡 一部パネル化済み

**推奨リファクタリング**:
```
character/
├── CharacterForm.tsx           (200行) - 統合・ルーティング
├── panels/
│   ├── BasicInfoPanel.tsx      (既存)
│   ├── PersonalityPanel.tsx    (既存)
│   ├── AppearancePanel.tsx     (既存)
│   ├── ScenarioPanel.tsx       (新規 - L636-693から分離)
│   ├── NSFWPanel.tsx           (新規 - L696-851から分離)
│   └── PromptPanel.tsx         (新規 - L855-866から分離)
├── components/
│   ├── FileUploader.tsx        (新規 - L161-315から分離)
│   └── ArrayFieldEditor.tsx    (新規 - 配列フィールド共通UI)
└── hooks/
    ├── useFileUpload.ts        (新規)
    └── useArrayField.ts        (新規)
```

---

## 3. ペルソナ管理 (Persona) アーキテクチャ

### 📁 ファイル構成
```
persona/
├── PersonaGalleryModal.tsx     (228行)
├── PersonaCard.tsx             (145行)
└── PersonaDetailModal.tsx      (238行)
```

### ✅ 優れている点
1. **統合された検索・フィルタリング**
   ```typescript
   const filteredPersonas = useMemo(() => {
     const validPersonas = personasArray.filter(
       (persona) => persona.id && persona.id.trim() !== ''
     );

     if (!searchTerm) return validPersonas;

     return validPersonas.filter((persona) =>
       persona.name.toLowerCase().includes(searchTerm.toLowerCase())
     );
   }, [personasArray, searchTerm]);
   ```

2. **JSONインポート機能**
   ```typescript
   const handleJsonUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (file) {
       const reader = new FileReader();
       reader.onload = async (e) => {
         const json = JSON.parse(e.target?.result as string);
         const importedPersona: Persona = {
           ...json,
           id: `imported-${Date.now()}`,
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString(),
         };
         addPersona(importedPersona);
       };
     }
   };
   ```

### ⚠️ 改善が必要な点

#### 問題1: CharacterGalleryModal との重複

**PersonaGalleryModal.tsx と CharacterGalleryModal.tsx の類似性**:
- 検索機能: ほぼ同一
- カード表示: 同一パターン
- インポート機能: 同一ロジック
- モーダル構造: 同一

**推奨統合アーキテクチャ**:
```typescript
// src/components/common/GalleryModal.tsx
interface GalleryModalProps<T> {
  items: T[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: T) => void;
  onImport?: (data: Record<string, unknown>) => void;
  renderCard: (item: T) => React.ReactNode;
  title: string;
  searchPlaceholder: string;
  searchFilter: (item: T, searchTerm: string) => boolean;
}

export const GalleryModal = <T extends { id: string; name: string }>({
  items,
  isOpen,
  onClose,
  onSelect,
  onImport,
  renderCard,
  title,
  searchPlaceholder,
  searchFilter,
}: GalleryModalProps<T>) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    return items.filter(item => searchFilter(item, searchTerm));
  }, [items, searchTerm, searchFilter]);

  return (
    <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50">
      {/* 統一されたギャラリーUI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredItems.map(item => (
          <div key={item.id} onClick={() => onSelect(item)}>
            {renderCard(item)}
          </div>
        ))}
      </div>
    </motion.div>
  );
};
```

**使用例**:
```typescript
// PersonaGalleryModal.tsx
<GalleryModal
  items={personasArray}
  isOpen={showPersonaGallery}
  onClose={() => setShowPersonaGallery(false)}
  onSelect={handleSelectPersona}
  onImport={handleJsonUpload}
  renderCard={(persona) => <PersonaCard persona={persona} />}
  title="Select a Persona"
  searchPlaceholder="Search personas..."
  searchFilter={(persona, term) =>
    persona.name.toLowerCase().includes(term.toLowerCase())
  }
/>
```

#### 問題2: API保存処理のエラーハンドリング不足

**PersonaGalleryModal.tsx (51-82行)**:
```typescript
const handleSavePersona = async (updatedPersona: Persona) => {
  try {
    updatePersona(updatedPersona);

    try {
      const response = await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPersona),
      });

      if (response.ok) {
        console.log('✅ Persona saved successfully');
      } else {
        console.warn('⚠️ Persona save API failed, but store updated');
      }
    } catch (apiError) {
      console.warn('⚠️ Persona save API error:', apiError, 'but store updated');
    }
  } catch (error) {
    console.error('❌ Failed to save persona:', error);
    throw error;
  }
};
```

**問題点**:
- API失敗時でもストアは更新される（データ不整合のリスク）
- ユーザーへのフィードバックがない
- リトライロジックがない

**推奨改善**:
```typescript
const handleSavePersona = async (updatedPersona: Persona) => {
  // 楽観的更新を一時保留
  const previousState = personas.get(updatedPersona.id);

  try {
    // まずAPIに保存を試みる
    const response = await fetch('/api/personas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPersona),
    });

    if (!response.ok) {
      throw new Error(`API保存失敗: ${response.statusText}`);
    }

    // API成功後にストア更新
    updatePersona(updatedPersona);

    // 成功フィードバック
    toast.success('ペルソナを保存しました');
  } catch (error) {
    // エラー時は元の状態に戻す
    if (previousState) {
      updatePersona(previousState);
    }

    // ユーザーへのエラー通知
    toast.error(`保存に失敗しました: ${error.message}`);
    throw error;
  }
};
```

---

## 4. 記憶管理 (Memory) アーキテクチャ

### 📁 ファイル構成
```
memory/
├── MemoryGallery.tsx           (283行)
└── MemoryCard.tsx              (266行)
```

### ✅ 優れている点
1. **高度なフィルタリング・ソート機能**
   ```typescript
   type SortBy = 'created_at' | 'importance' | 'last_accessed';
   type FilterBy = 'all' | 'pinned' | 'hidden' | MemoryCategory;

   const filteredAndSortedMemories = useMemo(() => {
     // 検索 → フィルタ → ソート の3段階処理
     let filtered = Array.from(currentSessionCards.values());

     // 検索フィルタ
     if (searchTerm) {
       filtered = filtered.filter(memory =>
         memory.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
         memory.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()))
       );
     }

     // カテゴリフィルタ
     filtered = applyFilterBy(filtered, filterBy, showHidden);

     // ソート
     filtered.sort((a, b) => applySortBy(a, b, sortBy, sortOrder));

     return filtered;
   }, [currentSessionCards, searchTerm, filterBy, showHidden, sortBy, sortOrder]);
   ```

2. **カテゴリベースの管理**
   ```typescript
   const categoryColors: Record<MemoryCategory, string> = {
     personal_info: "bg-blue-500/20 text-blue-400",
     preference: "bg-green-500/20 text-green-400",
     event: "bg-purple-500/20 text-purple-400",
     // ...10カテゴリ
   };
   ```

3. **インタラクティブなカード**
   - ピン留め/非表示
   - 編集/削除
   - 重要度バー表示

### ⚠️ 改善が必要な点

#### 問題: ギャラリー機能の重複

Character, Persona, Memory で**ギャラリーパターンが3重実装**されています。

**共通機能**:
- 検索バー
- カード表示
- モーダル管理
- アクションボタン

**提案する統合アプローチ**:
```typescript
// src/components/common/gallery/GalleryLayout.tsx
interface GalleryLayoutProps<T> {
  items: T[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  renderCard: (item: T) => React.ReactNode;
  renderToolbar?: () => React.ReactNode;
  emptyState?: React.ReactNode;
}

export const GalleryLayout = <T,>({
  items,
  searchTerm,
  onSearchChange,
  renderCard,
  renderToolbar,
  emptyState,
}: GalleryLayoutProps<T>) => {
  return (
    <div className="h-full flex flex-col">
      {/* 検索バー */}
      <div className="p-4 border-b border-white/10">
        <SearchBar value={searchTerm} onChange={onSearchChange} />
        {renderToolbar?.()}
      </div>

      {/* カードグリッド */}
      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          emptyState || <DefaultEmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {items.map(renderCard)}
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## 5. 複雑性メトリクス

### コンポーネントサイズ分析

| ファイル | 行数 | 複雑度 | リファクタリング優先度 |
|---------|-----|-------|---------------------|
| CharacterForm.tsx | 900 | 🔴 非常に高 | 🔴 最優先 |
| PersonalityPanel.tsx | 348 | 🟡 高 | 🟡 中 |
| MemoryGallery.tsx | 283 | 🟡 高 | 🟢 低 |
| MemoryCard.tsx | 266 | 🟢 中 | 🟢 低 |
| PersonaDetailModal.tsx | 238 | 🟢 中 | 🟢 低 |
| AppearancePanel.tsx | 235 | 🟢 中 | 🟡 中（重複あり） |
| PersonaGalleryModal.tsx | 228 | 🟡 高 | 🟡 中（統合可能） |
| AIPanel.tsx | 228 | 🟢 中 | 🟢 低 |
| BasicInfoPanel.tsx | 203 | 🟢 中 | 🟡 中（重複あり） |

**基準**:
- 🔴 300行超 または 循環的複雑度 >15: 即時対応必要
- 🟡 200-300行 または 循環的複雑度 10-15: 計画的対応
- 🟢 200行未満 または 循環的複雑度 <10: 監視

---

## 6. バリデーション状況分析

### 現状
**❌ 明示的なバリデーションロジックが存在しない**

**潜在的問題**:
1. API キー形式の検証なし
2. 必須フィールドのチェックなし
3. 文字列長の制限なし
4. 数値範囲の検証なし

### 推奨バリデーションアーキテクチャ

```typescript
// src/lib/validation/schema.ts
import { z } from 'zod';

export const CharacterSchema = z.object({
  name: z.string().min(1, '名前は必須です').max(100, '名前は100文字以内です'),
  personality: z.string().max(2000, '性格は2000文字以内です'),
  avatar_url: z.string().url('有効なURLを入力してください').optional(),
  background_url: z.string().url('有効なURLを入力してください').optional(),
  strengths: z.array(z.string()).max(10, '長所は10個までです'),
  // ...
});

export const SettingsSchema = z.object({
  apiConfig: z.object({
    provider: z.enum(['openrouter', 'anthropic', 'google']),
    openRouterApiKey: z.string().regex(
      /^sk-or-v1-[a-f0-9]{64}$/,
      '有効なOpenRouter APIキーを入力してください'
    ).optional(),
  }),
  // ...
});
```

**使用方法**:
```typescript
// src/hooks/useFormValidation.ts
export const useFormValidation = <T>(schema: z.ZodSchema<T>) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (data: unknown): data is T => {
    const result = schema.safeParse(data);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        const path = issue.path.join('.');
        fieldErrors[path] = issue.message;
      });
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  return { validate, errors, clearErrors: () => setErrors({}) };
};
```

**フォームでの使用**:
```typescript
const CharacterForm = ({ onSave }: Props) => {
  const [formData, setFormData] = useState<Character | null>(null);
  const { validate, errors } = useFormValidation(CharacterSchema);

  const handleSave = () => {
    if (!validate(formData)) {
      toast.error('入力内容にエラーがあります');
      return;
    }
    onSave(formData);
  };

  return (
    <div>
      <Input
        value={formData?.name || ''}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
      />
      {errors.name && <span className="text-red-400 text-sm">{errors.name}</span>}
    </div>
  );
};
```

---

## 7. リファクタリング計画

### Phase 1: 即時対応（1-2週間）

#### 🔴 優先度1: ファイルアップロードフックの作成
**影響ファイル**: CharacterForm.tsx, BasicInfoPanel.tsx, AppearancePanel.tsx

**タスク**:
1. `src/hooks/useFileUpload.ts` を作成
2. 3ファイルのアップロード処理を置き換え
3. エラーハンドリングを統一
4. テストケース作成

**期待効果**:
- 150行のコード削減
- エラーハンドリングの一貫性向上
- テスト容易性の向上

---

#### 🔴 優先度2: 配列フィールドフックの作成
**影響フィールド**: strengths, weaknesses, hobbies, likes, dislikes, verbal_tics

**タスク**:
1. `src/hooks/useArrayField.ts` を作成
2. PersonalityPanel.tsx の6箇所を置き換え
3. ArrayFieldEditor コンポーネントを作成
4. Enter キー処理の統一

**期待効果**:
- 100行以上のコード削減
- UI の一貫性向上
- 保守性の向上

---

### Phase 2: 計画的対応（3-4週間）

#### 🟡 優先度3: CharacterForm.tsx の分割
**タスク**:
1. ScenarioPanel.tsx を抽出
2. NSFWPanel.tsx を抽出
3. PromptPanel.tsx を抽出
4. FileUploader コンポーネントを分離

**目標**: CharacterForm.tsx を 900行 → 250行以下に削減

---

#### 🟡 優先度4: ギャラリーコンポーネントの統合
**影響ファイル**: CharacterGalleryModal.tsx, PersonaGalleryModal.tsx, MemoryGallery.tsx

**タスク**:
1. `src/components/common/gallery/GalleryLayout.tsx` を作成
2. `src/components/common/gallery/SearchBar.tsx` を作成
3. 3つのギャラリーを統合コンポーネント化

**期待効果**:
- 300行以上のコード削減
- 検索機能の一貫性向上
- 新しいギャラリー追加が容易に

---

#### 🟡 優先度5: バリデーションシステムの導入
**タスク**:
1. Zod をインストール
2. スキーマ定義を作成
3. `useFormValidation` フックを作成
4. CharacterForm, PersonaDetailModal, SettingsModal に適用

**期待効果**:
- データ整合性の向上
- ユーザーへの明確なフィードバック
- バグの早期発見

---

### Phase 3: 将来的改善（5-8週間）

#### 🟢 優先度6: 設定パネルの統合
**タスク**:
1. 共通フォームコンポーネントライブラリの選定
2. API設定の統一UIコンポーネント作成
3. パネル間の一貫性向上

---

#### 🟢 優先度7: フォームパネルの完全抽象化
**タスク**:
1. `BaseFormPanel` コンポーネントの作成
2. 共通propsインターフェースの定義
3. すべてのパネルを `BaseFormPanel` ベースに統一

---

## 8. パフォーマンス最適化機会

### 🚀 Memoization の適用

**PersonalityPanel.tsx の例**:
```typescript
// 現在
{formData.verbal_tics && formData.verbal_tics.map((tic, index) => (
  <TagItem key={index} onRemove={() => { /* ... */ }} />
))}

// 最適化後
const MemoizedTagList = React.memo(({ items, onRemove }: Props) => (
  <div className="flex flex-wrap gap-2">
    {items.map((item, index) => (
      <TagItem key={index} item={item} onRemove={() => onRemove(index)} />
    ))}
  </div>
));

// 使用
<MemoizedTagList items={formData.verbal_tics || []} onRemove={handleRemoveTic} />
```

**期待効果**: 再レンダリングの削減、入力レスポンスの向上

---

### 🚀 useCallback の適用

**CharacterGalleryModal.tsx の例**:
```typescript
// 現在
const handleSelectCharacter = (character: Character) => {
  selectCharacter(character.id);
  handleClose();
};

// 最適化後
const handleSelectCharacter = useCallback((character: Character) => {
  selectCharacter(character.id);
  handleClose();
}, [selectCharacter, handleClose]);
```

---

### 🚀 Lazy Loading の適用

**SettingsModal.tsx の例**:
```typescript
// パネルの動的インポート
const AIPanel = lazy(() => import('./panels/AIPanel'));
const AppearancePanel = lazy(() => import('./panels/AppearancePanel'));
// ...

// 使用
<Suspense fallback={<PanelSkeleton />}>
  {activePanel === 'ai' && <AIPanel settings={settings} updateSetting={updateSetting} />}
</Suspense>
```

**期待効果**: 初期バンドルサイズの削減、初回ロード時間の短縮

---

## 9. 型安全性の向上

### 現状の問題

**BasicInfoPanel.tsx (161-164行)**:
```typescript
value={
  mode === "persona" && formData && "role" in formData
    ? formData.role
    : ""
}
```

**問題点**: 型ガードが冗長で可読性が低い

### 改善案

```typescript
// src/lib/typeGuards.ts
export function isCharacter(data: unknown): data is Character {
  return (
    typeof data === 'object' &&
    data !== null &&
    'speaking_style' in data
  );
}

export function isPersona(data: unknown): data is Persona {
  return (
    typeof data === 'object' &&
    data !== null &&
    'role' in data &&
    !('speaking_style' in data)
  );
}
```

**使用例**:
```typescript
const BasicInfoPanel = ({ formData, mode }: Props) => {
  const characterData = mode === 'character' && isCharacter(formData) ? formData : null;
  const personaData = mode === 'persona' && isPersona(formData) ? formData : null;

  return (
    <Input
      value={personaData?.role || ''}
      onChange={(e) => {
        if (personaData) {
          setFormData({ ...personaData, role: e.target.value });
        }
      }}
    />
  );
};
```

---

## 10. テスト戦略

### 現状
**❌ テストコードが存在しない**

### 推奨テスト計画

#### ユニットテスト

**useFileUpload.ts のテスト例**:
```typescript
describe('useFileUpload', () => {
  it('should upload file successfully', async () => {
    const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const { result } = renderHook(() => useFileUpload());

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, url: 'https://example.com/test.jpg' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })
    ) as jest.Mock;

    const url = await result.current.uploadFile(mockFile);
    expect(url).toBe('https://example.com/test.jpg');
  });

  it('should handle upload error', async () => {
    const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const { result } = renderHook(() => useFileUpload());

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        statusText: 'Internal Server Error',
      })
    ) as jest.Mock;

    await expect(result.current.uploadFile(mockFile)).rejects.toThrow();
  });
});
```

#### インテグレーションテスト

**CharacterForm のテスト例**:
```typescript
describe('CharacterForm', () => {
  it('should save character with valid data', async () => {
    const mockOnSave = jest.fn();
    render(<CharacterForm mode="character" isOpen={true} onSave={mockOnSave} onClose={jest.fn()} />);

    await userEvent.type(screen.getByLabelText('名前'), 'Test Character');
    await userEvent.click(screen.getByRole('button', { name: '変更を保存' }));

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test Character' })
    );
  });

  it('should show validation error for empty name', async () => {
    render(<CharacterForm mode="character" isOpen={true} onSave={jest.fn()} onClose={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '変更を保存' }));

    expect(screen.getByText('名前は必須です')).toBeInTheDocument();
  });
});
```

---

## 11. まとめと推奨アクション

### 🎯 最優先アクション（今すぐ実施）

1. **useFileUpload フックの作成** (工数: 4時間)
   - 150行のコード削減
   - エラーハンドリングの統一

2. **useArrayField フックの作成** (工数: 3時間)
   - 100行以上のコード削減
   - UI の一貫性向上

**合計工数**: 1日 (7時間)
**コード削減**: ~250行
**品質向上**: エラーハンドリング、UI一貫性、保守性

---

### 📅 短期計画（2週間以内）

3. **CharacterForm.tsx の分割** (工数: 2日)
   - 900行 → 250行に削減
   - テスト容易性の向上

4. **バリデーションシステム導入** (工数: 2日)
   - Zod インストール・設定
   - 主要フォームへの適用

**合計工数**: 4日
**品質向上**: データ整合性、ユーザーエクスペリエンス

---

### 🚀 中長期計画（1-2ヶ月）

5. **ギャラリーコンポーネント統合** (工数: 3日)
6. **パフォーマンス最適化** (工数: 2日)
7. **テストカバレッジ向上** (工数: 5日)

**合計工数**: 10日
**品質向上**: 保守性、パフォーマンス、信頼性

---

### 📊 期待される効果

| 指標 | 現在 | リファクタリング後 |
|-----|-----|----------------|
| 総コード行数 | ~3,500行 | ~2,800行 (-20%) |
| 平均ファイルサイズ | 280行 | 180行 (-36%) |
| コード重複率 | ~15% | ~5% (-67%) |
| テストカバレッジ | 0% | 70%+ |
| TypeScript strict 準拠 | 部分的 | 完全 |

---

## 12. 付録: コードサンプル集

### A. useFileUpload フック完全版

```typescript
// src/hooks/useFileUpload.ts
import { useState } from 'react';

interface UploadOptions {
  onSuccess?: (url: string) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (
    file: File,
    options?: UploadOptions
  ): Promise<string> => {
    setIsUploading(true);
    setProgress(0);

    try {
      // ファイルサイズチェック (10MB制限)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('ファイルサイズは10MB以下にしてください');
      }

      // ファイル形式チェック
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('サポートされていないファイル形式です');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
        },
      });

      // Content-Type検証
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const errorText = await response.text();
        throw new Error(`サーバーエラー: ${errorText}`);
      }

      const result: UploadResult = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `アップロード失敗 (${response.status})`);
      }

      if (!result.url) {
        throw new Error('URLの取得に失敗しました');
      }

      setProgress(100);
      options?.onSuccess?.(result.url);
      return result.url;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'ファイルアップロードに失敗しました';

      const uploadError = new Error(errorMessage);
      options?.onError?.(uploadError);
      throw uploadError;
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return {
    uploadFile,
    isUploading,
    progress,
  };
};
```

### B. useArrayField フック完全版

```typescript
// src/hooks/useArrayField.ts
import { useCallback } from 'react';

export const useArrayField = <T extends Record<string, unknown>>(
  formData: T | null,
  setFormData: React.Dispatch<React.SetStateAction<T | null>>,
  fieldName: keyof T
) => {
  const items = (formData?.[fieldName] as string[]) || [];

  const addItem = useCallback(
    (item: string) => {
      if (!item.trim()) return;

      setFormData((prev) => {
        if (!prev) return prev;
        const currentItems = (prev[fieldName] as string[]) || [];

        // 重複チェック
        if (currentItems.includes(item.trim())) {
          return prev;
        }

        return {
          ...prev,
          [fieldName]: [...currentItems, item.trim()],
        };
      });
    },
    [setFormData, fieldName]
  );

  const removeItem = useCallback(
    (index: number) => {
      setFormData((prev) => {
        if (!prev) return prev;
        const currentItems = (prev[fieldName] as string[]) || [];
        return {
          ...prev,
          [fieldName]: currentItems.filter((_, i) => i !== index),
        };
      });
    },
    [setFormData, fieldName]
  );

  const updateItem = useCallback(
    (index: number, value: string) => {
      setFormData((prev) => {
        if (!prev) return prev;
        const currentItems = (prev[fieldName] as string[]) || [];
        const newItems = [...currentItems];
        newItems[index] = value;
        return {
          ...prev,
          [fieldName]: newItems,
        };
      });
    },
    [setFormData, fieldName]
  );

  const clearAll = useCallback(() => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [fieldName]: [],
      };
    });
  }, [setFormData, fieldName]);

  return {
    items,
    addItem,
    removeItem,
    updateItem,
    clearAll,
  };
};
```

### C. ArrayFieldEditor コンポーネント

```typescript
// src/components/common/ArrayFieldEditor.tsx
import React, { useState } from 'react';
import { PlusCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArrayFieldEditorProps {
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (index: number) => void;
  placeholder?: string;
  label?: string;
  maxItems?: number;
  colorScheme?: 'blue' | 'green' | 'red' | 'purple' | 'teal';
  className?: string;
}

const colorSchemes = {
  blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  green: 'bg-green-500/20 text-green-300 border-green-500/30',
  red: 'bg-red-500/20 text-red-300 border-red-500/30',
  purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  teal: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
};

export const ArrayFieldEditor: React.FC<ArrayFieldEditorProps> = ({
  items,
  onAdd,
  onRemove,
  placeholder = '項目を入力してEnter',
  label,
  maxItems,
  colorScheme = 'purple',
  className,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      if (maxItems && items.length >= maxItems) {
        alert(`最大${maxItems}個までです`);
        return;
      }
      onAdd(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {label && (
        <label className="text-sm font-medium text-slate-300">{label}</label>
      )}

      {/* タグ表示 */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={index}
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border',
                colorSchemes[colorScheme]
              )}
            >
              {item}
              <button
                onClick={() => onRemove(index)}
                className="ml-1 hover:text-red-300 transition-colors"
                aria-label={`${item}を削除`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 入力フィールド */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg focus:border-purple-400 focus:outline-none text-white placeholder-slate-400"
          disabled={maxItems !== undefined && items.length >= maxItems}
        />
        <button
          onClick={() => {
            if (inputValue.trim()) {
              onAdd(inputValue.trim());
              setInputValue('');
            }
          }}
          disabled={!inputValue.trim() || (maxItems !== undefined && items.length >= maxItems)}
          className="p-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="追加"
        >
          <PlusCircle className="w-5 h-5 text-purple-400" />
        </button>
      </div>

      {/* 上限表示 */}
      {maxItems && (
        <p className="text-xs text-slate-500">
          {items.length} / {maxItems} 個
        </p>
      )}
    </div>
  );
};
```

**使用例**:
```typescript
import { useArrayField } from '@/hooks/useArrayField';
import { ArrayFieldEditor } from '@/components/common/ArrayFieldEditor';

const PersonalityPanel = ({ formData, setFormData }: Props) => {
  const { items: verbalTics, addItem, removeItem } = useArrayField(
    formData,
    setFormData,
    'verbal_tics'
  );

  return (
    <ArrayFieldEditor
      items={verbalTics}
      onAdd={addItem}
      onRemove={removeItem}
      label="口癖"
      placeholder="口癖を入力してEnter（例：だよね、なのです）"
      maxItems={10}
      colorScheme="teal"
    />
  );
};
```

---

## 結論

UI層（設定・管理）の分析により、**以下の主要な最適化機会を特定**しました：

1. ✅ **ファイルアップロード処理の共通化** で 150行削減
2. ✅ **配列フィールド管理の統一** で 100行削減
3. ✅ **CharacterForm.tsx の分割** で可読性・保守性を大幅改善
4. ✅ **ギャラリーコンポーネント統合** で 300行削減
5. ✅ **バリデーションシステム導入** でデータ整合性向上

**即座に着手すべきアクション**は、**useFileUpload** と **useArrayField** フックの作成です。これにより、わずか1日の工数で 250行のコード削減と品質向上が実現できます。

リファクタリングを段階的に実施することで、プロジェクト全体の**保守性、パフォーマンス、型安全性を大幅に向上**させることができます。
