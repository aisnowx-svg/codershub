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
} from 'lucide-react';
import { Developer, BuildLog, Project, DeveloperSpecialty } from '../types';

interface DeveloperProfileProps {
  developerId?: string;
}

export const DeveloperProfile: React.FC<DeveloperProfileProps> = ({ developerId }) => {
  const { currentUser, updateProfile, signOut, isAuthenticated, setAuthModalOpen } = useAuthStore();
  const { connectAccount } = useGitHubStore();
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
      if (cleanGithub) {
        await connectAccount(cleanGithub);
      }
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

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  GitHub Handle
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400">@</span>
                  <input
                    type="text"
                    value={editGithubHandle}
                    onChange={(e) => setEditGithubHandle(e.target.value)}
                    placeholder="octocat"
                    className="w-full pl-7 pr-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 rounded-xl"
                  />
                </div>
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
