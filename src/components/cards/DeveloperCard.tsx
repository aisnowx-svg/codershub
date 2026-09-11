import React from 'react';
import { Developer } from '../../types';
import { TechBadge } from '../common/TechBadge';
import { Hammer, UserCheck, UserPlus } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';

interface DeveloperCardProps {
  developer: Developer;
}

export const DeveloperCard: React.FC<DeveloperCardProps> = ({ developer }) => {
  const { openDeveloperProfile, openProjectPage } = useUIStore();
  const [following, setFollowing] = React.useState(developer.isFollowing || false);

  const toggleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFollowing(!following);
  };

  return (
    <div
      onClick={() => openDeveloperProfile(developer.id)}
      className="bg-white hover:border-slate-300 border border-slate-200/80 rounded-2xl p-6 text-left cursor-pointer group shadow-soft hover:shadow-soft-hover transition-all relative overflow-hidden"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-3.5">
          <img
            src={developer.avatar}
            alt={developer.name}
            className="w-12 h-12 rounded-full object-cover border border-slate-200 group-hover:ring-2 group-hover:ring-blue-500/20 transition-all"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors font-sans">
                {developer.name}
              </h3>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {developer.specialty}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans">@{developer.handle}</p>
            <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{developer.role}</p>
          </div>
        </div>

        <button
          onClick={toggleFollow}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
            following
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200/70 border border-slate-200'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
          }`}
        >
          {following ? <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> : <UserPlus className="w-3.5 h-3.5" />}
          <span>{following ? 'Following' : 'Follow'}</span>
        </button>
      </div>

      {/* Bio */}
      <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed line-clamp-2">
        {developer.bio}
      </p>

      {/* CURRENTLY BUILDING section */}
      <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/60 mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
            <Hammer className="w-3 h-3 text-blue-600" />
            Currently Building
          </span>
          <span className="text-blue-600 font-bold font-code text-xs">
            {developer.currentlyBuilding.progressPercentage}%
          </span>
        </div>

        <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openProjectPage(developer.currentlyBuilding.projectId);
            }}
            className="hover:text-blue-600 hover:underline text-left cursor-pointer"
          >
            {developer.currentlyBuilding.projectName}
          </button>
          <span className="text-[11px] text-slate-400 font-normal truncate max-w-[200px] hidden sm:inline">
            {developer.currentlyBuilding.latestMilestone}
          </span>
        </div>

        {/* Clean Progress Bar */}
        <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${developer.currentlyBuilding.progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Tech tags */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {developer.techStack.slice(0, 5).map((tech) => (
          <TechBadge key={tech} name={tech} size="xs" />
        ))}
      </div>

      {/* Bottom mini proof */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
        <div>
          <span className="font-bold text-slate-800">{developer.proofOfWork.projectsShipped}</span>
          <span className="text-slate-400 ml-1">projects shipped</span>
        </div>
        <div>
          <span className="font-bold text-slate-800">{developer.proofOfWork.buildLogsCount}</span>
          <span className="text-slate-400 ml-1">build logs</span>
        </div>
        <div>
          <span className="font-bold text-blue-600 font-code">{developer.proofOfWork.githubContributions.toLocaleString()}</span>
          <span className="text-slate-400 ml-1">commits</span>
        </div>
      </div>
    </div>
  );
};
