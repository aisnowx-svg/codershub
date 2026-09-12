import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context: { env: Record<string, string>; request: Request }) {
  try {
    const authHeader = context.request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing authorization session token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = context.env.SUPABASE_URL || context.env.VITE_SUPABASE_URL || 'https://xcwizfrvceacokchguwz.supabase.co';
    const supabaseKey = context.env.SUPABASE_SERVICE_ROLE_KEY || context.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0YNf1JbY7nmn67CI1z7lDw_v-81E5x6';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authenticated user from token
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired user session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;
    const body = await context.request.json().catch(() => ({}));
    const { code, installation_id, redirect_uri } = body;

    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing GitHub authorization code' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const clientId = context.env.GITHUB_CLIENT_ID || context.env.VITE_GITHUB_CLIENT_ID;
    const clientSecret = context.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({
          error: 'GitHub OAuth Client ID or Client Secret is not configured on the backend',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Exchange code for GitHub Access Token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
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

    const tokenData: any = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      return new Response(
        JSON.stringify({
          error: tokenData.error_description || tokenData.error || 'Failed to exchange GitHub authorization code',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch authenticated GitHub user
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DevQuro-CodeSocial',
      },
    });

    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: 'Failed to retrieve GitHub profile data' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ghUser: any = await userRes.json();

    // 3. Fetch repositories accessible to this token / installation
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

    // 4. Upsert into Supabase github_accounts
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
      return new Response(
        JSON.stringify({ error: `Failed to save GitHub account: ${accountError.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Update user profile github_handle
    await supabase
      .from('profiles')
      .update({ github_handle: ghUser.login })
      .eq('id', userId);

    // 6. Upsert repositories into github_repositories
    const mappedRepos = [];
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

    return new Response(
      JSON.stringify({
        success: true,
        account: accountRow,
        repositories: mappedRepos,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error during GitHub exchange' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
