/**
 * Centralized native platform helpers for Capacitor.
 * Configures StatusBar, Keyboard, and SplashScreen on native platforms.
 */
import { Capacitor } from '@capacitor/core';

/** Initialize native plugins — call once from main.tsx */
export async function initNativePlatform() {
  if (!Capacitor.isNativePlatform()) return;

  // StatusBar
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#1e3a5f' });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch (e) {
    console.warn('[Native] StatusBar init failed:', e);
  }

  // Keyboard
  try {
    const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard');
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    await Keyboard.setScroll({ isDisabled: false });

    Keyboard.addListener('keyboardWillShow', (info) => {
      document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
      document.body.classList.add('keyboard-open');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.documentElement.style.setProperty('--keyboard-height', '0px');
      document.body.classList.remove('keyboard-open');
    });
  } catch (e) {
    console.warn('[Native] Keyboard init failed:', e);
  }

  // SplashScreen
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    // Hide after a short delay — our HTML splash handles branding
    setTimeout(() => {
      SplashScreen.hide({ fadeOutDuration: 300 });
    }, 500);
  } catch (e) {
    console.warn('[Native] SplashScreen init failed:', e);
  }
}

/** Lock/unlock screen orientation (if plugin available) */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function getPlatform(): 'ios' | 'android' | 'web' {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}
