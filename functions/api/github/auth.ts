/**
 * Cloudflare Pages Function: /api/github/auth
 * Handles GET & POST requests to initiate GitHub App OAuth authorization.
 * Generates an HMAC-SHA256 signed state tied to the authenticated user.
 */
import {
  getAuthenticatedUser,
  generateOAuthState,
  getServerAuthCallbackUrl,
  jsonResponse,
} from './_shared';

export async function onRequestGet(context: { env: Record<string, string | undefined>; request: Request }) {
  return handleAuth(context);
}

export async function onRequestPost(context: { env: Record<string, string | undefined>; request: Request }) {
  return handleAuth(context);
}

async function handleAuth(context: { env: Record<string, string | undefined>; request: Request }) {
  const url = new URL(context.request.url);

  // 1. Authenticate CODE SOCIAL user session (CSRF protection)
  const { user, error: authError } = await getAuthenticatedUser(context.request, context.env);
  if (authError || !user) {
    return jsonResponse(
      { error: authError || 'Authentication required: please sign in to CODE SOCIAL before connecting GitHub.' },
      401
    );
  }

  // 2. Validate GitHub App Client ID
  const clientId = context.env.GITHUB_CLIENT_ID || context.env.VITE_GITHUB_CLIENT_ID;
  if (!clientId || clientId.trim() === '' || clientId.includes('YOUR_GITHUB_APP_CLIENT_ID')) {
    return jsonResponse(
      {
        error:
          'GitHub App Client ID is not configured on the backend. Please add GITHUB_CLIENT_ID in Cloudflare Pages -> Settings -> Environment Variables.',
      },
      500
    );
  }

  const clientSecret = context.env.GITHUB_CLIENT_SECRET;
  if (!clientSecret) {
    return jsonResponse(
      {
        error:
          'GitHub App Client Secret is not configured on the backend. Please add GITHUB_CLIENT_SECRET in Cloudflare Pages -> Settings -> Environment Variables.',
      },
      500
    );
  }

  // 3. Resolve redirect URI with production guarantee (NEVER localhost in prod)
  const clientRedirectUri = url.searchParams.get('redirect_uri');
  const redirectUri = clientRedirectUri || getServerAuthCallbackUrl(context.request, context.env);

  // 4. Generate cryptographically signed state tied to this authenticated user
  const state = await generateOAuthState(user.id, clientSecret);

  // 5. Construct GitHub OAuth authorization URL
  const params = new URLSearchParams({
    client_id: clientId.trim(),
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
      clientId: clientId.trim(),
      state: state,
      redirectUri: redirectUri,
    });
  }

  // Direct browser navigation: redirect to GitHub authorization
  return Response.redirect(authUrl, 302);
}
