import React from 'react';
import { Terminal, FolderGit2, Plus } from 'lucide-react';

interface EmptyStateProps {
  type: 'projects' | 'builds' | 'notifications' | 'search' | 'developers';
  onAction?: () => void;
  actionText?: string;
  description?: string;
  message?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type, onAction, actionText, description, message }) => {
  const configs = {
    projects: {
      icon: FolderGit2,
      title: 'No projects shipped yet.',
      description: 'Connect your GitHub repository to import your work or start tracking your first project here.',
      defaultBtn: 'Create Project',
    },
    builds: {
      icon: Terminal,
      title: 'No build logs recorded.',
      description: 'Document what you changed today. Log a commit, share a latency optimization, or record a milestone.',
      defaultBtn: 'Log What You Built',
    },
    notifications: {
      icon: Terminal,
      title: 'All caught up.',
      description: 'You will receive alerts when developers fork your projects, apply to contribute, or comment on your builds.',
      defaultBtn: 'Explore Trending Builds',
    },
    search: {
      icon: Terminal,
      title: 'No technical matches found.',
      description: 'Try searching by language (e.g. "Rust", "FastAPI"), specialty (e.g. "AI", "Kernel"), or project name.',
      defaultBtn: 'Clear Search',
    },
    developers: {
      icon: Terminal,
      title: 'No builders found.',
      description: 'No developers found matching your current filter criteria.',
      defaultBtn: 'Reset Filters',
    },
  };

  const current = configs[type];
  const Icon = current.icon;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 shadow-soft my-4">
      <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-3 text-dev-accent">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900 mb-1">{current.title}</h3>
      <p className="text-xs text-slate-500 max-w-xs mb-4 leading-relaxed">{message || description || current.description}</p>
      {onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-dev-accent hover:bg-dev-accentHover text-white text-xs font-medium shadow-soft transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          {actionText || current.defaultBtn}
        </button>
      )}
    </div>
  );
};
