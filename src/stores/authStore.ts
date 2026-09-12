import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Developer } from '../types';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';
import { Session } from '@supabase/supabase-js';

export type AuthVerificationStatus = 
  | 'INITIALIZING'       // Checking initial session on boot
  | 'NOT_AUTHENTICATED' // Logged out / guest
  | 'UNVERIFIED'        // Account created or signed in, but email is unconfirmed
  | 'VERIFIED';         // Authenticated and email_confirmed_at is confirmed

export const DEFAULT_GUEST_USER: Developer = {
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

interface VerificationMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

interface AuthState {
  currentUser: Developer;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  githubConnected: boolean;
  onboardingCompleted: boolean;
  authModalOpen: boolean;

  // Email Verification State
  verificationStatus: AuthVerificationStatus;
  unverifiedEmail: string | null;
  verificationMessage: VerificationMessage | null;
  isCheckingVerification: boolean;
  resendCooldown: number;

  // Actions
  initializeAuth: () => Promise<void>;
  setAuthModalOpen: (open: boolean) => void;
  signIn: (email: string, pass: string) => Promise<boolean>;
  signUp: (email: string, pass: string, username: string, displayName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  checkVerification: () => Promise<{ verified: boolean; message?: string }>;
  resendVerification: () => Promise<boolean>;
  cancelVerification: () => Promise<void>;
  setUnverifiedEmail: (email: string) => void;
  clearVerificationMessage: () => void;
  connectGithub: (handle?: string) => Promise<void>;
  disconnectGithub: () => Promise<void>;
  completeOnboarding: (specialties: string[], techStack: string[]) => Promise<void>;
  updateProfile: (partial: Partial<Developer>) => Promise<void>;
  clearError: () => void;
}

let resendTimer: number | null = null;

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

      verificationStatus: 'INITIALIZING',
      unverifiedEmail: null,
      verificationMessage: null,
      isCheckingVerification: false,
      resendCooldown: 0,

      setAuthModalOpen: (open) => set({ authModalOpen: open, authError: null }),
      clearError: () => set({ authError: null }),
      setUnverifiedEmail: (email) => set({ unverifiedEmail: email }),
      clearVerificationMessage: () => set({ verificationMessage: null }),

      initializeAuth: async () => {
        try {
          set({ isLoading: true, verificationStatus: 'INITIALIZING' });
          const session = await authService.getSession();

          if (session?.user) {
            const isConfirmed = Boolean(
              session.user.email_confirmed_at || (session.user as any).confirmed_at
            );

            if (!isConfirmed) {
              set({
                session,
                currentUser: DEFAULT_GUEST_USER,
                isAuthenticated: false,
                verificationStatus: 'UNVERIFIED',
                unverifiedEmail: session.user.email || get().unverifiedEmail,
                isLoading: false,
              });
            } else {
              let profile = await profileService.getProfile(session.user.id);
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
                verificationStatus: 'VERIFIED',
                unverifiedEmail: null,
                githubConnected: !!profile.githubHandle,
                onboardingCompleted: get().onboardingCompleted,
                isLoading: false,
              });
            }
          } else {
            const currentUnverified = get().unverifiedEmail;
            set({
              session: null,
              currentUser: DEFAULT_GUEST_USER,
              isAuthenticated: false,
              verificationStatus: currentUnverified ? 'UNVERIFIED' : 'NOT_AUTHENTICATED',
              isLoading: false,
            });
          }

          // Subscribe to live auth state changes (e.g. email verification redirect back)
          authService.onAuthStateChange(async (_event, newSession) => {
            if (newSession?.user) {
              const isConfirmed = Boolean(
                newSession.user.email_confirmed_at || (newSession.user as any).confirmed_at
              );

              if (isConfirmed) {
                let profile = await profileService.getProfile(newSession.user.id);
                if (!profile) {
                  const meta = newSession.user.user_metadata || {};
                  const defaultHandle = meta.username || newSession.user.email?.split('@')[0] || 'builder';
                  const defaultName = meta.display_name || meta.name || defaultHandle;
                  profile = await profileService.upsertProfile({
                    id: newSession.user.id,
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
                  session: newSession,
                  currentUser: profile,
                  isAuthenticated: true,
                  verificationStatus: 'VERIFIED',
                  unverifiedEmail: null,
                  githubConnected: !!profile.githubHandle,
                  onboardingCompleted: get().onboardingCompleted,
                  isLoading: false,
                  verificationMessage: null,
                });
              } else {
                set({
                  session: newSession,
                  currentUser: DEFAULT_GUEST_USER,
                  isAuthenticated: false,
                  verificationStatus: 'UNVERIFIED',
                  unverifiedEmail: newSession.user.email || get().unverifiedEmail,
                  isLoading: false,
                });
              }
            } else {
              const currentUnverified = get().unverifiedEmail;
              set({
                session: null,
                currentUser: DEFAULT_GUEST_USER,
                isAuthenticated: false,
                verificationStatus: currentUnverified ? 'UNVERIFIED' : 'NOT_AUTHENTICATED',
                isLoading: false,
              });
            }
          });
        } catch (err: any) {
          console.error('Auth initialization error:', err);
          set({ isLoading: false, verificationStatus: 'NOT_AUTHENTICATED' });
        }
      },

      signIn: async (email: string, pass: string) => {
        try {
          set({ isLoading: true, authError: null });
          const { session, user } = await authService.signIn(email, pass);

          if (!user) throw new Error('Failed to sign in');

          const isConfirmed = Boolean(user.email_confirmed_at || (user as any).confirmed_at);

          if (!isConfirmed) {
            set({
              session,
              currentUser: DEFAULT_GUEST_USER,
              isAuthenticated: false,
              verificationStatus: 'UNVERIFIED',
              unverifiedEmail: email.trim(),
              authModalOpen: false,
              isLoading: false,
              authError: null,
              verificationMessage: null,
            });

            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', '/verify-email');
            }

            return false;
          }

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
            verificationStatus: 'VERIFIED',
            unverifiedEmail: null,
            onboardingCompleted: true,
            authModalOpen: false,
            isLoading: false,
            authError: null,
            verificationMessage: null,
          });

          return true;
        } catch (err: any) {
          const errorMsg = err.message || 'Authentication error';
          if (errorMsg.toLowerCase().includes('email not confirmed')) {
            set({
              authError: null,
              verificationStatus: 'UNVERIFIED',
              unverifiedEmail: email.trim(),
              authModalOpen: false,
              isLoading: false,
              verificationMessage: {
                type: 'info',
                text: 'Please verify your email before continuing.',
              },
            });

            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', '/verify-email');
            }
            return false;
          }

          set({ authError: errorMsg, isLoading: false });
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

          const isConfirmed = Boolean(user.email_confirmed_at || (user as any).confirmed_at);

          if (!isConfirmed) {
            // DO NOT treat signup as a successful login!
            // Show dedicated email verification screen
            set({
              session: null,
              currentUser: DEFAULT_GUEST_USER,
              isAuthenticated: false,
              verificationStatus: 'UNVERIFIED',
              unverifiedEmail: email.trim(),
              authModalOpen: false,
              isLoading: false,
              authError: null,
              verificationMessage: null,
            });

            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', '/verify-email');
            }

            return true;
          }

          // In case email confirmation is already fulfilled
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
            isAuthenticated: true,
            verificationStatus: 'VERIFIED',
            unverifiedEmail: null,
            onboardingCompleted: get().onboardingCompleted,
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

      checkVerification: async () => {
        try {
          set({ isCheckingVerification: true, verificationMessage: null });
          // PERFORM FRESH CHECK DIRECTLY AGAINST SUPABASE
          const { isVerified, user } = await authService.checkUserVerification();

          if (isVerified && user) {
            const session = await authService.getSession();
            let profile = await profileService.getProfile(user.id);
            if (!profile) {
              const meta = user.user_metadata || {};
              const defaultHandle = meta.username || user.email?.split('@')[0] || 'builder';
              const defaultName = meta.display_name || meta.name || defaultHandle;
              profile = await profileService.upsertProfile({
                id: user.id,
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
              session: session || null,
              currentUser: profile,
              isAuthenticated: true,
              verificationStatus: 'VERIFIED',
              unverifiedEmail: null,
              isCheckingVerification: false,
              onboardingCompleted: get().onboardingCompleted,
              verificationMessage: {
                type: 'success',
                text: 'Email verified! Welcome to CODE SOCIAL.',
              },
            });

            return { verified: true };
          } else {
            const message = "Your email hasn't been verified yet. Please click the link in your email.";
            set({
              isCheckingVerification: false,
              verificationMessage: {
                type: 'error',
                text: message,
              },
            });
            return { verified: false, message };
          }
        } catch (err: any) {
          const message = err.message || "Failed to check verification status. Please try again.";
          set({
            isCheckingVerification: false,
            verificationMessage: {
              type: 'error',
              text: message,
            },
          });
          return { verified: false, message };
        }
      },

      resendVerification: async () => {
        const { unverifiedEmail, resendCooldown } = get();
        if (!unverifiedEmail) {
          set({
            verificationMessage: {
              type: 'error',
              text: 'No email address specified to resend to.',
            },
          });
          return false;
        }

        if (resendCooldown > 0) {
          return false;
        }

        try {
          set({ isCheckingVerification: true });
          await authService.resendVerificationEmail(unverifiedEmail);
          set({
            isCheckingVerification: false,
            resendCooldown: 60,
            verificationMessage: {
              type: 'success',
              text: 'Verification email sent.',
            },
          });

          if (resendTimer) {
            window.clearInterval(resendTimer);
          }

          resendTimer = window.setInterval(() => {
            const current = get().resendCooldown;
            if (current <= 1) {
              if (resendTimer) window.clearInterval(resendTimer);
              resendTimer = null;
              set({ resendCooldown: 0 });
            } else {
              set({ resendCooldown: current - 1 });
            }
          }, 1000);

          return true;
        } catch (err: any) {
          set({
            isCheckingVerification: false,
            verificationMessage: {
              type: 'error',
              text: err.message || 'Failed to resend verification email.',
            },
          });
          return false;
        }
      },

      cancelVerification: async () => {
        try {
          await authService.signOut();
        } catch (_) {}

        if (resendTimer) {
          window.clearInterval(resendTimer);
          resendTimer = null;
        }

        set({
          session: null,
          currentUser: DEFAULT_GUEST_USER,
          isAuthenticated: false,
          verificationStatus: 'NOT_AUTHENTICATED',
          unverifiedEmail: null,
          verificationMessage: null,
          resendCooldown: 0,
          authModalOpen: true,
        });

        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', '/');
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
            verificationStatus: 'NOT_AUTHENTICATED',
            unverifiedEmail: null,
            verificationMessage: null,
            onboardingCompleted: false,
            isLoading: false,
            authError: null,
          });
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', '/');
          }
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
      name: 'code-social-auth-storage-v5',
      partialize: (state) => ({
        onboardingCompleted: state.onboardingCompleted,
        unverifiedEmail: state.unverifiedEmail,
      }),
    }
  )
);
