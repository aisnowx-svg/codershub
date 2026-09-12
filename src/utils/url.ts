/**
 * CODE SOCIAL — Centralized Environment & URL Resolver
 * 
 * Provides rock-solid, environment-aware URL resolution across
 * client-side and build-time contexts.
 * 
 * CORE GUARANTEE:
 * Production environments NEVER fall back to localhost or 127.0.0.1.
 */

/**
 * Canonical Production URL for CODE SOCIAL.
 * This is the ultimate ground truth for deployed production traffic.
 */
export const PRODUCTION_SITE_URL = 'https://codershub-kqi.pages.dev';

/**
 * Standard Local Development URL.
 * Only used when genuinely running locally.
 */
export const LOCAL_DEV_URL = 'http://localhost:5173';

/**
 * Checks if a hostname belongs to a local development machine.
 */
export function isLocalHostname(hostname?: string | null): boolean {
  if (!hostname) return false;
  const clean = hostname.trim().toLowerCase();
  return (
    clean === 'localhost' ||
    clean === '127.0.0.1' ||
    clean === '0.0.0.0' ||
    clean === '[::1]' ||
    clean.endsWith('.local') ||
    clean.endsWith('.internal') ||
    clean.startsWith('192.168.') ||
    clean.startsWith('10.') ||
    clean.startsWith('172.16.')
  );
}

/**
 * Checks if a full URL string points to a local host.
 */
export function isLocalUrl(urlStr?: string | null): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr.trim());
    return isLocalHostname(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Determines whether the current execution context is local development.
 */
export function isLocalDev(): boolean {
  if (typeof window !== 'undefined' && window.location) {
    return isLocalHostname(window.location.hostname);
  }
  return (
    (import.meta as any).env?.DEV === true ||
    (import.meta as any).env?.MODE === 'development'
  );
}

/**
 * Determines whether the current execution context is production.
 */
export function isProduction(): boolean {
  return !isLocalDev();
}

/**
 * Resolves the appropriate application base URL (without trailing slashes).
 * 
 * Logic hierarchy:
 * 1. If running in browser:
 *    a. If on a local hostname (localhost/127.0.0.1), respect local VITE_SITE_URL or window.location.origin.
 *    b. If on a remote hostname (e.g. codershub-kqi.pages.dev or preview deployments):
 *       - Disallow any localhost VITE_SITE_URL.
 *       - Use verified non-local origin or PRODUCTION_SITE_URL.
 * 2. If running outside browser (SSR, build-time prerender, Vite bundling):
 *    a. If in dev mode, use VITE_SITE_URL or LOCAL_DEV_URL.
 *    b. If in production mode, use non-local VITE_SITE_URL or PRODUCTION_SITE_URL.
 *       Under NO circumstance does production fall back to localhost.
 */
export function getSiteUrl(): string {
  // 1. Browser context
  if (typeof window !== 'undefined' && window.location) {
    const { hostname, origin } = window.location;

    // A) Actively running on local machine
    if (isLocalHostname(hostname)) {
      const envUrl = (import.meta as any).env?.VITE_SITE_URL;
      if (envUrl && typeof envUrl === 'string' && envUrl.trim().startsWith('http')) {
        return envUrl.trim().replace(/\/+$/, '');
      }
      return (origin && origin !== 'null' ? origin : LOCAL_DEV_URL).replace(/\/+$/, '');
    }

    // B) Running on production / remote host
    const envUrl = (import.meta as any).env?.VITE_SITE_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim().startsWith('http')) {
      const cleanEnv = envUrl.trim().replace(/\/+$/, '');
      // Ensure that a misconfigured localhost env var does NOT contaminate production
      if (!isLocalUrl(cleanEnv)) {
        return cleanEnv;
      }
    }

    // Use live verified origin if available and non-local
    if (
      origin &&
      origin !== 'null' &&
      !origin.includes('localhost') &&
      !origin.includes('127.0.0.1')
    ) {
      return origin.replace(/\/+$/, '');
    }

    // Canonical production fallback
    return PRODUCTION_SITE_URL;
  }

  // 2. Non-browser / Build-time context
  const isDev =
    (import.meta as any).env?.DEV === true ||
    (import.meta as any).env?.MODE === 'development';
  const envUrl = (import.meta as any).env?.VITE_SITE_URL;

  if (isDev) {
    if (envUrl && typeof envUrl === 'string' && envUrl.trim().startsWith('http')) {
      return envUrl.trim().replace(/\/+$/, '');
    }
    return LOCAL_DEV_URL;
  }

  // Production non-browser context
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().startsWith('http')) {
    const cleanEnv = envUrl.trim().replace(/\/+$/, '');
    if (!isLocalUrl(cleanEnv)) {
      return cleanEnv;
    }
  }

  // NEVER fall back to localhost in production
  return PRODUCTION_SITE_URL;
}

/**
 * Returns the exact Auth Callback URL for OAuth flows (GitHub OAuth, Supabase OAuth).
 * Production: https://codershub-kqi.pages.dev/auth/callback
 * Local dev:   http://localhost:5173/auth/callback
 */
export function getAuthCallbackUrl(): string {
  return `${getSiteUrl()}/auth/callback`;
}

/**
 * Returns the exact Email Verification URL for signup confirmation.
 * Production: https://codershub-kqi.pages.dev/verify-email
 * Local dev:   http://localhost:5173/verify-email
 */
export function getVerifyEmailUrl(): string {
  return `${getSiteUrl()}/verify-email`;
}

/**
 * Returns the exact Password Reset / Recovery redirect URL.
 * Production: https://codershub-kqi.pages.dev/auth/callback?type=recovery
 * Local dev:   http://localhost:5173/auth/callback?type=recovery
 */
export function getPasswordResetUrl(): string {
  return `${getSiteUrl()}/auth/callback?type=recovery`;
}
