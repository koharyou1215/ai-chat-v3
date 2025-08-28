import { StateCreator } from 'zustand';

export interface UISlice {
  isLeftSidebarOpen: boolean;
  isRightPanelOpen: boolean;
  isGroupMemberModalOpen: boolean;
  isGroupCreationModalOpen: boolean;
  isScenarioModalOpen: boolean; // シナリオ用モーダル状態を追加
  toggleLeftSidebar: () => void;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;
  toggleGroupMemberModal: (open?: boolean) => void;
  toggleGroupCreationModal: (open?: boolean) => void;
  toggleScenarioModal: (open?: boolean) => void; // シナリオ用アクションを追加
}

export const createUISlice: StateCreator<UISlice, [], [], UISlice> = (set) => ({
  // 安全なデフォルト値：モバイルでは閉じる
  isLeftSidebarOpen: false, 
  isRightPanelOpen: false, // Initially closed
  isGroupMemberModalOpen: false,
  isGroupCreationModalOpen: false,
  isScenarioModalOpen: false, // シナリオ用モーダル状態を追加
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
});
