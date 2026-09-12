import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Session } from '@supabase/supabase-js';
import { Developer, DeveloperSpecialty } from '../types';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';
import { useAppStateStore } from './appStateStore';

export type AuthStateStatus =
  | 'INITIALIZING'
  | 'UNAUTHENTICATED'
  | 'UNVERIFIED_AUTHENTICATED'
  | 'VERIFIED_AUTHENTICATED';

// Backwards compatibility for components expecting verificationStatus
export type AuthVerificationStatus =
  | 'INITIALIZING'
  | 'NOT_AUTHENTICATED'
  | 'UNVERIFIED'
  | 'VERIFIED';

export interface VerificationMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

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
    projectName: 'No Active Project',
    description: 'Set your active project on your profile.',
    progressPercentage: 0,
    latestMilestone: 'In development',
  },
  techStack: ['TypeScript', 'React'],
  isFollowing: false,
};

interface AuthStoreState {
  // Core Auth Dimensions
  session: Session | null;
  currentUser: Developer;
  hasSession: boolean;
  emailVerified: boolean;
  profileOnboardingCompleted: boolean;
  authState: AuthStateStatus;

  // Backwards-compatible aliases
  isAuthenticated: boolean;
  verificationStatus: AuthVerificationStatus;
  onboardingCompleted: boolean;

  // UI & Feedback States
  isLoading: boolean;
  authError: string | null;
  authModalOpen: boolean;
  authModalMode: 'signin' | 'signup';
  githubConnected: boolean;

  // Email Verification UI State
  unverifiedEmail: string | null;
  verificationMessage: VerificationMessage | null;
  isCheckingVerification: boolean;
  isRateLimited: boolean;
  resendCooldown: number; // Linked to appStateStore

  // Actions
  initializeAuth: () => Promise<void>;
  setAuthModalOpen: (open: boolean, mode?: 'signin' | 'signup') => void;
  clearError: () => void;
  setUnverifiedEmail: (email: string) => void;
  clearVerificationMessage: () => void;
  signIn: (email: string, pass: string) => Promise<boolean>;
  signUp: (email: string, pass: string, username: string, displayName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  checkVerification: () => Promise<{ verified: boolean; requiresSignIn?: boolean; email?: string; message?: string }>;
  resendVerification: () => Promise<boolean>;
  cancelVerification: () => Promise<void>;
  completeOnboarding: (specialties: string[], techStack: string[]) => Promise<void>;
  updateProfile: (partial: Partial<Developer>) => Promise<void>;
  connectGithub: (handle?: string) => Promise<void>;
  disconnectGithub: () => Promise<void>;
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      session: null,
      currentUser: DEFAULT_GUEST_USER,
      hasSession: false,
      emailVerified: false,
      profileOnboardingCompleted: false,
      authState: 'INITIALIZING',

      // Aliases
      isAuthenticated: false,
      verificationStatus: 'INITIALIZING',
      onboardingCompleted: false,

      isLoading: true,
      authError: null,
      authModalOpen: false,
      authModalMode: 'signin',
      githubConnected: false,

      unverifiedEmail: null,
      verificationMessage: null,
      isCheckingVerification: false,
      isRateLimited: false,
      resendCooldown: 0,

      setAuthModalOpen: (open, mode = 'signin') => {
        set({ authModalOpen: open, authModalMode: mode, authError: null });
      },

      clearError: () => set({ authError: null, isRateLimited: false }),
      setUnverifiedEmail: (email) => set({ unverifiedEmail: email }),
      clearVerificationMessage: () => set({ verificationMessage: null }),

      initializeAuth: async () => {
        try {
          set({ isLoading: true, authState: 'INITIALIZING', verificationStatus: 'INITIALIZING' });
          const session = await authService.getSession();

          if (session?.user) {
            const isConfirmed = Boolean(
              session.user.email_confirmed_at || (session.user as any).confirmed_at
            );

            if (!isConfirmed) {
              // Valid session exists, but email is not yet confirmed
              set({
                session,
                currentUser: DEFAULT_GUEST_USER,
                hasSession: true,
                emailVerified: false,
                authState: 'UNVERIFIED_AUTHENTICATED',
                isAuthenticated: false,
                verificationStatus: 'UNVERIFIED',
                unverifiedEmail: session.user.email || get().unverifiedEmail,
                isLoading: false,
              });
            } else {
              // Valid session and email is verified
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

              const hasProfileSpecialty = Boolean(
                profile.specialty && profile.techStack && profile.techStack.length > 0
              );
              const profileCompleted = get().profileOnboardingCompleted || hasProfileSpecialty;

              set({
                session,
                currentUser: profile,
                hasSession: true,
                emailVerified: true,
                profileOnboardingCompleted: profileCompleted,
                authState: 'VERIFIED_AUTHENTICATED',
                isAuthenticated: true,
                verificationStatus: 'VERIFIED',
                onboardingCompleted: profileCompleted,
                unverifiedEmail: null,
                authModalOpen: false,
                githubConnected: Boolean(profile.githubHandle),
                isLoading: false,
              });
            }
          } else {
            // No session
            const storedEmail = get().unverifiedEmail;
            set({
              session: null,
              currentUser: DEFAULT_GUEST_USER,
              hasSession: false,
              emailVerified: false,
              authState: 'UNAUTHENTICATED',
              isAuthenticated: false,
              verificationStatus: storedEmail ? 'UNVERIFIED' : 'NOT_AUTHENTICATED',
              isLoading: false,
            });
          }

          // Live Supabase auth event listener (ZERO rogue redirects)
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

                const hasProfileSpecialty = Boolean(
                  profile.specialty && profile.techStack && profile.techStack.length > 0
                );
                const profileCompleted = get().profileOnboardingCompleted || hasProfileSpecialty;

                set({
                  session: newSession,
                  currentUser: profile,
                  hasSession: true,
                  emailVerified: true,
                  profileOnboardingCompleted: profileCompleted,
                  authState: 'VERIFIED_AUTHENTICATED',
                  isAuthenticated: true,
                  verificationStatus: 'VERIFIED',
                  onboardingCompleted: profileCompleted,
                  unverifiedEmail: null,
                  authModalOpen: false,
                  githubConnected: Boolean(profile.githubHandle),
                  isLoading: false,
                  verificationMessage: null,
                });
              } else {
                set({
                  session: newSession,
                  currentUser: DEFAULT_GUEST_USER,
                  hasSession: true,
                  emailVerified: false,
                  authState: 'UNVERIFIED_AUTHENTICATED',
                  isAuthenticated: false,
                  verificationStatus: 'UNVERIFIED',
                  unverifiedEmail: newSession.user.email || get().unverifiedEmail,
                  isLoading: false,
                });
              }
            } else {
              const storedEmail = get().unverifiedEmail;
              set({
                session: null,
                currentUser: DEFAULT_GUEST_USER,
                hasSession: false,
                emailVerified: false,
                authState: 'UNAUTHENTICATED',
                isAuthenticated: false,
                verificationStatus: storedEmail ? 'UNVERIFIED' : 'NOT_AUTHENTICATED',
                isLoading: false,
              });
            }
          });
        } catch (err: any) {
          console.error('Auth initialization error:', err);
          set({
            isLoading: false,
            hasSession: false,
            emailVerified: false,
            authState: 'UNAUTHENTICATED',
            isAuthenticated: false,
            verificationStatus: 'NOT_AUTHENTICATED',
          });
        }
      },

      signIn: async (email: string, pass: string) => {
        try {
          set({ isLoading: true, authError: null, isRateLimited: false });
          const { session, user } = await authService.signIn(email, pass);

          if (!user) throw new Error('Failed to retrieve user upon sign in');

          const isConfirmed = Boolean(user.email_confirmed_at || (user as any).confirmed_at);

          if (!isConfirmed) {
            set({
              session,
              currentUser: DEFAULT_GUEST_USER,
              hasSession: true,
              emailVerified: false,
              authState: 'UNVERIFIED_AUTHENTICATED',
              isAuthenticated: false,
              verificationStatus: 'UNVERIFIED',
              unverifiedEmail: email.trim(),
              authModalOpen: false,
              isLoading: false,
              authError: null,
              verificationMessage: {
                type: 'info',
                text: 'Please confirm your email address before entering CODE SOCIAL.',
              },
            });
            return true;
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

          const hasProfileSpecialty = Boolean(
            profile.specialty && profile.techStack && profile.techStack.length > 0
          );
          const profileCompleted = get().profileOnboardingCompleted || hasProfileSpecialty;

          set({
            session,
            currentUser: profile,
            hasSession: true,
            emailVerified: true,
            profileOnboardingCompleted: profileCompleted,
            authState: 'VERIFIED_AUTHENTICATED',
            isAuthenticated: true,
            verificationStatus: 'VERIFIED',
            onboardingCompleted: profileCompleted,
            unverifiedEmail: null,
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
              hasSession: false,
              emailVerified: false,
              authState: 'UNAUTHENTICATED',
              isAuthenticated: false,
              verificationStatus: 'UNVERIFIED',
              unverifiedEmail: email.trim(),
              authModalOpen: false,
              isLoading: false,
              verificationMessage: {
                type: 'info',
                text: 'Please verify your email before continuing.',
              },
            });
            return true;
          }

          set({ authError: errorMsg, isLoading: false });
          return false;
        }
      },

      signUp: async (email: string, pass: string, username: string, displayName: string) => {
        try {
          set({ isLoading: true, authError: null, isRateLimited: false });
          const cleanHandle = username.trim().replace(/^@/, '');
          const { user, session } = await authService.signUp(email, pass, {
            username: cleanHandle,
            display_name: displayName.trim(),
            full_name: displayName.trim(),
          });

          if (!user) throw new Error('Failed to register user');

          const isConfirmed = Boolean(user.email_confirmed_at || (user as any).confirmed_at);

          if (!isConfirmed) {
            set({
              session: session || null,
              currentUser: DEFAULT_GUEST_USER,
              hasSession: Boolean(session?.user),
              emailVerified: false,
              authState: session?.user ? 'UNVERIFIED_AUTHENTICATED' : 'UNAUTHENTICATED',
              isAuthenticated: false,
              verificationStatus: 'UNVERIFIED',
              unverifiedEmail: email.trim(),
              authModalOpen: false,
              isLoading: false,
              authError: null,
              verificationMessage: null,
            });

            // Start initial 60s cooldown for resend button
            useAppStateStore.getState().startResendCooldown(60);
            return true;
          }

          // In rare cases where email confirmation is disabled/instant
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
            hasSession: true,
            emailVerified: true,
            profileOnboardingCompleted: false, // Must complete profile setup next
            authState: 'VERIFIED_AUTHENTICATED',
            isAuthenticated: true,
            verificationStatus: 'VERIFIED',
            onboardingCompleted: false,
            unverifiedEmail: null,
            authModalOpen: false,
            isLoading: false,
            authError: null,
          });

          return true;
        } catch (err: any) {
          const msg = err.message || 'Registration error';
          const isRate = msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('limit');
          set({
            authError: isRate
              ? 'Email sending rate limit exceeded by Supabase. Please wait a few minutes before trying again.'
              : msg,
            isRateLimited: isRate,
            isLoading: false,
          });
          return false;
        }
      },

      checkVerification: async () => {
        try {
          set({ isCheckingVerification: true, verificationMessage: null });
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

            const hasProfileSpecialty = Boolean(
              profile.specialty && profile.techStack && profile.techStack.length > 0
            );
            const profileCompleted = get().profileOnboardingCompleted || hasProfileSpecialty;

            set({
              session: session || null,
              currentUser: profile,
              hasSession: true,
              emailVerified: true,
              profileOnboardingCompleted: profileCompleted,
              authState: 'VERIFIED_AUTHENTICATED',
              isAuthenticated: true,
              verificationStatus: 'VERIFIED',
              onboardingCompleted: profileCompleted,
              unverifiedEmail: null,
              authModalOpen: false,
              isCheckingVerification: false,
              verificationMessage: {
                type: 'success',
                text: 'Email verified! Welcome to CODE SOCIAL.',
              },
            });

            return { verified: true };
          } else if (!user) {
            // CROSS-DEVICE SCENARIO: No active session on this device
            set({
              isCheckingVerification: false,
              verificationMessage: {
                type: 'info',
                text: 'Your email may already be confirmed. Please sign in to continue.',
              },
            });
            return {
              verified: false,
              requiresSignIn: true,
              email: get().unverifiedEmail || undefined,
              message: 'Your email may already be confirmed. Please sign in to continue.',
            };
          } else {
            // Session exists, but email_confirmed_at is still null
            const message = "Your email hasn't been verified yet. Please click the link sent to your inbox.";
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
          const message = err.message || 'Failed to check verification status. Please try again.';
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
        const { unverifiedEmail } = get();
        const appStore = useAppStateStore.getState();

        if (appStore.isResending || appStore.resendCooldownSeconds > 0) {
          return false;
        }

        if (!unverifiedEmail) {
          set({
            verificationMessage: {
              type: 'error',
              text: 'No email address specified to resend to.',
            },
          });
          return false;
        }

        appStore.setIsResending(true);
        set({ verificationMessage: null, isRateLimited: false });

        try {
          await authService.resendVerificationEmail(unverifiedEmail);
          appStore.startResendCooldown(60);
          set({
            verificationMessage: {
              type: 'success',
              text: `Verification email resent to ${unverifiedEmail}. Check your inbox or spam folder.`,
            },
          });
          return true;
        } catch (err: any) {
          const msg = err.message || 'Failed to resend verification email.';
          const isRate = msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('limit');
          set({
            isRateLimited: isRate,
            verificationMessage: {
              type: 'error',
              text: isRate
                ? 'Email rate limit reached for this project. Please wait a few minutes before trying again.'
                : msg,
            },
          });
          if (isRate) {
            appStore.startResendCooldown(120);
          }
          return false;
        } finally {
          appStore.setIsResending(false);
        }
      },

      cancelVerification: async () => {
        const { unverifiedEmail } = get();
        if (unverifiedEmail) {
          try {
            await authService.signOut();
          } catch {
            // Ignore sign out errors on cancel
          }
        }
        set({
          session: null,
          currentUser: DEFAULT_GUEST_USER,
          hasSession: false,
          emailVerified: false,
          authState: 'UNAUTHENTICATED',
          isAuthenticated: false,
          verificationStatus: 'NOT_AUTHENTICATED',
          unverifiedEmail: null,
          verificationMessage: null,
          authModalOpen: false,
        });
      },

      signOut: async () => {
        try {
          set({ isLoading: true });
          await authService.signOut();
          set({
            session: null,
            currentUser: DEFAULT_GUEST_USER,
            hasSession: false,
            emailVerified: false,
            authState: 'UNAUTHENTICATED',
            isAuthenticated: false,
            verificationStatus: 'NOT_AUTHENTICATED',
            unverifiedEmail: null,
            verificationMessage: null,
            profileOnboardingCompleted: false,
            onboardingCompleted: false,
            isLoading: false,
            authError: null,
            authModalOpen: false,
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
        const specialty = (specialties[0] as DeveloperSpecialty) || 'Systems';
        const mergedStack = Array.from(new Set([...currentUser.techStack, ...techStack]));

        if (currentUser.id) {
          await profileService.updateProfile(currentUser.id, {
            specialty,
            techStack: mergedStack,
          });
        }

        set((state) => ({
          profileOnboardingCompleted: true,
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
      name: 'code-social-auth-storage-v6',
      partialize: (state) => ({
        profileOnboardingCompleted: state.profileOnboardingCompleted,
        onboardingCompleted: state.profileOnboardingCompleted,
        unverifiedEmail: state.unverifiedEmail,
      }),
    }
  )
);
