import { StateCreator } from 'zustand';

export interface UISlice {
  isLeftSidebarOpen: boolean;
  isRightPanelOpen: boolean;
  isGroupMemberModalOpen: boolean;
  isGroupCreationModalOpen: boolean;
  isScenarioModalOpen: boolean; // シナリオ用モーダル状態を追加
  editingMessageId: string | null; // 編集中のメッセージID
  editingContent: string; // 編集中のテキスト
  toggleLeftSidebar: () => void;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;
  toggleGroupMemberModal: (open?: boolean) => void;
  toggleGroupCreationModal: (open?: boolean) => void;
  toggleScenarioModal: (open?: boolean) => void; // シナリオ用アクションを追加
  startEditingMessage: (messageId: string, content: string) => void; // 編集開始
  cancelEditingMessage: () => void; // 編集キャンセル
  updateEditingContent: (content: string) => void; // 編集内容更新
}

export const createUISlice: StateCreator<UISlice, [], [], UISlice> = (set) => ({
  // 安全なデフォルト値：モバイルでは閉じる
  isLeftSidebarOpen: false,
  isRightPanelOpen: false, // Initially closed
  isGroupMemberModalOpen: false,
  isGroupCreationModalOpen: false,
  isScenarioModalOpen: false, // シナリオ用モーダル状態を追加
  editingMessageId: null,
  editingContent: '',
  toggleLeftSidebar: () => set((state) => ({ isLeftSidebarOpen: !state.isLeftSidebarOpen })),
  toggleRightPanel: () => set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),
  setRightPanelOpen: (open) => set({ isRightPanelOpen: open }),
  toggleGroupMemberModal: (open) => set((state) => ({
    isGroupMemberModalOpen: open !== undefined ? open : !state.isGroupMemberModalOpen
  })),
  toggleGroupCreationModal: (open) => set((state) => ({
    isGroupCreationModalOpen: open !== undefined ? open : !state.isGroupCreationModalOpen
  })),
  toggleScenarioModal: (open) => set((state) => ({
    isScenarioModalOpen: open !== undefined ? open : !state.isScenarioModalOpen
  })),
  startEditingMessage: (messageId, content) => set({
    editingMessageId: messageId,
    editingContent: content
  }),
  cancelEditingMessage: () => set({
    editingMessageId: null,
    editingContent: ''
  }),
  updateEditingContent: (content) => set({
    editingContent: content
  }),
});
