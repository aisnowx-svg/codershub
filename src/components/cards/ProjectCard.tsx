import React from 'react';
import { Project } from '../../types';
import { TechBadge } from '../common/TechBadge';
import { Star, GitFork, Activity, Users, ArrowUpRight } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const { toggleFollowProject } = useProjectStore();
  const { openProjectPage, openForkModal, openJoinModal, openDeveloperProfile } = useUIStore();

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFollowProject(project.id);
  };

  const handleFork = (e: React.MouseEvent) => {
    e.stopPropagation();
    openForkModal(project);
  };

  const handleJoin = (e: React.MouseEvent) => {
    e.stopPropagation();
    openJoinModal(project);
  };

  return (
    <div
      onClick={() => openProjectPage(project.id)}
      className="bg-white hover:border-slate-300 border border-slate-200/80 rounded-2xl p-4 sm:p-6 text-left cursor-pointer group shadow-soft hover:shadow-soft-hover transition-all relative overflow-hidden"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 text-sm font-code shrink-0 shadow-2xs">
            {project.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
              <span>{project.name}</span>
              <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
            </h3>
            <span className="text-xs text-slate-400 font-medium">{project.category}</span>
          </div>
        </div>

        {/* Stars and Forks */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleFollow}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              project.isFollowing
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${project.isFollowing ? 'fill-current text-amber-500' : 'text-slate-400'}`} />
            <span>{project.stars.toLocaleString()}</span>
          </button>

          <button
            onClick={handleFork}
            title="Fork Project"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-blue-600 border border-slate-200 transition-colors"
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>{project.forkCount}</span>
          </button>
        </div>
      </div>

      {/* Tagline */}
      <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
        {project.tagline}
      </p>

      {/* Looking for contributors banner */}
      {project.lookingForContributors && (
        <div className="mb-4 p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="text-xs text-slate-800">
              <span className="font-semibold text-blue-700">Looking for contributors</span>
              <span className="text-slate-500 hidden sm:inline"> — {project.lookingForContributors.openPositions} positions open</span>
            </div>
          </div>
          <button
            onClick={handleJoin}
            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shrink-0 shadow-2xs"
          >
            Join Project
          </button>
        </div>
      )}

      {/* Tech badges */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {project.techStack.slice(0, 5).map((tech) => (
          <TechBadge key={tech} name={tech} size="xs" />
        ))}
      </div>

      {/* Footer: Contributors & Build activity */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2 overflow-hidden">
            {project.contributors.map((c) => (
              <img
                key={c.id}
                src={c.avatar}
                alt={c.name}
                title={`${c.name} (${c.role})`}
                onClick={(e) => {
                  e.stopPropagation();
                  openDeveloperProfile(c.id);
                }}
                className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover hover:z-10 hover:scale-110 transition-transform"
              />
            ))}
          </div>
          <span className="text-slate-500 text-xs ml-1">
            {project.contributors.length} builder{project.contributors.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          <span>{project.buildActivityCount} updates</span>
        </div>
      </div>
    </div>
  );
};
