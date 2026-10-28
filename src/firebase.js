import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { resolveAuthDomain } from './authDomain.js';

const resolvedAuthDomain = resolveAuthDomain(
  window.location.hostname,
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
);

if (!resolvedAuthDomain) {
  console.warn('Firebase auth domain is not configured. Set VITE_FIREBASE_AUTH_DOMAIN.');
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

// Solo `vite --mode emulator` (.env.emulator): porte di firebase.json, progetto demo-*.
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9191', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8181);
}
