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

    // Verify user
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid user session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;

    // Get GitHub account for this user
    const { data: account, error: accError } = await supabase
      .from('github_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (accError || !account) {
      return new Response(JSON.stringify({ error: 'No linked GitHub account found for this user' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Set sync status to syncing
    await supabase
      .from('github_accounts')
      .update({ sync_status: 'syncing' })
      .eq('id', account.id);

    // Fetch public and accessible repositories from GitHub for this user
    const ghRes = await fetch(`https://api.github.com/users/${account.github_username}/repos?per_page=100&sort=updated`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DevQuro-CodeSocial',
      },
    });

    if (!ghRes.ok) {
      await supabase
        .from('github_accounts')
        .update({ sync_status: 'failed' })
        .eq('id', account.id);

      return new Response(JSON.stringify({ error: 'Failed to fetch repositories from GitHub' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const repos = await ghRes.json();
    const mapped = [];

    for (const r of repos) {
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

      if (savedRepo) mapped.push(savedRepo);
    }

    // Update account synced_at and status
    await supabase
      .from('github_accounts')
      .update({
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        public_repo_count: repos.length,
      })
      .eq('id', account.id);

    return new Response(JSON.stringify({ success: true, count: mapped.length, repositories: mapped }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal sync error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
