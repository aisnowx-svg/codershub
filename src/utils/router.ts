import { MainTab, SubPage } from '../stores/uiStore';

export function getRouteFromPathname(): {
  tab: MainTab;
  subPage: SubPage | null;
  isVerifyEmail: boolean;
  isAuthCallback: boolean;
} {
  if (typeof window === 'undefined') {
    return { tab: 'home', subPage: null, isVerifyEmail: false, isAuthCallback: false };
  }

  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';

  if (path === '/auth/callback') {
    return { tab: 'profile', subPage: null, isVerifyEmail: false, isAuthCallback: true };
  }

  if (path === '/verify-email') {
    return { tab: 'home', subPage: null, isVerifyEmail: true, isAuthCallback: false };
  }

  if (path.startsWith('/project/')) {
    const id = path.split('/')[2];
    return { tab: 'projects', subPage: { type: 'project', id }, isVerifyEmail: false, isAuthCallback: false };
  }

  if (path.startsWith('/developer/')) {
    const id = path.split('/')[2];
    return { tab: 'discover', subPage: { type: 'developer', id }, isVerifyEmail: false, isAuthCallback: false };
  }

  if (path === '/search') {
    return { tab: 'home', subPage: { type: 'search' }, isVerifyEmail: false, isAuthCallback: false };
  }

  switch (path) {
    case '/discover':
      return { tab: 'discover', subPage: null, isVerifyEmail: false, isAuthCallback: false };
    case '/projects':
      return { tab: 'projects', subPage: null, isVerifyEmail: false, isAuthCallback: false };
    case '/alerts':
    case '/notifications':
      return { tab: 'alerts', subPage: null, isVerifyEmail: false, isAuthCallback: false };
    case '/profile':
      return { tab: 'profile', subPage: null, isVerifyEmail: false, isAuthCallback: false };
    case '/home':
    case '/':
    default:
      return { tab: 'home', subPage: null, isVerifyEmail: false, isAuthCallback: false };
  }
}

export function getPathnameFromUI(tab: MainTab, subPage: SubPage | null): string {
  if (subPage) {
    if (subPage.type === 'project') return `/project/${subPage.id}`;
    if (subPage.type === 'developer') return `/developer/${subPage.id}`;
    if (subPage.type === 'search') return '/search';
  }

  switch (tab) {
    case 'home':
      return '/home';
    case 'discover':
      return '/discover';
    case 'projects':
      return '/projects';
    case 'alerts':
      return '/notifications';
    case 'profile':
      return '/profile';
    default:
      return '/home';
  }
}
