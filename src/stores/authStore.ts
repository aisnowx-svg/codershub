import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Developer } from '../types';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';
import { Session } from '@supabase/supabase-js';

const DEFAULT_GUEST_USER: Developer = {
  id: '',
  name: 'Builder',
  handle: 'builder',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  role: 'Developer / Builder',
  specialty: 'Systems',
  bio: 'Building open source software.',
  location: '',
  githubHandle: '',
  followersCount: 0,
  followingCount: 0,
  projectsCount: 0,
  buildsCount: 0,
  proofOfWork: {
    projectsShipped: 0,
    openSourceProjects: 0,
    githubContributions: 0,
    buildLogsCount: 0,
    collaborationsCount: 0,
  },
  currentlyBuilding: {
    projectId: '',
    projectName: '',
    description: '',
    progressPercentage: 0,
    latestMilestone: '',
  },
  techStack: ['TypeScript'],
  isFollowing: false,
};

interface AuthState {
  currentUser: Developer;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  githubConnected: boolean;
  onboardingCompleted: boolean;
  authModalOpen: boolean;

  // Actions
  initializeAuth: () => Promise<void>;
  setAuthModalOpen: (open: boolean) => void;
  signIn: (email: string, pass: string) => Promise<boolean>;
  signUp: (email: string, pass: string, username: string, displayName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  connectGithub: (handle?: string) => Promise<void>;
  disconnectGithub: () => Promise<void>;
  completeOnboarding: (specialties: string[], techStack: string[]) => Promise<void>;
  updateProfile: (partial: Partial<Developer>) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: DEFAULT_GUEST_USER,
      session: null,
      isAuthenticated: false,
      isLoading: true,
      authError: null,
      githubConnected: false,
      onboardingCompleted: false,
      authModalOpen: false,

      setAuthModalOpen: (open) => set({ authModalOpen: open, authError: null }),
      clearError: () => set({ authError: null }),

      initializeAuth: async () => {
        try {
          set({ isLoading: true });
          const session = await authService.getSession();

          if (session?.user) {
            let profile = await profileService.getProfile(session.user.id);

            // If profile does not exist in db yet, create it
            if (!profile) {
              const meta = session.user.user_metadata || {};
              const defaultHandle = meta.username || session.user.email?.split('@')[0] || 'builder';
              const defaultName = meta.display_name || meta.name || defaultHandle;
              profile = await profileService.upsertProfile({
                id: session.user.id,
                handle: defaultHandle,
                name: defaultName,
                avatar: meta.avatar_url || DEFAULT_GUEST_USER.avatar,
                role: 'Developer / Builder',
                specialty: 'Systems',
                bio: 'Building software tools.',
                techStack: ['TypeScript'],
              });
            }

            set({
              session,
              currentUser: profile,
              isAuthenticated: true,
              githubConnected: !!profile.githubHandle,
              onboardingCompleted: true,
              isLoading: false,
            });
          } else {
            set({
              session: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }

          // Subscribe to live auth state changes
          authService.onAuthStateChange(async (_event, newSession) => {
            if (newSession?.user) {
              const profile = await profileService.getProfile(newSession.user.id);
              if (profile) {
                set({
                  session: newSession,
                  currentUser: profile,
                  isAuthenticated: true,
                  githubConnected: !!profile.githubHandle,
                  onboardingCompleted: true,
                  isLoading: false,
                });
              }
            } else {
              set({
                session: null,
                currentUser: DEFAULT_GUEST_USER,
                isAuthenticated: false,
                isLoading: false,
              });
            }
          });
        } catch (err: any) {
          console.error('Auth initialization error:', err);
          set({ isLoading: false });
        }
      },

      signIn: async (email: string, pass: string) => {
        try {
          set({ isLoading: true, authError: null });
          const { session, user } = await authService.signIn(email, pass);

          if (!user) throw new Error('Failed to sign in');

          let profile = await profileService.getProfile(user.id);
          if (!profile) {
            const handle = email.split('@')[0];
            profile = await profileService.upsertProfile({
              id: user.id,
              handle,
              name: handle,
              avatar: DEFAULT_GUEST_USER.avatar,
              role: 'Developer / Builder',
              specialty: 'Systems',
              bio: '',
              techStack: ['TypeScript'],
            });
          }

          set({
            session,
            currentUser: profile,
            isAuthenticated: true,
            onboardingCompleted: true,
            authModalOpen: false,
            isLoading: false,
            authError: null,
          });

          return true;
        } catch (err: any) {
          set({ authError: err.message || 'Authentication error', isLoading: false });
          return false;
        }
      },

      signUp: async (email: string, pass: string, username: string, displayName: string) => {
        try {
          set({ isLoading: true, authError: null });
          const cleanHandle = username.trim().replace(/^@/, '');
          const { user, session } = await authService.signUp(email, pass, {
            username: cleanHandle,
            display_name: displayName.trim(),
            full_name: displayName.trim(),
          });

          if (!user) throw new Error('Failed to register user');

          // Ensure profile is loaded (created by database trigger or fallback)
          let profile = await profileService.getProfile(user.id);
          if (!profile) {
            profile = await profileService.upsertProfile({
              id: user.id,
              handle: cleanHandle || email.split('@')[0],
              name: displayName.trim() || cleanHandle || 'Developer',
              avatar: DEFAULT_GUEST_USER.avatar,
              role: 'Developer / Builder',
              specialty: 'Systems',
              bio: 'Building software tools.',
              techStack: ['TypeScript'],
            });
          }

          set({
            session,
            currentUser: profile,
            isAuthenticated: !!session,
            onboardingCompleted: true,
            authModalOpen: false,
            isLoading: false,
            authError: null,
          });

          return true;
        } catch (err: any) {
          set({ authError: err.message || 'Registration error', isLoading: false });
          return false;
        }
      },

      signOut: async () => {
        try {
          set({ isLoading: true });
          await authService.signOut();
          set({
            session: null,
            currentUser: DEFAULT_GUEST_USER,
            isAuthenticated: false,
            onboardingCompleted: false,
            isLoading: false,
            authError: null,
          });
        } catch (err: any) {
          console.error('Sign out error:', err);
          set({ isLoading: false });
        }
      },

      connectGithub: async (handle = '') => {
        const { currentUser } = get();
        if (!currentUser.id) return;
        const cleanHandle = handle.replace(/^@/, '');
        await profileService.updateProfile(currentUser.id, {
          githubHandle: cleanHandle,
        });
        set((state) => ({
          githubConnected: true,
          currentUser: {
            ...state.currentUser,
            githubHandle: cleanHandle,
          },
        }));
      },

      disconnectGithub: async () => {
        const { currentUser } = get();
        if (!currentUser.id) return;
        await profileService.updateProfile(currentUser.id, {
          githubHandle: '',
        });
        set((state) => ({
          githubConnected: false,
          currentUser: {
            ...state.currentUser,
            githubHandle: '',
          },
        }));
      },

      completeOnboarding: async (specialties, techStack) => {
        const { currentUser } = get();
        const specialty = (specialties[0] as any) || 'Systems';
        const mergedStack = Array.from(new Set([...currentUser.techStack, ...techStack]));

        if (currentUser.id) {
          await profileService.updateProfile(currentUser.id, {
            specialty,
            techStack: mergedStack,
          });
        }

        set((state) => ({
          onboardingCompleted: true,
          currentUser: {
            ...state.currentUser,
            techStack: mergedStack,
            specialty,
          },
        }));
      },

      updateProfile: async (partial) => {
        const { currentUser } = get();
        if (currentUser.id) {
          const updated = await profileService.updateProfile(currentUser.id, partial);
          set({ currentUser: updated });
        } else {
          set((state) => ({
            currentUser: {
              ...state.currentUser,
              ...partial,
            },
          }));
        }
      },
    }),
    {
      name: 'code-social-auth-storage-v4',
      partialize: (state) => ({
        onboardingCompleted: state.onboardingCompleted,
      }),
    }
  )
);
