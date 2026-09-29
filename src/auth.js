import { useEffect, useState } from 'react';
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, provider } from './firebase.js';

setPersistence(auth, browserLocalPersistence).catch((err) =>
  console.warn('Impossibile impostare la persistenza del login', err),
);

// undefined = sto ancora controllando, null = nessun login.
export function useAuthUser() {
  const [user, setUser] = useState(auth.currentUser ?? undefined);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  return user;
}

// Ritorna un messaggio d'errore da mostrare, oppure '' se il login e' riuscito.
export async function loginWithGoogle() {
  try {
    const probeKey = '__firebase_auth_probe__';
    window.sessionStorage.setItem(probeKey, '1');
    window.sessionStorage.removeItem(probeKey);
  } catch (storageErr) {
    console.warn('SessionStorage non disponibile per autenticazione', storageErr);
    return 'Per accedere con Google devi aprire il sito nel browser di sistema e consentire i cookie.';
  }

  try {
    await signInWithPopup(auth, provider);
    return '';
  } catch (err) {
    console.error('Login fallito', err);
    if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
      return 'Accesso annullato: riprova quando vuoi.';
    }
    if (err?.message?.includes('missing initial state')) {
      return 'Il browser sta bloccando la pagina di login di Google. Apri il sito nel browser di sistema e abilita i cookie, poi riprova.';
    }
    return 'Accesso non riuscito, riprova.';
  }
}

export async function logout() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Logout fallito', err);
  }
}
