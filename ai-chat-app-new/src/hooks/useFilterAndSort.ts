import { useMemo } from 'react';

// Tはジェネリック型で、ソート・フィルタリング対象のオブジェクト型（CharacterやPersonaなど）
// KはTのキーの型（検索用）
// SKはソートキーの型（検索キーとは別に指定可能）
type SortOption = `${string}_${'asc' | 'desc'}`;

interface UseFilterAndSortProps<T, K extends keyof T> {
  data: T[];
  searchTerm: string;
  searchKeys: K[]; // 検索対象とするキーの配列
  sortOption: SortOption;
  // ネストしたオブジェクトのキーを扱えるように、キーまたはキーへのパスを指定
  sortKeys?: { [key: string]: (item: T) => string | number | Date };
}

export function useFilterAndSort<T, K extends keyof T>({
  data,
  searchTerm,
  searchKeys,
  sortOption,
  sortKeys,
}: UseFilterAndSortProps<T, K>) {
  const filteredAndSortedData = useMemo(() => {
    // 1. Filtering Logic
    const filtered = data.filter(item => {
      if (!searchTerm) return true;
      // searchKeysで指定された各キーの値を検索
      return searchKeys.some(key => {
        const value = item[key];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        if (Array.isArray(value)) {
          return value.some(tag =>
            typeof tag === 'string' && tag.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        return false;
      });
    });

    // 2. Sorting Logic - Safe destructuring
    const parts = sortOption?.split('_') || [];
    const [field = '', direction = 'asc'] = parts.length >= 2
      ? parts as [string, 'asc' | 'desc']
      : ['', 'asc'] as [string, 'asc' | 'desc'];
    
    const sorted = [...filtered].sort((a, b) => {
      let valA, valB;

      // sortKeysにカスタムのアクセサ関数が定義されていればそれを使用
      if (field && sortKeys && field in sortKeys) {
        valA = sortKeys[field as keyof typeof sortKeys]!(a);
        valB = sortKeys[field as keyof typeof sortKeys]!(b);
      } else if (field && field in (a as Record<string, unknown>)) {
        // デフォルトの動作：オブジェクトのプロパティを直接参照
        const recordA = a as Record<string, unknown>;
        const recordB = b as Record<string, unknown>;
        valA = recordA[field];
        valB = recordB[field];
      } else {
        valA = 0;
        valB = 0;
      }
      
      // 値がnullやundefinedの場合のフォールバック
      valA = valA ?? 0;
      valB = valB ?? 0;

      // 日付文字列の可能性がある場合はDateオブジェクトに変換して比較
      if (typeof valA === 'string' && !isNaN(Date.parse(valA)) &&
          typeof valB === 'string' && !isNaN(Date.parse(valB))) {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [data, searchTerm, searchKeys, sortOption, sortKeys]);

  return filteredAndSortedData;
}
