import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  LogOut,
  ShieldCheck,
  Inbox,
  Clock,
  Sparkles,
  LogIn,
} from 'lucide-react';
import { useAuthStore, DEFAULT_GUEST_USER } from '../stores/authStore';
import { profileService } from '../services/profileService';
import { supabase } from '../lib/supabase';
import { CodeSocialLogo } from '../components/common/CodeSocialLogo';

interface UrlErrorInfo {
  error: string;
  code?: string;
  description: string;
}

export const VerifyEmailPage: React.FC = () => {
  const {
    unverifiedEmail,
    verificationMessage,
    isCheckingVerification,
    resendCooldown,
    resendVerification,
    cancelVerification,
    setAuthModalOpen,
  } = useAuthStore();

  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<UrlErrorInfo | null>(null);

  // Parse error and token parameters from query string and hash fragment
  const inspectUrlAndVerify = useCallback(async () => {
    setIsVerifying(true);
    setUrlError(null);

    try {
      if (typeof window === 'undefined') {
        setIsVerifying(false);
        return;
      }

      // 1. Inspect URL search query params
      const searchParams = new URLSearchParams(window.location.search);
      // 2. Inspect URL hash fragment (Supabase OAuth & Email confirmations often redirect with #access_token=... or #error=...)
      const rawHash = window.location.hash.startsWith('#')
        ? window.location.hash.substring(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(rawHash);

      // Check for error parameters in query or hash
      const errorParam = searchParams.get('error') || hashParams.get('error');
      const errorCode = searchParams.get('error_code') || hashParams.get('error_code') || undefined;
      const rawDescription =
        searchParams.get('error_description') || hashParams.get('error_description') || '';
      const errorDescription = rawDescription.replace(/\+/g, ' ');

      if (errorParam) {
        setUrlError({
          error: errorParam,
          code: errorCode,
          description:
            errorDescription ||
            (errorCode === 'otp_expired'
              ? 'This email confirmation link has expired or has already been used.'
              : 'The verification link could not be verified. Please request a new confirmation email.'),
        });
        setIsVerifying(false);
        return;
      }

      // If PKCE code is provided in query params, exchange it
      const code = searchParams.get('code');
      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code);
        } catch (exchangeErr: any) {
          console.warn('PKCE exchange error (may have already been exchanged):', exchangeErr);
        }
      }

      // 3. Query current user and verification status directly from Supabase
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        // No active session yet
        // Check if there was an unverified email stored in store
        setIsConfirmed(false);
        setConfirmedEmail(null);
        setIsVerifying(false);
        return;
      }

      const user = userData.user;
      const confirmed = Boolean(user.email_confirmed_at || (user as any).confirmed_at);

      if (confirmed) {
        setIsConfirmed(true);
        setConfirmedEmail(user.email || null);

        // Update profile & authStore state while strictly PRESERVING onboardingCompleted
        let profile = await profileService.getProfile(user.id);
        if (!profile) {
          const meta = user.user_metadata || {};
          const defaultHandle = meta.username || user.email?.split('@')[0] || 'builder';
          const defaultName = meta.display_name || meta.name || defaultHandle;
          profile = await profileService.upsertProfile({
            id: user.id,
            handle: defaultHandle,
            name: defaultName,
            avatar: meta.avatar_url || DEFAULT_GUEST_USER.avatar,
            role: 'Developer / Builder',
            specialty: 'Systems',
            bio: 'Building software tools.',
            techStack: ['TypeScript'],
          });
        }

        const sessionResult = await supabase.auth.getSession();
        useAuthStore.setState({
          session: sessionResult.data?.session || null,
          currentUser: profile,
          isAuthenticated: true,
          verificationStatus: 'VERIFIED',
          unverifiedEmail: null,
          githubConnected: !!profile.githubHandle,
          // CRITICAL: Preserve existing onboardingCompleted state; never artificially force it true!
          onboardingCompleted: useAuthStore.getState().onboardingCompleted,
          isLoading: false,
          verificationMessage: null,
        });
      } else {
        setIsConfirmed(false);
        setConfirmedEmail(null);
        useAuthStore.setState({
          isAuthenticated: false,
          verificationStatus: 'UNVERIFIED',
          unverifiedEmail: user.email || useAuthStore.getState().unverifiedEmail,
          isLoading: false,
        });
      }
    } catch (err: any) {
      console.error('Verification check error:', err);
      setUrlError({
        error: 'verification_failed',
        description: err.message || 'An unexpected error occurred while verifying your email.',
      });
    } finally {
      setIsVerifying(false);
    }
  }, []);

  useEffect(() => {
    inspectUrlAndVerify();

    // Listen for live Supabase auth state change (e.g. hash token exchange completes)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const confirmed = Boolean(
          session.user.email_confirmed_at || (session.user as any).confirmed_at
        );
        if (confirmed) {
          setIsConfirmed(true);
          setConfirmedEmail(session.user.email || null);
          setUrlError(null);
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [inspectUrlAndVerify]);

  /**
   * Navigates the user into CODE SOCIAL following the exact rule:
   * - If onboardingCompleted is already true -> /home
   * - Otherwise -> normal onboarding flow (/)
   * - Never artificially set onboardingCompleted = true
   */
  const handleContinueToApp = () => {
    const isCompleted = useAuthStore.getState().onboardingCompleted;
    const targetUrl = isCompleted ? '/home' : '/';
    window.history.pushState(null, '', targetUrl);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleCheckAgain = async () => {
    await inspectUrlAndVerify();
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    await resendVerification();
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600/30 font-sans relative overflow-x-hidden">
      {/* Background glow ambiance */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-6 py-5 flex items-center justify-between border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <CodeSocialLogo className="w-8 h-8" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold tracking-tight text-white">CODE SOCIAL</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Auth Gate
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Developer Platform & Proof of Work</p>
          </div>
        </div>

        <button
          onClick={cancelVerification}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 cursor-pointer"
          title="Sign in with a different account or change email"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Switch Account</span>
        </button>
      </header>

      {/* Main Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
          {/* STATE 1: Initializing / Verifying Token */}
          {isVerifying ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
                <RefreshCw className="w-8 h-8 stroke-[1.8] animate-spin" />
              </div>
              <div className="space-y-1">
                <h1 className="text-lg font-bold text-white tracking-tight">Verifying with Supabase...</h1>
                <p className="text-xs text-slate-400 font-mono">Checking confirmation status...</p>
              </div>
            </div>
          ) : urlError ? (
            /* STATE 2: Link Error / Expired Token */
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shadow-inner">
                  <AlertCircle className="w-8 h-8 stroke-[1.8]" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Verification Link Issue
                </h1>
                <p className="text-xs sm:text-sm text-red-300 leading-relaxed bg-red-950/40 border border-red-500/30 p-3.5 rounded-xl">
                  {urlError.description}
                </p>
                {urlError.code && (
                  <p className="text-[10px] text-slate-500 font-mono uppercase">
                    Code: {urlError.code}
                  </p>
                )}
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={handleCheckAgain}
                  className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 active:scale-[0.99] text-white font-semibold text-xs tracking-wide transition-all border border-slate-700/80 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Check Verification Again</span>
                </button>

                <button
                  onClick={() => {
                    cancelVerification();
                    setAuthModalOpen(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In or Request New Link</span>
                </button>
              </div>
            </div>
          ) : isConfirmed ? (
            /* STATE 3: Verified Success */
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                    <CheckCircle2 className="w-9 h-9 stroke-[2] animate-in zoom-in-50 duration-300" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              <div className="text-center space-y-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" /> Confirmed
                </span>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Email Verified Successfully!
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Your email{' '}
                  {confirmedEmail && (
                    <span className="font-mono font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 break-all">
                      {confirmedEmail}
                    </span>
                  )}{' '}
                  has been verified with Supabase. Your CODE SOCIAL account is now active.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300/90 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span className="leading-relaxed">
                  Verification verified. You can now access your developer profile, follow builders, and connect GitHub repositories.
                </span>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleContinueToApp}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-semibold text-xs tracking-wider uppercase transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Continue to CODE SOCIAL</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : unverifiedEmail ? (
            /* STATE 4: Pending Verification */
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
                    <Mail className="w-8 h-8 stroke-[1.8] animate-pulse" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              <div className="text-center space-y-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Verify your email
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  We&apos;ve sent a verification link to{' '}
                  <span className="font-mono font-medium text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40 break-all">
                    {unverifiedEmail}
                  </span>
                </p>
                <p className="text-xs text-slate-400">
                  Please click the link in your email to continue.
                </p>
              </div>

              {verificationMessage && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 border animate-in fade-in duration-200 ${
                    verificationMessage.type === 'success'
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                      : verificationMessage.type === 'error'
                      ? 'bg-red-950/40 border-red-500/30 text-red-300'
                      : 'bg-blue-950/40 border-blue-500/30 text-blue-300'
                  }`}
                >
                  {verificationMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  ) : verificationMessage.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  ) : (
                    <Sparkles className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                  )}
                  <span className="leading-relaxed font-medium">
                    {verificationMessage.text}
                  </span>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleCheckAgain}
                  disabled={isCheckingVerification}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] disabled:opacity-50 text-white font-semibold text-xs tracking-wide transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isCheckingVerification ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Checking Supabase verification...</span>
                    </>
                  ) : (
                    <>
                      <span>I&apos;ve verified my email</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isCheckingVerification}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50 text-slate-200 hover:text-white font-medium text-xs border border-slate-700/80 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingVerification ? 'animate-spin' : ''}`} />
                  <span>
                    {resendCooldown > 0
                      ? `Resend available in ${resendCooldown}s`
                      : 'Resend verification email'}
                  </span>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-800/80 space-y-2 text-[11px] text-slate-400">
                <div className="flex items-start gap-2">
                  <Inbox className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <span>
                    Can&apos;t find the email? Check your <strong>spam</strong> or <strong>junk</strong> folder.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* STATE 5: Public / Unauthenticated Access */
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
                  <ShieldCheck className="w-8 h-8 stroke-[1.8]" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Email Verification
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Looking to verify your account? Please click the confirmation link sent to your email address, or sign in below.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-semibold text-xs tracking-wider uppercase transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In / Create Account</span>
                </button>

                <button
                  onClick={() => {
                    window.history.pushState(null, '', '/');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs border border-slate-700/80 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Go to Home Feed</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto px-6 py-4 text-center border-t border-slate-900 text-[11px] text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>CODE SOCIAL &bull; Real Supabase Auth Source of Truth</span>
        <div className="flex items-center gap-2 text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Live Auth Verification Listener Active</span>
        </div>
      </footer>
    </div>
  );
};
