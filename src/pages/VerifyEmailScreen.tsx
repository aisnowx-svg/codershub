import React from 'react';
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
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { CodeSocialLogo } from '../components/common/CodeSocialLogo';

export const VerifyEmailScreen: React.FC = () => {
  const {
    unverifiedEmail,
    verificationMessage,
    isCheckingVerification,
    resendCooldown,
    checkVerification,
    resendVerification,
    cancelVerification,
  } = useAuthStore();

  const handleCheckVerification = async () => {
    await checkVerification();
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    await resendVerification();
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600/30 font-sans relative overflow-x-hidden">
      {/* Subtle background glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-6 py-5 flex items-center justify-between border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <CodeSocialLogo className="w-8 h-8" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold tracking-tight text-white">CODE SOCIAL</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Gate
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

      {/* Main Verification Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
          {/* Animated Mail Icon Badge */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
                <Mail className="w-8 h-8 stroke-[1.8] animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center space-y-2 mb-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Verify your email
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              We&apos;ve sent a verification link to{' '}
              <span className="font-mono font-medium text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40 break-all">
                {unverifiedEmail || 'your email'}
              </span>
            </p>
            <p className="text-xs text-slate-400">
              Please verify your email before continuing.
            </p>
          </div>

          {/* Verification Feedback Banner */}
          {verificationMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 mb-6 border animate-in fade-in duration-200 ${
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

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleCheckVerification}
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

          {/* Helpful Tips */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-2.5 text-[11px] text-slate-400">
            <div className="flex items-start gap-2">
              <Inbox className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
              <span>
                Can&apos;t find the email? Check your <strong>spam</strong> or <strong>junk</strong> folder.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
              <span>
                Supabase Auth requires email confirmation before granting access to developer feeds, projects, and proof of work.
              </span>
            </div>
          </div>

          {/* Change Email Action */}
          <div className="mt-5 text-center">
            <button
              onClick={cancelVerification}
              className="text-[11px] text-slate-400 hover:text-blue-400 transition-colors underline underline-offset-4 cursor-pointer"
            >
              Wrong email address? Change email
            </button>
          </div>
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
