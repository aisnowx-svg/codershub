import React from 'react';
import { ProofOfWork as ProofOfWorkType } from '../../types';
import { CheckCircle2, GitBranch, GitCommit, ScrollText, Users } from 'lucide-react';

interface ProofOfWorkProps {
  stats: ProofOfWorkType;
  title?: string;
}

export const ProofOfWork: React.FC<ProofOfWorkProps> = ({ stats, title = 'PROOF OF WORK' }) => {
  const items = [
    {
      label: 'Projects shipped',
      value: stats.projectsShipped,
      icon: CheckCircle2,
      accent: 'text-emerald-500',
    },
    {
      label: 'Open source',
      value: stats.openSourceProjects,
      icon: GitBranch,
      accent: 'text-blue-500',
    },
    {
      label: 'GitHub commits',
      value: stats.githubContributions.toLocaleString(),
      icon: GitCommit,
      accent: 'text-indigo-500',
    },
    {
      label: 'Build logs',
      value: stats.buildLogsCount,
      icon: ScrollText,
      accent: 'text-purple-500',
    },
    {
      label: 'Collaborations',
      value: stats.collaborationsCount,
      icon: Users,
      accent: 'text-sky-500',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          {title}
        </h3>
        <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
          Verified Activity
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="bg-slate-50/70 hover:bg-slate-50 transition-colors rounded-xl p-3.5 border border-slate-100 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">{item.label}</span>
                <Icon className={`w-3.5 h-3.5 ${item.accent}`} />
              </div>
              <div className="text-xl font-bold font-code tracking-tight text-slate-900">
                {item.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
