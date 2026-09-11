import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { projectService } from '../services/projectService';
import { buildLogService } from '../services/buildLogService';
import { TechBadge } from '../components/common/TechBadge';
import { BuildLogCard } from '../components/cards/BuildLogCard';
import {
  Star,
  GitFork,
  ExternalLink,
  ArrowLeft,
  Loader2,
  Edit3,
  Trash2,
  X,
} from 'lucide-react';
import { Project, BuildLog, ProjectStatus, ProjectCategory } from '../types';

interface ProjectPageProps {
  projectId: string;
}

export const ProjectPage: React.FC<ProjectPageProps> = ({ projectId }) => {
  const { toggleFollowProject } = useProjectStore();
  const { currentUser, isAuthenticated, setAuthModalOpen } = useAuthStore();
  const { openForkModal, openDeveloperProfile, closeSubPage, showToast } = useUIStore();

  const [project, setProject] = useState<Project | null>(null);
  const [projectLogs, setProjectLogs] = useState<BuildLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit project state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<ProjectStatus>('active');
  const [editCategory, setEditCategory] = useState<ProjectCategory>('AI');
  const [editRepoUrl, setEditRepoUrl] = useState('');
  const [editWebsiteUrl, setEditWebsiteUrl] = useState('');

  useEffect(() => {
    async function loadProject() {
      setLoading(true);
      try {
        const [p, logs] = await Promise.all([
          projectService.getProjectById(projectId, currentUser?.id),
          buildLogService.getBuildLogsByProject(projectId),
        ]);
        setProject(p);
        setProjectLogs(logs);
      } catch (err) {
        console.error('Error loading project:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProject();
  }, [projectId, currentUser?.id]);

  const handleFollow = async () => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    if (!project) return;

    await toggleFollowProject(project.id, currentUser?.id);
    const willFollow = !project.isFollowing;
    setProject((prev) =>
      prev
        ? {
            ...prev,
            isFollowing: willFollow,
            stars: willFollow ? prev.stars + 1 : Math.max(0, prev.stars - 1),
          }
        : null
    );
    showToast(willFollow ? `Starred @${project.name}` : `Unstarred @${project.name}`);
  };

  const openEdit = () => {
    if (!project) return;
    setEditName(project.name);
    setEditTagline(project.tagline);
    setEditDescription(project.description);
    setEditStatus(project.status);
    setEditCategory(project.category);
    setEditRepoUrl(project.repositoryUrl);
    setEditWebsiteUrl(project.websiteUrl || '');
    setEditModalOpen(true);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    try {
      const updated = await projectService.updateProject(project.id, {
        name: editName.trim(),
        tagline: editTagline.trim(),
        description: editDescription.trim(),
        status: editStatus,
        category: editCategory,
        repositoryUrl: editRepoUrl.trim(),
        websiteUrl: editWebsiteUrl.trim() || undefined,
      });

      setProject(updated);
      setEditModalOpen(false);
      showToast('Project updated successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to update project');
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    if (!window.confirm(`Are you sure you want to delete @${project.name}? This cannot be undone.`)) {
      return;
    }

    try {
      await projectService.deleteProject(project.id);
      showToast(`Deleted project @${project.name}`);
      closeSubPage();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete project');
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <span className="text-xs">Loading project details...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm text-slate-500">Project not found or removed.</p>
        <button
          onClick={closeSubPage}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
        >
          Back to feed
        </button>
      </div>
    );
  }

  const isOwner = currentUser?.id && project.ownerId === currentUser.id;

  return (
    <div className="w-full text-left space-y-6">
      {/* Back button */}
      <button
        onClick={closeSubPage}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 text-blue-600" />
        <span>Back to previous</span>
      </button>

      {/* Project Banner Header Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-7 shadow-soft">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
                {project.name}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                {project.category}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                {project.status}
              </span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed font-normal">
              {project.tagline}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleFollow}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                project.isFollowing
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  project.isFollowing ? 'fill-current text-amber-500' : 'text-slate-400'
                }`}
              />
              <span>{project.stars.toLocaleString()}</span>
            </button>

            <button
              onClick={() => openForkModal(project)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-blue-600 border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>Fork</span>
            </button>

            {isOwner && (
              <>
                <button
                  onClick={openEdit}
                  className="p-2 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                  title="Edit Project"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDeleteProject}
                  className="p-2 rounded-full border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer"
                  title="Delete Project"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tech Badges */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {project.techStack.map((tech: string) => (
            <TechBadge key={tech} name={tech} size="sm" />
          ))}
        </div>

        {/* Repository & Demo links */}
        <div className="flex items-center gap-3 pt-4 border-t border-slate-100 text-xs">
          {project.repositoryUrl && (
            <a
              href={project.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium transition-colors"
            >
              <span>Repository</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          )}

          {project.websiteUrl && (
            <a
              href={project.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium transition-colors"
            >
              <span>Website</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          )}
        </div>
      </div>

      {/* Description Card */}
      {project.description && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-soft text-xs text-slate-600 leading-relaxed">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
            About the Project
          </h2>
          <p>{project.description}</p>
        </div>
      )}

      {/* Contributors Section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-soft">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
          Maintainers & Collaborators
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {project.contributors.map((c) => (
            <div
              key={c.id}
              onClick={() => openDeveloperProfile(c.id)}
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200/60 cursor-pointer transition-all"
            >
              <img
                src={c.avatar}
                alt={c.name}
                className="w-9 h-9 rounded-lg object-cover ring-1 ring-slate-200"
              />
              <div className="min-w-0">
                <div className="font-semibold text-xs text-slate-900 truncate">{c.name}</div>
                <div className="text-[11px] text-slate-400 truncate">@{c.handle} · {c.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Project Build Logs */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Project Build Logs ({projectLogs.length})
        </h2>
        {projectLogs.length > 0 ? (
          <div className="space-y-4">
            {projectLogs.map((log) => (
              <BuildLogCard key={log.id} log={log} />
            ))}
          </div>
        ) : (
          <div className="p-8 bg-white border border-slate-200/80 rounded-2xl text-center text-xs text-slate-400">
            No build logs published for this project yet.
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-soft-lg overflow-hidden text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <h2 className="text-sm font-bold text-slate-900">Edit Project</h2>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateProject} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Project Name
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
                  Tagline
                </label>
                <input
                  type="text"
                  required
                  value={editTagline}
                  onChange={(e) => setEditTagline(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 rounded-xl leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as ProjectCategory)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
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
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="active">Active</option>
                    <option value="alpha">Alpha</option>
                    <option value="beta">Beta</option>
                    <option value="shipped">Shipped</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Repository URL
                </label>
                <input
                  type="url"
                  value={editRepoUrl}
                  onChange={(e) => setEditRepoUrl(e.target.value)}
                  placeholder="https://github.com/org/repo"
                  className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  value={editWebsiteUrl}
                  onChange={(e) => setEditWebsiteUrl(e.target.value)}
                  placeholder="https://myproject.dev"
                  className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 rounded-xl"
                />
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
