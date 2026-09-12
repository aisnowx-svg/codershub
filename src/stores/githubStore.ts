import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  GitHubAccount,
  GitHubRepository,
  ProjectGitHubRepository,
} from '../types/github';
import { githubService } from '../services/githubService';

interface GitHubStoreState {
  account: GitHubAccount | null;
  repositories: GitHubRepository[];
  projectLinks: Record<string, ProjectGitHubRepository[]>;
  isSyncing: boolean;
  isConnecting: boolean;
  lastSyncError: string | null;

  // Actions
  loadAccount: (userId: string) => Promise<void>;
  startConnect: () => Promise<void>;
  handleCallback: (code: string, installationId?: string) => Promise<boolean>;
  disconnectAccount: (userId: string) => Promise<boolean>;
  triggerSync: () => Promise<boolean>;
  linkRepositoryToProject: (
    projectId: string,
    repo: GitHubRepository,
    isPrimary?: boolean,
    rootDirectory?: string
  ) => Promise<void>;
  unlinkRepositoryFromProject: (projectId: string, githubRepoId: number) => Promise<void>;
  getProjectRepositories: (projectId: string) => ProjectGitHubRepository[];
  loadProjectRepositories: (projectId: string) => Promise<void>;
  clearError: () => void;
}

export const useGitHubStore = create<GitHubStoreState>()(
  persist(
    (set, get) => ({
      account: null,
      repositories: [],
      projectLinks: {},
      isSyncing: false,
      isConnecting: false,
      lastSyncError: null,

      clearError: () => set({ lastSyncError: null }),

      loadAccount: async (userId: string) => {
        if (!userId) return;
        try {
          const account = await githubService.getStatus(userId);
          if (account) {
            const repositories = await githubService.getRepositories(account.id);
            set({ account, repositories, lastSyncError: null });
          } else {
            set({ account: null, repositories: [] });
          }
        } catch (err: any) {
          console.warn('Error loading GitHub account:', err);
        }
      },

      startConnect: async () => {
        try {
          set({ isConnecting: true, lastSyncError: null });
          const authUrl = await githubService.getAuthUrl();
          if (typeof window !== 'undefined') {
            window.location.href = authUrl;
          }
        } catch (err: any) {
          set({
            isConnecting: false,
            lastSyncError: err.message || 'Failed to start GitHub authorization',
          });
        }
      },

      handleCallback: async (code: string, installationId?: string) => {
        try {
          set({ isConnecting: true, lastSyncError: null });
          const { account, repositories } = await githubService.exchangeCode(code, installationId);
          set({
            account,
            repositories,
            isConnecting: false,
            lastSyncError: null,
          });
          return true;
        } catch (err: any) {
          set({
            isConnecting: false,
            lastSyncError: err.message || 'Failed to complete GitHub authorization',
          });
          return false;
        }
      },

      disconnectAccount: async (userId: string) => {
        try {
          set({ isSyncing: true, lastSyncError: null });
          await githubService.disconnect(userId);
          set({
            account: null,
            repositories: [],
            isSyncing: false,
            lastSyncError: null,
          });
          return true;
        } catch (err: any) {
          set({
            isSyncing: false,
            lastSyncError: err.message || 'Failed to disconnect GitHub account',
          });
          return false;
        }
      },

      triggerSync: async () => {
        const { account } = get();
        if (!account) return false;

        try {
          set({ isSyncing: true, lastSyncError: null });
          const repositories = await githubService.syncRepositories();
          set((state) => ({
            isSyncing: false,
            repositories,
            account: state.account
              ? {
                  ...state.account,
                  lastSyncedAt: new Date().toISOString(),
                  syncStatus: 'synced',
                  publicRepoCount: repositories.length,
                }
              : null,
          }));
          return true;
        } catch (err: any) {
          set({
            isSyncing: false,
            lastSyncError: err.message || 'Failed to sync GitHub repositories',
          });
          return false;
        }
      },

      linkRepositoryToProject: async (projectId, repo, isPrimary = true, rootDirectory) => {
        try {
          const linked = await githubService.linkRepositoryToProject(
            projectId,
            repo.fullName,
            repo.githubRepoId,
            repo.htmlUrl,
            repo.defaultBranch,
            repo.primaryLanguage || 'TypeScript',
            isPrimary,
            rootDirectory
          );

          set((state) => {
            const currentLinks = state.projectLinks[projectId] || [];
            const filtered = currentLinks.filter((l) => l.githubRepoId !== repo.githubRepoId);
            return {
              projectLinks: {
                ...state.projectLinks,
                [projectId]: [...filtered, linked],
              },
            };
          });
        } catch (err: any) {
          console.error('Error linking repo:', err);
        }
      },

      unlinkRepositoryFromProject: async (projectId, githubRepoId) => {
        try {
          await githubService.unlinkRepositoryFromProject(projectId, githubRepoId);
          set((state) => {
            const currentLinks = state.projectLinks[projectId] || [];
            return {
              projectLinks: {
                ...state.projectLinks,
                [projectId]: currentLinks.filter((l) => l.githubRepoId !== githubRepoId),
              },
            };
          });
        } catch (err: any) {
          console.error('Error unlinking repo:', err);
        }
      },

      getProjectRepositories: (projectId) => {
        return get().projectLinks[projectId] || [];
      },

      loadProjectRepositories: async (projectId) => {
        try {
          const repos = await githubService.getLinkedRepositories(projectId);
          set((state) => ({
            projectLinks: {
              ...state.projectLinks,
              [projectId]: repos,
            },
          }));
        } catch (err) {
          console.warn('Error loading linked repositories:', err);
        }
      },
    }),
    {
      name: 'code-social-github-storage-v2',
      partialize: (state) => ({
        account: state.account,
        repositories: state.repositories,
      }),
    }
  )
);
