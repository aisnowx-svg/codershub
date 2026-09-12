import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useGitHubStore } from '../stores/githubStore';
import { useUIStore } from '../stores/uiStore';
import { profileService } from '../services/profileService';
import { buildLogService } from '../services/buildLogService';
import { projectService } from '../services/projectService';
import { followService } from '../services/followService';
import { storageService } from '../services/storageService';
import { ProofOfWork } from '../components/common/ProofOfWork';
import { TechBadge } from '../components/common/TechBadge';
import { BuildLogCard } from '../components/cards/BuildLogCard';
import { ProjectCard } from '../components/cards/ProjectCard';
import { GithubIcon } from '../components/common/Icons';
import {
  MapPin,
  UserPlus,
  UserCheck,
  ArrowLeft,
  Edit3,
  LogOut,
  Upload,
  Loader2,
  X,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Lock,
  FolderGit2,
} from 'lucide-react';
import { Developer, BuildLog, Project, DeveloperSpecialty } from '../types';

interface DeveloperProfileProps {
  developerId?: string;
}

export const DeveloperProfile: React.FC<DeveloperProfileProps> = ({ developerId }) => {
  const { currentUser, updateProfile, signOut, isAuthenticated, setAuthModalOpen } = useAuthStore();
  const {
    account,
    repositories,
    isSyncing,
    isConnecting,
    lastSyncError,
    startConnect,
    disconnectAccount,
    triggerSync,
    loadAccount,
    clearError,
  } = useGitHubStore();
  const { closeSubPage, showToast } = useUIStore();

  const [developer, setDeveloper] = useState<Developer>(currentUser);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'builds' | 'projects'>('builds');
  const [following, setFollowing] = useState(false);
  const [devLogs, setDevLogs] = useState<BuildLog[]>([]);
  const [devProjects, setDevProjects] = useState<Project[]>([]);

  // Edit profile state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editSpecialty, setEditSpecialty] = useState<DeveloperSpecialty>('Systems');
  const [editLocation, setEditLocation] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editGithubHandle, setEditGithubHandle] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetId = developerId || currentUser?.id;
  const isSelf = currentUser?.id && targetId === currentUser.id;

  useEffect(() => {
    async function loadDeveloperData() {
      if (!targetId) {
        setDeveloper(currentUser);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const profile = await profileService.getProfile(targetId, currentUser?.id);
        if (profile) {
          setDeveloper(profile);
          setFollowing(profile.isFollowing || false);
        } else {
          setDeveloper(currentUser);
        }

        const [logs, projs] = await Promise.all([
          buildLogService.getBuildLogsByAuthor(targetId),
          projectService.getProjects(undefined, currentUser?.id),
        ]);

        setDevLogs(logs);
        setDevProjects(
          projs.filter((p) => p.ownerId === targetId || p.contributors.some((c) => c.id === targetId))
        );
      } catch (err) {
        console.error('Error loading developer profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDeveloperData();
  }, [targetId, currentUser?.id]);

  useEffect(() => {
    if (isSelf && currentUser?.id) {
      loadAccount(currentUser.id);
    }
  }, [isSelf, currentUser?.id, loadAccount]);

  const handleToggleFollow = async () => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    if (!currentUser?.id || isSelf) return;

    const nextFollow = !following;
    setFollowing(nextFollow);
    setDeveloper((prev) => ({
      ...prev,
      followersCount: nextFollow ? prev.followersCount + 1 : Math.max(0, prev.followersCount - 1),
    }));

    if (nextFollow) {
      await followService.followUser(currentUser.id, developer.id);
      showToast(`Following @${developer.handle}`);
    } else {
      await followService.unfollowUser(currentUser.id, developer.id);
      showToast(`Unfollowed @${developer.handle}`);
    }
  };

  const openEditModal = () => {
    setEditName(developer.name);
    setEditBio(developer.bio);
    setEditRole(developer.role);
    setEditSpecialty(developer.specialty);
    setEditLocation(developer.location);
    setEditAvatar(developer.avatar);
    setEditGithubHandle(developer.githubHandle || '');
    setEditModalOpen(true);
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser.id) return;

    setUploadingAvatar(true);
    try {
      const publicUrl = await storageService.uploadAvatar(file, currentUser.id);
      setEditAvatar(publicUrl);
      showToast('Avatar uploaded to Supabase Storage');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.id) return;

    try {
      const cleanGithub = editGithubHandle.trim().replace(/^@/, '');
      const updated = {
        name: editName.trim(),
        bio: editBio.trim(),
        role: editRole.trim(),
        specialty: editSpecialty,
        location: editLocation.trim(),
        avatar: editAvatar,
        githubHandle: cleanGithub,
      };

      await updateProfile(updated);
      setDeveloper((prev) => ({ ...prev, ...updated }));
      setEditModalOpen(false);
      showToast('Profile updated successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <span className="text-xs">Loading developer profile...</span>
      </div>
    );
  }

  return (
    <div className="w-full text-left space-y-6">
      {/* Back button if opened as subpage */}
      {developerId && (
        <button
          onClick={closeSubPage}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-blue-600" />
          <span>Back to previous</span>
        </button>
      )}

      {/* 1. Clean Profile Header Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-7 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div className="flex items-center gap-4">
            <img
              src={developer.avatar}
              alt={developer.name}
              className="w-18 h-18 rounded-full object-cover border-2 border-slate-100 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans">
                  {developer.name}
                </h1>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  {developer.specialty}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">@{developer.handle}</p>
              {developer.githubHandle && (
                <a
                  href={`https://github.com/${developer.githubHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 mt-1 transition-colors"
                >
                  <GithubIcon className="w-3.5 h-3.5 text-slate-600" />
                  <span>github.com/{developer.githubHandle}</span>
                </a>
              )}
              <p className="text-xs text-slate-600 mt-1 font-medium">{developer.role}</p>
              {developer.location && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{developer.location}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSelf ? (
              <>
                {!account ? (
                  <button
                    onClick={() => startConnect()}
                    disabled={isConnecting}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all disabled:opacity-60"
                  >
                    <GithubIcon className="w-3.5 h-3.5 text-white" />
                    <span>{isConnecting ? 'Connecting...' : 'Connect GitHub'}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>@{account.githubUsername}</span>
                  </div>
                )}
                <button
                  onClick={openEditModal}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit Profile</span>
                </button>
                <button
                  onClick={() => signOut()}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={handleToggleFollow}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                  following
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {following ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Follow Builder</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Bio */}
        {developer.bio && (
          <p className="text-xs text-slate-600 mt-4 leading-relaxed max-w-2xl">
            {developer.bio}
          </p>
        )}

        {/* Tech Stack */}
        {developer.techStack && developer.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-slate-100">
            {developer.techStack.map((tech) => (
              <TechBadge key={tech} name={tech} size="sm" />
            ))}
          </div>
        )}
      </div>

      {/* GitHub App Integration Section */}
      {isSelf && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-soft space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <GithubIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">GitHub Integration</h2>
                <p className="text-[11px] text-slate-400">DevQuro App &bull; Verified Repository Proof of Work</p>
              </div>
            </div>

            {account && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerSync()}
                  disabled={isSyncing}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  title="Sync repositories from GitHub"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Repos'}</span>
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm('Disconnect your GitHub account from CODE SOCIAL?')) {
                      await disconnectAccount(currentUser.id);
                      showToast('GitHub account disconnected.');
                    }
                  }}
                  disabled={isSyncing}
                  className="px-2.5 py-1.5 rounded-lg border border-red-200/80 text-[11px] font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  Disconnect GitHub
                </button>
              </div>
            )}
          </div>

          {/* Error State */}
          {lastSyncError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200/80 flex items-start justify-between gap-3 text-xs text-red-700">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{lastSyncError}</span>
              </div>
              <button
                onClick={() => {
                  clearError();
                  startConnect();
                }}
                className="px-3 py-1 rounded-lg bg-red-600 text-white font-medium text-xs hover:bg-red-700 transition-colors shrink-0 cursor-pointer"
              >
                Try again
              </button>
            </div>
          )}

          {/* Connecting State */}
          {isConnecting && (
            <div className="py-6 flex flex-col items-center justify-center space-y-2 text-slate-600">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs font-medium font-mono">Connecting to GitHub...</span>
            </div>
          )}

          {/* Connected State */}
          {!isConnecting && account && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60">
                <div className="flex items-center gap-3">
                  <img
                    src={account.avatarUrl}
                    alt={account.githubUsername}
                    className="w-9 h-9 rounded-full border border-slate-200"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 font-mono">@{account.githubUsername}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Connected
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Sync Status: <span className="font-medium text-slate-600 capitalize">{account.syncStatus}</span> &bull; {repositories.length} accessible repositories
                    </p>
                  </div>
                </div>
                <a
                  href={account.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                >
                  <span>View GitHub</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Accessible Repositories */}
              {repositories.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Accessible Repositories ({repositories.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {repositories.map((repo) => (
                      <div
                        key={repo.id || repo.githubRepoId}
                        className="p-3 rounded-xl border border-slate-200/70 bg-white hover:border-slate-300 transition-colors flex items-start justify-between gap-2 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <FolderGit2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <a
                              href={repo.htmlUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-slate-900 hover:text-blue-600 truncate transition-colors font-mono"
                            >
                              {repo.name}
                            </a>
                            {repo.isPrivate && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 text-[9px] font-medium border border-amber-200/60 flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" /> Private
                              </span>
                            )}
                          </div>
                          {repo.description && (
                            <p className="text-[11px] text-slate-500 truncate mt-1">
                              {repo.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 font-mono">
                            {repo.primaryLanguage && (
                              <span className="flex items-center gap-1 text-slate-600 font-sans">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                {repo.primaryLanguage}
                              </span>
                            )}
                            {repo.starsCount > 0 && (
                              <span>★ {repo.starsCount}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  No repositories accessible yet. Configure repository access in your DevQuro GitHub App installation settings.
                </div>
              )}
            </div>
          )}

          {/* Not Connected State */}
          {!isConnecting && !account && !lastSyncError && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200/60">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-800">
                  Link DevQuro to verify Proof of Work
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed max-w-lg">
                  Connect your GitHub account to import repositories, verify commit activity, and link repositories to CODE SOCIAL projects.
                </p>
              </div>
              <button
                onClick={() => startConnect()}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-xs shrink-0 cursor-pointer"
              >
                <GithubIcon className="w-3.5 h-3.5 text-white" />
                <span>Connect GitHub</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. Proof of Work Grid */}
      <ProofOfWork
        stats={{
          projectsShipped: devProjects.length,
          openSourceProjects: devProjects.filter((p) => p.category === 'Open Source').length,
          githubContributions: developer.proofOfWork?.githubContributions || 0,
          buildLogsCount: devLogs.length,
          collaborationsCount: developer.proofOfWork?.collaborationsCount || 0,
        }}
      />

      {/* 3. Segmented Activity View: Builds vs Projects */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
          <button
            onClick={() => setActiveTab('builds')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'builds'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            Build Logs ({devLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'projects'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            Projects ({devProjects.length})
          </button>
        </div>

        {activeTab === 'builds' ? (
          devLogs.length > 0 ? (
            <div className="space-y-4">
              {devLogs.map((log) => (
                <BuildLogCard key={log.id} log={log} />
              ))}
            </div>
          ) : (
            <div className="p-8 bg-white border border-slate-200/80 rounded-2xl text-center text-xs text-slate-400">
              No published build logs yet.
            </div>
          )
        ) : devProjects.length > 0 ? (
          <div className="space-y-4">
            {devProjects.map((proj) => (
              <ProjectCard key={proj.id} project={proj} />
            ))}
          </div>
        ) : (
          <div className="p-8 bg-white border border-slate-200/80 rounded-2xl text-center text-xs text-slate-400">
            No projects associated with this developer yet.
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-soft-lg overflow-hidden text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <h2 className="text-sm font-bold text-slate-900">Edit Developer Profile</h2>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Avatar Upload */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Profile Avatar
                </label>
                <div className="flex items-center gap-4">
                  <img
                    src={editAvatar || developer.avatar}
                    alt="Preview"
                    className="w-14 h-14 rounded-full object-cover border border-slate-200 shadow-2xs"
                  />
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarFileChange}
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploadingAvatar}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{uploadingAvatar ? 'Uploading...' : 'Upload Image to Storage'}</span>
                    </button>
                    <p className="text-[10px] text-slate-400 mt-1">PNG, JPG, WebP up to 5MB</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Title / Engineering Role
                </label>
                <input
                  type="text"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  placeholder="e.g. Systems & AI Engineer"
                  className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Primary Engineering Specialty
                </label>
                <select
                  value={editSpecialty}
                  onChange={(e) => setEditSpecialty(e.target.value as DeveloperSpecialty)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 rounded-xl"
                >
                  <option value="Systems">Systems</option>
                  <option value="AI">AI</option>
                  <option value="Rust">Rust</option>
                  <option value="Frontend">Frontend</option>
                  <option value="Backend">Backend</option>
                  <option value="Open Source">Open Source</option>
                  <option value="Mobile">Mobile</option>
                  <option value="DevOps">DevOps</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Bio / Philosophy
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 rounded-xl leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA"
                  className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  GitHub Integration
                </label>

                {account ? (
                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={account.avatarUrl}
                        alt={account.githubUsername}
                        className="w-8 h-8 rounded-full border border-emerald-200"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 font-mono">@{account.githubUsername}</span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Connected
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">DevQuro GitHub App Verified</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm('Disconnect your GitHub account?')) {
                          await disconnectAccount(currentUser.id);
                          setEditGithubHandle('');
                          showToast('GitHub disconnected');
                        }
                      }}
                      className="text-[11px] font-semibold text-red-600 hover:text-red-700 cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">DevQuro GitHub OAuth</p>
                        <p className="text-[11px] text-slate-500">Connect via OAuth to verify repositories & commits automatically.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditModalOpen(false);
                          startConnect();
                        }}
                        disabled={isConnecting}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all shrink-0"
                      >
                        <GithubIcon className="w-3.5 h-3.5 text-white" />
                        <span>{isConnecting ? 'Connecting...' : 'Connect GitHub'}</span>
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60">
                      <span className="block text-[10px] font-medium text-slate-500 mb-1">Or manual username fallback:</span>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs text-slate-400">@</span>
                        <input
                          type="text"
                          value={editGithubHandle}
                          onChange={(e) => setEditGithubHandle(e.target.value)}
                          placeholder="octocat"
                          className="w-full pl-7 pr-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 rounded-xl font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
