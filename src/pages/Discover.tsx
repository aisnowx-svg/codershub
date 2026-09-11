import React, { useState, useEffect } from 'react';
import { useDevelopers } from '../hooks/useDevelopers';
import { useProjects } from '../hooks/useProjects';
import { projectService } from '../services/projectService';
import { DeveloperCard } from '../components/cards/DeveloperCard';
import { ProjectCard } from '../components/cards/ProjectCard';
import { TechBadge } from '../components/common/TechBadge';
import { EmptyState } from '../components/common/EmptyState';
import { Developer, Project } from '../types';
import { Loader2 } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';

type DiscoverTab = 'builders' | 'projects' | 'technologies';

interface TechItem {
  name: string;
  count: number;
  desc: string;
}

export const Discover: React.FC = () => {
  const [tab, setTab] = useState<DiscoverTab>('builders');
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [technologies, setTechnologies] = useState<TechItem[]>([]);
  const [techLoading, setTechLoading] = useState(false);

  const { developers, loading: devsLoading } = useDevelopers({
    tech: selectedTech || undefined,
  });

  const { projects, loading: projsLoading } = useProjects({
    tech: selectedTech || undefined,
  });

  const { setBuildModalOpen } = useUIStore();

  useEffect(() => {
    async function loadTech() {
      setTechLoading(true);
      const list = await projectService.getTechnologies();
      setTechnologies(list);
      setTechLoading(false);
    }
    loadTech();
  }, []);

  const isLoading = tab === 'builders' ? devsLoading : tab === 'projects' ? projsLoading : techLoading;

  return (
    <div className="w-full text-left space-y-8">
      {/* 1. Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
          Discover
        </h1>
        <p className="text-sm text-slate-500 mt-1 font-normal">
          Find interesting builders and projects across the network.
        </p>
      </div>

      {/* 2. Simple Segmented Controls (Builders / Projects / Technologies) */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('builders')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              tab === 'builders'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            Builders
          </button>

          <button
            onClick={() => setTab('projects')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              tab === 'projects'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            Projects
          </button>

          <button
            onClick={() => setTab('technologies')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              tab === 'technologies'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            Technologies
          </button>
        </div>

        {selectedTech && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filtering by:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">
              {selectedTech}
              <button
                onClick={() => setSelectedTech(null)}
                className="hover:text-blue-900 font-bold ml-1 cursor-pointer"
              >
                ×
              </button>
            </span>
          </div>
        )}
      </div>

      {/* 3. Spacious Lists */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600 mb-2" />
          <span className="text-xs font-medium">Discovering network...</span>
        </div>
      ) : tab === 'builders' ? (
        developers.length > 0 ? (
          <div className="space-y-6">
            {developers.map((dev: Developer) => (
              <DeveloperCard key={dev.id} developer={dev} />
            ))}
          </div>
        ) : (
          <EmptyState
            type="developers"
            message="No builders found matching your filter."
            actionText="Clear Filter"
            onAction={() => setSelectedTech(null)}
          />
        )
      ) : tab === 'projects' ? (
        projects.length > 0 ? (
          <div className="space-y-6">
            {projects.map((p: Project) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        ) : (
          <EmptyState
            type="projects"
            actionText="Start First Project"
            onAction={() => setBuildModalOpen(true)}
          />
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {technologies.map((item) => (
            <div
              key={item.name}
              onClick={() => {
                const next = selectedTech === item.name ? null : item.name;
                setSelectedTech(next);
                if (next) setTab('projects');
              }}
              className={`p-5 rounded-2xl border transition-all cursor-pointer text-left ${
                selectedTech === item.name
                  ? 'bg-blue-50/60 border-blue-200 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-white hover:bg-slate-50/80 border-slate-200/80 shadow-soft'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <TechBadge name={item.name} size="sm" selected={selectedTech === item.name} />
                <span className="text-xs text-blue-600 font-medium">Filter by tech →</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
