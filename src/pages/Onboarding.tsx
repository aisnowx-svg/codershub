import React, { useState } from 'react';
import {
  Terminal,
  ArrowRight,
  ArrowLeft,
  Check,
  Mail,
  Lock,
  User,
  AlertCircle,
  Loader2,
  LogIn,
  UserPlus,
  Sparkles,
  Code2,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { TechBadge } from '../components/common/TechBadge';
import { GithubIcon } from '../components/common/Icons';
import { githubService } from '../services/githubService';

const SPECIALTIES = [
  'AI',
  'Systems',
  'Web',
  'Mobile',
  'Data',
  'Open Source',
  'Games',
  'Security',
];

const POPULAR_TECH = [
  'Python',
  'Rust',
  'TypeScript',
  'React',
  'Go',
  'C++',
  'FastAPI',
  'PyTorch',
  'WebGPU',
  'Linux',
  'Docker',
  'PostgreSQL',
];

interface OnboardingProps {
  onFinish?: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onFinish }) => {
  const [step, setStep] = useState<number>(1);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(['AI', 'Systems']);
  const [selectedTech, setSelectedTech] = useState<string[]>(['Python', 'Rust', 'TypeScript']);
  const [githubHandle, setGithubHandle] = useState('');
  const [githubSyncing, setGithubSyncing] = useState(false);

  // Auth form state for Slide 4
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const {
    signIn,
    signUp,
    connectGithub,
    completeOnboarding,
    signinRequest,
    signupRequest,
    clearSigninError,
    clearSignupError,
    clearAllAuthErrors,
    isLoading,
  } = useAuthStore();

  const { showToast } = useUIStore();

  const toggleSpecialty = (spec: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  const toggleTech = (tech: string) => {
    setSelectedTech((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    );
  };

  const goToSlide4 = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthMode(mode);
    clearAllAuthErrors();
    setLocalError(null);
    setSubmitting(false);
    if (!username && githubHandle) {
      setUsername(githubHandle.trim().replace(/^@/, '').toLowerCase());
    }
    setStep(4);
  };

  const handleConnectGithub = async () => {
    setGithubSyncing(true);
    const cleanHandle = githubHandle.trim().replace(/^@/, '');
    if (cleanHandle) {
      await connectGithub(cleanHandle);
      if (!username) {
        setUsername(cleanHandle.toLowerCase());
      }
    }
    setGithubSyncing(false);
    setStep(3);
  };

  const isFormInFlight =
    submitting ||
    isLoading ||
    (authMode === 'signin' ? signinRequest.inFlight : signupRequest.inFlight);

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormInFlight) return;

    clearSigninError();
    setLocalError(null);

    if (!email.trim() || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const success = await signIn(email.trim(), password);
      if (success) {
        await completeOnboarding(selectedSpecialties, selectedTech);
        if (githubHandle.trim()) {
          await connectGithub(githubHandle.trim().replace(/^@/, ''));
        }
        showToast('Signed in to CODE SOCIAL');
        if (onFinish) onFinish();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormInFlight) return;

    clearSignupError();
    setLocalError(null);

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

    setSubmitting(true);
    try {
      const success = await signUp(
        email.trim(),
        password,
        cleanUsername,
        displayName.trim() || cleanUsername
      );
      if (success) {
        await completeOnboarding(selectedSpecialties, selectedTech);
        if (githubHandle.trim()) {
          await connectGithub(githubHandle.trim().replace(/^@/, ''));
        }
        showToast('Verification email sent! Please check your inbox.');
        if (onFinish) onFinish();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGithubOAuth = async () => {
    try {
      setOauthLoading(true);
      setLocalError(null);
      const url = await githubService.getAuthUrl();
      window.location.href = url;
    } catch (err: any) {
      setOauthLoading(false);
      setLocalError(err.message || 'GitHub OAuth setup is incomplete.');
    }
  };

  const handleGuestContinue = async () => {
    await completeOnboarding(selectedSpecialties, selectedTech);
    if (githubHandle.trim()) {
      await connectGithub(githubHandle.trim().replace(/^@/, ''));
    }
    showToast('Welcome to CODE SOCIAL (Guest mode)');
    if (onFinish) onFinish();
  };

  const stepTitles = [
    'Welcome',
    'GitHub',
    'Tech Stack',
    'Login / Join',
  ];

  return (
    <div className="min-h-screen bg-slate-900/5 backdrop-blur-xs flex flex-col items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-lg bg-white border border-slate-200/90 rounded-2xl shadow-xl p-6 sm:p-8 text-left relative overflow-hidden transition-all duration-300">
        {/* Top Header: Progress indicators & quick access */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              Slide {step} of 4 · {stepTitles[step - 1]}
            </span>

            {/* Quick jump to Slide 4 on all slides */}
            {step < 4 ? (
              <button
                type="button"
                onClick={() => goToSlide4('signin')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 group cursor-pointer"
              >
                <span>Login or Create Account</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium">Final Step</span>
            )}
          </div>

          {/* 4-Step Progress Indicator (Clickable to jump) */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (i === 4) goToSlide4(authMode);
                  else setStep(i);
                }}
                className={`h-2 flex-1 rounded-full transition-all duration-300 cursor-pointer ${
                  i === step
                    ? 'bg-blue-600 ring-2 ring-blue-400/30 shadow-xs'
                    : i < step
                    ? 'bg-blue-400/80 hover:bg-blue-500'
                    : 'bg-slate-200 hover:bg-slate-300'
                }`}
                title={`Go to Slide ${i}: ${stepTitles[i - 1]}`}
                aria-label={`Slide ${i}`}
              />
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SLIDE 1: Welcome & Philosophy Intro                                       */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                <Terminal className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">
                  Welcome to Code Social
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Your code is your profile.
                </h1>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Not LinkedIn for developers. Not generic social media. A focused network built around what developers <strong className="text-slate-900 font-semibold">actually build and ship</strong>.
            </p>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3 text-xs text-slate-700">
                <span className="w-5 h-5 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                  ✓
                </span>
                <div>
                  <strong className="text-slate-900 block font-semibold">Build & Ship</strong>
                  <span className="text-slate-500">Document architectural logs, milestones, and active roadmaps.</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3 text-xs text-slate-700">
                <span className="w-5 h-5 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                  ✓
                </span>
                <div>
                  <strong className="text-slate-900 block font-semibold">Show Verified Proof</strong>
                  <span className="text-slate-500">Link commits, repository stars, and verified proof of work.</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3 text-xs text-slate-700">
                <span className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                  ✓
                </span>
                <div>
                  <strong className="text-slate-900 block font-semibold">Connect with Builders</strong>
                  <span className="text-slate-500">Find collaborators, fork architecture, and build together.</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-soft transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-4 text-xs pt-1">
                <button
                  type="button"
                  onClick={() => goToSlide4('signin')}
                  className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer flex items-center gap-1"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => goToSlide4('signup')}
                  className="text-slate-600 hover:text-slate-900 font-medium cursor-pointer flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 2: Connect GitHub & Proof of Work                                   */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white shadow-2xs">
                <GithubIcon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">
                  Slide 2 of 4
                </span>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Connect GitHub
                </h1>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Associate your GitHub handle to display your open source proof of work, repository activity, and verified contributions.
            </p>

            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                GitHub Username
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono font-semibold">
                  @
                </span>
                <input
                  type="text"
                  value={githubHandle}
                  onChange={(e) => setGithubHandle(e.target.value.replace(/^@/, ''))}
                  placeholder="your-github-username"
                  className="w-full pl-8 pr-3.5 py-2.5 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 rounded-xl font-mono text-slate-900 transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Entering your handle also auto-configures your developer handle on the next steps.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleConnectGithub}
                  disabled={githubSyncing}
                  className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs shadow-soft transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {githubSyncing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>{githubHandle.trim() ? 'Continue with GitHub' : 'Continue'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  Skip for now →
                </button>

                <button
                  type="button"
                  onClick={() => goToSlide4('signin')}
                  className="text-blue-600 hover:underline font-semibold cursor-pointer"
                >
                  Login or Create Account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 3: What do you build? (Specialties & Tech Stack)                     */}
        {/* ========================================================================= */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                <Code2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">
                  Slide 3 of 4
                </span>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  What do you build?
                </h1>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Pick your primary focus areas and core technologies to personalize your feed.
            </p>

            {/* Specialties Grid */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                Engineering Domains ({selectedSpecialties.length} selected)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SPECIALTIES.map((spec) => {
                  const isSelected = selectedSpecialties.includes(spec);
                  return (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => toggleSpecialty(spec)}
                      className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs font-semibold'
                          : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-600'
                      }`}
                    >
                      <span className="truncate">{spec}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tech Stack Selection */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                Top Technologies ({selectedTech.length} selected)
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {POPULAR_TECH.map((tech) => (
                  <TechBadge
                    key={tech}
                    name={tech}
                    size="sm"
                    selected={selectedTech.includes(tech)}
                    onClick={() => toggleTech(tech)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => goToSlide4(authMode || 'signup')}
                  disabled={selectedSpecialties.length === 0 && selectedTech.length === 0}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs shadow-soft transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Next: Login or Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => goToSlide4('signin')}
                  className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                >
                  Already have an account? Sign In directly
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 4: Dedicated Login or Create Account Slide                          */}
        {/* ========================================================================= */}
        {step === 4 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                    Step 4 of 4 · Final Step
                  </span>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    Login or Create Account
                  </h1>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
                title="Back to Tech Stack"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="grid grid-cols-2 p-1 bg-slate-100/80 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  clearAllAuthErrors();
                  setLocalError(null);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  authMode === 'signin'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  clearAllAuthErrors();
                  setLocalError(null);
                  if (!username && githubHandle) {
                    setUsername(githubHandle.trim().replace(/^@/, '').toLowerCase());
                  }
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  authMode === 'signup'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Account</span>
              </button>
            </div>

            {/* Error Message Display (Strictly scoped to active form) */}
            {(localError || (authMode === 'signin' ? signinRequest.error : signupRequest.error)) && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <span className="leading-relaxed">
                  {localError || (authMode === 'signin' ? signinRequest.error : signupRequest.error)}
                </span>
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={authMode === 'signin' ? handleSignInSubmit : handleSignUpSubmit}
              className="space-y-3.5"
            >
              {authMode === 'signup' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
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
                        className="w-full pl-7 pr-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 rounded-xl font-mono text-slate-900 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
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
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 rounded-xl text-slate-900 transition-all"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
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
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 rounded-xl text-slate-900 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
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
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 rounded-xl text-slate-900 transition-all"
                  />
                </div>
                {authMode === 'signup' && (
                  <p className="text-[10px] text-slate-400 mt-1">Minimum 6 characters.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isFormInFlight}
                className="w-full py-3 mt-1 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-xs shadow-soft transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isFormInFlight ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{authMode === 'signin' ? 'Sign In to Code Social' : 'Create Developer Account'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-semibold">
                <span className="bg-white px-2 text-slate-400">or</span>
              </div>
            </div>

            {/* GitHub OAuth Button */}
            <button
              type="button"
              onClick={handleGithubOAuth}
              disabled={oauthLoading}
              className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {oauthLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <GithubIcon className="w-4 h-4" />
              )}
              <span>Continue with GitHub</span>
            </button>

            {/* Continue as Guest option */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleGuestContinue}
                className="text-xs text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                Explore first without an account →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
