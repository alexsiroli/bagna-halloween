import { useState } from 'react';
import { SignOutIcon } from '@phosphor-icons/react';
import Sheet from './Sheet.jsx';
import { logout, useAuthUser } from '../auth.js';

// «Alex Siroli» -> «AS»; senza nome, la prima lettera dell'email.
const initials = (name, email) => {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length) return words.slice(0, 2).map((word) => word[0].toUpperCase()).join('');
  return (email || '?')[0].toUpperCase();
};

// Cerchio con le iniziali in alto a destra: tocco = chi sono (nome, email) ed Esci. Senza accesso non c'e'.
function Profile() {
  const user = useAuthUser();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const name = user.displayName || 'Halloween lover';
  const letters = initials(user.displayName, user.email);

  return (
    <>
      <button type="button" className="avatar" onClick={() => setOpen(true)} aria-label={`Profilo: ${name}`}>
        {letters}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} labelledBy="profile-title" className="profile-sheet">
        <div className="profile">
          <span className="avatar avatar--lg" aria-hidden="true">
            {letters}
          </span>
          <div className="profile__who">
            <h2 id="profile-title">{name}</h2>
            {user.email && <p>{user.email}</p>}
          </div>
          <div className="dialog-actions">
            <button type="button" className="secondary-btn" onClick={() => setOpen(false)}>
              Chiudi
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                setOpen(false);
                logout();
              }}
            >
              <SignOutIcon aria-hidden="true" weight="bold" /> Esci
            </button>
          </div>
        </div>
      </Sheet>
    </>
  );
}

export default Profile;
