// src/hooks/useArrayField.ts
import { useCallback } from 'react';

/**
 * 配列型フィールドの追加・削除・更新を統一管理するカスタムフック
 *
 * @template T - フォームデータの型
 * @param {T | null} formData - 現在のフォームデータ
 * @param {Function} setFormData - フォームデータの更新関数
 * @param {keyof T} fieldName - 対象の配列フィールド名
 * @returns {object} 配列操作関数群 (items, addItem, removeItem, updateItem, clearAll)
 *
 * @example
 * ```tsx
 * const { items, addItem, removeItem } = useArrayField(
 *   formData,
 *   setFormData,
 *   'verbal_tics'
 * );
 *
 * <input
 *   onKeyPress={(e) => {
 *     if (e.key === 'Enter' && e.currentTarget.value.trim()) {
 *       addItem(e.currentTarget.value.trim());
 *       e.currentTarget.value = '';
 *     }
 *   }}
 * />
 * ```
 */
export const useArrayField = <T,>(
  formData: T | null,
  setFormData: React.Dispatch<React.SetStateAction<T | null>>,
  fieldName: keyof T
) => {
  const items = (formData && formData[fieldName] ? formData[fieldName] as unknown as string[] : []);

  const addItem = useCallback(
    (item: string) => {
      if (!item.trim()) return;

      setFormData((prev) => {
        if (!prev) return prev;
        const currentItems = (prev[fieldName] as unknown as string[]) || [];

        // 重複チェック
        if (currentItems.includes(item.trim())) {
          return prev;
        }

        return {
          ...prev,
          [fieldName]: [...currentItems, item.trim()],
        } as T;
      });
    },
    [setFormData, fieldName]
  );

  const removeItem = useCallback(
    (index: number) => {
      setFormData((prev) => {
        if (!prev) return prev;
        const currentItems = (prev[fieldName] as unknown as string[]) || [];
        return {
          ...prev,
          [fieldName]: currentItems.filter((_, i) => i !== index),
        } as T;
      });
    },
    [setFormData, fieldName]
  );

  const updateItem = useCallback(
    (index: number, value: string) => {
      setFormData((prev) => {
        if (!prev) return prev;
        const currentItems = (prev[fieldName] as unknown as string[]) || [];
        const newItems = [...currentItems];
        newItems[index] = value;
        return {
          ...prev,
          [fieldName]: newItems,
        } as T;
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
      } as T;
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
