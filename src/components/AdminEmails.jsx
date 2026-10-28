import { useState } from 'react';
import { arrayRemove, arrayUnion, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { PlusIcon } from '@phosphor-icons/react';
import Sheet from './Sheet.jsx';
import { db } from '../firebase.js';
import { useConfigDoc } from '../data.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Chi e' admin: elenco in config/admins. Le regole Firestore sono la vera protezione, qui solo lo specchio.
function AdminEmails({ user }) {
  const admins = useConfigDoc('admins');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toRemove, setToRemove] = useState(null);

  const emails = Array.isArray(admins?.emails) ? admins.emails : [];
  const me = (user.email || '').toLowerCase();
  const onlyOne = emails.length <= 1;

  const save = async (change, failure) => {
    setBusy(true);
    try {
      await updateDoc(doc(db, 'config', 'admins'), { emails: change, updatedAt: serverTimestamp() });
      setError('');
      return true;
    } catch (err) {
      console.error('Errore elenco admin', err);
      setError(failure);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (event) => {
    event.preventDefault();
    const next = email.trim().toLowerCase();
    if (!EMAIL_RE.test(next)) {
      setError('Indirizzo email non valido.');
      return;
    }
    if (emails.includes(next)) {
      setError(`${next} è già admin.`);
      return;
    }
    if (await save(arrayUnion(next), 'Impossibile aggiungere l’admin.')) setEmail('');
  };

  const remove = async () => {
    const target = toRemove;
    setToRemove(null);
    await save(arrayRemove(target), 'Impossibile togliere l’admin.');
  };

  return (
    <section className="panel admin-emails">
      <h2>Admin</h2>
      <p className="muted">Chi ha l’email in questo elenco, dopo il login con Google, entra in quest’area.</p>

      {error && (
        <div className="notice notice--error" role="alert">
          <strong>Attenzione:</strong> {error}
        </div>
      )}

      <ul className="admin-emails__list">
        {emails.map((item) => (
          <li key={item} className="admin-emails__row">
            <span>
              {item}
              {item === me && ' (tu)'}
            </span>
            {item !== me && !onlyOne && (
              <button type="button" className="secondary-btn" onClick={() => setToRemove(item)} disabled={busy}>
                Togli<span className="sr-only"> {item}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
      {onlyOne && <p className="muted">Resta un solo admin: non si può togliere.</p>}

      <form className="admin-emails__form" onSubmit={add}>
        <div className="field">
          <label htmlFor="admin-email">Nuova email admin</label>
          <input
            id="admin-email"
            type="text"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <button type="submit" className="primary-btn" disabled={busy}>
          <PlusIcon aria-hidden="true" weight="bold" /> Aggiungi
        </button>
      </form>

      <Sheet open={toRemove !== null} onClose={() => setToRemove(null)} labelledBy="admin-remove-title">
        <h2 id="admin-remove-title">Togliere {toRemove}?</h2>
        <p>Non potrà più entrare nell’area admin.</p>
        <div className="dialog-actions">
          <button type="button" className="secondary-btn" onClick={() => setToRemove(null)}>
            Annulla
          </button>
          <button type="button" className="primary-btn" onClick={remove}>
            Togli
          </button>
        </div>
      </Sheet>
    </section>
  );
}

export default AdminEmails;
