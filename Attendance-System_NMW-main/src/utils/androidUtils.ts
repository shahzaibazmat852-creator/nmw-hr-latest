// Android Chrome specific utilities
export const isAndroidChrome = () => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent;
  return /Android/i.test(userAgent) && /Chrome/i.test(userAgent);
};

export const isAndroidWebView = () => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent;
  return /Android/i.test(userAgent) && /wv/i.test(userAgent);
};

export const getAndroidChromeVersion = () => {
  if (typeof window === 'undefined') return null;
  
  const userAgent = navigator.userAgent;
  const match = userAgent.match(/Chrome\/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

export const isAndroidChromeCompatible = () => {
  const version = getAndroidChromeVersion();
  return version ? version >= 67 : false; // WebAuthn support from Chrome 67+
};

export const getAndroidDeviceInfo = () => {
  if (typeof window === 'undefined') return null;
  
  return {
    isAndroid: /Android/i.test(navigator.userAgent),
    isChrome: /Chrome/i.test(navigator.userAgent),
    isWebView: /wv/i.test(navigator.userAgent),
    version: getAndroidChromeVersion(),
    userAgent: navigator.userAgent,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };
};
