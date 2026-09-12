import { createClient } from '@supabase/supabase-js';

// Idempotency cache for delivery IDs in memory
const processedDeliveries = new Set<string>();

/**
 * Verify GitHub webhook HMAC SHA256 signature
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

export async function onRequestPost(context: { env: Record<string, string>; request: Request }) {
  try {
    const signature = context.request.headers.get('x-hub-signature-256') || '';
    const event = context.request.headers.get('x-github-event') || '';
    const delivery = context.request.headers.get('x-github-delivery') || '';

    const webhookSecret = context.env.GITHUB_WEBHOOK_SECRET;

    const rawBody = await context.request.text();

    // Verify signature if webhook secret is configured
    if (webhookSecret) {
      const isValid = await verifySignature(webhookSecret, signature, rawBody);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Invalid HMAC SHA-256 signature' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Idempotency check
    if (delivery) {
      if (processedDeliveries.has(delivery)) {
        return new Response(JSON.stringify({ message: 'Delivery already processed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      processedDeliveries.add(delivery);
      if (processedDeliveries.size > 2000) {
        // prune cache
        const [first] = processedDeliveries;
        processedDeliveries.delete(first);
      }
    }

    const payload = JSON.parse(rawBody);

    const supabaseUrl = context.env.SUPABASE_URL || context.env.VITE_SUPABASE_URL || 'https://xcwizfrvceacokchguwz.supabase.co';
    const supabaseKey = context.env.SUPABASE_SERVICE_ROLE_KEY || context.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0YNf1JbY7nmn67CI1z7lDw_v-81E5x6';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Process GitHub App Events (DO NOT create public CODE SOCIAL posts or build logs)
    switch (event) {
      case 'installation_repositories': {
        // Repository access added or removed
        const installationId = payload.installation?.id;
        if (installationId) {
          const { data: account } = await supabase
            .from('github_accounts')
            .select('id')
            .eq('installation_id', installationId)
            .maybeSingle();

          if (account) {
            // Repositories added
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

            // Repositories removed
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
        // Repository updated, edited, or renamed
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
        // Push event: strictly update internal repository metadata (pushed_at)
        // NOT creating public CODE SOCIAL posts
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
        // Other events acknowledged without modification
        break;
    }

    return new Response(JSON.stringify({ ok: true, event, delivery }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error processing webhook' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
