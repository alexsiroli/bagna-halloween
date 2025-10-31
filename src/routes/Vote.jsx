import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import BackHomeLink from '../components/BackHomeLink.jsx';
import PumpkinRating from '../components/PumpkinRating.jsx';
import MyVotes from '../components/MyVotes.jsx';
import { auth, provider, db } from '../firebase.js';

function Vote() {
  const [user, setUser] = useState(null);
  const [houses, setHouses] = useState([]);
  const [votes, setVotes] = useState([]);
  const [config, setConfig] = useState({ votingOpen: true });
  const [loadingHouses, setLoadingHouses] = useState(true);
  const [loadingVotes, setLoadingVotes] = useState(false);
  const [error, setError] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const [modalState, setModalState] = useState({ open: false, house: null, score: 0 });
  const [savingVote, setSavingVote] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (err) {
        console.warn('Impossibile impostare la persistenza del login', err);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setError('');
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const housesRef = collection(db, 'houses');
    const unsubscribeHouses = onSnapshot(
      housesRef,
      (snapshot) => {
        const items = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((item) => item.visible !== false)
          .sort((a, b) => a.number - b.number);
        setHouses(items);
        setLoadingHouses(false);
      },
      (err) => {
        console.error('Errore caricando le case', err);
        setLoadingHouses(false);
        setError('Impossibile caricare le case, riprova più tardi.');
      },
    );

    const configRef = doc(db, 'config', 'app');
    const unsubscribeConfig = onSnapshot(
      configRef,
      (snapshot) => {
        setConfig(snapshot.data() || { votingOpen: false });
      },
      (err) => {
        console.error('Errore caricando la configurazione', err);
        setConfig({ votingOpen: false });
      },
    );

    return () => {
      unsubscribeHouses();
      unsubscribeConfig();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setVotes([]);
      setLoadingVotes(false);
      return;
    }

    setLoadingVotes(true);
    const votesRef = collection(db, 'votes');
    const votesQuery = query(votesRef, where('userId', '==', user.uid));
    const unsubscribeVotes = onSnapshot(
      votesQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setVotes(items);
        setLoadingVotes(false);
      },
      (err) => {
        console.error('Errore caricando i voti', err);
        setLoadingVotes(false);
        setError('Impossibile recuperare i tuoi voti.');
      },
    );

    return () => unsubscribeVotes();
  }, [user]);

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
    try {
      if (typeof window !== 'undefined') {
        const probeKey = '__firebase_auth_probe__';
        try {
          window.sessionStorage.setItem(probeKey, '1');
          window.sessionStorage.removeItem(probeKey);
        } catch (storageErr) {
          setError(
            'Per accedere con Google devi aprire il sito nel browser di sistema e consentire i cookie.',
          );
          console.warn('SessionStorage non disponibile per autenticazione', storageErr);
          return;
        }
      }
    } catch (probeErr) {
      console.warn('Errore durante la verifica del browser prima del login', probeErr);
    }

    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Login fallito', err);
      if (err?.message?.includes('missing initial state')) {
        setError(
          'Il browser sta bloccando la pagina di login di Google. Apri il sito nel browser di sistema e abilita i cookie, poi riprova.',
        );
        return;
      }
      setError('Accesso non riuscito, riprova.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout fallito', err);
    }
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
      const voteRef = doc(db, 'votes', `${user.uid}_${houseNumber}`);
      const parsedScore = Number(score);
      const sanitizedScore = Number.isFinite(parsedScore) ? parsedScore : 0;
      const clampedScore =
        sanitizedScore <= 0 ? 0 : Math.min(10, Math.max(6, sanitizedScore));
      const payload = {
        userId: user.uid,
        userName: user.displayName || '',
        houseNumber,
        score: clampedScore,
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
    [config.votingOpen, user, votesMap],
  );

  const openHouseModal = useCallback(
    (house) => {
      const existingScore = votesMap.get(house.number)?.score ?? 0;
      setModalState({ open: true, house, score: existingScore });
      setSearchMessage('');
    },
    [votesMap],
  );

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
      closeModal();
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

  return (
    <div className="app-shell vote-page">
      <BackHomeLink />
      <header>
        <p className="badge">Sezione voto</p>
        <h1>Vota una casa</h1>
        <p>
          {config.votingOpen
            ? 'Le votazioni sono aperte! Scegli le tue case preferite.'
            : 'Le votazioni sono chiuse, puoi comunque consultare i voti che hai espresso.'}
        </p>
      </header>

      {error && (
        <div className="card" role="alert">
          <strong>Attenzione:</strong> {error}
        </div>
      )}

      {!user && (
        <div className="card">
          <h2>Accedi per votare</h2>
          <p>Usa il tuo account Google per esprimere i voti.</p>
          <button type="button" className="primary-btn" onClick={handleLogin}>
            Accedi con Google
          </button>
        </div>
      )}

      {user && (
        <>
          <div className="card">
            <div className="house-header">
              <div>
                <strong>Ciao {user.displayName || 'Halloween lover'}!</strong>
                <p>
                  Case visibili: {totalVisible} · Case valutate: {totalRated}
                </p>
              </div>
              <button type="button" className="secondary-btn" onClick={handleLogout}>
                Esci
              </button>
            </div>

            <form className="search-bar search-bar--large" onSubmit={handleSearchSubmit}>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Inserisci numero casa"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                disabled={loadingHouses}
              />
              <button type="submit" className="primary-btn" disabled={loadingHouses}>
                Cerca
              </button>
            </form>
            {searchMessage && <p>{searchMessage}</p>}

            <div
              className="vote-progress"
              role="group"
              aria-label="Progresso valutazioni"
            >
              <p>
                Case valutate: {totalRated} / {totalVisible || '—'}
              </p>
              <div
                className="vote-progress-bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progressPercent)}
              >
                <span style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>

          <MyVotes
            houses={houses}
            votesMap={votesMap}
            loading={loadingHouses}
            onHouseSelect={handleHouseSelectFromList}
          />

          {loadingVotes && <p className="empty-state">Aggiornamento voti…</p>}
        </>
      )}

      {modalState.open && modalState.house && (
        <div className="dialog-backdrop" role="dialog" aria-modal="true">
          <form className="dialog-card vote-dialog" onSubmit={handleModalSubmit}>
            <div className="vote-dialog-header">
              <span className="vote-dialog-emoji" role="img" aria-hidden="true">
                🏠
              </span>
              <div className="vote-dialog-headings">
                <h3>Casa {modalState.house.number}</h3>
                <p className="vote-dialog-house-title">
                  {modalState.house.title || 'Senza titolo'}
                </p>
              </div>
            </div>
            <p className="vote-dialog-description">
              {modalState.house.description || 'Nessuna descrizione disponibile.'}
            </p>

            {!config.votingOpen && (
              <p className="empty-state" style={{ margin: 0 }}>
                Le votazioni sono chiuse al momento.
              </p>
            )}

            <PumpkinRating
              label="Seleziona un voto"
              value={modalState.score}
              onChange={updateModalScore}
              disabled={!config.votingOpen || savingVote}
            />

            <div className="dialog-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={closeModal}
                disabled={savingVote}
              >
                Annulla
              </button>
              <button
                type="submit"
                className="primary-btn"
                disabled={savingVote || !config.votingOpen || modalState.score < 6}
              >
                {savingVote ? 'Salvataggio…' : 'Salva voto'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Vote;
