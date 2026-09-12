/**
 * Cloudflare Pages Function: GET /api/github/repos
 * Retrieves repositories accessible to the user's connected GitHub account.
 * 
 * Supports:
 * - Server-side GitHub App authentication via RS256 JWT & installation access token
 * - Syncs safe metadata to Supabase github_repositories
 * - Never returns GitHub credentials or private keys
 */
import {
  getAuthenticatedUser,
  getSupabaseClient,
  generateGitHubAppJwt,
  getInstallationAccessToken,
  jsonResponse,
} from './_shared';

export async function onRequestGet(context: { env: Record<string, string | undefined>; request: Request }) {
  return handleGetRepos(context);
}

export async function onRequestPost(context: { env: Record<string, string | undefined>; request: Request }) {
  return handleGetRepos(context);
}

async function handleGetRepos(context: { env: Record<string, string | undefined>; request: Request }) {
  try {
    // 1. Verify user authentication
    const { user, error: authError } = await getAuthenticatedUser(context.request, context.env);
    if (authError || !user) {
      return jsonResponse({ error: authError || 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient(context.env);

    // 2. Look up connected GitHub account
    const { data: account, error: accError } = await supabase
      .from('github_accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (accError || !account) {
      return jsonResponse({ error: 'No connected GitHub account found for this user' }, 404);
    }

    // Set sync status to syncing
    await supabase
      .from('github_accounts')
      .update({ sync_status: 'syncing' })
      .eq('id', account.id);

    let rawRepos: any[] = [];
    let usedInstallationToken = false;

    // 3. Attempt GitHub App server-side authentication if credentials exist
    const appId = context.env.GITHUB_APP_ID;
    const privateKey = context.env.GITHUB_PRIVATE_KEY;

    if (appId && privateKey) {
      try {
        let installationId = account.installation_id;

        // If installation_id is not saved yet, try to discover it via GitHub App API
        if (!installationId) {
          const appJwt = await generateGitHubAppJwt(appId, privateKey);
          const findInstRes = await fetch(
            `https://api.github.com/users/${encodeURIComponent(account.github_username)}/installation`,
            {
              headers: {
                Authorization: `Bearer ${appJwt}`,
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'DevQuro-CodeSocial',
              },
            }
          );

          if (findInstRes.ok) {
            const instData: any = await findInstRes.json();
            if (instData?.id) {
              installationId = instData.id;
              await supabase
                .from('github_accounts')
                .update({ installation_id: installationId })
                .eq('id', account.id);
            }
          }
        }

        // If installationId is known, obtain installation access token
        if (installationId) {
          const instToken = await getInstallationAccessToken(context.env, installationId);
          if (instToken) {
            const instReposRes = await fetch(
              'https://api.github.com/installation/repositories?per_page=100',
              {
                headers: {
                  Authorization: `Bearer ${instToken}`,
                  Accept: 'application/vnd.github.v3+json',
                  'User-Agent': 'DevQuro-CodeSocial',
                },
              }
            );

            if (instReposRes.ok) {
              const instReposData: any = await instReposRes.json();
              rawRepos = instReposData.repositories || [];
              usedInstallationToken = true;
            }
          }
        }
      } catch (appErr) {
        console.warn('[GitHub App Auth] Could not fetch via installation token:', appErr);
      }
    }

    // 4. Fallback to public repositories if installation token flow didn't yield repos
    if (!usedInstallationToken || rawRepos.length === 0) {
      const publicReposRes = await fetch(
        `https://api.github.com/users/${encodeURIComponent(account.github_username)}/repos?per_page=100&sort=updated`,
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'DevQuro-CodeSocial',
          },
        }
      );

      if (publicReposRes.ok) {
        rawRepos = await publicReposRes.json();
      }
    }

    // 5. Sync safe repository metadata to Supabase github_repositories
    const mappedRepos: any[] = [];
    for (const r of rawRepos) {
      const repoPayload = {
        account_id: account.id,
        github_repo_id: r.id,
        full_name: r.full_name,
        name: r.name,
        description: r.description || '',
        html_url: r.html_url,
        default_branch: r.default_branch || 'main',
        is_private: Boolean(r.private),
        is_fork: Boolean(r.fork),
        primary_language: r.language || '',
        stars_count: r.stargazers_count || 0,
        forks_count: r.forks_count || 0,
        open_issues_count: r.open_issues_count || 0,
        updated_at: new Date().toISOString(),
      };

      const { data: savedRepo } = await supabase
        .from('github_repositories')
        .upsert(repoPayload, { onConflict: 'account_id,github_repo_id' })
        .select('*')
        .single();

      if (savedRepo) {
        mappedRepos.push({
          id: savedRepo.id,
          githubRepoId: Number(savedRepo.github_repo_id),
          fullName: savedRepo.full_name,
          name: savedRepo.name,
          ownerLogin: savedRepo.full_name.split('/')[0] || account.github_username,
          description: savedRepo.description || '',
          htmlUrl: savedRepo.html_url,
          defaultBranch: savedRepo.default_branch || 'main',
          isPrivate: Boolean(savedRepo.is_private),
          isFork: Boolean(savedRepo.is_fork),
          primaryLanguage: savedRepo.primary_language || null,
          starsCount: savedRepo.stars_count || 0,
          forksCount: savedRepo.forks_count || 0,
          openIssuesCount: savedRepo.open_issues_count || 0,
          updatedAt: savedRepo.updated_at,
        });
      }
    }

    // 6. Update account sync timestamp and status
    await supabase
      .from('github_accounts')
      .update({
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        public_repo_count: mappedRepos.length,
      })
      .eq('id', account.id);

    // Return safe data only
    return jsonResponse({
      success: true,
      count: mappedRepos.length,
      repositories: mappedRepos,
      authMethod: usedInstallationToken ? 'github_app_installation' : 'public_metadata',
    });
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'Server error retrieving repositories' }, 500);
  }
}
