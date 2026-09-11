import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { useUIStore } from './stores/uiStore';
import { AppShell } from './layouts/AppShell';
import { Onboarding } from './pages/Onboarding';
import { HomeFeed } from './pages/HomeFeed';
import { Discover } from './pages/Discover';
import { ProjectsPage } from './pages/ProjectsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { DeveloperProfile } from './pages/DeveloperProfile';
import { ProjectPage } from './pages/ProjectPage';
import { SearchPage } from './pages/SearchPage';

export function App() {
  const { onboardingCompleted, initializeAuth, isLoading } = useAuthStore();
  const {
    activeTab,
    subPage,
    openSearch,
    closeSubPage,
    buildModalOpen,
    setBuildModalOpen,
    forkModalData,
    closeForkModal,
    joinModalData,
    closeJoinModal,
  } = useUIStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Desktop keyboard shortcuts:
  // '/' -> Search
  // 'Esc' -> Close active modals or subpages
  // 'Ctrl+B' -> I Built Something
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        (e.target as HTMLElement)?.tagName
      );

      // Escape closes modals or subpages
      if (e.key === 'Escape') {
        if (buildModalOpen) {
          setBuildModalOpen(false);
          return;
        }
        if (forkModalData) {
          closeForkModal();
          return;
        }
        if (joinModalData) {
          closeJoinModal();
          return;
        }
        if (subPage) {
          closeSubPage();
          return;
        }
      }

      // '/' opens Search if not typing in input
      if (e.key === '/' && !isInputActive) {
        e.preventDefault();
        openSearch();
        return;
      }

      // Ctrl+B / Cmd+B -> Quick Build modal
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b' && !isInputActive) {
        e.preventDefault();
        setBuildModalOpen(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    openSearch,
    closeSubPage,
    buildModalOpen,
    setBuildModalOpen,
    forkModalData,
    closeForkModal,
    joinModalData,
    closeJoinModal,
    subPage,
  ]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-slate-500 font-mono tracking-wider">
          CONNECTING TO CODE SOCIAL...
        </p>
      </div>
    );
  }

  if (!onboardingCompleted) {
    return <Onboarding />;
  }

  const renderContent = () => {
    // Check if a detailed sub-page is active
    if (subPage) {
      switch (subPage.type) {
        case 'project':
          return <ProjectPage projectId={subPage.id} />;
        case 'developer':
          return <DeveloperProfile developerId={subPage.id} />;
        case 'search':
          return <SearchPage initialQuery={subPage.initialQuery} />;
      }
    }

    // Otherwise render primary tab
    switch (activeTab) {
      case 'home':
        return <HomeFeed />;
      case 'discover':
        return <Discover />;
      case 'projects':
        return <ProjectsPage />;
      case 'alerts':
        return <NotificationsPage />;
      case 'profile':
        return <DeveloperProfile />;
      default:
        return <HomeFeed />;
    }
  };

  return <AppShell>{renderContent()}</AppShell>;
}

export default App;
