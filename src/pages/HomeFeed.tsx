import React, { useEffect } from 'react';
import { useFeedStore, FeedFilter } from '../stores/feedStore';
import { useProjectStore } from '../stores/projectStore';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { BuildLogCard } from '../components/cards/BuildLogCard';
import { ProjectCard } from '../components/cards/ProjectCard';
import { EmptyState } from '../components/common/EmptyState';
import { Plus, Loader2 } from 'lucide-react';
import { BuildLog, Project } from '../types';

export const HomeFeed: React.FC = () => {
  const { feedFilter, setFeedFilter, buildLogs, fetchFeed, isLoading: feedLoading } = useFeedStore();
  const { projects, fetchProjects, isLoading: projectsLoading } = useProjectStore();
  const { setBuildModalOpen } = useUIStore();
  const { currentUser } = useAuthStore();

  useEffect(() => {
    fetchFeed(feedFilter, currentUser?.id);
    fetchProjects(undefined, currentUser?.id);
  }, [fetchFeed, fetchProjects, feedFilter, currentUser?.id]);

  const filterOptions: { id: FeedFilter; label: string }[] = [
    { id: 'for-you', label: 'For You' },
    { id: 'following', label: 'Following' },
    { id: 'projects', label: 'Projects' },
  ];

  // Filter logs according to selected tab
  const displayedLogs = buildLogs.filter((log: BuildLog) => {
    if (feedFilter === 'for-you') return true;
    if (feedFilter === 'following') {
      const project = projects.find((p: Project) => p.id === log.projectId);
      return project?.isFollowing || log.authorId === currentUser.id;
    }
    return true;
  });

  const firstName = currentUser.name?.split(' ')[0] || 'Builder';
  const isLoading = feedFilter === 'projects' ? projectsLoading : feedLoading;

  return (
    <div className="w-full text-left space-y-8">
      {/* 1. Header Greeting & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Good day, {firstName} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-normal">
            Build today. A better tomorrow.
          </p>
        </div>

        {/* Prominent [+ I Built Something] Button */}
        <button
          onClick={() => setBuildModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-soft transition-all active:scale-98 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>I Built Something</span>
        </button>
      </div>

      {/* 2. Filter Pills */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setFeedFilter(opt.id)}
              className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                feedFilter === opt.id
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 font-medium">
          {feedFilter === 'projects'
            ? `${projects.length} living projects`
            : `${displayedLogs.length} updates`}
        </span>
      </div>

      {/* 3. Feed Content: Beautiful White Cards with Generous Spacing */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600 mb-2" />
          <span className="text-xs font-medium">Loading live feed...</span>
        </div>
      ) : feedFilter === 'projects' ? (
        projects.length > 0 ? (
          <div className="space-y-6">
            {projects.map((project: Project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <EmptyState
            type="projects"
            onAction={() => setBuildModalOpen(true)}
            actionText="Start First Project"
          />
        )
      ) : displayedLogs.length > 0 ? (
        <div className="space-y-6">
          {displayedLogs.map((log: BuildLog) => (
            <BuildLogCard key={log.id} log={log} />
          ))}
        </div>
      ) : (
        <EmptyState
          type="builds"
          onAction={() => setBuildModalOpen(true)}
          actionText="I Built Something"
        />
      )}
    </div>
  );
};
