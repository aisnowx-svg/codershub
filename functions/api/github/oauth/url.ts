/**
 * Cloudflare Pages Function: GET /api/github/oauth/url
 * Returns the GitHub App authorization / installation URL
 */
export async function onRequestGet(context: { env: Record<string, string>; request: Request }) {
  const url = new URL(context.request.url);
  const redirectUri = url.searchParams.get('redirect_uri') || `${url.origin}/auth/callback`;
  const state = url.searchParams.get('state') || '';

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
    // If client ID is not yet provided, redirect to app installation
    authUrl = `https://github.com/apps/${appName}/installations/new`;
  }

  return new Response(JSON.stringify({ url: authUrl, clientId: clientId || null }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
