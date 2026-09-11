import { Home, Compass, FolderGit2, Bell, User } from 'lucide-react';
import { MainTab } from '../stores/uiStore';

export interface NavItemConfig {
  id: MainTab;
  label: string;
  icon: typeof Home;
  ariaLabel: string;
}

export const MAIN_NAV_ITEMS: NavItemConfig[] = [
  { id: 'home', label: 'Home', icon: Home, ariaLabel: 'Navigate to Home feed' },
  { id: 'discover', label: 'Discover', icon: Compass, ariaLabel: 'Navigate to Discover' },
  { id: 'projects', label: 'Projects', icon: FolderGit2, ariaLabel: 'Navigate to Projects directory' },
  { id: 'alerts', label: 'Notifications', icon: Bell, ariaLabel: 'Navigate to Notifications' },
];

export const PROFILE_NAV_ITEM: NavItemConfig = {
  id: 'profile',
  label: 'Profile',
  icon: User,
  ariaLabel: 'Navigate to your Developer Profile',
};

export const PRIMARY_ACTION = {
  label: 'I Built Something',
  shortcut: 'Ctrl B',
  ariaLabel: 'Open build log composer',
};
