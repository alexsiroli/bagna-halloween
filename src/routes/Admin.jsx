import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { CaretDownIcon, CaretUpIcon, EyeIcon, EyeSlashIcon, PencilSimpleIcon, PlusIcon, SignOutIcon, TrophyIcon } from '@phosphor-icons/react';
import AdminEmails from '../components/AdminEmails.jsx';
import HouseMap from '../components/HouseMap.jsx';
import Sheet from '../components/Sheet.jsx';
import { db } from '../firebase.js';
import { logout } from '../auth.js';
import { hasPosition, houseAddress, houseId, useAppConfig, useHouses } from '../data.js';
import { isKind, KIND_LABELS } from '../mapKinds.js';
import { editionOf, positions, sortStats, topThree } from '../podium.js';
import { dateToRome, formatEnd, romeToDate } from '../votingTime.js';

const emptyHouse = {
  id: null,
  number: '',
  title: '',
  description: '',
  street: '',
  civic: '',
  kind: '',
  visible: true,
  lat: '',
  lng: '',
};

const POSITION_ERROR = 'Posizione incompleta: compila latitudine e longitudine, oppure lasciale vuote entrambe.';

const SORT_LABELS = { houseNumber: 'Casa', scoreAverage: 'Media voto', count: 'Voti' };

function Admin({ user }) {
  const config = useAppConfig();
  const { edition } = config;
  const { houses, loading, error: housesError } = useHouses(edition, { includeHidden: true });
  const [votes, setVotes] = useState([]);
  const [error, setError] = useState('');
  const [modalState, setModalState] = useState({ open: false, data: emptyHouse, mode: 'create' });
  const [saving, setSaving] = useState(false);
  // Albo d'oro: edizione scelta (default la corrente) e relativa top 3 pubblicata (undefined = in lettura).
  const [albumYear, setAlbumYear] = useState(null);
  const year = albumYear ?? edition;
  const years = Array.from({ length: Math.max(edition - 2025, 0) + 1 }, (_, i) => edition - i);
  const [published, setPublished] = useState(undefined);
  const [albumBusy, setAlbumBusy] = useState(false);
  const [albumNote, setAlbumNote] = useState('');
  useEffect(() => {
    setPublished(undefined);
    return onSnapshot(
      doc(db, 'results', String(year)),
      (snapshot) => setPublished(snapshot.data() ?? null),
      (err) => {
        console.error('Errore albo admin', err);
        setPublished(null);
        setError('Impossibile leggere l’albo d’oro.');
      },
    );
  }, [year]);
  const [sort, setSort] = useState({ field: 'scoreAverage', direction: 'desc' });
  // Campo dell'orario di fine: si allinea al valore salvato quando cambia.
  const endsMs = config.votingEndsAt?.getTime();
  const [endInput, setEndInput] = useState('');
  useEffect(() => setEndInput(endsMs ? dateToRome(new Date(endsMs)) : ''), [endsMs]);
  const endPassed = endsMs <= Date.now();
  const voters = useMemo(() => new Set(votes.map((vote) => vote.userId)).size, [votes]);

  useEffect(() => {
    // Nessun orderBy: con il filtro per edizione servirebbe un indice composto. Si ordina qui.
    const votesQuery = query(collection(db, 'votes'), where('edition', '==', edition));
    return onSnapshot(
      votesQuery,
      (snapshot) => {
        setVotes(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      },
      (err) => {
        console.error('Errore voti admin', err);
        setError('Impossibile caricare i voti.');
      },
    );
  }, [edition]);

  const stats = useMemo(() => {
    const map = new Map();
    votes.forEach((vote) => {
      const numericScore = Number(vote.score) || 0;
      if (numericScore < 6) {
        return;
      }
      const entry = map.get(vote.houseNumber) || {
        houseNumber: vote.houseNumber,
        scoreSum: 0,
        count: 0,
      };
      entry.scoreSum += numericScore;
      entry.count += 1;
      map.set(vote.houseNumber, entry);
    });

    return houses.map((house) => {
      const entry = map.get(house.number);
      const scoreAverage =
        entry && entry.count > 0 ? entry.scoreSum / entry.count : 0;
      return {
        houseNumber: house.number,
        title: house.title,
        scoreAverage,
        count: entry ? entry.count : 0,
      };
    });
  }, [houses, votes]);

  const sortedStats = useMemo(() => sortStats(stats, sort), [stats, sort]);
  const places = useMemo(() => positions(stats), [stats]);

  const votesBySlot = useMemo(() => {
    const slots = new Map();
    votes.forEach((vote) => {
      const numericScore = Number(vote.score) || 0;
      if (numericScore < 6) {
        return;
      }
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
  const totalVotes = votesBySlot.reduce((sum, slot) => sum + slot.count, 0);

  // Il selettore si apre sulla casa in modifica se e' posizionata, altrimenti sulle case gia' posizionate.
  const startPoints = (house) => (house && hasPosition(house) ? [house] : houses.filter(hasPosition));

  const openCreateHouse = () => {
    setModalState({ open: true, data: emptyHouse, mode: 'create', startAt: startPoints() });
    setError('');
  };

  const openEditHouse = (house) => {
    setModalState({
      open: true,
      data: {
        id: house.id,
        number: house.number,
        title: house.title || '',
        description: house.description || '',
        street: house.street || '',
        civic: house.civic || '',
        kind: isKind(house.kind) ? house.kind : '',
        visible: house.visible !== false,
        lat: Number.isFinite(house.lat) ? house.lat : '',
        lng: Number.isFinite(house.lng) ? house.lng : '',
      },
      mode: 'edit',
      startAt: startPoints(house),
    });
    setError('');
  };

  const closeModal = () => {
    setModalState({ open: false, data: emptyHouse, mode: 'create' });
  };

  const updateForm = (patch) => {
    setError((current) => (current === POSITION_ERROR ? '' : current));
    setModalState((prev) => ({ ...prev, data: { ...prev.data, ...patch } }));
  };

  const handleHouseSubmit = async (event) => {
    event.preventDefault();
    const form = modalState.data;
    const numericNumber = Number.parseInt(form.number, 10);
    if (Number.isNaN(numericNumber)) {
      setError('Il numero casa deve essere un intero.');
      return;
    }
    if (modalState.mode === 'create' && houses.some((house) => house.number === numericNumber)) {
      setError(`La casa ${numericNumber} esiste già: usa "Modifica".`);
      return;
    }

    const houseRef = doc(
      db,
      'houses',
      modalState.mode === 'edit' ? form.id : houseId(edition, numericNumber),
    );
    const lat = Number.parseFloat(form.lat);
    const lng = Number.parseFloat(form.lng);
    if (Number.isFinite(lat) !== Number.isFinite(lng)) {
      setError(POSITION_ERROR);
      return;
    }
    const placed = Number.isFinite(lat) && Number.isFinite(lng);
    const payload = {
      number: numericNumber,
      title: form.title || '',
      description: form.description || '',
      street: form.street.trim(),
      civic: form.civic.trim(),
      kind: form.kind,
      visible: form.visible !== false,
      edition,
      lat: placed ? lat : null,
      lng: placed ? lng : null,
      updatedAt: serverTimestamp(),
    };
    if (modalState.mode === 'create') {
      payload.createdAt = serverTimestamp();
    }

    try {
      setSaving(true);
      await setDoc(houseRef, payload, { merge: modalState.mode === 'edit' });
      setSaving(false);
      setError('');
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

  const writeApp = (patch) =>
    setDoc(doc(db, 'config', 'app'), { ...patch, updatedAt: serverTimestamp() }, { merge: true });

  // Si decide sullo stato effettivo; aprendo con l'orario gia' passato lo si toglie nella stessa scrittura.
  const toggleVotingState = async () => {
    try {
      await writeApp(
        config.votingOpen
          ? { votingOpen: false }
          : { votingOpen: true, ...(endPassed ? { votingEndsAt: deleteField() } : {}) },
      );
    } catch (err) {
      console.error('Errore aggiornando stato votazioni', err);
      setError('Impossibile aggiornare lo stato delle votazioni.');
    }
  };

  const saveEndTime = async (clear) => {
    const date = clear ? null : romeToDate(endInput);
    if (!clear && !date) {
      setError("Scegli data e ora di fine, oppure usa Cancella.");
      return;
    }
    try {
      await writeApp({ votingEndsAt: date ? Timestamp.fromDate(date) : deleteField() });
      setError('');
      if (clear) setEndInput('');
    } catch (err) {
      console.error('Errore salvando l’orario di fine', err);
      setError('Impossibile salvare l’orario di fine.');
    }
  };

  // I voti 2025 non hanno `edition` e le case 2025 stanno in `houses` con id senza prefisso:
  // si legge tutto una volta e si filtra con editionOf.
  const publishAlbum = async () => {
    setAlbumBusy(true);
    setAlbumNote('');
    try {
      const [houseSnap, voteSnap] = await Promise.all([getDocs(collection(db, 'houses')), getDocs(collection(db, 'votes'))]);
      const ofYear = (snap) => snap.docs.map((docSnap) => docSnap.data()).filter((data) => editionOf(data) === year);
      const top3 = topThree(ofYear(houseSnap), ofYear(voteSnap));
      if (top3.length === 0) {
        setAlbumNote(`Nessun voto per il ${year}.`);
        return;
      }
      await setDoc(doc(db, 'results', String(year)), { edition: year, top3, updatedAt: serverTimestamp() });
      setError('');
    } catch (err) {
      console.error('Errore pubblicando l’albo d’oro', err);
      setError('Impossibile pubblicare la classifica.');
    } finally {
      setAlbumBusy(false);
    }
  };

  const withdrawAlbum = async () => {
    try {
      await deleteDoc(doc(db, 'results', String(year)));
      setError('');
    } catch (err) {
      console.error('Errore ritirando la classifica', err);
      setError('Impossibile ritirare la classifica.');
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
    const formatter = new Intl.DateTimeFormat('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return formatter.format(date);
  };

  // Il selettore mostra solo il segnaposto della casa in modifica, nel punto scritto nei campi.
  const pickerHouses = useMemo(() => {
    const { number, title, lat, lng } = modalState.data;
    const point = { number: Number.parseInt(number, 10), title, lat: Number.parseFloat(lat), lng: Number.parseFloat(lng) };
    return hasPosition(point) ? [point] : [];
  }, [modalState.data]);

  const shownError = error || housesError;

  return (
    <div className="app-shell admin">
      <header className="admin-head">
        <div>
          <h1>Area admin</h1>
          <p>
            Edizione {edition}. Gestisci case, stato delle votazioni e monitora le statistiche in tempo reale.
          </p>
        </div>
        <div className="admin-head__user">
          <span>{user.email}</span>
          <button type="button" className="ghost-btn" onClick={logout}>
            <SignOutIcon aria-hidden="true" weight="bold" /> Esci
          </button>
        </div>
      </header>

      {shownError && !modalState.open && (
        <div className="notice notice--error" role="alert">
          <strong>Attenzione:</strong> {shownError}
        </div>
      )}

      {loading && <p className="empty-state">Caricamento dati…</p>}

      <div className="admin-grid">
        <section className="panel admin-switch" data-open={config.votingOpen}>
          <div>
            <h2>Stato votazioni</h2>
            <p className="status-line" data-open={config.votingOpen}>
              <span className="status-bulb" aria-hidden="true" />
              {config.votingOpen
                ? config.votingEndsAt
                  ? `Aperte fino alle ${formatEnd(config.votingEndsAt)}`
                  : 'Aperte: il paese sta votando.'
                : config.votingFlag && endPassed
                  ? 'Chiuse: orario di fine passato'
                  : 'Chiuse: nessuno può votare.'}
            </p>
            <div className="field end-time">
              <label htmlFor="voting-end">Orario di fine (ora di Roma)</label>
              <input
                id="voting-end"
                type="datetime-local"
                value={endInput}
                onChange={(event) => setEndInput(event.target.value)}
              />
              <div className="end-time__actions">
                <button type="button" className="secondary-btn" onClick={() => saveEndTime(false)}>
                  Salva orario
                </button>
                <button type="button" className="secondary-btn" onClick={() => saveEndTime(true)} disabled={!endsMs}>
                  Cancella
                </button>
              </div>
            </div>
          </div>
          <button type="button" className="primary-btn" onClick={toggleVotingState}>
            {config.votingOpen ? 'Metti in pausa' : 'Apri votazioni'}
          </button>
        </section>

        <section className="panel admin-switch" data-open={Boolean(published)}>
          <div>
            <h2>Albo d’oro</h2>
            <div className="field">
              <label htmlFor="album-year">Edizione</label>
              <select
                id="album-year"
                value={year}
                onChange={(event) => {
                  setAlbumYear(Number(event.target.value));
                  setAlbumNote('');
                }}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <p className="status-line" data-open={Boolean(published)}>
              <span className="status-bulb" aria-hidden="true" />
              {published
                ? `Pubblicata: ${published.top3.map((row, i) => `${i + 1}° casa ${row.number}`).join(', ')}.`
                : albumNote || `Non pubblicata per il ${year}.`}
            </p>
          </div>
          <button
            type="button"
            className={published ? 'secondary-btn' : 'primary-btn'}
            onClick={published ? withdrawAlbum : publishAlbum}
            disabled={published === undefined || albumBusy}
          >
            <TrophyIcon aria-hidden="true" weight="bold" />
            {published ? 'Ritira' : 'Pubblica classifica'}
          </button>
        </section>

        <section className="panel admin-houses">
          <div className="panel-head">
            <h2>Gestione case</h2>
            <button type="button" className="primary-btn" onClick={openCreateHouse}>
              <PlusIcon aria-hidden="true" weight="bold" /> Aggiungi casa
            </button>
          </div>

          {houses.length === 0 && !loading && (
            <p className="empty-state">Nessuna casa per l’edizione {edition}. Aggiungi la prima.</p>
          )}
          <div className="house-list">
            {houses.map((house) => (
              <article key={house.id} className="house-row" data-hidden={house.visible === false}>
                <span className="plate" aria-hidden="true">
                  {house.number}
                </span>
                <div className="house-row__text">
                  <h3>
                    Casa {house.number}: {house.title || 'Senza titolo'}
                  </h3>
                  <p>
                    {houseAddress(house) ? `${houseAddress(house)} · ` : ''}
                    {house.visible !== false ? 'Visibile' : 'Nascosta'}
                    {' · '}
                    {hasPosition(house) ? 'sulla mappa' : 'da posizionare sulla mappa'}
                  </p>
                </div>
                <div className="admin-actions">
                  <button type="button" className="icon-btn" onClick={() => openEditHouse(house)} aria-label={`Modifica casa ${house.number}`}>
                    <PencilSimpleIcon aria-hidden="true" weight="bold" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => toggleVisibility(house)}
                    aria-label={`${house.visible !== false ? 'Nascondi' : 'Mostra'} casa ${house.number}`}
                  >
                    {house.visible !== false ? (
                      <EyeSlashIcon aria-hidden="true" weight="bold" />
                    ) : (
                      <EyeIcon aria-hidden="true" weight="bold" />
                    )}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel admin-stats">
          <h2>Classifica provvisoria</h2>
          <p className="muted">
            Votazioni totali: <strong>{votes.length}</strong>
          </p>
          <p className="muted">
            Account che hanno votato: <strong>{voters}</strong>
          </p>
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Pos.</th>
                  {Object.entries(SORT_LABELS).map(([field, label]) => (
                    <th
                      key={field}
                      scope="col"
                      aria-sort={
                        sort.field === field ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
                      }
                    >
                      <button type="button" className="sort-btn" onClick={() => updateSort(field)}>
                        {label}
                        {sort.field === field &&
                          (sort.direction === 'asc' ? (
                            <CaretUpIcon aria-hidden="true" weight="bold" />
                          ) : (
                            <CaretDownIcon aria-hidden="true" weight="bold" />
                          ))}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedStats.map((row) => (
                  <tr key={row.houseNumber}>
                    <td className="admin-table__figure">{places.has(row.houseNumber) ? `${places.get(row.houseNumber)}°` : '—'}</td>
                    <td>
                      <span className="admin-table__num">{row.houseNumber}</span>
                      {row.title ? <span className="admin-table__title">{row.title}</span> : null}
                    </td>
                    <td className="admin-table__figure">{row.count ? row.scoreAverage.toFixed(2) : 'n.d.'}</td>
                    <td className="admin-table__figure">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel admin-chart">
          <h2>Flusso voti nel tempo</h2>
          <p className="muted">Fasce da 10 minuti, {totalVotes} voti in tutto.</p>
          {votesBySlot.length === 0 ? (
            <p className="empty-state">Nessun voto registrato finora.</p>
          ) : (
            <ol className="chart-bands">
              {votesBySlot.map((slot, index) => (
                <li key={slot.start.toISOString()} className="chart-band" style={{ '--i': index }}>
                  <time dateTime={slot.start.toISOString()}>{formatSlot(slot.start)}</time>
                  <span className="chart-band__bar" aria-hidden="true">
                    <span
                      style={{
                        '--fill': maxVotesInSlot ? slot.count / maxVotesInSlot : 0,
                      }}
                    />
                  </span>
                  <span className="chart-band__count">
                    {slot.count} <span className="sr-only">voti</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <AdminEmails user={user} />
      </div>

      <Sheet open={modalState.open} onClose={() => !saving && closeModal()} labelledBy="house-dialog-title" className="house-dialog">
        <form className="house-form" onSubmit={handleHouseSubmit}>
          <h2 id="house-dialog-title">{modalState.mode === 'create' ? 'Nuova casa' : `Modifica casa ${modalState.data.number}`}</h2>

          <div className="house-form__grid">
            <div className="field">
              <label htmlFor="house-number">Numero</label>
              <input
                id="house-number"
                type="number"
                inputMode="numeric"
                required
                value={modalState.data.number}
                onChange={(event) => updateForm({ number: event.target.value })}
                disabled={modalState.mode === 'edit'}
              />
            </div>
            <div className="field">
              <label htmlFor="house-visible">Visibile</label>
              <select
                id="house-visible"
                value={modalState.data.visible ? 'true' : 'false'}
                onChange={(event) => updateForm({ visible: event.target.value === 'true' })}
              >
                <option value="true">Visibile</option>
                <option value="false">Nascosta</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="house-title">Titolo</label>
            <input
              id="house-title"
              type="text"
              value={modalState.data.title}
              onChange={(event) => updateForm({ title: event.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="house-kind">Tipo</label>
            <select id="house-kind" value={modalState.data.kind} onChange={(event) => updateForm({ kind: event.target.value })}>
              <option value="">—</option>
              {Object.entries(KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="house-description">Descrizione</label>
            <textarea
              id="house-description"
              value={modalState.data.description}
              onChange={(event) => updateForm({ description: event.target.value })}
            />
          </div>

          <div className="house-form__grid house-form__grid--address">
            <div className="field">
              <label htmlFor="house-street">Via</label>
              <input
                id="house-street"
                type="text"
                value={modalState.data.street}
                onChange={(event) => updateForm({ street: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="house-civic">Civico</label>
              <input
                id="house-civic"
                type="text"
                value={modalState.data.civic}
                onChange={(event) => updateForm({ civic: event.target.value })}
              />
            </div>
          </div>

          <fieldset className="field house-form__map">
            <legend>Posizione sulla mappa</legend>
            <p className="muted">Tocca la mappa nel punto della casa, oppure scrivi latitudine e longitudine.</p>
            <HouseMap
              className="house-map--picker"
              houses={pickerHouses}
              startAt={modalState.startAt}
              onPick={({ lat, lng }) => updateForm({ lat, lng })}
            />
            <div className="house-form__grid">
              <div className="field">
                <label htmlFor="house-lat">Latitudine</label>
                <input
                  id="house-lat"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="-90"
                  max="90"
                  value={modalState.data.lat}
                  onChange={(event) => updateForm({ lat: event.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="house-lng">Longitudine</label>
                <input
                  id="house-lng"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="-180"
                  max="180"
                  value={modalState.data.lng}
                  onChange={(event) => updateForm({ lng: event.target.value })}
                />
              </div>
            </div>
          </fieldset>

          {shownError && (
            <div className="notice notice--error" role="alert">
              <strong>Attenzione:</strong> {shownError}
            </div>
          )}

          <div className="dialog-actions">
            <button type="button" className="secondary-btn" onClick={closeModal} disabled={saving}>
              Annulla
            </button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Salvataggio…' : 'Salva'}
            </button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}

export default Admin;
