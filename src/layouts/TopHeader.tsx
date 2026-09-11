import React from 'react';
import { Search, ArrowLeft } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';

export const TopHeader: React.FC = () => {
  const { subPage, closeSubPage, openSearch, activeTab } = useUIStore();

  const tabTitles: Record<string, string> = {
    home: 'Home / Activity',
    discover: 'Discover Builders & Projects',
    projects: 'Projects Directory',
    alerts: 'Notifications',
    profile: 'Developer Profile',
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between z-10 shrink-0 select-none">
      {/* Left: Subpage Back Button or Current Section Title */}
      <div className="flex items-center gap-3">
        {subPage ? (
          <button
            onClick={closeSubPage}
            className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-blue-600" />
            <span>Back</span>
          </button>
        ) : (
          <span className="text-xs font-semibold text-slate-500 font-mono">
            {tabTitles[activeTab] || 'Code Social'}
          </span>
        )}
      </div>

      {/* Right: Rounded Clean Search Field */}
      <div className="w-80">
        <button
          onClick={() => openSearch()}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-xs text-slate-400 transition-all cursor-pointer shadow-2xs group"
          title="Search projects, developers, and build logs (/ or Ctrl+K)"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            <span className="text-slate-500 text-xs">
              Search developers, projects, tech...
            </span>
          </div>
          <kbd className="text-[10px] font-sans font-medium px-1.5 py-0.5 rounded bg-white text-slate-400 border border-slate-200 shadow-2xs">
            /
          </kbd>
        </button>
      </div>
    </header>
  );
};
