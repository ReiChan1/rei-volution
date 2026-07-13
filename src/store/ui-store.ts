import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  pinModal: {
    open: boolean;
    reason: string;
    onSuccess: (() => void) | null;
  };
  requestPin: (reason: string, onSuccess: () => void) => void;
  closePinModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  pinModal: { open: false, reason: "", onSuccess: null },
  requestPin: (reason, onSuccess) =>
    set({ pinModal: { open: true, reason, onSuccess } }),
  closePinModal: () =>
    set({ pinModal: { open: false, reason: "", onSuccess: null } }),
}));
