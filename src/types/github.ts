export type GitHubSyncStatus = 'idle' | 'syncing' | 'synced' | 'failed' | 'cooldown';

export interface GitHubAccount {
  id: string;
  githubUserId: number;
  githubUsername: string;
  avatarUrl: string;
  profileUrl: string;
  publicRepoCount: number;
  totalStars: number;
  connectedAt: string;
  lastSyncedAt: string;
  syncStatus: GitHubSyncStatus;
}

export interface GitHubRepository {
  id: string;
  githubRepoId: number;
  fullName: string;
  name: string;
  ownerLogin: string;
  description: string | null;
  htmlUrl: string;
  defaultBranch: string;
  isPrivate: boolean;
  isFork: boolean;
  primaryLanguage: string | null;
  languages: Record<string, number>;
  starsCount: number;
  forksCount: number;
  openIssuesCount: number;
  pushedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectGitHubRepository {
  id: string;
  projectId: string;
  githubRepoId: number;
  repositoryFullName: string;
  htmlUrl: string;
  defaultBranch: string;
  primaryLanguage: string | null;
  isPrimary: boolean;
  rootDirectory?: string;
  linkedAt: string;
}

export interface GitHubCommit {
  sha: string;
  shortSha: string;
  message: string;
  authorName: string;
  authorDate: string;
  filename: string;
  additions: number;
  deletions: number;
  diffSnippet: string;
}
