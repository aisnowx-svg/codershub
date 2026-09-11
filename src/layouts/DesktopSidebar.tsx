import React from 'react';
import {
  Home,
  Compass,
  FolderGit2,
  Bell,
  Plus,
  ExternalLink,
  ChevronRight,
  PanelLeftClose,
  LogIn,
  LogOut,
} from 'lucide-react';
import { useUIStore, MainTab } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { useNotifications } from '../hooks/useNotifications';
import { CodeSocialLogo } from '../components/common/CodeSocialLogo';

export const DesktopSidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setBuildModalOpen,
    closeSubPage,
    openProjectPage,
    subPage,
    sidebarCollapsed,
    toggleSidebar,
  } = useUIStore();

  const { currentUser, isAuthenticated, setAuthModalOpen, signOut } = useAuthStore();
  const { unreadCount } = useNotifications();

  const navItems = [
    { id: 'home' as MainTab, label: 'Home', icon: Home, badge: null },
    { id: 'discover' as MainTab, label: 'Discover', icon: Compass, badge: null },
    { id: 'projects' as MainTab, label: 'Projects', icon: FolderGit2, badge: null },
    { id: 'alerts' as MainTab, label: 'Notifications', icon: Bell, badge: unreadCount > 0 ? unreadCount : null },
  ];

  const handleNav = (tab: MainTab) => {
    closeSubPage();
    setActiveTab(tab);
  };

  const isProfileActive = activeTab === 'profile' && !subPage;

  return (
    <aside
      className={`bg-white border-r border-slate-200/80 flex flex-col h-full shrink-0 select-none transition-all duration-300 ease-in-out relative z-40 ${
        sidebarCollapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* 1. Brand & Collapse Toggle */}
      <div className={`border-b border-slate-100/90 ${sidebarCollapsed ? 'p-3 flex justify-center' : 'p-4 pb-3'}`}>
        {sidebarCollapsed ? (
          <div className="relative group flex justify-center">
            <button
              onClick={toggleSidebar}
              className="cursor-pointer transition-transform hover:scale-105"
            >
              <CodeSocialLogo size={38} />
            </button>

            {/* Custom Elegant Flyout Tooltip */}
            <div className="absolute left-full ml-3.5 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 transform translate-x-1 group-hover:translate-x-0">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/95 text-white shadow-xl backdrop-blur-xs border border-slate-800 whitespace-nowrap text-xs font-medium">
                <span className="font-semibold tracking-wide text-blue-300">CODE SOCIAL</span>
                <span className="text-[10px] text-slate-400">Click to expand</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleNav('home')}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
              title=""
            >
              <CodeSocialLogo size={32} />
              <div>
                <h1 className="text-sm font-bold tracking-tight text-slate-900 font-sans leading-none group-hover:text-blue-600 transition-colors">
                  CODE SOCIAL
                </h1>
                <p className="text-[10px] text-slate-400 font-medium mt-1 tracking-normal">
                  Your code is your profile.
                </p>
              </div>
            </button>

            {/* Explicit collapse button */}
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Primary Creation Action: "I Built Something" */}
      <div className="p-3">
        {sidebarCollapsed ? (
          <div className="relative group flex justify-center">
            <button
              onClick={() => setBuildModalOpen(true)}
              className="w-10 h-10 mx-auto rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-sm transition-all hover:scale-105 cursor-pointer"
            >
              <Plus className="w-5 h-5 text-white stroke-[2.5]" />
            </button>

            {/* Custom Tooltip */}
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 transform translate-x-1 group-hover:translate-x-0">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/95 text-white shadow-xl backdrop-blur-xs border border-slate-800 whitespace-nowrap text-xs font-medium">
                <span>I Built Something</span>
                <kbd className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                  Ctrl B
                </kbd>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setBuildModalOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition-all duration-150 cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-lg bg-blue-500/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Plus className="w-3.5 h-3.5 text-white stroke-[2.5]" />
              </span>
              <span className="font-semibold tracking-wide">I Built Something</span>
            </div>
            <kbd className="text-[10px] text-blue-200/80 font-mono bg-blue-700/60 px-1.5 py-0.5 rounded">
              Ctrl B
            </kbd>
          </button>
        )}
      </div>

      {/* 3. Core Navigation Items */}
      <nav className="px-2 py-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id && !subPage;

          if (sidebarCollapsed) {
            return (
              <div key={item.id} className="relative group flex justify-center">
                <button
                  onClick={() => handleNav(item.id)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 shadow-xs'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                  {item.badge && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
                  )}
                </button>

                {/* Custom Elegant Tooltip */}
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 transform translate-x-1 group-hover:translate-x-0">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/95 text-white shadow-xl backdrop-blur-xs border border-slate-800 whitespace-nowrap text-xs font-medium">
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                        {item.badge} unread
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 stroke-[2.2]' : 'text-slate-400'}`} />
                <span className="tracking-tight">{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 4. CURRENTLY BUILDING Widget */}
      <div className="px-3 py-2 mt-auto">
        {sidebarCollapsed ? (
          <div className="relative group flex justify-center">
            <div
              onClick={() => {
                if (currentUser.currentlyBuilding?.projectId) {
                  openProjectPage(currentUser.currentlyBuilding.projectId);
                }
              }}
              className="w-10 h-10 mx-auto rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-200 flex flex-col items-center justify-center cursor-pointer transition-all"
            >
              <span className="text-[10px] font-mono font-bold text-blue-600 group-hover:scale-105 transition-transform">
                {currentUser.currentlyBuilding?.progressPercentage || 0}%
              </span>
            </div>

            {/* Custom Tooltip */}
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 transform translate-x-1 group-hover:translate-x-0">
              <div className="px-3 py-2 rounded-xl bg-slate-900/95 text-white shadow-xl backdrop-blur-xs border border-slate-800 whitespace-nowrap text-left">
                <div className="text-[10px] uppercase font-semibold text-blue-300">
                  Currently Building · {currentUser.currentlyBuilding?.progressPercentage || 0}%
                </div>
                <div className="text-xs font-bold text-white mt-0.5">
                  {currentUser.currentlyBuilding?.projectName || 'No Active Project'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {currentUser.currentlyBuilding?.latestMilestone || 'In development'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/70 text-left">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              <span>Currently Building</span>
              <span className="text-blue-600 font-bold font-mono">
                {currentUser.currentlyBuilding?.progressPercentage || 0}%
              </span>
            </div>

            <div
              onClick={() => {
                if (currentUser.currentlyBuilding?.projectId) {
                  openProjectPage(currentUser.currentlyBuilding.projectId);
                }
              }}
              className="text-xs font-bold text-slate-800 truncate hover:text-blue-600 cursor-pointer flex items-center justify-between group"
            >
              <span className="truncate">{currentUser.currentlyBuilding?.projectName || 'No Active Project'}</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 ml-1" />
            </div>

            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              {currentUser.currentlyBuilding?.description || 'Set your active project on your profile.'}
            </p>

            {/* Clean Progress Bar */}
            <div className="w-full bg-slate-200/80 rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${currentUser.currentlyBuilding?.progressPercentage || 0}%` }}
              />
            </div>

            <div className="text-[10px] font-medium text-slate-400 mt-2 truncate">
              {currentUser.currentlyBuilding?.latestMilestone || 'In development'}
            </div>
          </div>
        )}
      </div>

      {/* 5. User Profile Card at Bottom */}
      <div className="p-3 border-t border-slate-100">
        {!isAuthenticated ? (
          sidebarCollapsed ? (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-10 h-10 mx-auto rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-all cursor-pointer"
              title="Sign In / Join"
            >
              <LogIn className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Join</span>
            </button>
          )
        ) : sidebarCollapsed ? (
          <div className="relative group flex justify-center">
            <div
              onClick={() => {
                closeSubPage();
                setActiveTab('profile');
              }}
              className="flex justify-center cursor-pointer"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className={`w-9 h-9 rounded-xl object-cover ring-2 transition-all hover:scale-105 ${
                  isProfileActive ? 'ring-blue-600' : 'ring-slate-200 hover:ring-blue-400'
                }`}
              />
            </div>

            {/* Custom Tooltip */}
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 transform translate-x-1 group-hover:translate-x-0">
              <div className="px-3 py-1.5 rounded-xl bg-slate-900/95 text-white shadow-xl backdrop-blur-xs border border-slate-800 whitespace-nowrap text-left text-xs">
                <div className="font-semibold text-white">{currentUser.name}</div>
                <div className="text-[10px] text-slate-400">@{currentUser.handle} · Profile</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <div
              onClick={() => {
                closeSubPage();
                setActiveTab('profile');
              }}
              className={`flex-1 flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all group ${
                isProfileActive
                  ? 'bg-blue-50/90 border-blue-200 shadow-2xs'
                  : 'bg-slate-50/80 hover:bg-slate-100/90 border-slate-200/60'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className={`w-7 h-7 rounded-lg object-cover ring-1 transition-all ${
                    isProfileActive ? 'ring-blue-500' : 'ring-slate-200 group-hover:ring-blue-400'
                  }`}
                />
                <div className="min-w-0 text-left">
                  <div
                    className={`font-semibold truncate leading-tight text-[11px] ${
                      isProfileActive ? 'text-blue-900' : 'text-slate-800 group-hover:text-slate-900'
                    }`}
                  >
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    @{currentUser.handle}
                  </div>
                </div>
              </div>
              <ChevronRight
                className={`w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 ${
                  isProfileActive ? 'text-blue-600' : 'text-slate-400'
                }`}
              />
            </div>

            <button
              onClick={() => signOut()}
              className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer border border-transparent hover:border-red-200"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
