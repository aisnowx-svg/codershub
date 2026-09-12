/**
 * Cloudflare Pages Function: /api/github/auth
 * Handles GET & POST requests to initiate GitHub OAuth / App authorization.
 * Keep GitHub authentication logic entirely server-side.
 */
import { jsonResponse, getServerAuthCallbackUrl } from './_shared';

export async function onRequestGet(context: { env: Record<string, string | undefined>; request: Request }) {
  return handleAuth(context);
}

export async function onRequestPost(context: { env: Record<string, string | undefined>; request: Request }) {
  return handleAuth(context);
}

async function handleAuth(context: { env: Record<string, string | undefined>; request: Request }) {
  const url = new URL(context.request.url);
  const redirectUri = url.searchParams.get('redirect_uri') || getServerAuthCallbackUrl(context.request, context.env);
  const state = url.searchParams.get('state') || crypto.randomUUID();

  const clientId = context.env.GITHUB_CLIENT_ID || context.env.VITE_GITHUB_CLIENT_ID;
  const appName = context.env.GITHUB_APP_NAME || 'devquro';

  if (!clientId) {
    return jsonResponse(
      {
        error: 'GITHUB_CLIENT_ID is not configured on the backend. Please add GITHUB_CLIENT_ID in Cloudflare Pages -> Settings -> Environment Variables.',
      },
      500
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state: state,
  });
  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

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
