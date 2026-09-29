import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { GoogleLogoIcon, MagnifyingGlassIcon, SignOutIcon } from '@phosphor-icons/react';
import BackHomeLink from '../components/BackHomeLink.jsx';
import PumpkinRating from '../components/PumpkinRating.jsx';
import MyVotes from '../components/MyVotes.jsx';
import Sheet from '../components/Sheet.jsx';
import { db } from '../firebase.js';
import { loginWithGoogle, logout, useAuthUser } from '../auth.js';
import { useAppConfig, useHouses, voteId } from '../data.js';

function Vote() {
  const user = useAuthUser();
  const config = useAppConfig();
  const { edition } = config;
  const { houses, loading: loadingHouses, error: housesError } = useHouses(edition);
  const [votes, setVotes] = useState([]);
  const [loadingVotes, setLoadingVotes] = useState(false);
  const [error, setError] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const [modalState, setModalState] = useState({ open: false, house: null, score: 0 });
  const [savingVote, setSavingVote] = useState(false);
  const [savedHouse, setSavedHouse] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!user) {
      setVotes([]);
      setLoadingVotes(false);
      return undefined;
    }

    setLoadingVotes(true);
    const votesQuery = query(
      collection(db, 'votes'),
      where('userId', '==', user.uid),
      where('edition', '==', edition),
    );
    return onSnapshot(
      votesQuery,
      (snapshot) => {
        setVotes(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
        setLoadingVotes(false);
      },
      (err) => {
        console.error('Errore caricando i voti', err);
        setLoadingVotes(false);
        setError('Impossibile recuperare i tuoi voti.');
      },
    );
  }, [user, edition]);

  const votesMap = useMemo(() => {
    const map = new Map();
    votes.forEach((vote) => {
      map.set(vote.houseNumber, vote);
    });
    return map;
  }, [votes]);

  const totalVisible = houses.length;
  const totalRated = useMemo(() => {
    return houses.reduce((count, house) => {
      const vote = votesMap.get(house.number);
      return count + ((vote?.score || 0) >= 6 ? 1 : 0);
    }, 0);
  }, [houses, votesMap]);
  const progressPercent = totalVisible ? (totalRated / totalVisible) * 100 : 0;

  const handleLogin = async () => {
    setError(await loginWithGoogle());
  };

  const handleVoteChange = useCallback(
    async (houseNumber, score) => {
      if (!user) {
        setError('Per votare devi essere autenticato.');
        return false;
      }
      if (!config.votingOpen) {
        setError('Le votazioni sono attualmente chiuse.');
        return false;
      }

      const existing = votesMap.get(houseNumber);
      const voteRef = doc(db, 'votes', voteId(edition, user.uid, houseNumber));
      const parsedScore = Number(score);
      const sanitizedScore = Number.isFinite(parsedScore) ? parsedScore : 0;
      const clampedScore =
        sanitizedScore <= 0 ? 0 : Math.min(10, Math.max(6, sanitizedScore));
      const payload = {
        userId: user.uid,
        userName: user.displayName || '',
        houseNumber,
        score: clampedScore,
        edition,
        updatedAt: serverTimestamp(),
        createdAt: existing?.createdAt || serverTimestamp(),
      };

      try {
        await setDoc(voteRef, payload);
        setError('');
        return true;
      } catch (err) {
        console.error('Errore salvando il voto', err);
        setError('Impossibile salvare il voto, riprova più tardi.');
        return false;
      }
    },
    [config.votingOpen, edition, user, votesMap],
  );

  const openHouseModal = useCallback(
    (house) => {
      const existingScore = votesMap.get(house.number)?.score ?? 0;
      setModalState({ open: true, house, score: existingScore });
      setSearchMessage('');
    },
    [votesMap],
  );

  // Arrivo dalla mappa: /vote?casa=12 apre subito la casa (dopo il login).
  const requestedHouse = Number(searchParams.get('casa'));
  useEffect(() => {
    if (!user || loadingHouses || !requestedHouse) return;
    const house = houses.find((item) => item.number === requestedHouse);
    if (house) openHouseModal(house);
    else setSearchMessage(`Nessuna casa ${requestedHouse} trovata (forse è nascosta).`);
    setSearchParams({}, { replace: true });
  }, [user, loadingHouses, houses, requestedHouse, openHouseModal, setSearchParams]);

  const closeModal = () => {
    setModalState({ open: false, house: null, score: 0 });
    setSavingVote(false);
  };

  const updateModalScore = (score) => {
    setModalState((prev) => ({ ...prev, score }));
  };

  const handleHouseSelectFromList = useCallback(
    (houseNumber) => {
      const house = houses.find((item) => item.number === houseNumber);
      if (!house) return;
      openHouseModal(house);
    },
    [houses, openHouseModal],
  );

  const handleModalSubmit = async (event) => {
    event.preventDefault();
    if (!modalState.house) return;
    setSavingVote(true);
    const success = await handleVoteChange(modalState.house.number, modalState.score);
    setSavingVote(false);
    if (success) {
      setSavedHouse({ number: modalState.house.number, score: modalState.score });
      closeModal();
      // La prossima casa e' gia' pronta: campo numero vuoto (il dialog rimette il focus da dove eri).
      setSearchValue('');
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const trimmed = searchValue.trim();
    if (!trimmed) {
      setSearchMessage('Inserisci un numero di casa.');
      return;
    }
    const targetNumber = Number.parseInt(trimmed, 10);
    if (Number.isNaN(targetNumber)) {
      setSearchMessage('Inserisci un numero di casa valido.');
      return;
    }

    const house = houses.find((item) => item.number === targetNumber);
    if (!house) {
      setSearchMessage(`Nessuna casa ${targetNumber} trovata (forse è nascosta).`);
      return;
    }

    openHouseModal(house);
  };

  const shownError = error || housesError;

  return (
    <div className="app-shell app-shell--narrow vote-page">
      <BackHomeLink />
      <header className="page-head">
        <h1>Vota una casa</h1>
        {config.loaded && (
          <p className="status-line" data-open={config.votingOpen}>
            <span className="status-bulb" aria-hidden="true" />
            {config.votingOpen
              ? 'Le votazioni sono aperte! Scegli le tue case preferite.'
              : 'Le votazioni sono chiuse, puoi comunque consultare i voti che hai espresso.'}
          </p>
        )}
      </header>

      {shownError && (
        <div className="notice notice--error" role="alert">
          <strong>Attenzione:</strong> {shownError}
        </div>
      )}

      {user === null && (
        <section className="panel login-panel">
          <h2>Accedi per votare</h2>
          <p>Usa il tuo account Google per esprimere i voti. Un voto per casa, modificabile finché le votazioni sono aperte.</p>
          <button type="button" className="primary-btn primary-btn--xl" onClick={handleLogin}>
            <GoogleLogoIcon aria-hidden="true" weight="bold" /> Accedi con Google
          </button>
        </section>
      )}

      {user && (
        <>
          <section className="panel vote-panel">
            <div className="vote-panel__who">
              <p>
                Ciao <strong>{user.displayName || 'Halloween lover'}</strong>
              </p>
              <button type="button" className="ghost-btn" onClick={logout}>
                <SignOutIcon aria-hidden="true" weight="bold" /> Esci
              </button>
            </div>

            <form className="search-bar" onSubmit={handleSearchSubmit}>
              <label htmlFor="house-search">Numero della casa</label>
              <div className="search-bar__row">
                <input
                  id="house-search"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  placeholder="Es. 12"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  disabled={loadingHouses}
                  enterKeyHint="go"
                />
                <button type="submit" className="primary-btn" disabled={loadingHouses}>
                  <MagnifyingGlassIcon aria-hidden="true" weight="bold" /> Cerca
                </button>
              </div>
            </form>
            {searchMessage && <p className="field-message" role="status">{searchMessage}</p>}

            <div className="vote-progress" role="group" aria-label="Progresso valutazioni">
              <p>
                Case valutate <strong>{totalRated}</strong> su {totalVisible || 'nessuna'}
              </p>
              <div
                className="bulb-string"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progressPercent)}
                aria-label={`${totalRated} case valutate su ${totalVisible}`}
              >
                {houses.map((house) => (
                  <span
                    key={house.id}
                    className="bulb"
                    data-lit={(votesMap.get(house.number)?.score || 0) >= 6}
                  />
                ))}
              </div>
            </div>
          </section>

          {savedHouse && (
            <p className="notice notice--saved" role="status" key={`${savedHouse.number}-${savedHouse.score}`}>
              Voto salvato: casa {savedHouse.number}, {savedHouse.score} su 10.
            </p>
          )}

          <MyVotes
            houses={houses}
            votesMap={votesMap}
            loading={loadingHouses}
            onHouseSelect={handleHouseSelectFromList}
            highlight={savedHouse?.number}
          />

          {loadingVotes && <p className="empty-state">Aggiornamento voti…</p>}
        </>
      )}

      <Sheet
        open={modalState.open && Boolean(modalState.house)}
        onClose={() => !savingVote && closeModal()}
        labelledBy="vote-dialog-title"
        className="vote-dialog"
      >
        {modalState.house && (
          <form onSubmit={handleModalSubmit}>
            <div className="vote-dialog-header">
              <span className="plate plate--lg" aria-hidden="true">
                {modalState.house.number}
              </span>
              <div className="vote-dialog-headings">
                <h2 id="vote-dialog-title">Casa {modalState.house.number}</h2>
                <p className="vote-dialog-house-title">{modalState.house.title || 'Senza titolo'}</p>
              </div>
            </div>
            <p className="vote-dialog-description">
              {modalState.house.description || 'Nessuna descrizione disponibile.'}
            </p>

            {!config.votingOpen && <p className="notice">Le votazioni sono chiuse al momento.</p>}

            <PumpkinRating
              label="Il tuo voto"
              value={modalState.score}
              onChange={updateModalScore}
              disabled={!config.votingOpen || savingVote}
            />

            <div className="dialog-actions">
              <button type="button" className="secondary-btn" onClick={closeModal} disabled={savingVote}>
                Annulla
              </button>
              <button
                type="submit"
                className="primary-btn"
                disabled={savingVote || !config.votingOpen || modalState.score < 6}
                data-busy={savingVote}
              >
                {savingVote ? 'Salvataggio…' : 'Salva voto'}
              </button>
            </div>
          </form>
        )}
      </Sheet>
    </div>
  );
}

export default Vote;
