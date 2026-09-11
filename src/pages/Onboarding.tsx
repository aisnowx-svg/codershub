import React, { useState } from 'react';
import { Terminal, ArrowRight, Check, Sparkles } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { TechBadge } from '../components/common/TechBadge';
import { GithubIcon } from '../components/common/Icons';
import { AuthModal } from '../components/modals/AuthModal';

const SPECIALTIES = [
  'AI',
  'Web',
  'Mobile',
  'Systems',
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
  'Vulkan',
  'eBPF',
  'io_uring',
  'Docker',
  'PostgreSQL',
];

interface OnboardingProps {
  onFinish?: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onFinish }) => {
  const [step, setStep] = useState(1);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(['AI', 'Systems']);
  const [selectedTech, setSelectedTech] = useState<string[]>(['Python', 'Rust', 'TypeScript']);
  const [githubHandle, setGithubHandle] = useState('');
  const [githubSyncing, setGithubSyncing] = useState(false);

  const { connectGithub, completeOnboarding, setAuthModalOpen } = useAuthStore();

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

  const handleConnectGithub = async () => {
    setGithubSyncing(true);
    const cleanHandle = githubHandle.trim().replace(/^@/, '');
    await connectGithub(cleanHandle);
    setGithubSyncing(false);
    setStep(3);
  };

  const handleFinish = async () => {
    await completeOnboarding(selectedSpecialties, selectedTech);
    if (onFinish) onFinish();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-soft-lg p-7 text-left relative overflow-hidden">
        {/* Progress indicator */}
        <div className="flex items-center gap-1.5 mb-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? 'bg-dev-accent' : 'bg-slate-100'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Philosophy Intro */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-dev-accent">
              <Terminal className="w-6 h-6 stroke-[2.5]" />
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-dev-accent">
                Welcome to Code Social
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                Your code is your profile.
              </h1>
            </div>

            <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <p>
                Not LinkedIn for developers. Not generic social media. An elegant platform built around what developers <strong className="text-slate-900 font-semibold">actually build</strong>.
              </p>
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-2 text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-dev-accent font-bold">✓</span>
                  <span>Build things.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-dev-accent font-bold">✓</span>
                  <span>Show your work with verified proof.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Meet and collaborate with builders.</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl bg-dev-accent hover:bg-dev-accentHover text-white font-medium text-xs shadow-soft transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
              >
                Already have an account? Sign In
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Connect GitHub */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-900">
              <GithubIcon className="w-6 h-6" />
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-dev-accent">
                Step 2 of 5
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1">
                Connect GitHub
              </h1>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Associate your GitHub handle to display your open source proof of work.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                GitHub Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                  @
                </span>
                <input
                  type="text"
                  value={githubHandle}
                  onChange={(e) => setGithubHandle(e.target.value.replace(/^@/, ''))}
                  placeholder="your-github-username"
                  className="w-full pl-7 pr-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={handleConnectGithub}
                disabled={githubSyncing || !githubHandle.trim()}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium text-xs shadow-soft transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <GithubIcon className="w-4 h-4" />
                <span>{githubSyncing ? 'Linking...' : 'Connect GitHub'}</span>
              </button>

              <button
                onClick={() => setStep(3)}
                className="w-full py-2 text-center text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Step 3: What do you build? */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-dev-accent">
                Step 3 of 5
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1">
                What do you build?
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Select the engineering domains that represent your focus.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {SPECIALTIES.map((spec) => {
                const isSelected = selectedSpecialties.includes(spec);
                return (
                  <button
                    key={spec}
                    onClick={() => toggleSpecialty(spec)}
                    className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-200 text-dev-accent shadow-soft'
                        : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200 text-slate-600'
                    }`}
                  >
                    <span>{spec}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-dev-accent" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setStep(4)}
              disabled={selectedSpecialties.length === 0}
              className="w-full py-3 rounded-xl bg-dev-accent hover:bg-dev-accentHover disabled:opacity-50 text-white font-medium text-xs shadow-soft transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 4: Choose Technologies */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-dev-accent">
                Step 4 of 5
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1">
                Choose technologies
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Highlight the core languages, runtimes, and frameworks you ship with.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
              {POPULAR_TECH.map((tech) => (
                <TechBadge
                  key={tech}
                  name={tech}
                  size="md"
                  selected={selectedTech.includes(tech)}
                  onClick={() => toggleTech(tech)}
                />
              ))}
            </div>

            <button
              onClick={() => setStep(5)}
              disabled={selectedTech.length === 0}
              className="w-full py-3 rounded-xl bg-dev-accent hover:bg-dev-accentHover disabled:opacity-50 text-white font-medium text-xs shadow-soft transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 5: Identity Ready */}
        {step === 5 && (
          <div className="space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-dev-accent mx-auto">
              <Sparkles className="w-7 h-7" />
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
                Ready to Ship
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1">
                Your developer identity is ready.
              </h1>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
                Your profile is grounded in real builds, commits, and projects. Welcome to the network.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Focus:</span>
                <span className="text-slate-900 font-semibold">{selectedSpecialties.join(' · ')}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Stack:</span>
                <span className="text-dev-accent font-semibold">{selectedTech.slice(0, 4).join(', ')}...</span>
              </div>
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-3.5 rounded-xl bg-dev-accent hover:bg-dev-accentHover text-white font-medium text-sm shadow-soft transition-all active:scale-95"
            >
              Enter Code Social
            </button>
          </div>
        )}
      </div>
      <AuthModal />
    </div>
  );
};
