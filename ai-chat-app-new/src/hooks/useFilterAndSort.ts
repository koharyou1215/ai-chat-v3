import { useMemo } from 'react';

// Tはジェネリック型で、ソート・フィルタリング対象のオブジェクト型（CharacterやPersonaなど）
// KはTのキーの型
type SortOption<K> = `${string & K}_${'asc' | 'desc'}`;

interface UseFilterAndSortProps<T, K extends keyof T> {
  data: T[];
  searchTerm: string;
  searchKeys: K[]; // 検索対象とするキーの配列
  sortOption: SortOption<K>;
  // ネストしたオブジェクトのキーを扱えるように、キーまたはキーへのパスを指定
  sortKeys?: { [key in string & K]?: (item: T) => string | number | Date };
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
      ? parts as [string & K, 'asc' | 'desc']
      : ['', 'asc'] as [string & K, 'asc' | 'desc'];
    
    const sorted = [...filtered].sort((a, b) => {
      let valA, valB;

      // sortKeysにカスタムのアクセサ関数が定義されていればそれを使用
      if (sortKeys && sortKeys[field]) {
        valA = sortKeys[field]!(a);
        valB = sortKeys[field]!(b);
      } else {
        // デフォルトの動作：オブジェクトのプロパティを直接参照
        valA = a[field];
        valB = b[field];
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
