import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';
import { firebaseConfig, isPushConfigured } from '../config/firebaseConfig';

let messagingPromise;

export function getFirebaseApp() {
  if (!firebaseConfig.appId) return null;
  if (!getApps().length) initializeApp(firebaseConfig);
  return getApps()[0] || null;
}

export async function getFirebaseMessaging() {
  if (!isPushConfigured()) return null;
  if (!messagingPromise) {
    messagingPromise = (async () => {
      try {
        if (typeof window === 'undefined' || !('Notification' in window)) return null;
        if (!(await isSupported())) return null;
        const app = getFirebaseApp();
        if (!app) return null;
        return getMessaging(app);
      } catch {
        return null;
      }
    })();
  }
  return messagingPromise;
}

export async function isWebPushSupported() {
  if (!isPushConfigured()) return false;
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}
