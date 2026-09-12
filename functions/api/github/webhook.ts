/**
 * Cloudflare Pages Function: POST /api/github/webhook
 * Handles incoming GitHub App webhooks.
 * 
 * NOTE: The webhook is NOT activated yet on GitHub.
 * Security & Requirements:
 * - Verifies HMAC SHA-256 (X-Hub-Signature-256)
 * - Rejects invalid signatures with 401
 * - Idempotency tracking via X-GitHub-Delivery
 * - Updates internal GitHub metadata only
 * - NEVER creates public CODE SOCIAL posts or builds
 */
import { getSupabaseClient, jsonResponse } from './_shared';

// In-memory idempotency cache for recent delivery IDs
const processedDeliveries = new Set<string>();

/**
 * Verifies GitHub webhook HMAC SHA-256 signature using Web Crypto API
 */
async function verifySignature(secret: string, header: string, payload: string): Promise<boolean> {
  if (!header || !header.startsWith('sha256=')) return false;
  const signatureHex = header.slice(7);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const hashArray = Array.from(new Uint8Array(signed));
  const expectedHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return signatureHex === expectedHex;
}

export async function onRequestPost(context: { env: Record<string, string | undefined>; request: Request }) {
  try {
    const signature = context.request.headers.get('x-hub-signature-256') || '';
    const event = context.request.headers.get('x-github-event') || '';
    const delivery = context.request.headers.get('x-github-delivery') || '';

    const webhookSecret = context.env.GITHUB_WEBHOOK_SECRET;
    const rawBody = await context.request.text();

    // 1. Verify HMAC SHA-256 signature if webhook secret is configured
    if (webhookSecret) {
      const isValid = await verifySignature(webhookSecret, signature, rawBody);
      if (!isValid) {
        return jsonResponse({ error: 'Invalid HMAC SHA-256 signature' }, 401);
      }
    }

    // 2. Idempotency validation
    if (delivery) {
      if (processedDeliveries.has(delivery)) {
        return jsonResponse({ message: 'Delivery already processed' }, 200);
      }
      processedDeliveries.add(delivery);
      if (processedDeliveries.size > 2000) {
        const [first] = processedDeliveries;
        processedDeliveries.delete(first);
      }
    }

    const payload = JSON.parse(rawBody || '{}');
    const supabase = getSupabaseClient(context.env);

    // 3. Process supported GitHub App Events
    // (Strict rule: NEVER create public CODE SOCIAL posts or builds from commits)
    switch (event) {
      case 'installation_repositories': {
        const installationId = payload.installation?.id;
        if (installationId) {
          const { data: account } = await supabase
            .from('github_accounts')
            .select('id')
            .eq('installation_id', installationId)
            .maybeSingle();

          if (account) {
            // Repositories added to app installation
            for (const repo of payload.repositories_added || []) {
              await supabase.from('github_repositories').upsert(
                {
                  account_id: account.id,
                  github_repo_id: repo.id,
                  full_name: repo.full_name,
                  name: repo.name,
                  html_url: `https://github.com/${repo.full_name}`,
                  is_private: Boolean(repo.private),
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'account_id,github_repo_id' }
              );
            }

            // Repositories removed from app installation
            for (const repo of payload.repositories_removed || []) {
              await supabase
                .from('github_repositories')
                .delete()
                .eq('account_id', account.id)
                .eq('github_repo_id', repo.id);
            }
          }
        }
        break;
      }

      case 'repository': {
        const repoId = payload.repository?.id;
        if (repoId) {
          await supabase
            .from('github_repositories')
            .update({
              name: payload.repository.name,
              full_name: payload.repository.full_name,
              description: payload.repository.description || '',
              html_url: payload.repository.html_url,
              is_private: Boolean(payload.repository.private),
              default_branch: payload.repository.default_branch || 'main',
              stars_count: payload.repository.stargazers_count || 0,
              forks_count: payload.repository.forks_count || 0,
              updated_at: new Date().toISOString(),
            })
            .eq('github_repo_id', repoId);
        }
        break;
      }

      case 'push': {
        // Internal metadata update only - NO public social posts created
        const repoId = payload.repository?.id;
        if (repoId) {
          await supabase
            .from('github_repositories')
            .update({
              stars_count: payload.repository.stargazers_count || 0,
              updated_at: new Date().toISOString(),
            })
            .eq('github_repo_id', repoId);
        }
        break;
      }

      default:
        // Acknowledge other events gracefully
        break;
    }

    return jsonResponse({ ok: true, event, delivery });
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'Error processing webhook' }, 500);
  }
}
