import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const configuredAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const browserHostname =
  typeof window !== 'undefined' && window.location?.hostname ? window.location.hostname : undefined;

// Align the auth handler domain with the hosting domain to avoid third-party storage issues.
const resolvedAuthDomain =
  browserHostname && browserHostname !== 'localhost' && browserHostname !== '127.0.0.1'
    ? browserHostname
    : configuredAuthDomain;

if (!resolvedAuthDomain) {
  // eslint-disable-next-line no-console
  console.warn(
    'Firebase auth domain is not configured. Set VITE_FIREBASE_AUTH_DOMAIN or run the app from a browser context.',
  );
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: resolvedAuthDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
