import { supabase } from '../lib/supabase';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

export interface AuthUserMetadata {
  username?: string;
  display_name?: string;
  full_name?: string;
  avatar_url?: string;
}

export function getSiteUrl(): string {
  if (typeof window !== 'undefined') {
    const envUrl = (import.meta as any).env?.VITE_SITE_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim().startsWith('http')) {
      return envUrl.trim().replace(/\/+$/, '');
    }
    return window.location.origin;
  }
  return (import.meta as any).env?.VITE_SITE_URL || 'http://localhost:5173';
}

export const authService = {
  /**
   * Signs up a new user with email and password
   */
  async signUp(email: string, password: string, metadata?: AuthUserMetadata) {
    const siteUrl = getSiteUrl();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${siteUrl}/verify-email`,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Resends verification email for sign up
   */
  async resendVerificationEmail(email: string) {
    const siteUrl = getSiteUrl();
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${siteUrl}/verify-email`,
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
