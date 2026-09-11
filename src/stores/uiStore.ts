import { create } from 'zustand';
import { Project } from '../types';

export type MainTab = 'home' | 'discover' | 'projects' | 'alerts' | 'profile';

export type SubPage = 
  | { type: 'project'; id: string }
  | { type: 'developer'; id: string }
  | { type: 'search'; initialQuery?: string };

interface UIState {
  activeTab: MainTab;
  subPage: SubPage | null;
  buildModalOpen: boolean;
  buildModalTab: 'log' | 'project';
  forkModalData: { project: Project } | null;
  joinModalData: { project: Project } | null;
  sidebarCollapsed: boolean;
  toastMessage: string | null;
  setActiveTab: (tab: MainTab) => void;
  openProjectPage: (id: string) => void;
  openDeveloperProfile: (id: string) => void;
  openSearch: (initialQuery?: string) => void;
  closeSubPage: () => void;
  setBuildModalOpen: (open: boolean, tab?: 'log' | 'project') => void;
  openForkModal: (project: Project) => void;
  closeForkModal: () => void;
  openJoinModal: (project: Project) => void;
  closeJoinModal: () => void;
  showToast: (message: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'home',
  subPage: null,
  buildModalOpen: false,
  buildModalTab: 'log',
  forkModalData: null,
  joinModalData: null,
  sidebarCollapsed: false,
  toastMessage: null,
  setActiveTab: (tab) => set({ activeTab: tab, subPage: null }),
  openProjectPage: (id) => set({ subPage: { type: 'project', id } }),
  openDeveloperProfile: (id) => set({ subPage: { type: 'developer', id } }),
  openSearch: (initialQuery) => set({ subPage: { type: 'search', initialQuery } }),
  closeSubPage: () => set({ subPage: null }),
  setBuildModalOpen: (open, tab) => set({ buildModalOpen: open, buildModalTab: tab || 'log' }),
  openForkModal: (project) => set({ forkModalData: { project } }),
  closeForkModal: () => set({ forkModalData: null }),
  openJoinModal: (project) => set({ joinModalData: { project } }),
  closeJoinModal: () => set({ joinModalData: null }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  showToast: (message) => {
    set({ toastMessage: message });
    setTimeout(() => {
      set((s) => (s.toastMessage === message ? { toastMessage: null } : s));
    }, 3200);
  },
}));
