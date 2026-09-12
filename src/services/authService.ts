import { supabase } from '../lib/supabase';
import { User, Session, AuthChangeEvent, Provider } from '@supabase/supabase-js';
import {
  getSiteUrl,
  getAuthCallbackUrl,
  getVerifyEmailUrl,
  getPasswordResetUrl,
  PRODUCTION_SITE_URL,
  LOCAL_DEV_URL,
  isLocalDev,
  isProduction,
} from '../utils/url';

export interface AuthUserMetadata {
  username?: string;
  display_name?: string;
  full_name?: string;
  avatar_url?: string;
}

// Re-export URL resolver helpers for backwards compatibility
export {
  getSiteUrl,
  getAuthCallbackUrl,
  getVerifyEmailUrl,
  getPasswordResetUrl,
  PRODUCTION_SITE_URL,
  LOCAL_DEV_URL,
  isLocalDev,
  isProduction,
};

export const authService = {
  /**
   * Signs up a new user with email and password.
   * Explicitly sets emailRedirectTo using environment-aware URL resolver.
   */
  async signUp(email: string, password: string, metadata?: AuthUserMetadata) {
    const redirectUrl = getVerifyEmailUrl();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Resends verification email for sign up.
   * Explicitly sets emailRedirectTo using environment-aware URL resolver.
   */
  async resendVerificationEmail(email: string) {
    const redirectUrl = getVerifyEmailUrl();
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Sends password reset email.
   * Explicitly sets redirectTo to environment-aware password reset URL.
   */
  async resetPasswordForEmail(email: string) {
    const redirectUrl = getPasswordResetUrl();
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Supabase OAuth sign in (e.g. GitHub, Google).
   * Explicitly sets redirectTo to environment-aware auth callback URL.
   */
  async signInWithOAuth(provider: Provider, scopes?: string) {
    const redirectUrl = getAuthCallbackUrl();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        scopes,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Performs a fresh check on Supabase to verify whether current user has confirmed their email
   */
  async checkUserVerification(): Promise<{ isVerified: boolean; user: User | null }> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return { isVerified: false, user: null };
    }
    const isVerified = Boolean(
      data.user.email_confirmed_at || (data.user as any).confirmed_at
    );
    return { isVerified, user: data.user };
  },

  /**
   * Signs in an existing user with email and password
   */
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Signs out current user
   */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Gets current session from storage / memory
   */
  async getSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Error fetching Supabase session:', error.message);
      return null;
    }
    return data.session;
  },

  /**
   * Gets current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      return null;
    }
    return data.user;
  },

  /**
   * Subscribes to auth state changes
   */
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};
