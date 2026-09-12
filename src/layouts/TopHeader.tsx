import React from 'react';
import { Search, ArrowLeft, Bell } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useNotifications } from '../hooks/useNotifications';
import { CodeSocialLogo } from '../components/common/CodeSocialLogo';

export const TopHeader: React.FC = () => {
  const { subPage, closeSubPage, openSearch, activeTab, setActiveTab } = useUIStore();
  const { unreadCount } = useNotifications();

  const tabTitles: Record<string, string> = {
    home: 'Home / Activity',
    discover: 'Discover Builders & Projects',
    projects: 'Projects Directory',
    alerts: 'Notifications',
    profile: 'Developer Profile',
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200/80 px-4 md:px-8 flex items-center justify-between z-10 shrink-0 select-none">
      {/* Left: Subpage Back Button OR Mobile Brand Logo OR Desktop Breadcrumb */}
      <div className="flex items-center gap-3">
        {subPage ? (
          <button
            onClick={closeSubPage}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 text-blue-600" />
            <span>Back</span>
          </button>
        ) : (
          <>
            {/* Mobile Brand (visible only < md) */}
            <div className="flex md:hidden items-center gap-2">
              <CodeSocialLogo size={26} />
              <span className="text-xs font-bold tracking-tight text-slate-900 font-sans">
                CODE SOCIAL
              </span>
            </div>

            {/* Desktop Breadcrumb Section Title (visible only >= md) */}
            <span className="hidden md:inline-block text-xs font-semibold text-slate-500 font-mono">
              {tabTitles[activeTab] || 'Code Social'}
            </span>
          </>
        )}
      </div>

      {/* Right Action Area */}
      <div className="flex items-center gap-2">
        {/* Mobile: Compact Search Button */}
        <button
          onClick={() => openSearch()}
          className="flex md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Search"
          title="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Mobile: Notifications Bell with Badge */}
        <button
          onClick={() => {
            closeSubPage();
            setActiveTab('alerts');
          }}
          className="flex md:hidden relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
          )}
        </button>

        {/* Desktop: Rounded Search Bar with kbd shortcut */}
        <div className="hidden md:block w-80">
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
      </div>
    </header>
  );
};
