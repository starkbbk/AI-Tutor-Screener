/**
 * Device Identity Factory
 * 
 * Provides robust detection for mobile devices, specifically:
 * - iOS Safari (requires special mic handling)
 * - Android Chrome (requires auto-revive logic)
 */

export interface DeviceInfo {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  handoffDelay: number;
}

export function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      isSafari: false,
      isChrome: false,
      handoffDelay: 0
    };
  }

  const ua = window.navigator.userAgent.toLowerCase();
  
  // Basic platform detection
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const isMobile = isIOS || isAndroid || /mobile|tablet|kindle|silk/.test(ua) || (window.innerWidth <= 768 && 'ontouchstart' in window);

  // Browser detection
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua) || (isIOS && !/chrome|crios|fxios/.test(ua));
  const isChrome = /chrome|crios/i.test(ua);

  // Handoff Delays as per requirements
  let handoffDelay = 0;
  if (isIOS) {
    handoffDelay = 1200; // 1.2s for iOS Safari stability
  } else if (isMobile) {
    handoffDelay = 800;  // 800ms for other mobile (Android etc.)
  }

  return {
    isMobile,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    handoffDelay
  };
}

// Singleton for performance
let cachedDeviceInfo: DeviceInfo | null = null;

export function getDeviceType() {
  if (!cachedDeviceInfo) {
    cachedDeviceInfo = getDeviceInfo();
  }
  return cachedDeviceInfo;
}
