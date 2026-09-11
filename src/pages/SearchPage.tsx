import React, { useState, useEffect } from 'react';
import { Search, X, Users, FolderGit2, Terminal, Loader2 } from 'lucide-react';
import { searchService, SearchResults } from '../services/searchService';
import { useAuthStore } from '../stores/authStore';
import { DeveloperCard } from '../components/cards/DeveloperCard';
import { ProjectCard } from '../components/cards/ProjectCard';
import { BuildLogCard } from '../components/cards/BuildLogCard';
import { EmptyState } from '../components/common/EmptyState';
import { Developer, Project, BuildLog } from '../types';

type SearchTab = 'all' | 'devs' | 'projects' | 'logs';

export const SearchPage: React.FC<{ initialQuery?: string }> = ({ initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [results, setResults] = useState<SearchResults>({
    developers: [],
    projects: [],
    buildLogs: [],
    technologies: [],
  });
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuthStore();

  useEffect(() => {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      setResults({ developers: [], projects: [], buildLogs: [], technologies: [] });
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchService.searchAll(cleanQuery, currentUser?.id);
        setResults(res);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, currentUser?.id]);

  const totalResults = results.developers.length + results.projects.length + results.buildLogs.length;

  return (
    <div className="w-full text-left space-y-6">
      {/* Search Input Box */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search developers, projects, or technologies (e.g. 'Rust', 'Inference', 'FastAPI')..."
          className="w-full bg-white border border-slate-200/90 rounded-2xl pl-12 pr-12 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-soft transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Suggested quick queries */}
      {!query.trim() && (
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-soft">
          <div className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
            Suggested Searches
          </div>
          <div className="flex flex-wrap gap-2">
            {['Rust', 'Python', 'FastAPI', 'AI', 'Systems', 'WebGPU', 'TypeScript'].map(
              (term) => (
                <button
                  key={term}
                  onClick={() => setQuery(term)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-blue-600 text-xs font-medium border border-slate-200/80 transition-colors cursor-pointer"
                >
                  {term}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Search Filter Tabs */}
      {query.trim() && (
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            All Results ({totalResults})
          </button>
          <button
            onClick={() => setActiveTab('devs')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'devs'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            Developers ({results.developers.length})
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'projects'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            Projects ({results.projects.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            Build Logs ({results.buildLogs.length})
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
          <span className="text-xs">Searching database...</span>
        </div>
      )}

      {/* Results Content */}
      {!loading && query.trim() && totalResults === 0 && (
        <EmptyState
          type="search"
          message={`No matches found for "${query}" across projects, developers, or builds.`}
          actionText="Clear Search"
          onAction={() => setQuery('')}
        />
      )}

      {!loading && (
        <div className="space-y-8">
          {/* Developers */}
          {(activeTab === 'all' || activeTab === 'devs') && results.developers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Developers ({results.developers.length})</span>
              </div>
              <div className="space-y-4">
                {results.developers.map((dev: Developer) => (
                  <DeveloperCard key={dev.id} developer={dev} />
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {(activeTab === 'all' || activeTab === 'projects') && results.projects.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <FolderGit2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Projects ({results.projects.length})</span>
              </div>
              <div className="space-y-4">
                {results.projects.map((p: Project) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            </div>
          )}

          {/* Build Logs */}
          {(activeTab === 'all' || activeTab === 'logs') && results.buildLogs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Terminal className="w-3.5 h-3.5 text-blue-600" />
                <span>Build Logs ({results.buildLogs.length})</span>
              </div>
              <div className="space-y-4">
                {results.buildLogs.map((log: BuildLog) => (
                  <BuildLogCard key={log.id} log={log} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
