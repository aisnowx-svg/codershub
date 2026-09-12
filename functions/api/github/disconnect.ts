/**
 * Cloudflare Pages Function: POST /api/github/disconnect
 * Safely unlinks the authenticated user's GitHub account and clears synced repositories.
 */
import {
  getAuthenticatedUser,
  getSupabaseClient,
  jsonResponse,
} from './_shared';

export async function onRequestPost(context: { env: Record<string, string | undefined>; request: Request }) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(context.request, context.env);
    if (authError || !user) {
      return jsonResponse({ error: authError || 'Authentication required' }, 401);
    }

    const supabase = getSupabaseClient(context.env);

    // Delete github_accounts record (cascades to github_repositories)
    const { error: deleteError } = await supabase
      .from('github_accounts')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      return jsonResponse({ error: `Failed to disconnect account: ${deleteError.message}` }, 500);
    }

    // Clear github_handle on profile
    await supabase
      .from('profiles')
      .update({ github_handle: '' })
      .eq('id', user.id);

    return jsonResponse({
      success: true,
      message: 'GitHub account disconnected successfully',
    });
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'Server error during disconnect' }, 500);
  }
}
