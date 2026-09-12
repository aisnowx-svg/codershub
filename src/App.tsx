import { useEffect, useCallback } from 'react';
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
import { VerifyEmailScreen } from './pages/VerifyEmailScreen';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { getRouteFromPathname, getPathnameFromUI } from './utils/router';

export function App() {
  const { onboardingCompleted, initializeAuth, isLoading, verificationStatus } = useAuthStore();
  const {
    activeTab,
    subPage,
    setActiveTab,
    openSearch,
    closeSubPage,
    buildModalOpen,
    setBuildModalOpen,
    forkModalData,
    closeForkModal,
    joinModalData,
    closeJoinModal,
    openProjectPage,
    openDeveloperProfile,
  } = useUIStore();

  // Initialize Auth & Supabase event listener
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Sync route on popstate (browser back / forward button)
  const syncFromUrl = useCallback(() => {
    const route = getRouteFromPathname();
    if (route.isVerifyEmail) {
      // Handled by verification status gate
      return;
    }
    if (route.subPage) {
      if (route.subPage.type === 'project') openProjectPage(route.subPage.id);
      else if (route.subPage.type === 'developer') openDeveloperProfile(route.subPage.id);
      else if (route.subPage.type === 'search') openSearch();
    } else {
      closeSubPage();
      setActiveTab(route.tab);
    }
  }, [openProjectPage, openDeveloperProfile, openSearch, closeSubPage, setActiveTab]);

  useEffect(() => {
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [syncFromUrl]);

  // Sync tab/subPage state changes to URL
  useEffect(() => {
    const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
    if (isLoading || verificationStatus === 'INITIALIZING') return;
    if (currentPath === '/auth/callback') return;

    if (verificationStatus === 'UNVERIFIED') {
      if (window.location.pathname !== '/verify-email') {
        window.history.replaceState(null, '', '/verify-email');
      }
      return;
    }

    if (window.location.pathname === '/verify-email') {
      window.history.replaceState(null, '', '/home');
      return;
    }

    const targetPath = getPathnameFromUI(activeTab, subPage);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }, [activeTab, subPage, verificationStatus, isLoading]);

  // Desktop keyboard shortcuts (only active when verified / authenticated or guest browsing)
  useEffect(() => {
    if (verificationStatus === 'UNVERIFIED') return;

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
    verificationStatus,
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

  // Loading State
  if (isLoading || verificationStatus === 'INITIALIZING') {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-slate-400 font-mono tracking-wider">
          CONNECTING TO CODE SOCIAL...
        </p>
      </div>
    );
  }

  // 1. MANDATORY EMAIL VERIFICATION GATE
  // An unverified user MUST NOT access Home, Discover, Projects, Profile, Notifications, etc.
  if (verificationStatus === 'UNVERIFIED') {
    return <VerifyEmailScreen />;
  }

  // 2. GITHUB OAUTH / APP CALLBACK ROUTE
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  if (currentPath === '/auth/callback') {
    return <AuthCallbackPage />;
  }

  // 3. Onboarding Gate (only for verified users who haven't completed onboarding)
  if (!onboardingCompleted) {
    return <Onboarding />;
  }

  // 3. Authenticated / Standard Application Shell
  const renderContent = () => {
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
