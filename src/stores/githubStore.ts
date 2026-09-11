import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  GitHubAccount,
  GitHubRepository,
  ProjectGitHubRepository,
  GitHubCommit,
} from '../types/github';

interface GitHubStoreState {
  account: GitHubAccount | null;
  repositories: GitHubRepository[];
  projectLinks: Record<string, ProjectGitHubRepository[]>;
  isSyncing: boolean;
  lastSyncError: string | null;

  // Actions
  connectAccount: (username: string) => Promise<boolean>;
  disconnectAccount: () => void;
  triggerSync: () => Promise<boolean>;
  linkRepositoryToProject: (
    projectId: string,
    repo: GitHubRepository,
    isPrimary?: boolean,
    rootDirectory?: string
  ) => void;
  unlinkRepositoryFromProject: (projectId: string, githubRepoId: number) => void;
  getProjectRepositories: (projectId: string) => ProjectGitHubRepository[];
  getCommitsForRepo: (repoFullName: string) => GitHubCommit[];
}

// Simulated mock repositories returned on initial sync
const generateMockRepos = (username: string): GitHubRepository[] => [
  {
    id: `gh-repo-1`,
    githubRepoId: 1019283,
    fullName: `${username}/snowbrain-runtime`,
    name: 'snowbrain-runtime',
    ownerLogin: username,
    description: 'High-performance tensor caching and quantized execution runtime in Rust',
    htmlUrl: `https://github.com/${username}/snowbrain-runtime`,
    defaultBranch: 'main',
    isPrivate: false,
    isFork: false,
    primaryLanguage: 'Rust',
    languages: { Rust: 84000, Python: 12000, C: 4500 },
    starsCount: 42,
    forksCount: 6,
    openIssuesCount: 3,
    pushedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: `gh-repo-2`,
    githubRepoId: 1019284,
    fullName: `${username}/distributed-kv`,
    name: 'distributed-kv',
    ownerLogin: username,
    description: 'In-memory persistent key-value store using io_uring async dispatch',
    htmlUrl: `https://github.com/${username}/distributed-kv`,
    defaultBranch: 'main',
    isPrivate: false,
    isFork: false,
    primaryLanguage: 'Go',
    languages: { Go: 48000, Assembly: 2300 },
    starsCount: 18,
    forksCount: 2,
    openIssuesCount: 1,
    pushedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    createdAt: '2025-02-01T12:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: `gh-repo-3`,
    githubRepoId: 1019285,
    fullName: `${username}/webgpu-kernels`,
    name: 'webgpu-kernels',
    ownerLogin: username,
    description: 'Custom compute shader pipelines for client-side matrix multiplication',
    htmlUrl: `https://github.com/${username}/webgpu-kernels`,
    defaultBranch: 'main',
    isPrivate: false,
    isFork: false,
    primaryLanguage: 'TypeScript',
    languages: { TypeScript: 32000, WGSL: 15000 },
    starsCount: 89,
    forksCount: 11,
    openIssuesCount: 4,
    pushedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    createdAt: '2024-11-15T08:30:00Z',
    updatedAt: new Date().toISOString(),
  },
];

// Simulated recent commits for on-demand diff snippet picking in Build Modal
const MOCK_COMMITS: Record<string, GitHubCommit[]> = {
  default: [
    {
      sha: 'a81f3ce45b2019ab9284cf789123049102830192',
      shortSha: 'a81f3ce',
      message: 'feat(runtime): implement lock-free ringbuffer for async tensor dispatch',
      authorName: 'You',
      authorDate: '2 hours ago',
      filename: 'src/runtime/ring_buffer.rs',
      additions: 48,
      deletions: 12,
      diffSnippet: `+ pub struct LockFreeRingBuffer<T: Send> {\n+     head: AtomicUsize,\n+     tail: AtomicUsize,\n+     buffer: Vec<MaybeUninit<T>>,\n+ }\n+\n+ impl<T: Send> LockFreeRingBuffer<T> {\n+     pub fn push(&self, value: T) -> Result<(), QueueFull> {\n+         // Lock-free CAS pointer increment\n+         let current_tail = self.tail.load(Ordering::Acquire);\n+         ...\n+     }\n+ }`,
    },
    {
      sha: 'e92f10b784910204859182390184029481029384',
      shortSha: 'e92f10b',
      message: 'perf(cuda): zero-copy unified memory paging across compute passes',
      authorName: 'You',
      authorDate: '1 day ago',
      filename: 'crates/compute/unified_slice.rs',
      additions: 32,
      deletions: 6,
      diffSnippet: `+ let mut stream = CudaStream::new()?;\n+ let slice = tensor.as_unified_slice();\n+ stream.launch_kernel(kernel, grid, block, &[slice])?;`,
    },
    {
      sha: 'c47120a819284019283019283019283019283019',
      shortSha: 'c47120a',
      message: 'fix(protocol): handle backpressure when token stream saturates client bandwidth',
      authorName: 'You',
      authorDate: '3 days ago',
      filename: 'src/transport/sse_stream.rs',
      additions: 19,
      deletions: 5,
      diffSnippet: `+ match stream.poll_ready(cx) {\n+     Poll::Ready(Ok(())) => self.sink.start_send(frame),\n+     Poll::Pending => Ok(Backpressure::Throttled),\n+ }`,
    },
  ],
};

export const useGitHubStore = create<GitHubStoreState>()(
  persist(
    (set, get) => ({
      account: null,
      repositories: [],
      projectLinks: {},
      isSyncing: false,
      lastSyncError: null,

      connectAccount: async (username: string) => {
        set({ isSyncing: true, lastSyncError: null });
        // Simulate backend OAuth token exchange & initial sync
        await new Promise((resolve) => setTimeout(resolve, 800));

        const cleanUsername = username.trim().replace(/^@/, '');
        const mockRepos = generateMockRepos(cleanUsername);

        const newAccount: GitHubAccount = {
          id: `gh-acc-${Date.now()}`,
          githubUserId: 8492019,
          githubUsername: cleanUsername,
          avatarUrl: `https://avatars.githubusercontent.com/u/8492019?v=4`,
          profileUrl: `https://github.com/${cleanUsername}`,
          publicRepoCount: mockRepos.length,
          totalStars: mockRepos.reduce((acc, r) => acc + r.starsCount, 0),
          connectedAt: new Date().toISOString(),
          lastSyncedAt: new Date().toISOString(),
          syncStatus: 'synced',
        };

        set({
          account: newAccount,
          repositories: mockRepos,
          isSyncing: false,
        });

        return true;
      },

      disconnectAccount: () => {
        set({
          account: null,
          repositories: [],
          projectLinks: {},
          isSyncing: false,
          lastSyncError: null,
        });
      },

      triggerSync: async () => {
        const { account } = get();
        if (!account) return false;

        set({ isSyncing: true, lastSyncError: null });
        await new Promise((resolve) => setTimeout(resolve, 600));

        const refreshedRepos = generateMockRepos(account.githubUsername);

        set((state) => ({
          isSyncing: false,
          repositories: refreshedRepos,
          account: state.account
            ? {
                ...state.account,
                lastSyncedAt: new Date().toISOString(),
                syncStatus: 'synced',
              }
            : null,
        }));

        return true;
      },

      linkRepositoryToProject: (projectId, repo, isPrimary = true, rootDirectory) => {
        set((state) => {
          const currentLinks = state.projectLinks[projectId] || [];
          // Avoid duplicate link
          if (currentLinks.some((l) => l.githubRepoId === repo.githubRepoId)) {
            return state;
          }

          const newLink: ProjectGitHubRepository = {
            id: `pgr-${Date.now()}`,
            projectId,
            githubRepoId: repo.githubRepoId,
            repositoryFullName: repo.fullName,
            htmlUrl: repo.htmlUrl,
            defaultBranch: repo.defaultBranch,
            primaryLanguage: repo.primaryLanguage,
            isPrimary,
            rootDirectory,
            linkedAt: new Date().toISOString(),
          };

          return {
            projectLinks: {
              ...state.projectLinks,
              [projectId]: [...currentLinks, newLink],
            },
          };
        });
      },

      unlinkRepositoryFromProject: (projectId, githubRepoId) => {
        set((state) => {
          const currentLinks = state.projectLinks[projectId] || [];
          return {
            projectLinks: {
              ...state.projectLinks,
              [projectId]: currentLinks.filter((l) => l.githubRepoId !== githubRepoId),
            },
          };
        });
      },

      getProjectRepositories: (projectId) => {
        return get().projectLinks[projectId] || [];
      },

      getCommitsForRepo: (repoFullName) => {
        return MOCK_COMMITS[repoFullName] || MOCK_COMMITS['default'];
      },
    }),
    {
      name: 'code-social-github-integration-v1',
    }
  )
);
