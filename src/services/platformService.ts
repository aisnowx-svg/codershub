/**
 * CODE SOCIAL — Platform Independence Service
 * 
 * Defines the canonical abstraction for native & OS capabilities.
 * Core React components interact ONLY with this interface, ensuring:
 * - 100% web browser compatibility today
 * - Seamless drop-in integration with PyWebView (Windows) tomorrow
 * - Seamless drop-in integration with Capacitor (Android & iOS) later
 * - Seamless desktop wrapper on macOS later
 * - ZERO platform-specific leaks into UI code
 */

export type PlatformType = 'web' | 'windows' | 'android' | 'ios' | 'macos';

export interface PlatformCapabilities {
  hasFileSystemAccess: boolean;
  hasNativeNotifications: boolean;
  hasHardwareAcceleration: boolean;
  isTouchDevice: boolean;
}

export interface ShareData {
  title: string;
  text?: string;
  url?: string;
}

export interface IPlatformService {
  getPlatform(): PlatformType;
  isNative(): boolean;
  getCapabilities(): PlatformCapabilities;
  copyToClipboard(text: string): Promise<boolean>;
  openExternalUrl(url: string): void;
  showNotification(title: string, body?: string): void;
  share(data: ShareData): Promise<boolean>;
}

class WebPlatformService implements IPlatformService {
  public getPlatform(): PlatformType {
    if (typeof window === 'undefined') return 'web';

    // Check if running inside PyWebView window bridge
    if ((window as any).pywebview) {
      return 'windows';
    }

    // Check if running inside Capacitor bridge
    if ((window as any).Capacitor) {
      const platform = (window as any).Capacitor.getPlatform?.();
      if (platform === 'android') return 'android';
      if (platform === 'ios') return 'ios';
    }

    // Check User-Agent fallback
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    if (/Macintosh/.test(ua)) return 'macos';
    if (/Windows/.test(ua)) return 'windows';

    return 'web';
  }

  public isNative(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).pywebview || (window as any).Capacitor);
  }

  public getCapabilities(): PlatformCapabilities {
    const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    return {
      hasFileSystemAccess: typeof window !== 'undefined' && 'showOpenFilePicker' in window,
      hasNativeNotifications: typeof window !== 'undefined' && 'Notification' in window,
      hasHardwareAcceleration: true,
      isTouchDevice: isTouch,
    };
  }

  public async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      // Fallback for restricted contexts
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  }

  public openExternalUrl(url: string): void {
    if (!url) return;
    try {
      // In PyWebView or Capacitor, external URLs can be intercepted by bridge
      if ((window as any).pywebview?.api?.open_browser) {
        (window as any).pywebview.api.open_browser(url);
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      // Degrade gracefully
    }
  }

  public showNotification(title: string, body?: string): void {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    } catch {
      // Notification failed or disabled
    }
  }

  public async share(data: ShareData): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(data);
        return true;
      }
      // Fallback to copying URL
      if (data.url) {
        return await this.copyToClipboard(data.url);
      }
      return false;
    } catch {
      return false;
    }
  }
}

export const platformService = new WebPlatformService();
