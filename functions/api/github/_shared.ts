/**
 * Shared Utilities for Cloudflare Pages Functions
 * Handles Supabase connections, User Session validation,
 * cryptographic OAuth state generation/verification,
 * and Web Crypto API RSA RS256 JWT generation for GitHub App authentication.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Env {
  // GitHub App server-side secrets (Configured in Cloudflare Pages Variables & Secrets / .dev.vars)
  GITHUB_APP_ID?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_PRIVATE_KEY?: string;
  GITHUB_WEBHOOK_SECRET?: string;
  GITHUB_APP_NAME?: string;

  // Supabase
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_GITHUB_CLIENT_ID?: string;
  VITE_SITE_URL?: string;
  SITE_URL?: string;
}

export const CANONICAL_PRODUCTION_URL = 'https://codershub-kqi.pages.dev';

/**
 * Resolves the server-side site origin with zero localhost fallback in production.
 */
export function getServerSiteUrl(request: Request, env: Record<string, string | undefined>): string {
  const url = new URL(request.url);
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';

  if (isLocal) {
    return url.origin;
  }

  const configured = env.VITE_SITE_URL || env.SITE_URL;
  if (configured && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
    return configured.replace(/\/+$/, '');
  }

  if (url.origin && !url.origin.includes('localhost') && !url.origin.includes('127.0.0.1')) {
    return url.origin;
  }

  return CANONICAL_PRODUCTION_URL;
}

/**
 * Resolves the server-side auth callback URL.
 */
export function getServerAuthCallbackUrl(request: Request, env: Record<string, string | undefined>): string {
  return `${getServerSiteUrl(request, env)}/auth/callback`;
}

/**
 * Returns a configured Supabase client.
 * Prioritizes SUPABASE_SERVICE_ROLE_KEY if present for administrative backend operations.
 */
export function getSupabaseClient(env: Record<string, string | undefined>): SupabaseClient {
  const url =
    env.SUPABASE_URL ||
    env.VITE_SUPABASE_URL ||
    'https://xcwizfrvceacokchguwz.supabase.co';

  const key =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    'sb_publishable_0YNf1JbY7nmn67CI1z7lDw_v-81E5x6';

  return createClient(url, key);
}

/**
 * Authenticates the CODE SOCIAL user from the Authorization header Bearer token.
 * Never trusts any client-supplied user ID.
 */
export async function getAuthenticatedUser(request: Request, env: Record<string, string | undefined>) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { user: null, error: 'Missing authorization session token' };
  }

  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return { user: null, error: 'Invalid or expired user session' };
  }

  return { user: data.user, error: null };
}

/**
 * Utility: Standard JSON response with security headers
 */
export function jsonResponse(data: any, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

/**
 * Base64 string to Uint8Array helper
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64.replace(/\s+/g, ''));
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Helper to concatenate multiple Uint8Arrays
 */
function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, val) => acc + val.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }
  return result;
}

/**
 * Helper to encode ASN.1 length
 */
function encodeAsn1Length(len: number): Uint8Array {
  if (len < 128) {
    return new Uint8Array([len]);
  } else if (len < 256) {
    return new Uint8Array([0x81, len]);
  } else {
    return new Uint8Array([0x82, (len >> 8) & 0xff, len & 0xff]);
  }
}

/**
 * Imports an RSA private key PEM (supporting both PKCS#1 and PKCS#8) using Web Crypto API.
 */
export async function importRsaPrivateKey(pem: string): Promise<CryptoKey> {
  const normalizedPem = pem.replace(/\\n/g, '\n').trim();
  const cleanPem = normalizedPem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = base64ToUint8Array(cleanPem);

  if (normalizedPem.includes('BEGIN RSA PRIVATE KEY')) {
    // Convert PKCS#1 to PKCS#8 DER
    const version = new Uint8Array([0x02, 0x01, 0x00]);
    const algorithm = new Uint8Array([
      0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
    ]);
    const octetString = concatUint8Arrays([
      new Uint8Array([0x04]),
      encodeAsn1Length(der.length),
      der,
    ]);
    const sequenceContent = concatUint8Arrays([version, algorithm, octetString]);
    const pkcs8Der = concatUint8Arrays([
      new Uint8Array([0x30]),
      encodeAsn1Length(sequenceContent.length),
      sequenceContent,
    ]);

    return crypto.subtle.importKey(
      'pkcs8',
      pkcs8Der,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
  } else {
    // Already PKCS#8 DER
    return crypto.subtle.importKey(
      'pkcs8',
      der,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
  }
}

/**
 * Generates an RS256 JWT for GitHub App authentication using Web Crypto API.
 */
export async function generateGitHubAppJwt(appId: string, privateKeyPem: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60, // 60 seconds clock drift allowance
    exp: now + 10 * 60, // 10 minutes maximum expiration
    iss: appId,
  };

  const encodeBase64Url = (str: string) =>
    btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const unsignedToken = `${encodeBase64Url(JSON.stringify(header))}.${encodeBase64Url(
    JSON.stringify(payload)
  )}`;

  const cryptoKey = await importRsaPrivateKey(privateKeyPem);
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureBytes = new Uint8Array(signatureBuffer);
  let binaryString = '';
  for (let i = 0; i < signatureBytes.length; i++) {
    binaryString += String.fromCharCode(signatureBytes[i]);
  }
  const encodedSignature = btoa(binaryString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${unsignedToken}.${encodedSignature}`;
}

/**
 * Obtains an installation access token for a GitHub App installation.
 */
export async function getInstallationAccessToken(
  env: Record<string, string | undefined>,
  installationId: number | string
): Promise<string | null> {
  const appId = env.GITHUB_APP_ID;
  const privateKey = env.GITHUB_PRIVATE_KEY;

  if (!appId || !privateKey) {
    return null;
  }

  try {
    const appJwt = await generateGitHubAppJwt(appId, privateKey);
    const tokenRes = await fetch(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${appJwt}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'DevQuro-CodeSocial',
        },
      }
    );

    if (!tokenRes.ok) {
      console.warn(`[GitHub App] Failed to obtain installation token for installation ${installationId}: ${tokenRes.status}`);
      return null;
    }

    const data: any = await tokenRes.json();
    return data.token || null;
  } catch (err) {
    console.error('[GitHub App] Error creating installation token:', err);
    return null;
  }
}

// ======================================================================
// Cryptographic HMAC-SHA256 OAuth State
// ======================================================================

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generates an HMAC-SHA256 signed OAuth state parameter tied to the authenticated user ID.
 */
export async function generateOAuthState(userId: string, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const payload = `${userId}:${now}:${nonce}`;
  const sig = await hmacSha256Hex(secret, payload);
  const token = `${payload}:${sig}`;
  return btoa(token).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Verifies an HMAC-SHA256 signed OAuth state parameter against the authenticated user ID.
 * Protects against CSRF and replay attacks. 15-minute validity window.
 */
export async function verifyOAuthState(
  state: string,
  expectedUserId: string,
  secret: string
): Promise<{ valid: boolean; reason?: string }> {
  if (!state || typeof state !== 'string') {
    return { valid: false, reason: 'Missing OAuth state parameter' };
  }

  try {
    let base64 = state.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';
    const decoded = atob(base64);

    const parts = decoded.split(':');
    if (parts.length !== 4) {
      return { valid: false, reason: 'Malformed OAuth state structure' };
    }

    const [userId, timestampStr, nonce, sig] = parts;
    const timestamp = parseInt(timestampStr, 10);
    const now = Math.floor(Date.now() / 1000);

    // 1. Validate expiration (15 minutes = 900 seconds)
    if (isNaN(timestamp) || now - timestamp > 900 || timestamp - now > 60) {
      return { valid: false, reason: 'OAuth state has expired. Please try connecting again.' };
    }

    // 2. Validate cryptographic signature
    const expectedPayload = `${userId}:${timestampStr}:${nonce}`;
    const expectedSig = await hmacSha256Hex(secret, expectedPayload);

    if (expectedSig !== sig) {
      return { valid: false, reason: 'Invalid OAuth state signature (CSRF protection)' };
    }

    // 3. Validate user ownership
    if (userId !== expectedUserId) {
      return { valid: false, reason: 'OAuth state was initiated by a different user session' };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, reason: `Failed to decode OAuth state: ${err.message}` };
  }
}

// ======================================================================
// GitHub App Installation Verification & Repository Sync
// ======================================================================

/**
 * Looks up the DevQuro GitHub App installation for a user using the App JWT.
 */
export async function findUserInstallation(
  env: Record<string, string | undefined>,
  githubUsername: string
): Promise<{ id: number; account: { id: number; login: string } } | null> {
  const appId = env.GITHUB_APP_ID;
  const privateKey = env.GITHUB_PRIVATE_KEY;

  if (!appId || !privateKey) return null;

  try {
    const appJwt = await generateGitHubAppJwt(appId, privateKey);
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(githubUsername)}/installation`, {
      headers: {
        Authorization: `Bearer ${appJwt}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DevQuro-CodeSocial',
      },
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      console.warn(`[GitHub App] Error checking installation for ${githubUsername}: ${res.status}`);
      return null;
    }

    const data: any = await res.json();
    return {
      id: data.id,
      account: {
        id: data.account?.id,
        login: data.account?.login,
      },
    };
  } catch (err) {
    console.error('[GitHub App] findUserInstallation error:', err);
    return null;
  }
}

/**
 * Syncs repositories accessible to the GitHub App installation into public.github_repositories.
 * Strict rule: NEVER creates public Build Logs, feed posts, or notifications from commits.
 */
export async function syncInstallationRepositories(
  supabase: SupabaseClient,
  env: Record<string, string | undefined>,
  account: { id: string; installation_id?: number | null; github_username: string }
): Promise<{ repositories: any[]; authMethod: string }> {
  let rawRepos: any[] = [];
  let usedInstallation = false;

  if (account.installation_id) {
    const token = await getInstallationAccessToken(env, account.installation_id);
    if (token) {
      const res = await fetch('https://api.github.com/installation/repositories?per_page=100', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'DevQuro-CodeSocial',
        },
      });

      if (res.ok) {
        const data: any = await res.json();
        rawRepos = data.repositories || [];
        usedInstallation = true;
      }
    }
  }

  // Fallback to public repositories if installation access token was unavailable
  if (!usedInstallation || rawRepos.length === 0) {
    const publicRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(account.github_username)}/repos?per_page=100&sort=updated`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'DevQuro-CodeSocial',
        },
      }
    );
    if (publicRes.ok) {
      rawRepos = await publicRes.json();
    }
  }

  // Upsert into Supabase
  const mappedRepos: any[] = [];
  const accessibleRepoIds = new Set<number>();

  for (const r of rawRepos) {
    accessibleRepoIds.add(r.id);
    const repoPayload = {
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
    };

    const { data: saved } = await supabase
      .from('github_repositories')
      .upsert(repoPayload, { onConflict: 'account_id,github_repo_id' })
      .select('*')
      .single();

    if (saved) {
      mappedRepos.push({
        id: saved.id,
        githubRepoId: Number(saved.github_repo_id),
        fullName: saved.full_name,
        name: saved.name,
        ownerLogin: saved.full_name.split('/')[0] || account.github_username,
        description: saved.description || '',
        htmlUrl: saved.html_url,
        defaultBranch: saved.default_branch || 'main',
        isPrivate: Boolean(saved.is_private),
        isFork: Boolean(saved.is_fork),
        primaryLanguage: saved.primary_language || null,
        starsCount: saved.stars_count || 0,
        forksCount: saved.forks_count || 0,
        openIssuesCount: saved.open_issues_count || 0,
        updatedAt: saved.updated_at,
      });
    }
  }

  // If using installation, clean up any repositories previously synced that are no longer accessible
  if (usedInstallation && accessibleRepoIds.size > 0) {
    const { data: existing } = await supabase
      .from('github_repositories')
      .select('id, github_repo_id')
      .eq('account_id', account.id);

    if (existing) {
      for (const ex of existing) {
        if (!accessibleRepoIds.has(Number(ex.github_repo_id))) {
          await supabase.from('github_repositories').delete().eq('id', ex.id);
        }
      }
    }
  }

  // Update account sync status
  await supabase
    .from('github_accounts')
    .update({
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
      public_repo_count: mappedRepos.length,
    })
    .eq('id', account.id);

  return {
    repositories: mappedRepos,
    authMethod: usedInstallation ? 'github_app_installation' : 'public_metadata',
  };
}
