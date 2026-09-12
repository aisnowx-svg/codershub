/**
 * Cloudflare Pages Function: /api/github/callback
 * Handles OAuth callback verification, secure token exchange,
 * and linking GitHub accounts to the authenticated CODE SOCIAL user.
 * 
 * Never trusts a client-supplied user ID.
 * Client secrets and private keys never leave the server.
 */
import {
  getAuthenticatedUser,
  getSupabaseClient,
  getServerSiteUrl,
  jsonResponse,
} from './_shared';

/**
 * Handles browser redirect from GitHub OAuth flow
 */
export async function onRequestGet(context: { env: Record<string, string | undefined>; request: Request }) {
  const url = new URL(context.request.url);
  const siteUrl = getServerSiteUrl(context.request, context.env);
  const errorParam = url.searchParams.get('error');
  const errorDesc = url.searchParams.get('error_description');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const installationId = url.searchParams.get('installation_id');

  // If user declined or GitHub encountered an error, redirect to CODE SOCIAL callback page with error
  if (errorParam) {
    const target = new URL('/auth/callback', siteUrl);
    target.searchParams.set('error', errorParam);
    if (errorDesc) target.searchParams.set('error_description', errorDesc);
    return Response.redirect(target.toString(), 302);
  }

  // If code is present, forward to frontend callback page to complete authenticated exchange
  if (code) {
    const target = new URL('/auth/callback', siteUrl);
    target.searchParams.set('code', code);
    if (state) target.searchParams.set('state', state);
    if (installationId) target.searchParams.set('installation_id', installationId);
    return Response.redirect(target.toString(), 302);
  }

  // Missing code or error parameter
  const target = new URL('/profile', siteUrl);
  target.searchParams.set('error', 'invalid_github_callback');
  return Response.redirect(target.toString(), 302);
}

/**
 * Handles secure code exchange from authenticated React frontend
 */
export async function onRequestPost(context: { env: Record<string, string | undefined>; request: Request }) {
  try {
    // 1. Authenticate CODE SOCIAL user session
    const { user, error: authError } = await getAuthenticatedUser(context.request, context.env);
    if (authError || !user) {
      return jsonResponse({ error: authError || 'Authentication required: please sign in first' }, 401);
    }

    const userId = user.id; // Trusted ID from verified JWT session

    // 2. Parse request body
    const body: any = await context.request.json().catch(() => ({}));
    const { code, installation_id, redirect_uri } = body;

    if (!code) {
      return jsonResponse({ error: 'Missing GitHub authorization code' }, 400);
    }

    const clientId = context.env.GITHUB_CLIENT_ID || context.env.VITE_GITHUB_CLIENT_ID;
    const clientSecret = context.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return jsonResponse(
        { error: 'GitHub App OAuth secrets (GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET) are not configured on the backend' },
        500
      );
    }

    // 3. Securely exchange authorization code for access token directly with GitHub
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'DevQuro-CodeSocial',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri,
      }),
    });

    const tokenData: any = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
      return jsonResponse(
        {
          error:
            tokenData.error_description ||
            tokenData.error ||
            'Failed to exchange authorization code with GitHub',
        },
        400
      );
    }

    const accessToken = tokenData.access_token;

    // 4. Identify the GitHub user
    const ghUserRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DevQuro-CodeSocial',
      },
    });

    if (!ghUserRes.ok) {
      return jsonResponse({ error: 'Failed to retrieve GitHub user profile' }, 502);
    }

    const ghUser: any = await ghUserRes.json();

    // 5. Fetch accessible repositories for this user
    let repos: any[] = [];
    const reposRes = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DevQuro-CodeSocial',
      },
    });

    if (reposRes.ok) {
      repos = await reposRes.json();
    }

    // 6. Associate GitHub account with authenticated CODE SOCIAL user in Supabase
    const supabase = getSupabaseClient(context.env);

    const accountPayload = {
      user_id: userId,
      github_user_id: ghUser.id,
      github_username: ghUser.login,
      avatar_url: ghUser.avatar_url,
      profile_url: ghUser.html_url,
      public_repo_count: ghUser.public_repos || 0,
      total_stars: 0,
      sync_status: 'synced',
      connected_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      installation_id: installation_id ? Number(installation_id) : null,
    };

    const { data: accountRow, error: accountError } = await supabase
      .from('github_accounts')
      .upsert(accountPayload, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (accountError) {
      return jsonResponse({ error: `Failed to link GitHub account: ${accountError.message}` }, 500);
    }

    // Update profiles table handle
    await supabase
      .from('profiles')
      .update({ github_handle: ghUser.login })
      .eq('id', userId);

    // 7. Sync repository metadata into github_repositories
    const mappedRepos: any[] = [];
    for (const r of repos) {
      const repoPayload = {
        account_id: accountRow.id,
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
        mappedRepos.push(savedRepo);
      }
    }

    // Return safe data (credentials and secrets NEVER returned)
    return jsonResponse({
      success: true,
      account: accountRow,
      repositories: mappedRepos,
    });
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'Server error during callback processing' }, 500);
  }
}
