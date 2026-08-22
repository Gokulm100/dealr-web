/**
 * Must match the Firebase project the backend Admin SDK and the Android
 * app use (dealr-app-494db). Web tokens from any other project are rejected.
 *
 * Set REACT_APP_FIREBASE_APP_ID and REACT_APP_FIREBASE_VAPID_KEY after adding
 * a Web app in Firebase Console → Project settings → Cloud Messaging.
 */
export const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyAu63Bq-JgfGvCCAl_zvGhc6AZ9zjQI3qk',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'dealr-app-494db.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'dealr-app-494db',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'dealr-app-494db.firebasestorage.app',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '281405583072',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '',
};

export const firebaseVapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY || '';

export function isPushConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId && firebaseVapidKey);
}
