/**
 * Standalone Node.js Backend Server for CODE SOCIAL GitHub Integration
 * Can be run locally via: npx tsx server/index.ts
 * Or deployed as a standalone Node service on Render, Railway, Fly.io, Docker.
 */
import http from 'http';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const PORT = process.env.PORT || 3001;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://xcwizfrvceacokchguwz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0YNf1JbY7nmn67CI1z7lDw_v-81E5x6';

const GITHUB_APP_ID = process.env.GITHUB_APP_ID || '4917548';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || process.env.VITE_GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function sendJson(res: http.ServerResponse, status: number, data: any) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-hub-signature-256, x-github-event, x-github-delivery',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(JSON.stringify(data));
}

function parseBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost:3001'}`);
  const pathname = parsedUrl.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-hub-signature-256, x-github-event, x-github-delivery',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    });
    res.end();
    return;
  }

  try {
    // 1. GET /api/github/oauth/url
    if (req.method === 'GET' && pathname === '/api/github/oauth/url') {
      const redirectUri = parsedUrl.searchParams.get('redirect_uri') || 'https://codershub-kqi.pages.dev/auth/callback';
      const state = parsedUrl.searchParams.get('state') || '';

      let authUrl = '';
      if (GITHUB_CLIENT_ID) {
        const params = new URLSearchParams({
          client_id: GITHUB_CLIENT_ID,
          redirect_uri: redirectUri,
          state: state,
        });
        authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
      } else {
        authUrl = 'https://github.com/apps/devquro/installations/new';
      }

      return sendJson(res, 200, { url: authUrl, clientId: GITHUB_CLIENT_ID || null });
    }

    // 2. POST /api/github/oauth/exchange
    if (req.method === 'POST' && pathname === '/api/github/oauth/exchange') {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();

      if (!token) {
        return sendJson(res, 401, { error: 'Missing authorization session token' });
      }

      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (userError || !userData?.user) {
        return sendJson(res, 401, { error: 'Invalid user session' });
      }

      const raw = await parseBody(req);
      const body = JSON.parse(raw || '{}');
      const { code, installation_id, redirect_uri } = body;

      if (!code) {
        return sendJson(res, 400, { error: 'Missing code' });
      }

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'DevQuro-CodeSocial',
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
          redirect_uri,
        }),
      });

      const tokenData: any = await tokenRes.json();
      if (!tokenData.access_token) {
        return sendJson(res, 400, {
          error: tokenData.error_description || tokenData.error || 'Failed to exchange GitHub authorization code',
        });
      }

      const ghUserRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'DevQuro-CodeSocial',
        },
      });

      const ghUser: any = await ghUserRes.json();

      let repos: any[] = [];
      const ghReposRes = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'DevQuro-CodeSocial',
        },
      });
      if (ghReposRes.ok) {
        repos = await ghReposRes.json();
      }

      const accountPayload = {
        user_id: userData.user.id,
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
        return sendJson(res, 500, { error: accountError.message });
      }

      await supabase.from('profiles').update({ github_handle: ghUser.login }).eq('id', userData.user.id);

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

        const { data: saved } = await supabase
          .from('github_repositories')
          .upsert(repoPayload, { onConflict: 'account_id,github_repo_id' })
          .select('*')
          .single();

        if (saved) mappedRepos.push(saved);
      }

      return sendJson(res, 200, { success: true, account: accountRow, repositories: mappedRepos });
    }

    // 3. POST /api/github/sync
    if (req.method === 'POST' && pathname === '/api/github/sync') {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();

      const { data: userData } = await supabase.auth.getUser(token);
      if (!userData?.user) return sendJson(res, 401, { error: 'Unauthorized' });

      const { data: account } = await supabase
        .from('github_accounts')
        .select('*')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (!account) return sendJson(res, 404, { error: 'Account not found' });

      const ghRes = await fetch(`https://api.github.com/users/${account.github_username}/repos?per_page=100&sort=updated`, {
        headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'DevQuro-CodeSocial' },
      });

      const repos = await ghRes.json();
      const mapped = [];

      for (const r of repos) {
        const { data: saved } = await supabase.from('github_repositories').upsert(
          {
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
          },
          { onConflict: 'account_id,github_repo_id' }
        ).select('*').single();
        if (saved) mapped.push(saved);
      }

      await supabase.from('github_accounts').update({
        last_synced_at: new Date().toISOString(),
        public_repo_count: repos.length,
        sync_status: 'synced',
      }).eq('id', account.id);

      return sendJson(res, 200, { success: true, count: mapped.length, repositories: mapped });
    }

    // 4. POST /api/github/webhook
    if (req.method === 'POST' && pathname === '/api/github/webhook') {
      const signature = req.headers['x-hub-signature-256'] as string || '';
      const event = req.headers['x-github-event'] as string || '';
      const raw = await parseBody(req);

      if (GITHUB_WEBHOOK_SECRET) {
        const hmac = crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET);
        hmac.update(raw);
        const digest = `sha256=${hmac.digest('hex')}`;
        if (signature !== digest) {
          return sendJson(res, 401, { error: 'Invalid signature' });
        }
      }

      return sendJson(res, 200, { ok: true, event });
    }

    // 404 for unknown endpoints
    sendJson(res, 404, { error: 'Endpoint not found' });
  } catch (err: any) {
    sendJson(res, 500, { error: err.message || 'Server error' });
  }
});

server.listen(PORT, () => {
  console.log(`[+] CODE SOCIAL GitHub Backend Server running on http://localhost:${PORT}`);
});
