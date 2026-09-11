import { supabase } from '../lib/supabase';
import { GitHubAccount, ProjectGitHubRepository } from '../types/github';

export const githubService = {
  /**
   * Retrieves GitHub account details for a developer
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
    };
  },

  /**
   * Records a linked GitHub account in the database
   */
  async connect(userId: string, username: string): Promise<GitHubAccount> {
    const cleanUsername = username.trim().replace(/^@/, '');
    const payload = {
      user_id: userId,
      github_username: cleanUsername,
      avatarUrl: `https://avatars.githubusercontent.com/u/${cleanUsername}?v=4`,
      profileUrl: `https://github.com/${cleanUsername}`,
      public_repo_count: 0,
      total_stars: 0,
      sync_status: 'synced',
      connected_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    };

    const { data: row, error } = await supabase
      .from('github_accounts')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error) {
      // Fallback in memory object
      return {
        id: `gh-${Date.now()}`,
        githubUserId: 0,
        githubUsername: cleanUsername,
        avatarUrl: `https://avatars.githubusercontent.com/${cleanUsername}`,
        profileUrl: `https://github.com/${cleanUsername}`,
        publicRepoCount: 0,
        totalStars: 0,
        connectedAt: new Date().toISOString(),
        lastSyncedAt: 'Just now',
        syncStatus: 'synced',
      };
    }

    // Also update github_handle on user profile
    await supabase.from('profiles').update({ github_handle: cleanUsername }).eq('id', userId);

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
      syncStatus: 'synced',
    };
  },

  /**
   * Disconnects GitHub account
   */
  async disconnect(userId: string): Promise<boolean> {
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
    githubRepoId?: number
  ): Promise<ProjectGitHubRepository> {
    const repoId = githubRepoId || Date.now();
    const payload = {
      project_id: projectId,
      github_repo_id: repoId,
      repository_full_name: repoFullName,
      html_url: `https://github.com/${repoFullName}`,
      default_branch: 'main',
      primary_language: 'TypeScript',
      is_primary: true,
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
      .update({ repository_url: `https://github.com/${repoFullName}` })
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
};
