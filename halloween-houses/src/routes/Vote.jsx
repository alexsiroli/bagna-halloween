import { useEffect, useMemo, useState } from 'react';
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
import HouseCard from '../components/HouseCard.jsx';
import MyVotes from '../components/MyVotes.jsx';
import { auth, provider, db } from '../firebase.js';

const filters = [
  { id: 'all', label: 'Tutte' },
  { id: 'rated', label: 'Solo votate' },
  { id: 'unrated', label: 'Non votate' },
];

function Vote() {
  const [user, setUser] = useState(null);
  const [houses, setHouses] = useState([]);
  const [votes, setVotes] = useState([]);
  const [config, setConfig] = useState({ votingOpen: true });
  const [loadingHouses, setLoadingHouses] = useState(true);
  const [loadingVotes, setLoadingVotes] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [searchMessage, setSearchMessage] = useState('');

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

  const filteredHouses = useMemo(() => {
    if (filter === 'rated') {
      return houses.filter((house) => {
        const vote = votesMap.get(house.number);
        return (vote?.decorationVote || 0) > 0 || (vote?.showVote || 0) > 0;
      });
    }
    if (filter === 'unrated') {
      return houses.filter((house) => {
        const vote = votesMap.get(house.number);
        return !vote || ((vote.decorationVote || 0) === 0 && (vote.showVote || 0) === 0);
      });
    }
    return houses;
  }, [filter, houses, votesMap]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Login fallito', err);
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

  const handleVoteChange = async (houseNumber, partialVote) => {
    if (!user) {
      setError('Per votare devi essere autenticato.');
      return;
    }
    if (!config.votingOpen) {
      setError('Le votazioni sono attualmente chiuse.');
      return;
    }

    const existing = votesMap.get(houseNumber);
    const voteRef = doc(db, 'votes', `${user.uid}_${houseNumber}`);
    const payload = {
      userId: user.uid,
      userName: user.displayName || '',
      houseNumber,
      decorationVote: partialVote.decorationVote || 0,
      showVote: partialVote.showVote || 0,
      updatedAt: serverTimestamp(),
      createdAt: existing?.createdAt || serverTimestamp(),
    };

    try {
      await setDoc(voteRef, payload);
      setError('');
    } catch (err) {
      console.error('Errore salvando il voto', err);
      setError('Impossibile salvare il voto, riprova più tardi.');
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const trimmed = searchValue.trim();
    if (!trimmed) {
      setSearchMessage('');
      return;
    }
    const targetNumber = Number.parseInt(trimmed, 10);
    if (Number.isNaN(targetNumber)) {
      setSearchMessage('Inserisci un numero di casa valido.');
      return;
    }

    const exists = houses.some((house) => house.number === targetNumber);
    if (!exists) {
      setSearchMessage(`Nessuna casa ${targetNumber} trovata (forse è nascosta).`);
      return;
    }

    if (filter !== 'all') {
      setFilter('all');
    }

    requestAnimationFrame(() => {
      const element = document.getElementById(`house-${targetNumber}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        element.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.02)' }, { transform: 'scale(1)' }], {
          duration: 400,
        });
        setSearchMessage(`Casa ${targetNumber} trovata.`);
      } else {
        setSearchMessage(`Nessuna casa ${targetNumber} trovata (forse è nascosta).`);
      }
    });
  };

  const totalVisible = houses.length;
  const totalVoted = votes.filter(
    (vote) => (vote.decorationVote || 0) > 0 || (vote.showVote || 0) > 0,
  ).length;

  return (
    <div className="app-shell">
      <header>
        <p className="badge">Sezione voto</p>
        <h1>Vota una casa</h1>
        <p>
          {config.votingOpen ? 'Le votazioni sono aperte! Scegli le tue case preferite.' : 'Le votazioni sono chiuse, puoi comunque consultare i voti che hai espresso.'}
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
                  Case visibili: {totalVisible} · Case votate: {totalVoted}
                </p>
              </div>
              <button type="button" className="secondary-btn" onClick={handleLogout}>
                Esci
              </button>
            </div>

            <form className="search-bar" onSubmit={handleSearchSubmit}>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Inserisci numero casa"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
              <button type="submit" className="primary-btn">
                Cerca
              </button>
            </form>
            {searchMessage && <p>{searchMessage}</p>}

            <div className="admin-actions" style={{ marginTop: '1rem' }}>
              {filters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="secondary-btn"
                  onClick={() => setFilter(item.id)}
                  aria-pressed={filter === item.id}
                  style={
                    filter === item.id
                      ? { borderColor: 'rgba(255, 183, 110, 0.85)', background: 'rgba(255, 123, 0, 0.12)' }
                      : undefined
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {loadingHouses && <p className="empty-state">Caricamento case in corso…</p>}
          {!loadingHouses && filteredHouses.length === 0 && (
            <p className="empty-state">Nessuna casa disponibile con questo filtro.</p>
          )}

          <div className="house-list">
            {filteredHouses.map((house) => (
              <HouseCard
                key={house.id || house.number}
                house={house}
                vote={votesMap.get(house.number)}
                votingOpen={config.votingOpen}
                onVoteChange={handleVoteChange}
              />
            ))}
          </div>

          <MyVotes votes={votes} houses={houses} />

          {loadingVotes && <p className="empty-state">Aggiornamento voti…</p>}
        </>
      )}
    </div>
  );
}

export default Vote;
