import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';

/**
 * Triggers the native OS-level camera permission dialog on Capacitor platforms.
 * On web, this is a no-op since getUserMedia will trigger the browser prompt.
 */
export async function requestCameraPermission(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const status = await Camera.checkPermissions();
    if (status.camera !== 'granted') {
      await Camera.requestPermissions({ permissions: ['camera'] });
    }
  } catch (e) {
    // Capacitor Camera plugin permission is separate from WebView getUserMedia.
    // Even if this fails, getUserMedia might still work. Log and continue.
    console.warn('[permissions] Capacitor camera plugin error (non-fatal):', e);
  }
}
