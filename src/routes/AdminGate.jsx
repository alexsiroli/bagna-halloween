import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { GoogleLogoIcon, LockKeyIcon, SignOutIcon } from '@phosphor-icons/react';
import Admin from './Admin.jsx';
import { db } from '../firebase.js';
import { loginWithGoogle, logout, useAuthUser } from '../auth.js';

// Controllo lato app: prova a leggere config/admins, che le regole aprono solo agli admin.
// La vera protezione resta firestore.rules: questo evita solo di mostrare un pannello inutile.
function AdminGate() {
  const user = useAuthUser();
  const [access, setAccess] = useState({ uid: null, status: 'checking' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getDoc(doc(db, 'config', 'admins'))
      .then((snapshot) => {
        const emails = snapshot.data()?.emails ?? [];
        if (!cancelled) setAccess({ uid: user.uid, status: emails.includes(user.email) ? 'granted' : 'denied' });
      })
      .catch((err) => {
        if (err?.code !== 'permission-denied') console.error('Verifica admin fallita', err);
        if (!cancelled) setAccess({ uid: user.uid, status: 'denied' });
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (user && access.uid === user.uid && access.status === 'granted') {
    return <Admin user={user} />;
  }

  const checking = user === undefined || (user && access.uid !== user.uid);

  return (
    <div className="app-shell app-shell--narrow admin-gate">
      <section className="panel gate-panel" aria-busy={checking}>
        <LockKeyIcon className="gate-panel__icon" aria-hidden="true" weight="duotone" />
        <h1>Area organizzatori</h1>

        {checking && <p>Verifica dell’accesso in corso…</p>}

        {user === null && (
          <>
            <p>Accedi con l’account Google autorizzato dall’organizzazione.</p>
            {error && (
              <p className="notice notice--error" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              className="primary-btn primary-btn--xl"
              onClick={async () => setError(await loginWithGoogle())}
            >
              <GoogleLogoIcon aria-hidden="true" weight="bold" /> Accedi con Google
            </button>
          </>
        )}

        {user && !checking && (
          <>
            <p className="notice notice--error" role="alert">
              L’account <strong>{user.email}</strong> non è autorizzato ad amministrare il sito.
            </p>
            <button type="button" className="secondary-btn" onClick={logout}>
              <SignOutIcon aria-hidden="true" weight="bold" /> Esci e cambia account
            </button>
          </>
        )}
      </section>
    </div>
  );
}

export default AdminGate;
