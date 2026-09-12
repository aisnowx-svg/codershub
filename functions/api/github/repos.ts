/**
 * Cloudflare Pages Function: /api/github/repos
 * Retrieves and syncs repositories accessible to the user's connected GitHub App installation.
 * 
 * Strict rule: NEVER automatically creates public Build Logs, feed posts, or notifications.
 */
import {
  getAuthenticatedUser,
  getSupabaseClient,
  findUserInstallation,
  syncInstallationRepositories,
  jsonResponse,
} from './_shared';

export async function onRequestGet(context: { env: Record<string, string | undefined>; request: Request }) {
  return handleRepos(context);
}

export async function onRequestPost(context: { env: Record<string, string | undefined>; request: Request }) {
  return handleRepos(context);
}

async function handleRepos(context: { env: Record<string, string | undefined>; request: Request }) {
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

    // 3. If installation_id is missing, try to discover it via GitHub App API
    let activeAccount = account;
    if (!account.installation_id) {
      const installation = await findUserInstallation(context.env, account.github_username);
      if (installation?.id) {
        await supabase
          .from('github_accounts')
          .update({ installation_id: installation.id })
          .eq('id', account.id);
        activeAccount = { ...account, installation_id: installation.id };
      }
    }

    // 4. Synchronize accessible repositories using installation token
    const { repositories, authMethod } = await syncInstallationRepositories(
      supabase,
      context.env,
      activeAccount
    );

    return jsonResponse({
      success: true,
      count: repositories.length,
      repositories,
      authMethod,
    });
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'Server error retrieving repositories' }, 500);
  }
}
