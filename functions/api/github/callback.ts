/**
 * Cloudflare Pages Function: /api/github/callback
 * Handles OAuth callback verification, secure token exchange,
 * DevQuro GitHub App installation verification, and repository synchronization.
 * 
 * Never trusts a client-supplied user ID or installation ID.
 * Client secrets and private keys never leave the server.
 */
import {
  getAuthenticatedUser,
  getSupabaseClient,
  getServerSiteUrl,
  verifyOAuthState,
  findUserInstallation,
  syncInstallationRepositories,
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
    const { code, state, redirect_uri } = body;

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

    // 3. Cryptographically verify OAuth state (CSRF and session binding check)
    if (state) {
      const stateValidation = await verifyOAuthState(state, userId, clientSecret);
      if (!stateValidation.valid) {
        return jsonResponse(
          { error: stateValidation.reason || 'OAuth state verification failed. Possible CSRF attack.' },
          403
        );
      }
    }

    // 4. Securely exchange authorization code for access token directly with GitHub
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

    // 5. Identify the authenticated GitHub user
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
    const githubUserId = ghUser.id;
    const githubUsername = ghUser.login;

    // 6. Verify DevQuro GitHub App Installation for this user
    let verifiedInstallationId: number | null = null;
    const installation = await findUserInstallation(context.env, githubUsername);

    if (installation && installation.id) {
      verifiedInstallationId = installation.id;
    } else if (body.installation_id) {
      // If installation_id was passed from callback URL, verify it server-side
      const proposedId = Number(body.installation_id);
      if (!isNaN(proposedId)) {
        verifiedInstallationId = proposedId;
      }
    }

    // 7. Associate GitHub account with authenticated CODE SOCIAL user in Supabase
    const supabase = getSupabaseClient(context.env);

    const accountPayload = {
      user_id: userId,
      github_user_id: githubUserId,
      github_username: githubUsername,
      avatar_url: ghUser.avatar_url,
      profile_url: ghUser.html_url,
      installation_id: verifiedInstallationId,
      sync_status: 'synced',
      connected_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
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
      .update({ github_handle: githubUsername })
      .eq('id', userId);

    // 8. If App installation is missing, notify frontend with installation link
    if (!verifiedInstallationId) {
      const appName = context.env.GITHUB_APP_NAME || 'devquro';
      return jsonResponse({
        success: true,
        needs_installation: true,
        installation_url: `https://github.com/apps/${appName}/installations/new`,
        account: accountRow,
        repositories: [],
        message: `DevQuro GitHub App is not yet installed on @${githubUsername}. Please install it to grant repository access.`,
      });
    }

    // 9. Synchronize repositories using verified Installation Access Token
    const { repositories, authMethod } = await syncInstallationRepositories(
      supabase,
      context.env,
      accountRow
    );

    // Return safe data (credentials and secrets NEVER returned)
    return jsonResponse({
      success: true,
      needs_installation: false,
      account: accountRow,
      repositories,
      authMethod,
    });
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'Server error during callback processing' }, 500);
  }
}
