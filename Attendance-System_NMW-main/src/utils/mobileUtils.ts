// Mobile detection utilities
export const isMobile = () => {
  if (typeof window === 'undefined' || !navigator) return false;
  
  try {
    const userAgent = navigator.userAgent;
    // More specific tablet detection - only true tablets, not phones
    const isTablet = /iPad|Android.*Tablet|Windows.*Touch/i.test(userAgent) && 
                    !/Android.*Mobile/i.test(userAgent);
    const isPhone = /iPhone|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    return isPhone || (!isTablet && window.innerWidth && window.innerWidth <= 768);
  } catch (error) {
    console.warn('Mobile detection error:', error);
    return false;
  }
};

export const isTouchDevice = () => {
  if (typeof window === 'undefined' || !navigator) return false;
  
  try {
    return 'ontouchstart' in window || 
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) || 
           ((navigator as any).msMaxTouchPoints && (navigator as any).msMaxTouchPoints > 0);
  } catch (error) {
    console.warn('Touch device detection error:', error);
    return false;
  }
};

export const isWebAuthnSupported = () => {
  if (typeof window === 'undefined') return false;
  
  try {
    return window.PublicKeyCredential && 
           typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
  } catch (error) {
    console.warn('WebAuthn detection error:', error);
    return false;
  }
};

export const isTablet = () => {
  if (typeof window === 'undefined' || !navigator) return false;
  
  try {
    const userAgent = navigator.userAgent;
    // Only detect actual tablets, not phones
    return /iPad|Android.*Tablet|Windows.*Touch/i.test(userAgent) && 
           !/Android.*Mobile/i.test(userAgent);
  } catch (error) {
    console.warn('Tablet detection error:', error);
    return false;
  }
};

export const getMobileBrowserInfo = () => {
  if (typeof window === 'undefined') return { browser: 'unknown', version: 'unknown' };
  
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Chrome')) {
    return { browser: 'Chrome', version: userAgent.match(/Chrome\/(\d+)/)?.[1] || 'unknown' };
  } else if (userAgent.includes('Safari')) {
    return { browser: 'Safari', version: userAgent.match(/Version\/(\d+)/)?.[1] || 'unknown' };
  } else if (userAgent.includes('Firefox')) {
    return { browser: 'Firefox', version: userAgent.match(/Firefox\/(\d+)/)?.[1] || 'unknown' };
  }
  
  return { browser: 'unknown', version: 'unknown' };
};
