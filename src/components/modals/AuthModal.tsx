import React, { useState, useEffect } from 'react';
import { X, Terminal, ArrowRight, Lock, Mail, User, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    authModalMode,
    setAuthModalOpen,
    signIn,
    signUp,
    signinRequest,
    signupRequest,
    clearSigninError,
    clearSignupError,
    clearAllAuthErrors,
    isLoading,
  } = useAuthStore();
  const { showToast } = useUIStore();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When modal is opened: start 100% clean with zero stale errors or leftover text
  useEffect(() => {
    if (authModalOpen) {
      clearAllAuthErrors();
      setLocalError(null);
      setIsSubmitting(false);
      if (authModalMode) {
        setMode(authModalMode);
      }
    }
  }, [authModalOpen, authModalMode, clearAllAuthErrors]);

  if (!authModalOpen) return null;

  const handleSwitchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setLocalError(null);
    clearSigninError();
    clearSignupError();
  };

  const handleClose = () => {
    clearAllAuthErrors();
    setLocalError(null);
    setIsSubmitting(false);
    setAuthModalOpen(false);
  };

  // Error is strictly scoped to the active tab only
  const activeError =
    localError || (mode === 'signin' ? signinRequest.error : signupRequest.error);

  const isInFlight =
    isSubmitting ||
    isLoading ||
    (mode === 'signin' ? signinRequest.inFlight : signupRequest.inFlight);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInFlight) return;

    setLocalError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        clearSigninError();
        if (!email.trim() || !password) {
          setLocalError('Please enter both email and password.');
          return;
        }

        const success = await signIn(email.trim(), password);
        if (success) {
          showToast('Signed in to CODE SOCIAL');
          handleClose();
        }
      } else {
        clearSignupError();
        const cleanUsername = username.trim().replace(/^@/, '');
        if (!cleanUsername) {
          setLocalError('Please choose a developer handle.');
          return;
        }
        if (!email.trim() || !password) {
          setLocalError('Please fill in all required fields.');
          return;
        }
        if (password.length < 6) {
          setLocalError('Password must be at least 6 characters long.');
          return;
        }

        const success = await signUp(
          email.trim(),
          password,
          cleanUsername,
          displayName.trim() || cleanUsername
        );
        if (success) {
          showToast('Verification email sent! Please check your inbox.');
          handleClose();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-2xl shadow-soft-lg overflow-hidden text-left max-h-[92vh] sm:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Terminal className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-sans tracking-tight">
                {mode === 'signin' ? 'Sign In to Code Social' : 'Join Code Social'}
              </h2>
              <p className="text-[11px] text-slate-400">Your code is your profile.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 border-b border-slate-100 bg-slate-50/30 text-xs font-medium">
          <button
            type="button"
            onClick={() => handleSwitchMode('signin')}
            className={`py-2.5 text-center transition-colors cursor-pointer border-b-2 ${
              mode === 'signin'
                ? 'border-blue-600 text-blue-600 font-semibold bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('signup')}
            className={`py-2.5 text-center transition-colors cursor-pointer border-b-2 ${
              mode === 'signup'
                ? 'border-blue-600 text-blue-600 font-semibold bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {activeError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200/80 flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span className="leading-relaxed">{activeError}</span>
            </div>
          )}

          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Developer Handle
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                    @
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                    }
                    placeholder="alexsharma"
                    className="w-full pl-7 pr-3 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 rounded-xl transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Display Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Alex Sharma"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 rounded-xl transition-all"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="builder@example.com"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 rounded-xl transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 rounded-xl transition-all"
              />
            </div>
            {mode === 'signup' && (
              <p className="text-[10px] text-slate-400 mt-1">Minimum 6 characters.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isInFlight}
            className="w-full py-2.5 mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium text-xs shadow-xs hover:shadow-soft transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isInFlight ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
