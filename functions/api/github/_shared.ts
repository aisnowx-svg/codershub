/**
 * Shared Utilities for Cloudflare Pages Functions
 * Handles Supabase connections, User Session validation,
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
  // Normalize formatting (handle escaped newlines \n in environment variables)
  const normalizedPem = pem.replace(/\\n/g, '\n').trim();
  const cleanPem = normalizedPem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = base64ToUint8Array(cleanPem);

  if (normalizedPem.includes('BEGIN RSA PRIVATE KEY')) {
    // Convert PKCS#1 to PKCS#8 DER
    const version = new Uint8Array([0x02, 0x01, 0x00]);
    // AlgorithmIdentifier for rsaEncryption: OID 1.2.840.113549.1.1.1, NULL
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
    iat: now - 60, // 60 seconds clock drift
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
