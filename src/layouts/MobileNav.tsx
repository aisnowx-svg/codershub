import React from 'react';
import { Home, Compass, FolderGit2, Plus, User } from 'lucide-react';
import { useUIStore, MainTab } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';

export const MobileNav: React.FC = () => {
  const { activeTab, setActiveTab, setBuildModalOpen, closeSubPage, subPage } = useUIStore();
  const { currentUser, isAuthenticated, setAuthModalOpen } = useAuthStore();

  const handleNav = (tab: MainTab) => {
    closeSubPage();
    setActiveTab(tab);
  };

  const handleBuildClick = () => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    setBuildModalOpen(true);
  };

  const isProfileActive = activeTab === 'profile' && !subPage;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 shadow-[0_-4px_24px_rgba(15,23,42,0.06)] px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] select-none">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* 1. Home */}
        <button
          onClick={() => handleNav('home')}
          className={`flex-1 flex flex-col items-center justify-center py-1 gap-0.5 transition-colors cursor-pointer ${
            activeTab === 'home' && !subPage ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] tracking-tight">Home</span>
        </button>

        {/* 2. Discover */}
        <button
          onClick={() => handleNav('discover')}
          className={`flex-1 flex flex-col items-center justify-center py-1 gap-0.5 transition-colors cursor-pointer ${
            activeTab === 'discover' && !subPage ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Compass className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] tracking-tight">Discover</span>
        </button>

        {/* 3. Center Raised Build (+) CTA */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-5">
          <button
            onClick={handleBuildClick}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center border-3 border-white active:scale-95 transition-transform cursor-pointer"
            aria-label="I Built Something"
            title="I Built Something"
          >
            <Plus className="w-6 h-6 stroke-[2.8]" />
          </button>
          <span className="text-[9px] font-bold text-blue-600 mt-0.5 tracking-tight uppercase">Build</span>
        </div>

        {/* 4. Projects */}
        <button
          onClick={() => handleNav('projects')}
          className={`flex-1 flex flex-col items-center justify-center py-1 gap-0.5 transition-colors cursor-pointer ${
            activeTab === 'projects' && !subPage ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FolderGit2 className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] tracking-tight">Projects</span>
        </button>

        {/* 5. Profile */}
        <button
          onClick={() => handleNav('profile')}
          className={`flex-1 flex flex-col items-center justify-center py-1 gap-0.5 transition-colors cursor-pointer ${
            isProfileActive ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {currentUser?.avatar ? (
            <div className={`relative rounded-full transition-all ${isProfileActive ? 'ring-2 ring-blue-600 ring-offset-1' : ''}`}>
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-5 h-5 rounded-full object-cover"
              />
            </div>
          ) : (
            <User className="w-5 h-5 stroke-[2.2]" />
          )}
          <span className="text-[10px] tracking-tight">Profile</span>
        </button>
      </div>
    </nav>
  );
};
