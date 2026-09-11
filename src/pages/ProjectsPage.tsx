import React, { useState } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useUIStore } from '../stores/uiStore';
import { ProjectCard } from '../components/cards/ProjectCard';
import { PROJECT_CATEGORIES, PROJECT_STATUSES } from '../constants/tech';
import type { ProjectCategory, ProjectStatus } from '../types';
import { Search, Users, FolderGit2, Plus } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';

export const ProjectsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory | 'All'>('All');
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyHiring, setOnlyHiring] = useState<boolean>(false);
  const { setBuildModalOpen } = useUIStore();

  const { projects, loading, updateFilters } = useProjects({
    category: selectedCategory === 'All' ? undefined : selectedCategory,
    status: selectedStatus === 'All' ? undefined : selectedStatus,
    query: searchQuery || undefined,
    hasOpenPositions: onlyHiring ? true : undefined,
  });

  const handleCategoryChange = (cat: ProjectCategory | 'All') => {
    setSelectedCategory(cat);
    updateFilters({ category: cat === 'All' ? undefined : cat });
  };

  const handleStatusChange = (status: ProjectStatus | 'All') => {
    setSelectedStatus(status);
    updateFilters({ status: status === 'All' ? undefined : status });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    updateFilters({ query: val || undefined });
  };

  const handleToggleHiring = () => {
    const next = !onlyHiring;
    setOnlyHiring(next);
    updateFilters({ hasOpenPositions: next ? true : undefined });
  };

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setSelectedStatus('All');
    setSearchQuery('');
    setOnlyHiring(false);
    updateFilters({ category: undefined, status: undefined, query: undefined, hasOpenPositions: undefined });
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <FolderGit2 className="w-5 h-5 stroke-[2.2]" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Projects
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            First-class software projects built by real developers. Inspect architectures, follow roadmaps, and contribute.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleHiring}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              onlyHiring
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className={`w-3.5 h-3.5 ${onlyHiring ? 'text-white' : 'text-slate-400'}`} />
            <span>Open Collaborations</span>
          </button>

          <button
            onClick={() => setBuildModalOpen(true, 'project')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* 2. Filters & Search Bar */}
      <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Filter projects by name, technology (e.g. Rust, PyTorch), or architecture..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200 rounded-xl transition-all"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 uppercase tracking-wider">
            Category:
          </span>
          <button
            onClick={() => handleCategoryChange('All')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
              selectedCategory === 'All'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            All
          </button>
          {PROJECT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pt-1 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 uppercase tracking-wider">
            Status:
          </span>
          <button
            onClick={() => handleStatusChange('All')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
              selectedStatus === 'All'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            All
          </button>
          {PROJECT_STATUSES.map((status) => (
            <button
              key={status.id}
              onClick={() => handleStatusChange(status.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                selectedStatus === status.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Project Listings */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse h-48"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          type="projects"
          actionText="Reset all filters"
          onAction={handleResetFilters}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
};
