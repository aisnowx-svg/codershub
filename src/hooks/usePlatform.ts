import { useState, useEffect } from 'react';
import { platformService, PlatformType, PlatformCapabilities, ShareData } from '../services/platformService';

export function usePlatform() {
  const [platform, setPlatform] = useState<PlatformType>('web');
  const [capabilities, setCapabilities] = useState<PlatformCapabilities>({
    hasFileSystemAccess: false,
    hasNativeNotifications: false,
    hasHardwareAcceleration: true,
    isTouchDevice: false,
  });

  useEffect(() => {
    setPlatform(platformService.getPlatform());
    setCapabilities(platformService.getCapabilities());
  }, []);

  const copyToClipboard = (text: string) => platformService.copyToClipboard(text);
  const openExternalUrl = (url: string) => platformService.openExternalUrl(url);
  const showNotification = (title: string, body?: string) => platformService.showNotification(title, body);
  const share = (data: ShareData) => platformService.share(data);

  return {
    platform,
    isNative: platformService.isNative(),
    capabilities,
    copyToClipboard,
    openExternalUrl,
    showNotification,
    share,
  };
}
