import { supabase } from '../lib/supabase';
import { GitHubAccount, GitHubRepository, ProjectGitHubRepository } from '../types/github';
import { getAuthCallbackUrl } from '../utils/url';

export interface GitHubExchangeResult {
  account: GitHubAccount;
  repositories: GitHubRepository[];
  needsInstallation?: boolean;
  installationUrl?: string;
  message?: string;
}

export const githubService = {
  /**
   * Generates or fetches the GitHub OAuth / App authorization URL.
   * Authenticates with session token so the backend generates an HMAC-signed state.
   */
  async getAuthUrl(redirectUri?: string): Promise<string> {
    const callback = redirectUri || getAuthCallbackUrl();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(
        `/api/github/auth?format=json&redirect_uri=${encodeURIComponent(callback)}`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.url) return data.url;
      } else {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.error) {
          throw new Error(errorData.error);
        }
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch')) {
        throw err;
      }
      // Endpoint not reached (e.g. offline dev without server)
    }

    const clientId = (import.meta as any).env?.VITE_GITHUB_CLIENT_ID;
    if (clientId && !clientId.includes('YOUR_GITHUB_APP_CLIENT_ID')) {
      const clientState = crypto.randomUUID();
      return `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
        clientId.trim()
      )}&redirect_uri=${encodeURIComponent(callback)}&state=${encodeURIComponent(clientState)}`;
    }

    throw new Error(
      'GitHub App Client ID is not configured. Please add GITHUB_CLIENT_ID in Cloudflare Pages -> Settings -> Environment Variables and VITE_GITHUB_CLIENT_ID in .env.'
    );
  },

  /**
   * Exchanges GitHub authorization code for access token via backend service.
   * Sends code, state, and installation_id to /api/github/callback.
   */
  async exchangeCode(
    code: string,
    installationId?: string,
    redirectUri?: string,
    state?: string
  ): Promise<GitHubExchangeResult> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      throw new Error('Authentication required: please sign in to CODE SOCIAL first.');
    }

    const callback = redirectUri || getAuthCallbackUrl();

    const res = await fetch('/api/github/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        code,
        installation_id: installationId ? Number(installationId) : undefined,
        redirect_uri: callback,
        state,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to connect GitHub account via server');
    }

    const row = data.account;
    const account: GitHubAccount = {
      id: row.id,
      githubUserId: Number(row.github_user_id) || 0,
      githubUsername: row.github_username,
      avatarUrl: row.avatar_url || '',
      profileUrl: row.profile_url || `https://github.com/${row.github_username}`,
      publicRepoCount: row.public_repo_count || 0,
      totalStars: row.total_stars || 0,
      connectedAt: row.connected_at,
      lastSyncedAt: row.last_synced_at,
      syncStatus: (row.sync_status as any) || 'synced',
      installationId: row.installation_id ? Number(row.installation_id) : undefined,
    };

    const repositories: GitHubRepository[] = (data.repositories || []).map((r: any) => ({
      id: r.id,
      githubRepoId: Number(r.github_repo_id),
      fullName: r.full_name,
      name: r.name,
      ownerLogin: r.full_name.split('/')[0] || row.github_username,
      description: r.description || '',
      htmlUrl: r.html_url,
      defaultBranch: r.default_branch || 'main',
      isPrivate: Boolean(r.is_private),
      isFork: Boolean(r.is_fork),
      primaryLanguage: r.primary_language || null,
      languages: r.languages || {},
      starsCount: r.stars_count || 0,
      forksCount: r.forks_count || 0,
      openIssuesCount: r.open_issues_count || 0,
      pushedAt: r.updated_at || new Date().toISOString(),
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || new Date().toISOString(),
    }));

    return {
      account,
      repositories,
      needsInstallation: Boolean(data.needs_installation),
      installationUrl: data.installation_url,
      message: data.message,
    };
  },

  /**
   * Retrieves GitHub account details for a developer from Supabase
   */
  async getStatus(userId: string): Promise<GitHubAccount | null> {
    const { data: row, error } = await supabase
      .from('github_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !row) return null;

    return {
      id: row.id,
      githubUserId: Number(row.github_user_id) || 0,
      githubUsername: row.github_username,
      avatarUrl: row.avatar_url || '',
      profileUrl: row.profile_url || `https://github.com/${row.github_username}`,
      publicRepoCount: row.public_repo_count || 0,
      totalStars: row.total_stars || 0,
      connectedAt: row.connected_at,
      lastSyncedAt: row.last_synced_at,
      syncStatus: (row.sync_status as any) || 'synced',
      installationId: row.installation_id ? Number(row.installation_id) : undefined,
    };
  },

  /**
   * Retrieves repositories for a given account from Supabase
   */
  async getRepositories(accountId: string): Promise<GitHubRepository[]> {
    const { data: rows, error } = await supabase
      .from('github_repositories')
      .select('*')
      .eq('account_id', accountId)
      .order('updated_at', { ascending: false });

    if (error || !rows) return [];

    return rows.map((r: any) => ({
      id: r.id,
      githubRepoId: Number(r.github_repo_id),
      fullName: r.full_name,
      name: r.name,
      ownerLogin: r.full_name.split('/')[0] || '',
      description: r.description || '',
      htmlUrl: r.html_url,
      defaultBranch: r.default_branch || 'main',
      isPrivate: Boolean(r.is_private),
      isFork: Boolean(r.is_fork),
      primaryLanguage: r.primary_language || null,
      languages: r.languages || {},
      starsCount: r.stars_count || 0,
      forksCount: r.forks_count || 0,
      openIssuesCount: r.open_issues_count || 0,
      pushedAt: r.updated_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  /**
   * Triggers a repository sync via backend
   */
  async syncRepositories(): Promise<GitHubRepository[]> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) throw new Error('Not authenticated');

    const res = await fetch('/api/github/repos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to sync repositories');
    }

    return (data.repositories || []).map((r: any) => ({
      id: r.id,
      githubRepoId: Number(r.github_repo_id),
      fullName: r.full_name,
      name: r.name,
      ownerLogin: r.full_name.split('/')[0] || '',
      description: r.description || '',
      htmlUrl: r.html_url,
      defaultBranch: r.default_branch || 'main',
      isPrivate: Boolean(r.is_private),
      isFork: Boolean(r.is_fork),
      primaryLanguage: r.primary_language || null,
      languages: r.languages || {},
      starsCount: r.stars_count || 0,
      forksCount: r.forks_count || 0,
      openIssuesCount: r.open_issues_count || 0,
      pushedAt: r.updated_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  /**
   * Disconnects GitHub account safely via server and database
   */
  async disconnect(userId: string): Promise<boolean> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (token) {
      try {
        await fetch('/api/github/disconnect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.warn('[GitHub Disconnect] Backend endpoint warning:', err);
      }
    }

    // Direct database cleanup via Supabase RLS as safeguard
    await supabase.from('github_accounts').delete().eq('user_id', userId);
    await supabase.from('profiles').update({ github_handle: '' }).eq('id', userId);
    return true;
  },

  /**
   * Retrieves repositories linked to a specific CODE SOCIAL project
   */
  async getLinkedRepositories(projectId: string): Promise<ProjectGitHubRepository[]> {
    const { data: rows, error } = await supabase
      .from('project_github_repositories')
      .select('*')
      .eq('project_id', projectId);

    if (error || !rows) return [];

    return rows.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      githubRepoId: Number(r.github_repo_id),
      repositoryFullName: r.repository_full_name,
      htmlUrl: r.html_url,
      defaultBranch: r.default_branch || 'main',
      primaryLanguage: r.primary_language || 'TypeScript',
      isPrimary: r.is_primary,
      rootDirectory: r.root_directory || undefined,
      linkedAt: r.linked_at,
    }));
  },

  /**
   * Links a GitHub repository to a project
   */
  async linkRepositoryToProject(
    projectId: string,
    repoFullName: string,
    githubRepoId?: number,
    htmlUrl?: string,
    defaultBranch = 'main',
    primaryLanguage = 'TypeScript',
    isPrimary = true,
    rootDirectory?: string
  ): Promise<ProjectGitHubRepository> {
    const repoId = githubRepoId || Date.now();
    const payload = {
      project_id: projectId,
      github_repo_id: repoId,
      repository_full_name: repoFullName,
      html_url: htmlUrl || `https://github.com/${repoFullName}`,
      default_branch: defaultBranch,
      primary_language: primaryLanguage,
      is_primary: isPrimary,
      root_directory: rootDirectory || null,
      linked_at: new Date().toISOString(),
    };

    const { data: row, error } = await supabase
      .from('project_github_repositories')
      .upsert(payload, { onConflict: 'project_id,github_repo_id' })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Error linking repo: ${error.message}`);
    }

    // Update project repository_url
    await supabase
      .from('projects')
      .update({ repository_url: payload.html_url })
      .eq('id', projectId);

    return {
      id: row.id,
      projectId: row.project_id,
      githubRepoId: Number(row.github_repo_id),
      repositoryFullName: row.repository_full_name,
      htmlUrl: row.html_url,
      defaultBranch: row.default_branch,
      primaryLanguage: row.primary_language,
      isPrimary: row.is_primary,
      linkedAt: row.linked_at,
    };
  },

  /**
   * Unlinks a GitHub repository from a project
   */
  async unlinkRepositoryFromProject(projectId: string, githubRepoId: number): Promise<boolean> {
    const { error } = await supabase
      .from('project_github_repositories')
      .delete()
      .eq('project_id', projectId)
      .eq('github_repo_id', githubRepoId);

    if (error) {
      throw new Error(`Error unlinking repo: ${error.message}`);
    }

    return true;
  },
};
