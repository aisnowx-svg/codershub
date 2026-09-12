import React, { useState } from 'react';
import {
  Code2,
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { TechBadge } from '../components/common/TechBadge';
import { GithubIcon } from '../components/common/Icons';

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

interface ProfileOnboardingProps {
  onFinish?: () => void;
}

export const ProfileOnboarding: React.FC<ProfileOnboardingProps> = ({ onFinish }) => {
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(['AI', 'Systems']);
  const [selectedTech, setSelectedTech] = useState<string[]>(['Python', 'Rust', 'TypeScript']);
  const [githubHandle, setGithubHandle] = useState('');
  const [saving, setSaving] = useState(false);

  const { currentUser, completeOnboarding, connectGithub } = useAuthStore();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await completeOnboarding(selectedSpecialties, selectedTech);
      if (githubHandle.trim()) {
        await connectGithub(githubHandle.trim().replace(/^@/, ''));
      }
      showToast('Profile personalized! Welcome to CODE SOCIAL');
      if (onFinish) onFinish();
    } catch (err: any) {
      console.error('Error completing onboarding:', err);
      showToast('Profile updated!');
      if (onFinish) onFinish();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 relative overflow-x-hidden">
      {/* Background glow ambiance */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-2xs">
            <Code2 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Welcome {currentUser?.handle ? `@${currentUser.handle}` : 'Builder'}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Personalize Your Profile
            </h1>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          Tell us what you build so we can tune your developer feed with relevant repositories, architectural logs, and builders.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Engineering Domains / Specialties */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
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
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 font-semibold shadow-inner'
                        : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-400'
                    }`}
                  >
                    <span className="truncate">{spec}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tech Stack */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
              Primary Technologies ({selectedTech.length} selected)
            </label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
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

          {/* GitHub Handle (Optional) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              GitHub Username (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                <GithubIcon className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={githubHandle}
                onChange={(e) => setGithubHandle(e.target.value.replace(/^@/, ''))}
                placeholder="your-github-username"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-800/80 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 border border-slate-700 rounded-xl font-mono text-white transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              We will sync your public repositories and open source proof of work.
            </p>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving || (selectedSpecialties.length === 0 && selectedTech.length === 0)}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs tracking-wider uppercase shadow-lg shadow-blue-600/25 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Personalizing Feed...</span>
                </>
              ) : (
                <>
                  <span>Enter CODE SOCIAL</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
