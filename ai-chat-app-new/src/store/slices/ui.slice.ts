import { StateCreator } from 'zustand';

export interface UISlice {
  isLeftSidebarOpen: boolean;
  isRightPanelOpen: boolean;
  toggleLeftSidebar: () => void;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;
}

export const createUISlice: StateCreator<UISlice, [], [], UISlice> = (set) => ({
  // 安全なデフォルト値：モバイルでは閉じる
  isLeftSidebarOpen: false, 
  isRightPanelOpen: false, // Initially closed
  toggleLeftSidebar: () => set((state) => ({ isLeftSidebarOpen: !state.isLeftSidebarOpen })),
  toggleRightPanel: () => set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),
  setRightPanelOpen: (open) => set({ isRightPanelOpen: open }),
});
