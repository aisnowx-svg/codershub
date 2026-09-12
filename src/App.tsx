import { useEffect, useCallback } from 'react';
import { useAuthStore } from './stores/authStore';
import { useAppStateStore } from './stores/appStateStore';
import { useUIStore } from './stores/uiStore';
import { AppShell } from './layouts/AppShell';
import { FirstVisitIntro } from './pages/FirstVisitIntro';
import { ProfileOnboarding } from './pages/ProfileOnboarding';
import { HomeFeed } from './pages/HomeFeed';
import { Discover } from './pages/Discover';
import { ProjectsPage } from './pages/ProjectsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { DeveloperProfile } from './pages/DeveloperProfile';
import { ProjectPage } from './pages/ProjectPage';
import { SearchPage } from './pages/SearchPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { getRouteFromPathname, getPathnameFromUI } from './utils/router';

export function App() {
  const {
    hasSession,
    emailVerified,
    profileOnboardingCompleted,
    authState,
    initializeAuth,
    isLoading,
    verificationStatus,
  } = useAuthStore();

  const { introCompleted } = useAppStateStore();

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

  // Initialize Auth & Supabase event listener once on boot
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Sync UI route on popstate (browser back / forward button)
  const syncFromUrl = useCallback(() => {
    const route = getRouteFromPathname();
    if (route.isVerifyEmail || route.isAuthCallback) {
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

  // Sync tab/subPage state changes to browser URL (only for normal app browsing)
  useEffect(() => {
    const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
    if (isLoading || authState === 'INITIALIZING') return;
    if (currentPath === '/auth/callback' || currentPath === '/verify-email') return;

    // Unverified users are kept on the verification gate
    if (verificationStatus === 'UNVERIFIED' || (hasSession && !emailVerified)) {
      return;
    }

    // Do not alter path if in first-visit intro
    if (!introCompleted && !hasSession && currentPath === '/') {
      return;
    }

    const targetPath = getPathnameFromUI(activeTab, subPage);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }, [activeTab, subPage, verificationStatus, hasSession, emailVerified, introCompleted, isLoading, authState]);

  // Desktop keyboard shortcuts (active for verified users or guests)
  useEffect(() => {
    if (verificationStatus === 'UNVERIFIED' || (hasSession && !emailVerified)) return;

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
    hasSession,
    emailVerified,
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

  // 1. BOOT LOADER
  if (isLoading || authState === 'INITIALIZING') {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-slate-400 font-mono tracking-wider">
          CONNECTING TO CODE SOCIAL...
        </p>
      </div>
    );
  }

  // 2. DEDICATED TOP-LEVEL EXPLICIT ROUTES
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  if (currentPath === '/auth/callback') {
    return <AuthCallbackPage />;
  }
  if (currentPath === '/verify-email') {
    return <VerifyEmailPage />;
  }

  // 3. UNVERIFIED EMAIL AUTHENTICATION GATE
  // If user has a session but email is not confirmed, route strictly to VerifyEmailPage
  if ((hasSession && !emailVerified) || verificationStatus === 'UNVERIFIED') {
    return <VerifyEmailPage />;
  }

  // 4. FIRST VISIT INTRO SLIDES
  // Only shown when: user has never completed intro, has no active session, and is on root path '/'
  if (!introCompleted && !hasSession && currentPath === '/') {
    return <FirstVisitIntro />;
  }

  // 5. PROFILE ONBOARDING GATE
  // Only shown when: user is authenticated, email is verified, but profile specialization hasn't been chosen yet
  if (hasSession && emailVerified && !profileOnboardingCompleted) {
    return <ProfileOnboarding />;
  }

  // 6. MAIN APPLICATION SHELL (For verified authenticated users OR guests who completed intro)
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
