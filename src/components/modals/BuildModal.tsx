import React, { useState, useEffect } from 'react';
import { X, Terminal, GitCommit, Code2, Sparkles, FolderPlus, HelpCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useFeedStore } from '../../stores/feedStore';
import { useProjectStore } from '../../stores/projectStore';
import { useAuthStore } from '../../stores/authStore';
import { useGitHubStore } from '../../stores/githubStore';
import { GithubIcon } from '../common/Icons';
import { TechBadge } from '../common/TechBadge';
import { GitHubCommit, GitHubRepository } from '../../types/github';

type BuildTab = 'log' | 'project' | 'release' | 'question';

const AVAILABLE_TECH = ['Rust', 'Python', 'TypeScript', 'React', 'FastAPI', 'CUDA', 'PyTorch', 'Go', 'C++', 'Vulkan', 'Linux', 'eBPF', 'io_uring', 'Kotlin'];

export const BuildModal: React.FC = () => {
  const { buildModalOpen, setBuildModalOpen, buildModalTab, showToast } = useUIStore();
  const { addBuildLog } = useFeedStore();
  const { projects, createProject } = useProjectStore();
  const { currentUser, isAuthenticated, setAuthModalOpen } = useAuthStore();
  const { account, repositories, getCommitsForRepo, linkRepositoryToProject } = useGitHubStore();

  const [activeTab, setActiveTab] = useState<BuildTab>(buildModalTab || 'log');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (buildModalOpen) {
      setActiveTab(buildModalTab || 'log');
    }
  }, [buildModalOpen, buildModalTab]);

  // Build Log form state
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [changesText, setChangesText] = useState('• Added async inference queue\n• Reduced response latency to 18ms\n• Added retry handling with exponential backoff');
  const [selectedTech, setSelectedTech] = useState<string[]>(['Python', 'FastAPI']);
  const [commitHash, setCommitHash] = useState('e92f10b');
  const [dayNumber, setDayNumber] = useState(1);
  const [attachedDiff, setAttachedDiff] = useState<{ filename: string; additions: number; deletions: number; code: string }>({
    filename: 'src/pipeline/dispatch.py',
    additions: 34,
    deletions: 8,
    code: `+ async def dispatch_job(payload: JobBatch):\n+     return await runtime.schedule_worker(payload)`,
  });

  // New Project form state
  const [newProjName, setNewProjName] = useState('');
  const [newProjTagline, setNewProjTagline] = useState('');
  const [newProjCategory, setNewProjCategory] = useState<'AI' | 'Systems' | 'Web' | 'Mobile' | 'Open Source' | 'Data'>('AI');
  const [newProjRepo, setNewProjRepo] = useState('');
  const [selectedImportRepo, setSelectedImportRepo] = useState<GitHubRepository | null>(null);

  // Update selectedProjectId when projects load if empty
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  if (!buildModalOpen) return null;

  const availableCommits = account ? getCommitsForRepo('default') : [];

  const handleSelectCommit = (commit: GitHubCommit) => {
    setCommitHash(commit.shortSha);
    setAttachedDiff({
      filename: commit.filename,
      additions: commit.additions,
      deletions: commit.deletions,
      code: commit.diffSnippet,
    });
    if (!title.trim()) {
      setTitle(commit.message);
    }
  };

  const handleSelectImportRepo = (repo: GitHubRepository) => {
    setSelectedImportRepo(repo);
    setNewProjName(repo.name);
    setNewProjTagline(repo.description || 'Open source tool');
    setNewProjRepo(repo.htmlUrl);
    if (repo.primaryLanguage && !selectedTech.includes(repo.primaryLanguage)) {
      setSelectedTech([repo.primaryLanguage, ...selectedTech]);
    }
  };

  const toggleTech = (tech: string) => {
    if (selectedTech.includes(tech)) {
      setSelectedTech(selectedTech.filter((t) => t !== tech));
    } else {
      setSelectedTech([...selectedTech, tech]);
    }
  };

  const handlePublishBuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (!isAuthenticated || !currentUser?.id) {
      setAuthModalOpen(true);
      showToast('Please sign in to publish a build log.');
      return;
    }

    const project = projects.find((p) => p.id === selectedProjectId) || projects[0];
    if (!project) {
      showToast('Please create or select a project first.');
      setActiveTab('project');
      return;
    }

    const parsedChanges = changesText
      .split('\n')
      .map((line) => line.replace(/^[•\-\*]\s*/, '').trim())
      .filter(Boolean);

    setIsSubmitting(true);
    try {
      await addBuildLog(
        {
          projectId: project.id,
          projectName: project.name,
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorHandle: currentUser.handle,
          authorAvatar: currentUser.avatar,
          dayNumber: Number(dayNumber) || 1,
          title: title.trim(),
          summary: summary.trim() || title.trim(),
          changes: parsedChanges,
          techStack: selectedTech.length > 0 ? selectedTech : [project.primaryTech],
          commitHash: commitHash.trim() || undefined,
          repositoryUrl: project.repositoryUrl,
          diffSnippet: attachedDiff,
        },
        currentUser.id
      );

      showToast(`Build log published to @${project.name}!`);
      setBuildModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to publish build log');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    if (!isAuthenticated || !currentUser?.id) {
      setAuthModalOpen(true);
      showToast('Please sign in to create a project.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createProject(
        {
          name: newProjName.trim(),
          tagline: newProjTagline.trim() || 'A developer-built tool',
          description: `Open-source project built by @${currentUser.handle}.`,
          repositoryUrl: newProjRepo.trim() || `https://github.com/${currentUser.handle}/${newProjName.toLowerCase()}`,
          primaryTech: selectedTech[0] || 'TypeScript',
          techStack: selectedTech.length > 0 ? selectedTech : ['TypeScript'],
          status: 'active',
          category: newProjCategory,
        },
        currentUser.id
      );

      if (selectedImportRepo) {
        linkRepositoryToProject(created.id, selectedImportRepo, true);
      }

      showToast(`Project @${created.name} created!`);
      setSelectedProjectId(created.id);
      setActiveTab('log');
    } catch (err: any) {
      showToast(err.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-soft-lg overflow-hidden text-left max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-dev-accent">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                I Built Something
              </h2>
              <p className="text-[11px] text-slate-500">Document your engineering progress</p>
            </div>
          </div>
          <button
            onClick={() => setBuildModalOpen(false)}
            className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Type Selector */}
        <div className="grid grid-cols-4 border-b border-slate-200 text-xs font-medium bg-slate-50/40">
          <button
            onClick={() => setActiveTab('log')}
            className={`py-2.5 px-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'log'
                ? 'border-dev-accent text-dev-accent font-semibold bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="truncate">Build Log</span>
          </button>
          <button
            onClick={() => setActiveTab('project')}
            className={`py-2.5 px-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'project'
                ? 'border-dev-accent text-dev-accent font-semibold bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span className="truncate">New Project</span>
          </button>
          <button
            onClick={() => setActiveTab('release')}
            className={`py-2.5 px-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'release'
                ? 'border-dev-accent text-dev-accent font-semibold bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="truncate">Release</span>
          </button>
          <button
            onClick={() => setActiveTab('question')}
            className={`py-2.5 px-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'question'
                ? 'border-dev-accent text-dev-accent font-semibold bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="truncate">Ask Question</span>
          </button>
        </div>

        {/* Tab 1: Create Build Log (Primary) */}
        {activeTab === 'log' && (
          <form onSubmit={handlePublishBuild} className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Project selection & Day count */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Project
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:bg-white focus:border-dev-accent focus:ring-2 focus:ring-blue-100 transition-all"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.primaryTech})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Day #
                </label>
                <input
                  type="number"
                  value={dayNumber}
                  onChange={(e) => setDayNumber(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:bg-white focus:border-dev-accent focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                What did you build today?
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Implemented streaming token output in model pipeline"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-dev-accent focus:ring-2 focus:ring-blue-100 font-medium transition-all"
              />
            </div>

            {/* Short Summary */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Technical Context (Summary)
              </label>
              <textarea
                rows={2}
                placeholder="Briefly describe the architectural rationale or bottleneck resolved..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-dev-accent focus:ring-2 focus:ring-blue-100 leading-relaxed resize-none transition-all"
              />
            </div>

            {/* What Changed (Bulleted) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[11px] font-medium text-slate-600">
                  What Changed
                </label>
                <span className="text-[10px] text-slate-400">One bullet per line</span>
              </div>
              <textarea
                rows={3}
                value={changesText}
                onChange={(e) => setChangesText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-dev-accent focus:ring-2 focus:ring-blue-100 leading-relaxed resize-none transition-all"
              />
            </div>

            {/* Tech Stack Picker */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
                Tech Stack
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_TECH.map((tech) => (
                  <TechBadge
                    key={tech}
                    name={tech}
                    size="xs"
                    selected={selectedTech.includes(tech)}
                    onClick={() => toggleTech(tech)}
                  />
                ))}
              </div>
            </div>

            {/* GitHub Verified Commit Proof Selector */}
            {availableCommits.length > 0 && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                    <GithubIcon className="w-3.5 h-3.5 text-slate-600" />
                    Attach Verified Git Commit Proof
                  </span>
                  <span className="text-[10px] text-slate-400">Optional</span>
                </div>
                <select
                  onChange={(e) => {
                    const c = availableCommits.find((commit) => commit.shortSha === e.target.value);
                    if (c) handleSelectCommit(c);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Select a recent commit to attach diff --</option>
                  {availableCommits.map((c) => (
                    <option key={c.sha} value={c.shortSha}>
                      {c.shortSha} - {c.message.slice(0, 48)}...
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Commit Hash & Repository */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Git Commit (Optional)
                </label>
                <div className="relative">
                  <GitCommit className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={commitHash}
                    onChange={(e) => setCommitHash(e.target.value)}
                    placeholder="e.g. 8b1f3c"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:bg-white focus:border-dev-accent focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Attachment
                </label>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-600 flex items-center justify-between">
                  <span>Diff: {attachedDiff.filename} (+{attachedDiff.additions}/-{attachedDiff.deletions})</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBuildModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-dev-accent hover:bg-dev-accentHover disabled:opacity-60 text-white font-medium text-xs shadow-soft transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <span>Publish Build Log</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Create Project */}
        {activeTab === 'project' && (
          <form onSubmit={handleCreateProject} className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Optional GitHub Repository Import */}
            {repositories.length > 0 && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                    <GithubIcon className="w-3.5 h-3.5 text-slate-600" />
                    Import from Synced GitHub Repository
                  </span>
                  <span className="text-[10px] text-slate-400">Optional</span>
                </div>
                <select
                  onChange={(e) => {
                    const repo = repositories.find((r) => r.name === e.target.value);
                    if (repo) handleSelectImportRepo(repo);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Choose a repository to pre-fill --</option>
                  {repositories.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.fullName} ({r.primaryLanguage || 'Code'}) • ★ {r.starsCount}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Project Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. HyperKV"
                value={newProjName}
                onChange={(e) => setNewProjName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-dev-accent focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Tagline
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Distributed persistent memory storage engine"
                value={newProjTagline}
                onChange={(e) => setNewProjTagline(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-dev-accent focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Category
                </label>
                <select
                  value={newProjCategory}
                  onChange={(e) => setNewProjCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-dev-accent focus:ring-2 focus:ring-blue-100 transition-all"
                >
                  <option value="AI">AI</option>
                  <option value="Systems">Systems</option>
                  <option value="Web">Web</option>
                  <option value="Mobile">Mobile</option>
                  <option value="Open Source">Open Source</option>
                  <option value="Data">Data</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Repository URL
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/..."
                  value={newProjRepo}
                  onChange={(e) => setNewProjRepo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:bg-white focus:border-dev-accent focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
                Primary Technologies
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_TECH.slice(0, 10).map((tech) => (
                  <TechBadge
                    key={tech}
                    name={tech}
                    size="xs"
                    selected={selectedTech.includes(tech)}
                    onClick={() => toggleTech(tech)}
                  />
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBuildModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-dev-accent hover:bg-dev-accentHover disabled:opacity-60 text-white font-medium text-xs shadow-soft transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Project</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3 & 4: Release & Question shortcuts */}
        {(activeTab === 'release' || activeTab === 'question') && (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-dev-accent">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              {activeTab === 'release' ? 'Share Software Release' : 'Ask Technical Architecture Question'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Attach semver tags, release notes, or specific architecture trade-offs for peer developer review.
            </p>
            <button
              onClick={() => setActiveTab('log')}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-dev-accent rounded-xl text-xs font-medium border border-slate-200 transition-colors"
            >
              Back to Build Log
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
