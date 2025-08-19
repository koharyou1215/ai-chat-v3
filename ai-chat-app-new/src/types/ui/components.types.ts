// src/types/ui/components.types.ts
import * as React from 'react';

// ドロップダウンアイテム型
export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ComponentType;
  action?: () => void;
  disabled?: boolean;
  separator?: boolean;
  children?: DropdownItem[];
}

// タブ型
export interface Tab {
  id: string;
  label: string;
  icon?: React.ComponentType;
  content: React.ReactNode;
  disabled?: boolean;
  badge?: string | number;
}

// ページネーション型
export interface Pagination {
  current_page: number;
  total_pages: number;
  per_page: number;
  total_items: number;
  has_previous: boolean;
  has_next: boolean;
}

// フィルター型
export interface Filter {
  id: string;
  type: 'text' | 'select' | 'multiselect' | 'range' | 'date' | 'boolean';
  label: string;
  value: unknown;
  options?: FilterOption[];
  placeholder?: string;
}

// フィルターオプション型
export interface FilterOption {
  value: unknown;
  label: string;
  count?: number;
}

// ソート型
export interface Sort {
  field: string;
  direction: 'asc' | 'desc';
}

// ローディング状態型
export interface LoadingState {
  is_loading: boolean;
  message?: string;
  progress?: number;
}

// エラー状態型
export interface ErrorState {
  has_error: boolean;
  message?: string;
  code?: string;
  retry?: () => void;
}

// アクションメニュー項目型
export interface ActionMenuItem {
  id: string;
  label: string;
  icon: React.ComponentType;
  action: () => void;
  type?: 'character' | 'persona' | 'history' | 'model' | 'voice' | 'settings';
  badge?: string | number;
  disabled?: boolean;
}

// ギャラリーソート型
export interface GallerySort {
  field: 'name' | 'created_at' | 'last_used' | 'usage_count';
  direction: 'asc' | 'desc';
  label: string;
}

// アニメーション状態型
export interface AnimationState {
  sending: boolean;
  waiting: boolean;
  suggesting: boolean;
  enhancing: boolean;
  typing: boolean;
}

// パネル表示状態型
export interface PanelState {
  tracker_panel: {
    visible: boolean;
    position: 'left' | 'right';
    width: number;
  };
  action_menu: {
    visible: boolean;
    position: { x: number; y: number };
  };
}
