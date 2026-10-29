import { useState } from 'react';
import Casetta from './Casetta.jsx';
import DirectionsLink from './DirectionsLink.jsx';
import { KindTag } from './MapGlyph.jsx';
import PumpkinRating from './PumpkinRating.jsx';
import Sheet from './Sheet.jsx';
import { GoogleSignInButton } from './SignIn.jsx';
import { loginWithGoogle } from '../auth.js';
import { deleteVote, houseAddress } from '../data.js';
import { isVoted, MIN_SCORE, saveVote, useMyVotes } from '../myVotes.js';

// Tag rosso delle votazioni chiuse: lo stesso in pagina e nella scheda.
export const ClosedTag = () => <p className="tag tag--closed">Votazioni chiuse</p>;

function VoteForm({ house, user, config, saving, setSaving, onClose, onSaved, onAskDelete }) {
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
        <Casetta number={house.number} lit={isVoted(current)} size="lg" />
        <div className="vote-dialog-headings">
          <h2 id="vote-dialog-title">Casa {house.number}</h2>
          <p className="vote-dialog-house-title">{house.title || 'Senza titolo'}</p>
        </div>
      </div>
      {(houseAddress(house) || house.kind || !config.votingOpen) && (
        <div className="vote-dialog-meta">
          {houseAddress(house) && <p className="map-dialog__address">{houseAddress(house)}</p>}
          <KindTag kind={house.kind} />
          {config.loaded && !config.votingOpen && <ClosedTag />}
        </div>
      )}
      {house.description && <p className="vote-dialog-description">{house.description}</p>}
      <DirectionsLink place={house} />

      {user ? (
        <PumpkinRating label="Il tuo voto" value={score} onChange={setPicked} disabled={!config.votingOpen || saving} />
      ) : (
        <GoogleSignInButton onClick={handleLogin} />
      )}
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}

      {user && config.votingOpen && current && (
        <button type="button" className="secondary-btn" onClick={onAskDelete} disabled={saving}>
          Cancella voto
        </button>
      )}

      <div className="dialog-actions">
        <button type="button" className="secondary-btn" onClick={onClose} disabled={saving}>
          {user && config.votingOpen ? 'Annulla' : 'Chiudi'}
        </button>
        {user && config.votingOpen && (
          <button type="submit" className="primary-btn" disabled={saving || score < MIN_SCORE} data-busy={saving}>
            {saving ? 'Salvataggio…' : 'Salva voto'}
          </button>
        )}
      </div>
    </form>
  );
}

// La scheda di voto di una casa, la stessa in /vote, /vota/<n> e /mappa (dalla PR #49). house = null: chiusa.
// onSaved({ number, score }) parte a voto scritto, onSaved({ number, deleted: true }) a voto cancellato;
// chiudere la scheda resta a chi la usa.
function VoteSheet({ house, user, config, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  // Conferma «Cancella voto»: null = chiusa, altrimenti { deleting, error }.
  const [confirm, setConfirm] = useState(null);

  const handleDelete = async () => {
    const { number } = house;
    setConfirm({ deleting: true, error: '' });
    try {
      await deleteVote(config.edition, user.uid, number);
    } catch (err) {
      console.error('Errore cancellando il voto', err);
      setConfirm({ deleting: false, error: 'Impossibile cancellare il voto, riprova più tardi.' });
      return;
    }
    setConfirm(null);
    onSaved({ number, deleted: true });
  };

  return (
    <>
      <Sheet open={Boolean(house)} onClose={() => !saving && onClose()} labelledBy="vote-dialog-title" className="vote-dialog">
        {house && (
          <VoteForm
            key={house.number}
            {...{ house, user, config, saving, setSaving, onClose, onSaved }}
            onAskDelete={() => setConfirm({ deleting: false, error: '' })}
          />
        )}
      </Sheet>
      <Sheet
        open={Boolean(confirm) && Boolean(house)}
        onClose={() => !confirm?.deleting && setConfirm(null)}
        labelledBy="delete-vote-title"
        className="vote-dialog"
      >
        {confirm && house && (
          <div>
            <h2 id="delete-vote-title">Vuoi cancellare il tuo voto per la casa {house.number}?</h2>
            {confirm.error && (
              <p className="notice notice--error" role="alert">
                {confirm.error}
              </p>
            )}
            <div className="dialog-actions">
              <button type="button" className="secondary-btn" autoFocus onClick={() => setConfirm(null)} disabled={confirm.deleting}>
                Annulla
              </button>
              <button type="button" className="primary-btn" onClick={handleDelete} disabled={confirm.deleting} data-busy={confirm.deleting}>
                {confirm.deleting ? 'Cancellazione…' : 'Cancella'}
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}

export default VoteSheet;
