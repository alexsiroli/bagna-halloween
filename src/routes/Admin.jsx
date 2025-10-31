import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase.js';

const emptyHouse = {
  number: '',
  title: '',
  description: '',
  visible: true,
};

function Admin() {
  const [config, setConfig] = useState({ votingOpen: false });
  const [houses, setHouses] = useState([]);
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalState, setModalState] = useState({ open: false, data: emptyHouse, mode: 'create' });
  const [saving, setSaving] = useState(false);
  const [sort, setSort] = useState({ field: 'houseNumber', direction: 'asc' });

  useEffect(() => {
    const configRef = doc(db, 'config', 'app');
    const unsubConfig = onSnapshot(
      configRef,
      (snapshot) => {
        const data = snapshot.data();
        setConfig(data || { votingOpen: false });
      },
      (err) => {
        console.error('Errore config admin', err);
        setError('Impossibile caricare la configurazione.');
      },
    );

    const housesRef = collection(db, 'houses');
    const housesQuery = query(housesRef, orderBy('number'));
    const unsubHouses = onSnapshot(
      housesQuery,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setHouses(list);
        setLoading(false);
      },
      (err) => {
        console.error('Errore case admin', err);
        setError('Impossibile caricare la lista case.');
        setLoading(false);
      },
    );

    const votesRef = collection(db, 'votes');
    const votesQuery = query(votesRef, orderBy('createdAt'));
    const unsubVotes = onSnapshot(
      votesQuery,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setVotes(list);
      },
      (err) => {
        console.error('Errore voti admin', err);
      },
    );

    return () => {
      unsubConfig();
      unsubHouses();
      unsubVotes();
    };
  }, []);

  const stats = useMemo(() => {
    const map = new Map();
    votes.forEach((vote) => {
      const entry = map.get(vote.houseNumber) || {
        houseNumber: vote.houseNumber,
        decorationSum: 0,
        showSum: 0,
        count: 0,
      };
      entry.decorationSum += vote.decorationVote || 0;
      entry.showSum += vote.showVote || 0;
      entry.count += 1;
      map.set(vote.houseNumber, entry);
    });

    return houses.map((house) => {
      const entry = map.get(house.number);
      const decorationAverage = entry ? entry.decorationSum / entry.count : 0;
      const showAverage = entry ? entry.showSum / entry.count : 0;
      return {
        houseNumber: house.number,
        title: house.title,
        decorationAverage,
        showAverage,
        count: entry ? entry.count : 0,
      };
    });
  }, [houses, votes]);

  const sortedStats = useMemo(() => {
    const sorted = [...stats];
    const { field, direction } = sort;
    sorted.sort((a, b) => {
      const valueA = a[field];
      const valueB = b[field];
      if (valueA === valueB) return 0;
      if (direction === 'asc') {
        return valueA > valueB ? 1 : -1;
      }
      return valueA < valueB ? 1 : -1;
    });
    return sorted;
  }, [stats, sort]);

  const votesBySlot = useMemo(() => {
    const slots = new Map();
    votes.forEach((vote) => {
      const createdAt = vote.createdAt?.toDate ? vote.createdAt.toDate() : null;
      if (!createdAt) return;
      const bucketMinutes = Math.floor(createdAt.getMinutes() / 10) * 10;
      const slotStart = new Date(createdAt);
      slotStart.setMinutes(bucketMinutes, 0, 0);
      const key = slotStart.toISOString();
      const slot = slots.get(key) || { start: new Date(slotStart), count: 0 };
      slot.count += 1;
      slots.set(key, slot);
    });

    const series = [...slots.values()].sort((a, b) => a.start - b.start);
    return series;
  }, [votes]);

  const maxVotesInSlot = votesBySlot.reduce((max, slot) => Math.max(max, slot.count), 0);

  const openCreateHouse = () => {
    setModalState({ open: true, data: emptyHouse, mode: 'create' });
    setError('');
  };

  const openEditHouse = (house) => {
    setModalState({
      open: true,
      data: {
        number: house.number,
        title: house.title || '',
        description: house.description || '',
        visible: house.visible !== false,
      },
      mode: 'edit',
    });
    setError('');
  };

  const closeModal = () => {
    setModalState({ open: false, data: emptyHouse, mode: 'create' });
  };

  const handleHouseSubmit = async (event) => {
    event.preventDefault();
    const form = modalState.data;
    const numericNumber = Number.parseInt(form.number, 10);
    if (Number.isNaN(numericNumber)) {
      setError('Il numero casa deve essere un intero.');
      return;
    }

    const houseRef = doc(db, 'houses', String(numericNumber));
    const payload = {
      number: numericNumber,
      title: form.title || '',
      description: form.description || '',
      visible: form.visible !== false,
      updatedAt: serverTimestamp(),
    };
    if (modalState.mode === 'create') {
      payload.createdAt = serverTimestamp();
    }

    try {
      setSaving(true);
      await setDoc(houseRef, payload, { merge: modalState.mode === 'edit' });
      setSaving(false);
      closeModal();
    } catch (err) {
      console.error('Errore salvataggio casa', err);
      setSaving(false);
      setError('Impossibile salvare la casa.');
    }
  };

  const toggleVisibility = async (house) => {
    try {
      await updateDoc(doc(db, 'houses', house.id), {
        visible: !house.visible,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Errore toggle visibilità', err);
      setError('Impossibile aggiornare la visibilità.');
    }
  };

  const toggleVotingState = async () => {
    try {
      await setDoc(
        doc(db, 'config', 'app'),
        {
          votingOpen: !config.votingOpen,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (err) {
      console.error('Errore aggiornando stato votazioni', err);
      setError('Impossibile aggiornare lo stato delle votazioni.');
    }
  };

  const updateSort = (field) => {
    setSort((prev) => {
      if (prev.field === field) {
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { field, direction: 'desc' };
    });
  };

  const formatSlot = (date) => {
    const end = new Date(date);
    end.setMinutes(end.getMinutes() + 10);
    const formatter = new Intl.DateTimeFormat('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${formatter.format(date)} – ${formatter.format(end)}`;
  };

  return (
    <div className="app-shell">
      <header>
        <p className="badge">Area admin</p>
        <h1>Halloween Houses – Admin</h1>
        <p>Gestisci case, stato delle votazioni e monitora le statistiche in tempo reale.</p>
      </header>

      {error && (
        <div className="card" role="alert">
          <strong>Attenzione:</strong> {error}
        </div>
      )}

      {loading && <p className="empty-state">Caricamento dati…</p>}

      <div className="admin-grid">
        <section className="card">
          <div className="house-header">
            <div>
              <h3>Stato votazioni</h3>
              <p>Toggle rapido per attivare o sospendere i voti degli utenti.</p>
            </div>
            <button type="button" className="primary-btn" onClick={toggleVotingState}>
              {config.votingOpen ? 'Metti in pausa' : 'Apri votazioni'}
            </button>
          </div>
          <p>
            Stato attuale:{' '}
            <span className="inline-status">
              {config.votingOpen ? 'Aperte 🎃' : 'Chiuse 🕯️'}
            </span>
          </p>
        </section>

        <section className="card">
          <div className="house-header">
            <h3>Gestione case</h3>
            <button type="button" className="primary-btn" onClick={openCreateHouse}>
              Aggiungi casa
            </button>
          </div>

          <div className="house-list">
            {houses.map((house) => (
              <div key={house.id} className="house-card">
                <div className="house-header">
                  <h3>
                    Casa {house.number} – {house.title || 'Senza titolo'}
                  </h3>
                  <span className="inline-status">
                    {house.visible !== false ? 'Visibile' : 'Nascosta'}
                  </span>
                </div>
                <p>{house.description || 'Nessuna descrizione.'}</p>
                <div className="admin-actions">
                  <button type="button" className="secondary-btn" onClick={() => openEditHouse(house)}>
                    Modifica
                  </button>
                  <button type="button" className="secondary-btn" onClick={() => toggleVisibility(house)}>
                    {house.visible !== false ? 'Nascondi' : 'Mostra'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h3>Statistiche voti</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th onClick={() => updateSort('houseNumber')}>Casa</th>
                <th onClick={() => updateSort('decorationAverage')}>Media addobbi</th>
                <th onClick={() => updateSort('showAverage')}>Media spettacoli</th>
                <th onClick={() => updateSort('count')}># Voti</th>
              </tr>
            </thead>
            <tbody>
              {sortedStats.map((row) => (
                <tr key={row.houseNumber}>
                  <td>
                    {row.houseNumber}{' '}
                    {row.title ? (
                      <span style={{ color: '#bca9ff', fontSize: '0.85rem' }}>– {row.title}</span>
                    ) : null}
                  </td>
                  <td>{row.count ? row.decorationAverage.toFixed(2) : '—'}</td>
                  <td>{row.count ? row.showAverage.toFixed(2) : '—'}</td>
                  <td>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h3>Flusso voti nel tempo (slot da 10 minuti)</h3>
          {votesBySlot.length === 0 ? (
            <p className="empty-state">Nessun voto registrato finora.</p>
          ) : (
            <div className="chart-grid">
              {votesBySlot.map((slot) => (
                <div key={slot.start.toISOString()} className="chart-row">
                  <strong>{formatSlot(slot.start)}</strong>
                  <div className="chart-bar" aria-hidden="true">
                    <span
                      style={{
                        width: maxVotesInSlot ? `${(slot.count / maxVotesInSlot) * 100}%` : '0%',
                      }}
                    />
                  </div>
                  <small>{slot.count} voti</small>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {modalState.open && (
        <div className="dialog-backdrop" role="dialog" aria-modal="true">
          <form className="dialog-card" onSubmit={handleHouseSubmit}>
            <h3>{modalState.mode === 'create' ? 'Nuova casa' : 'Modifica casa'}</h3>
            <label htmlFor="house-number">Numero</label>
            <input
              id="house-number"
              type="number"
              required
              value={modalState.data.number}
              onChange={(event) =>
                setModalState((prev) => ({
                  ...prev,
                  data: { ...prev.data, number: event.target.value },
                }))
              }
              disabled={modalState.mode === 'edit'}
            />

            <label htmlFor="house-title">Titolo</label>
            <input
              id="house-title"
              type="text"
              value={modalState.data.title}
              onChange={(event) =>
                setModalState((prev) => ({
                  ...prev,
                  data: { ...prev.data, title: event.target.value },
                }))
              }
            />

            <label htmlFor="house-description">Descrizione</label>
            <textarea
              id="house-description"
              value={modalState.data.description}
              onChange={(event) =>
                setModalState((prev) => ({
                  ...prev,
                  data: { ...prev.data, description: event.target.value },
                }))
              }
            />

            <label htmlFor="house-visible">Visibile</label>
            <select
              id="house-visible"
              value={modalState.data.visible ? 'true' : 'false'}
              onChange={(event) =>
                setModalState((prev) => ({
                  ...prev,
                  data: { ...prev.data, visible: event.target.value === 'true' },
                }))
              }
            >
              <option value="true">Visibile</option>
              <option value="false">Nascosta</option>
            </select>

            <div className="dialog-actions">
              <button type="button" className="secondary-btn" onClick={closeModal}>
                Annulla
              </button>
              <button type="submit" className="primary-btn" disabled={saving}>
                {saving ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Admin;
