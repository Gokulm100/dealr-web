import { getToken, onMessage } from 'firebase/messaging';
import { firebaseVapidKey, isPushConfigured } from '../config/firebaseConfig';
import { getFirebaseMessaging, isWebPushSupported } from './firebaseMessaging';
import { applyNotificationRoute, notificationPayloadToRoute } from './notificationLaunch';

export { isWebPushSupported } from './firebaseMessaging';

const SW_PATH = '/firebase-messaging-sw.js';
const PROMPT_DISMISSED_KEY = 'dealr-web-push-prompt';

export function getNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export function isPushPromptDismissed() {
  try {
    return localStorage.getItem(PROMPT_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissPushPrompt() {
  try { localStorage.setItem(PROMPT_DISMISSED_KEY, '1'); } catch { /* ignore */ }
}

export async function shouldOfferPushPrompt() {
  if (!isPushConfigured()) return false;
  if (isPushPromptDismissed()) return false;
  if (!(await isWebPushSupported())) return false;
  return getNotificationPermission() === 'default';
}

async function getMessagingRegistration() {
  if (!('serviceWorker' in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing) {
    const script = existing.active?.scriptURL || existing.waiting?.scriptURL || existing.installing?.scriptURL || '';
    if (script.includes('firebase-messaging-sw.js')) return existing;
  }
  return navigator.serviceWorker.register(SW_PATH, { scope: '/' });
}

export async function registerPushToken(apiFetch) {
  if (!apiFetch || !isPushConfigured()) return null;
  if (getNotificationPermission() !== 'granted') return null;
  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  const registration = await getMessagingRegistration();
  const fcmToken = await getToken(messaging, {
    vapidKey: firebaseVapidKey,
    serviceWorkerRegistration: registration || undefined,
  });
  if (!fcmToken) return null;

  await apiFetch('/api/users/save-fcm-token', {
    method: 'POST',
    body: JSON.stringify({ fcmToken }),
  });
  return fcmToken;
}

export async function enableWebPush(apiFetch) {
  if (!(await isWebPushSupported())) {
    throw new Error('Notifications are not supported in this browser.');
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notifications were not enabled.');
  }
  dismissPushPrompt();
  return registerPushToken(apiFetch);
}

export async function unregisterPushToken(apiFetch) {
  try {
    if (apiFetch && localStorage.getItem('authToken')) {
      await apiFetch('/api/users/save-fcm-token', {
        method: 'POST',
        body: JSON.stringify({ fcmToken: null }),
      });
    }
  } catch { /* still try to drop the local token */ }

  try {
    const messaging = await getFirebaseMessaging();
    if (messaging) {
      const { deleteToken } = await import('firebase/messaging');
      await deleteToken(messaging);
    }
  } catch { /* ignore */ }
}

export function listenForForegroundPush({ navigate, showToast, isCurrentChat } = {}) {
  let unsub = () => {};
  let cancelled = false;

  (async () => {
    const messaging = await getFirebaseMessaging();
    if (!messaging || cancelled) return;
    unsub = onMessage(messaging, (payload) => {
      const data = payload?.data || {};
      const title = payload?.notification?.title || data.senderName || 'Dealr';
      const body = payload?.notification?.body || data.messageText || '';
      const route = notificationPayloadToRoute(data);

      if (typeof isCurrentChat === 'function' && isCurrentChat(data)) return;

      if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          const n = new Notification(title, {
            body,
            icon: '/icon-192.png',
            data,
          });
          n.onclick = () => {
            window.focus();
            applyNotificationRoute(route, navigate);
            n.close();
          };
        } catch { /* ignore */ }
      } else if (showToast && (title || body)) {
        showToast(body ? `${title}: ${body}` : title);
      }
    });
  })();

  return () => {
    cancelled = true;
    unsub();
  };
}

export function listenForNotificationClicks(navigate) {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return () => {};
  const onMessageEvent = (event) => {
    if (event.data?.type !== 'dealr-notification-click') return;
    applyNotificationRoute(notificationPayloadToRoute(event.data.data || {}), navigate);
  };
  navigator.serviceWorker.addEventListener('message', onMessageEvent);
  return () => navigator.serviceWorker.removeEventListener('message', onMessageEvent);
}
