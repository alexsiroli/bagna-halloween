import { useState } from 'react';
import { GoogleLogoIcon } from '@phosphor-icons/react';
import { KindTag } from './MapGlyph.jsx';
import PumpkinRating from './PumpkinRating.jsx';
import Sheet from './Sheet.jsx';
import { loginWithGoogle } from '../auth.js';
import { houseAddress } from '../data.js';
import { isVoted, MIN_SCORE, saveVote, useMyVotes } from '../myVotes.js';

function VoteForm({ house, user, config, saving, setSaving, onClose, onSaved }) {
  const { votesMap } = useMyVotes(user, config.edition);
  const current = votesMap.get(house.number);
  // null = non ha ancora toccato le zucche: si vede il voto salvato, anche se arriva dopo l'apertura.
  const [picked, setPicked] = useState(null);
  const [error, setError] = useState('');
  const score = picked ?? current?.score ?? 0;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await saveVote({ user, edition: config.edition, houseNumber: house.number, score, existing: current });
      onSaved({ number: house.number, score });
    } catch (err) {
      console.error('Errore salvando il voto', err);
      setError('Impossibile salvare il voto, riprova più tardi.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogin = async () => setError(await loginWithGoogle());

  return (
    <form onSubmit={handleSubmit}>
      <div className="vote-dialog-header">
        <span className="plate plate--lg" aria-hidden="true">
          {house.number}
        </span>
        <div className="vote-dialog-headings">
          <h2 id="vote-dialog-title">Casa {house.number}</h2>
          <p className="vote-dialog-house-title">{house.title || 'Senza titolo'}</p>
        </div>
      </div>
      {houseAddress(house) && <p className="map-dialog__address">{houseAddress(house)}</p>}
      <KindTag kind={house.kind} />
      {house.description && <p className="vote-dialog-description">{house.description}</p>}

      {user ? (
        <>
          <p className="vote-dialog-current" data-voted={isVoted(current)}>
            {isVoted(current) ? `Il tuo voto attuale: ${current.score} su 10` : 'Non hai ancora votato questa casa'}
          </p>
          {!config.votingOpen && <p className="notice">Le votazioni sono chiuse al momento.</p>}
          <PumpkinRating label="Il tuo voto" value={score} onChange={setPicked} disabled={!config.votingOpen || saving} />
        </>
      ) : (
        <button type="button" className="primary-btn" onClick={handleLogin} disabled={user === undefined}>
          <GoogleLogoIcon aria-hidden="true" weight="bold" /> Accedi con Google per votare
        </button>
      )}
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}

      {/* Riga delle azioni: qui arrivano «Portami qui» e «Vedi sulla mappa» (ticket successivo). */}
      <div className="dialog-actions">
        <button type="button" className="secondary-btn" onClick={onClose} disabled={saving}>
          {user ? 'Annulla' : 'Chiudi'}
        </button>
        {user && (
          <button type="submit" className="primary-btn" disabled={saving || !config.votingOpen || score < MIN_SCORE} data-busy={saving}>
            {saving ? 'Salvataggio…' : 'Salva voto'}
          </button>
        )}
      </div>
    </form>
  );
}

// La scheda di voto di una casa, la stessa in /vote, /vota/<n> e /mappa. house = null: chiusa.
// onSaved({ number, score }) parte a voto scritto; chiudere la scheda resta a chi la usa.
function VoteSheet({ house, user, config, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  return (
    <Sheet open={Boolean(house)} onClose={() => !saving && onClose()} labelledBy="vote-dialog-title" className="vote-dialog">
      {house && <VoteForm key={house.number} {...{ house, user, config, saving, setSaving, onClose, onSaved }} />}
    </Sheet>
  );
}

export default VoteSheet;
