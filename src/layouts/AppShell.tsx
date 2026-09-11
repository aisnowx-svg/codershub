import React from 'react';
import { useUIStore } from '../stores/uiStore';
import { TopHeader } from './TopHeader';
import { DesktopSidebar } from './DesktopSidebar';
import { BuildModal } from '../components/modals/BuildModal';
import { ForkModal } from '../components/modals/ForkModal';
import { JoinProjectModal } from '../components/modals/JoinProjectModal';
import { AuthModal } from '../components/modals/AuthModal';
import { Check } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { toastMessage } = useUIStore();

  return (
    <div className="h-screen w-screen bg-dev-bg text-slate-900 flex overflow-hidden font-sans">
      {/* 1. Primary Left Sidebar */}
      <DesktopSidebar />

      {/* 2. Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Context & Search Bar */}
        <TopHeader />

        {/* Center Main Workspace (Airy, generous breathing room - not a crowded 3-column) */}
        <main className="flex-1 overflow-y-auto bg-dev-bg">
          <div className="max-w-4xl mx-auto px-8 py-8 pb-24">
            {children}
          </div>
        </main>
      </div>

      {/* Global Action Modals */}
      <BuildModal />
      <ForkModal />
      <JoinProjectModal />
      <AuthModal />

      {/* Clean Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 shadow-modal flex items-center gap-3 text-xs font-medium text-slate-800">
            <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Check className="w-3.5 h-3.5" />
            </span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};
