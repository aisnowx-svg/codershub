import React, { useState } from 'react';
import {
  Terminal,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Code2,
  FolderGit2,
  Sparkles,
  ShieldCheck,
  UserPlus,
  LogIn,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useAppStateStore } from '../stores/appStateStore';
import { CodeSocialLogo } from '../components/common/CodeSocialLogo';

interface FirstVisitIntroProps {
  onFinish?: () => void;
}

export const FirstVisitIntro: React.FC<FirstVisitIntroProps> = ({ onFinish }) => {
  const [slide, setSlide] = useState<number>(1);
  const { setAuthModalOpen } = useAuthStore();
  const { completeIntro } = useAppStateStore();

  const handleCompleteAndOpenAuth = (mode: 'signin' | 'signup') => {
    // 1. Permanently complete the product intro
    completeIntro();
    // 2. Open the authentication modal with the selected mode
    setAuthModalOpen(true, mode);
    if (onFinish) onFinish();
  };

  const handleExploreAsGuest = () => {
    // 1. Permanently complete the product intro
    completeIntro();
    if (onFinish) onFinish();
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600/30 font-sans relative overflow-x-hidden">
      {/* Background glow ambiance */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[350px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-6 py-5 flex items-center justify-between border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <CodeSocialLogo className="w-8 h-8" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold tracking-tight text-white">CODE SOCIAL</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Welcome
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Developer Platform & Proof of Work</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleCompleteAndOpenAuth('signin')}
            className="text-xs text-slate-300 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-900 cursor-pointer"
          >
            Sign In
          </button>
          <button
            onClick={handleExploreAsGuest}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-900 border border-slate-800 cursor-pointer"
          >
            Skip Intro
          </button>
        </div>
      </header>

      {/* Main Slide Presentation */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-4">
        <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-md text-left">
          {/* Progress Indicator Dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3, 4].map((stepNum) => (
              <div
                key={stepNum}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  stepNum === slide
                    ? 'w-8 bg-blue-500'
                    : stepNum < slide
                    ? 'w-3 bg-blue-700'
                    : 'w-3 bg-slate-800'
                }`}
              />
            ))}
          </div>

          {/* SLIDE 1: Proof of Work Identity */}
          {slide === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
                <Terminal className="w-7 h-7 stroke-[2]" />
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-semibold">
                  01 / Identity
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Your Code is Your Profile
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Traditional resumes don&apos;t reflect how engineers build. CODE SOCIAL bridges your GitHub repositories, architecture logs, and technical milestones into an immutable Proof of Work.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Real repository commits & architecture trees</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Build logs showing technical decisions and progress</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setSlide(2)}
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-semibold text-xs tracking-wider uppercase transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Next: How it Works</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* SLIDE 2: Build Logs & Collaboration */}
          {slide === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
                <Code2 className="w-7 h-7 stroke-[2]" />
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                  02 / Collaboration
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Share Your Build Journey
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Publish technical build logs as you solve engineering bottlenecks. Discover software projects looking for contributors, fork open tools, or assemble a team.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Project fork & join collaboration requests</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Curated developer feed sorted by tech stack</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setSlide(1)}
                  className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  onClick={() => setSlide(3)}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-semibold text-xs tracking-wider uppercase transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Next: DevQuro Integration</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* SLIDE 3: DevQuro GitHub App */}
          {slide === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                <FolderGit2 className="w-7 h-7 stroke-[2]" />
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-semibold">
                  03 / Verification
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  DevQuro GitHub App
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Link the DevQuro GitHub App to verify Proof of Work. Repositories are imported securely without exposing source code or creating unnecessary notifications.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Read-only metadata verification with RS256 JWT tokens</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Zero public spam from commits — pure technical validation</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setSlide(2)}
                  className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  onClick={() => setSlide(4)}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-semibold text-xs tracking-wider uppercase transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Ready to Build</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* SLIDE 4: Action Choice (Never restarts) */}
          {slide === 4 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
                <Sparkles className="w-7 h-7 stroke-[2]" />
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
                  04 / Get Started
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Join the Builders
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Create your profile to start logging builds, showcase projects, and connect with systems and AI engineers.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => handleCompleteAndOpenAuth('signup')}
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-semibold text-xs tracking-wider uppercase transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </button>

                <button
                  onClick={() => handleCompleteAndOpenAuth('signin')}
                  className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 active:scale-[0.99] text-slate-200 hover:text-white font-medium text-xs border border-slate-700/80 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In with Existing Account</span>
                </button>

                <button
                  onClick={handleExploreAsGuest}
                  className="w-full py-2.5 text-center text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Explore CODE SOCIAL as Guest &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto px-6 py-4 text-center border-t border-slate-900 text-[11px] text-slate-600 flex items-center justify-between">
        <span>CODE SOCIAL &bull; Proof of Work Platform</span>
        <span className="font-mono text-[10px]">v1.0 &bull; Built for Builders</span>
      </footer>
    </div>
  );
};
