import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.voyex.app',
  appName: 'Voyex Ride',
  webDir: 'dist',
  server: {
    // Hot-reload from Lovable sandbox during development
    // Comment this out for production builds
    url: 'https://7e76c2ed-baf3-4ed9-b6c9-c01bba7b32cf.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 7000,
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidScaleType: 'CENTER_INSIDE',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1e3a5f'
    }
  },
  android: {
    allowMixedContent: true
  },
  ios: {
    contentInset: 'automatic'
  }
};

export default config;
