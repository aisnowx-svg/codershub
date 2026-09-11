import { apiClient, ApiResponse } from './client';
import { GitHubAccount, GitHubRepository, GitHubCommit, ProjectGitHubRepository } from '../types/github';

// Realistic mock GitHub repositories for the authenticated developer
const MOCK_GITHUB_REPOSITORIES: GitHubRepository[] = [
  {
    id: 'gh-repo-1',
    githubRepoId: 8941203,
    fullName: 'developer/snowbrain',
    name: 'snowbrain',
    ownerLogin: 'developer',
    description: 'Local AI reasoning engine with memory-mapped quantization and sub-30ms execution.',
    htmlUrl: 'https://github.com/developer/snowbrain',
    defaultBranch: 'main',
    isPrivate: false,
    isFork: false,
    primaryLanguage: 'Python',
    languages: { Python: 72000, Rust: 48000, C: 12000 },
    starsCount: 2140,
    forksCount: 184,
    openIssuesCount: 12,
    pushedAt: '2026-03-08T14:32:00Z',
    createdAt: '2025-11-10T08:00:00Z',
    updatedAt: '2026-03-08T14:32:00Z',
  },
  {
    id: 'gh-repo-2',
    githubRepoId: 9841244,
    fullName: 'developer/nova-ai',
    name: 'nova-ai',
    ownerLogin: 'developer',
    description: 'High-throughput async streaming model inference runtime for production GPUs.',
    htmlUrl: 'https://github.com/developer/nova-ai',
    defaultBranch: 'main',
    isPrivate: false,
    isFork: false,
    primaryLanguage: 'Python',
    languages: { Python: 89000, Cuda: 34000, Shell: 2400 },
    starsCount: 1280,
    forksCount: 142,
    openIssuesCount: 8,
    pushedAt: '2026-03-09T18:15:00Z',
    createdAt: '2025-12-04T12:00:00Z',
    updatedAt: '2026-03-09T18:15:00Z',
  },
  {
    id: 'gh-repo-3',
    githubRepoId: 1042301,
    fullName: 'developer/ghost-kernel',
    name: 'ghost-kernel',
    ownerLogin: 'developer',
    description: 'Experimental capability-based microkernel written in bare-metal Rust.',
    htmlUrl: 'https://github.com/developer/ghost-kernel',
    defaultBranch: 'master',
    isPrivate: false,
    isFork: false,
    primaryLanguage: 'Rust',
    languages: { Rust: 124000, Assembly: 8400 },
    starsCount: 3450,
    forksCount: 289,
    openIssuesCount: 19,
    pushedAt: '2026-03-10T11:45:00Z',
    createdAt: '2025-08-14T09:30:00Z',
    updatedAt: '2026-03-10T11:45:00Z',
  },
  {
    id: 'gh-repo-4',
    githubRepoId: 1184920,
    fullName: 'developer/vector-mesh',
    name: 'vector-mesh',
    ownerLogin: 'developer',
    description: 'Distributed vector database partitioned across Raft consensus groups in Go.',
    htmlUrl: 'https://github.com/developer/vector-mesh',
    defaultBranch: 'main',
    isPrivate: false,
    isFork: false,
    primaryLanguage: 'Go',
    languages: { Go: 94000 },
    starsCount: 940,
    forksCount: 88,
    openIssuesCount: 5,
    pushedAt: '2026-03-07T09:20:00Z',
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-03-07T09:20:00Z',
  }
];

export const MOCK_COMMITS_BY_REPO: Record<string, GitHubCommit[]> = {
  'developer/snowbrain': [
    {
      sha: 'a89c2f10b7d34e89',
      shortSha: 'a89c2f1',
      message: 'feat: add memory-mapped dynamic tensor cache for local inference',
      authorName: 'Developer',
      authorDate: '2 hours ago',
      filename: 'src/inference/mmap_tensor.rs',
      additions: 142,
      deletions: 18,
      diffSnippet: `+pub struct MmapTensorCache {\n+    inner: Arc<RwLock<MmapHandle>>,\n+    cache_lines: Vec<CacheBlock>,\n+}\n+\n+impl MmapTensorCache {\n+    pub fn load_quantized(&self, layer_id: usize) -> Result<TensorView> {\n+        self.inner.read().map_slice(layer_id)\n+    }\n+}`,
    },
    {
      sha: 'f4b301c23849182a',
      shortSha: 'f4b301c',
      message: 'perf: optimize attention score quantization to 4-bit weights',
      authorName: 'Developer',
      authorDate: 'Yesterday',
      filename: 'core/attention.py',
      additions: 89,
      deletions: 43,
      diffSnippet: `-def compute_qkv(x, w_q, w_k, w_v):\n+def compute_qkv_quantized(x, packed_weights, scales):\n+    return fast_matmul_int4(x, packed_weights, scales)`,
    },
  ],
};

let linkedReposCache: ProjectGitHubRepository[] = [
  {
    id: 'link-1',
    projectId: 'proj-snowbrain',
    githubRepoId: 8941203,
    repositoryFullName: 'developer/snowbrain',
    htmlUrl: 'https://github.com/developer/snowbrain',
    defaultBranch: 'main',
    primaryLanguage: 'Python',
    isPrimary: true,
    linkedAt: '2026-01-10T10:00:00Z',
  },
];

export const githubApi = {
  async getStatus(): Promise<ApiResponse<GitHubAccount | null>> {
    await apiClient.simulateLatency(30);
    const mockAccount: GitHubAccount = {
      id: 'gh-acc-1',
      githubUserId: 4829103,
      githubUsername: 'developer',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      profileUrl: 'https://github.com/developer',
      publicRepoCount: 4,
      totalStars: 7810,
      connectedAt: '2026-01-01T00:00:00Z',
      lastSyncedAt: 'Just now',
      syncStatus: 'synced',
    };
    return apiClient.wrapSuccess(mockAccount);
  },

  async connect(username: string): Promise<ApiResponse<GitHubAccount>> {
    await apiClient.simulateLatency(150);
    const account: GitHubAccount = {
      id: `gh-${Date.now()}`,
      githubUserId: 9948211,
      githubUsername: username || 'developer',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      profileUrl: `https://github.com/${username || 'developer'}`,
      publicRepoCount: MOCK_GITHUB_REPOSITORIES.length,
      totalStars: 7810,
      connectedAt: new Date().toISOString(),
      lastSyncedAt: 'Just now',
      syncStatus: 'synced',
    };
    return apiClient.wrapSuccess(account, `Connected GitHub account @${account.githubUsername}`);
  },

  async disconnect(): Promise<ApiResponse<boolean>> {
    await apiClient.simulateLatency(60);
    return apiClient.wrapSuccess(true, 'Disconnected GitHub account');
  },

  async getRepositories(): Promise<ApiResponse<GitHubRepository[]>> {
    await apiClient.simulateLatency(70);
    return apiClient.wrapSuccess(MOCK_GITHUB_REPOSITORIES);
  },

  async getLinkedRepositories(projectId: string): Promise<ApiResponse<ProjectGitHubRepository[]>> {
    await apiClient.simulateLatency(40);
    const filtered = linkedReposCache.filter((r) => r.projectId === projectId);
    return apiClient.wrapSuccess(filtered);
  },

  async linkRepositoryToProject(
    projectId: string,
    repositoryFullName: string
  ): Promise<ApiResponse<ProjectGitHubRepository>> {
    await apiClient.simulateLatency(90);
    const repo = MOCK_GITHUB_REPOSITORIES.find((r) => r.fullName === repositoryFullName);
    const newLink: ProjectGitHubRepository = {
      id: `link-${Date.now()}`,
      projectId,
      githubRepoId: repo ? repo.githubRepoId : Date.now(),
      repositoryFullName,
      htmlUrl: repo ? repo.htmlUrl : `https://github.com/${repositoryFullName}`,
      defaultBranch: repo ? repo.defaultBranch : 'main',
      primaryLanguage: repo ? repo.primaryLanguage : 'TypeScript',
      isPrimary: true,
      linkedAt: new Date().toISOString(),
    };

    linkedReposCache = [...linkedReposCache.filter((l) => l.projectId !== projectId), newLink];
    return apiClient.wrapSuccess(newLink, `Linked ${repositoryFullName} to project`);
  },

  async getRecentCommits(repositoryFullName: string): Promise<ApiResponse<GitHubCommit[]>> {
    await apiClient.simulateLatency(60);
    const commits = MOCK_COMMITS_BY_REPO[repositoryFullName] || MOCK_COMMITS_BY_REPO['developer/snowbrain'] || [];
    return apiClient.wrapSuccess(commits);
  },
};
