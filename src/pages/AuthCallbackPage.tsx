import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, ArrowRight, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useGitHubStore } from '../stores/githubStore';
import { useUIStore } from '../stores/uiStore';
import { CodeSocialLogo } from '../components/common/CodeSocialLogo';
import { GithubIcon } from '../components/common/Icons';

type CallbackStatus = 'loading' | 'success' | 'denied' | 'error' | 'unauthenticated';

export const AuthCallbackPage: React.FC = () => {
  const { isAuthenticated, currentUser, setAuthModalOpen } = useAuthStore();
  const { handleCallback, loadAccount } = useGitHubStore();
  const { setActiveTab, showToast } = useUIStore();

  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [connectedUsername, setConnectedUsername] = useState<string>('');

  useEffect(() => {
    const processCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get('error');
      const errorDesc = params.get('error_description');
      const code = params.get('code');
      const installationId = params.get('installation_id') || undefined;

      // 1. Check for user denial or GitHub error
      if (errorParam) {
        if (errorParam === 'access_denied') {
          setStatus('denied');
          setErrorMessage(
            errorDesc || 'You chose not to authorize DevQuro. No changes were made.'
          );
        } else {
          setStatus('error');
          setErrorMessage(errorDesc || errorParam || 'GitHub authorization was declined.');
        }
        return;
      }

      // 2. Check for code
      if (!code) {
        setStatus('error');
        setErrorMessage('Missing authorization code from GitHub callback.');
        return;
      }

      // 3. Check for authenticated user session
      if (!isAuthenticated || !currentUser?.id) {
        setStatus('unauthenticated');
        setErrorMessage('You must be logged in to CODE SOCIAL to connect your GitHub account.');
        return;
      }

      // 4. Exchange code securely via backend
      try {
        setStatus('loading');
        const success = await handleCallback(code, installationId);

        if (success) {
          await loadAccount(currentUser.id);
          const storeAccount = useGitHubStore.getState().account;
          const uname = storeAccount?.githubUsername || 'your account';
          setConnectedUsername(uname);
          setStatus('success');
          showToast(`GitHub account @${uname} connected successfully!`);

          // Automatically return to profile after brief delay
          setTimeout(() => {
            window.history.replaceState(null, '', '/profile');
            setActiveTab('profile');
          }, 1800);
        } else {
          const storeError = useGitHubStore.getState().lastSyncError;
          setStatus('error');
          setErrorMessage(storeError || 'Failed to exchange authorization with GitHub.');
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || 'An unexpected error occurred during GitHub callback.');
      }
    };

    processCallback();
  }, [isAuthenticated, currentUser?.id, handleCallback, loadAccount, setActiveTab, showToast]);

  const handleReturnToProfile = () => {
    window.history.replaceState(null, '', '/profile');
    setActiveTab('profile');
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[350px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 w-full max-w-4xl mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <CodeSocialLogo className="w-8 h-8" />
          <span className="font-mono text-sm font-bold tracking-tight text-white">CODE SOCIAL</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <GithubIcon className="w-4 h-4 text-slate-400" />
          <span>DevQuro Integration</span>
        </div>
      </header>

      {/* Center Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-md text-center space-y-6">
          {/* Status Icons */}
          <div className="flex justify-center">
            {status === 'loading' && (
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
            )}

            {status === 'success' && (
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            )}

            {status === 'denied' && (
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <ShieldAlert className="w-8 h-8" />
              </div>
            )}

            {(status === 'error' || status === 'unauthenticated') && (
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <AlertCircle className="w-8 h-8" />
              </div>
            )}
          </div>

          {/* Status Headings & Details */}
          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-white">
              {status === 'loading' && 'Connecting GitHub...'}
              {status === 'success' && 'GitHub Connected!'}
              {status === 'denied' && 'Authorization Cancelled'}
              {status === 'unauthenticated' && 'Authentication Required'}
              {status === 'error' && 'Connection Failed'}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {status === 'loading' && (
                'Securely exchanging authorization credentials with DevQuro GitHub App...'
              )}
              {status === 'success' && (
                <>
                  Successfully linked <span className="font-mono text-blue-400 font-semibold">@{connectedUsername}</span> to your CODE SOCIAL profile. Redirecting to your profile...
                </>
              )}
              {status === 'denied' && errorMessage}
              {status === 'unauthenticated' && errorMessage}
              {status === 'error' && errorMessage}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2">
            {status === 'unauthenticated' && (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Sign In to CODE SOCIAL</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {status === 'success' && (
              <button
                onClick={handleReturnToProfile}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Go to Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {(status === 'denied' || status === 'error') && (
              <div className="space-y-2">
                <button
                  onClick={handleReturnToProfile}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Return to Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-4xl mx-auto px-6 py-4 text-center border-t border-slate-900 text-[11px] text-slate-500 font-mono">
        CODE SOCIAL &bull; DevQuro GitHub App Integration
      </footer>
    </div>
  );
};
