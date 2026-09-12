import { create } from 'zustand';

const INTRO_STORAGE_KEY = 'code_social_intro_completed_v1';
const RESEND_COOLDOWN_KEY = 'code_social_resend_cooldown_until';

interface AppState {
  introCompleted: boolean;
  resendCooldownSeconds: number;
  isResending: boolean;

  completeIntro: () => void;
  resetIntro: () => void; // Provided for testing/debugging only
  startResendCooldown: (seconds?: number) => void;
  updateCooldownTick: () => void;
  setIsResending: (loading: boolean) => void;
}

function getInitialIntroCompleted(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(INTRO_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function getInitialCooldownSeconds(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(RESEND_COOLDOWN_KEY);
    if (!raw) return 0;
    const cooldownUntil = parseInt(raw, 10);
    if (isNaN(cooldownUntil)) return 0;
    const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
}

export const useAppStateStore = create<AppState>((set) => ({
  introCompleted: getInitialIntroCompleted(),
  resendCooldownSeconds: getInitialCooldownSeconds(),
  isResending: false,

  completeIntro: () => {
    try {
      localStorage.setItem(INTRO_STORAGE_KEY, 'true');
    } catch (e) {
      console.warn('Could not persist intro completion:', e);
    }
    set({ introCompleted: true });
  },

  resetIntro: () => {
    try {
      localStorage.removeItem(INTRO_STORAGE_KEY);
    } catch (e) {
      console.warn('Could not reset intro completion:', e);
    }
    set({ introCompleted: false });
  },

  startResendCooldown: (seconds = 60) => {
    const cooldownUntil = Date.now() + seconds * 1000;
    try {
      localStorage.setItem(RESEND_COOLDOWN_KEY, cooldownUntil.toString());
    } catch (e) {
      console.warn('Could not persist cooldown:', e);
    }
    set({ resendCooldownSeconds: seconds });
  },

  updateCooldownTick: () => {
    try {
      const raw = localStorage.getItem(RESEND_COOLDOWN_KEY);
      if (!raw) {
        set({ resendCooldownSeconds: 0 });
        return;
      }
      const cooldownUntil = parseInt(raw, 10);
      const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        localStorage.removeItem(RESEND_COOLDOWN_KEY);
        set({ resendCooldownSeconds: 0 });
      } else {
        set({ resendCooldownSeconds: remaining });
      }
    } catch {
      set({ resendCooldownSeconds: 0 });
    }
  },

  setIsResending: (loading: boolean) => set({ isResending: loading }),
}));
