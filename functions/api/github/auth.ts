/**
 * Cloudflare Pages Function: /api/github/auth
 * Handles GET & POST requests to initiate GitHub OAuth / App authorization.
 * Keep GitHub authentication logic entirely server-side.
 */
import { jsonResponse } from './_shared';

export async function onRequestGet(context: { env: Record<string, string | undefined>; request: Request }) {
  return handleAuth(context);
}

export async function onRequestPost(context: { env: Record<string, string | undefined>; request: Request }) {
  return handleAuth(context);
}

async function handleAuth(context: { env: Record<string, string | undefined>; request: Request }) {
  const url = new URL(context.request.url);
  const redirectUri = url.searchParams.get('redirect_uri') || `${url.origin}/auth/callback`;
  const state = url.searchParams.get('state') || crypto.randomUUID();

  const clientId = context.env.GITHUB_CLIENT_ID || context.env.VITE_GITHUB_CLIENT_ID;
  const appName = context.env.GITHUB_APP_NAME || 'devquro';

  let authUrl = '';
  if (clientId) {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      state: state,
    });
    authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  } else {
    // If client ID is not configured yet, redirect to GitHub App installation
    authUrl = `https://github.com/apps/${appName}/installations/new`;
  }

  const wantsJson =
    url.searchParams.get('format') === 'json' ||
    context.request.headers.get('Accept')?.includes('application/json') ||
    context.request.method === 'POST';

  if (wantsJson) {
    return jsonResponse({
      url: authUrl,
      clientId: clientId || null,
      state: state,
    });
  }

  // Direct browser navigation: redirect to GitHub authorization
  return Response.redirect(authUrl, 302);
}
