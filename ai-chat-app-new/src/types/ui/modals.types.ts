// src/types/ui/modals.types.ts
import * as React from 'react';

// モーダル型
export interface ModalState {
  is_open: boolean;
  type?: 'confirm' | 'alert' | 'form' | 'custom';
  title?: string;
  content?: React.ReactNode;
  actions?: ModalAction[];
  on_close?: () => void;
}

// モーダルアクション型
export interface ModalAction {
  label: string;
  action: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

// トースト通知型
export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    action: () => void;
  };
}

// ボトムシート型
export interface BottomSheetState {
  is_open: boolean;
  content: React.ReactNode;
  height?: 'auto' | 'full' | number;
  on_close?: () => void;
  swipeable?: boolean;
}
