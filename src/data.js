import { useEffect, useState } from 'react';
import { collection, doc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase.js';

// Edizione mostrata finche' config/app non risponde. Quella vera arriva da config/app.edition.
export const FALLBACK_EDITION = 2026;

export const houseId = (edition, number) => `${edition}_${number}`;
export const voteId = (edition, uid, houseNumber) => `${edition}_${uid}_${houseNumber}`;

// undefined = in caricamento, null = documento assente o non leggibile.
export function useConfigDoc(id) {
  const [data, setData] = useState(undefined);
  useEffect(
    () =>
      onSnapshot(
        doc(db, 'config', id),
        (snapshot) => setData(snapshot.data() ?? null),
        (err) => {
          console.error(`Errore caricando config/${id}`, err);
          setData(null);
        },
      ),
    [id],
  );
  return data;
}

export function useAppConfig() {
  const data = useConfigDoc('app');
  return {
    loaded: data !== undefined,
    votingOpen: data?.votingOpen === true,
    edition: Number(data?.edition) || FALLBACK_EDITION,
  };
}

// Numeri delle case in ordine di classifica, solo se l'admin l'ha pubblicata per questa edizione.
export function usePublishedRanking(edition) {
  const data = useConfigDoc('results');
  return data?.published === true && data.edition === edition ? data.ranking ?? [] : null;
}

const HOUSES_ERROR = 'Impossibile caricare le case, riprova più tardi.';
const housesQuery = (edition) => query(collection(db, 'houses'), where('edition', '==', edition));
const toHouses = (snapshot, includeHidden) =>
  snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((house) => includeHidden || house.visible !== false)
    .sort((a, b) => a.number - b.number);

// Pagine pubbliche: una lettura per edizione e per sessione (Map edizione -> Promise).
// Ricaricare la pagina rilegge; gli errori non restano in cache.
// shortcut: le modifiche dell'admin non arrivano a chi ha già la pagina aperta, serve un ricarico.
const housesCache = new Map();
function loadHouses(edition) {
  if (!housesCache.has(edition)) {
    const promise = getDocs(housesQuery(edition));
    promise.catch(() => housesCache.delete(edition));
    housesCache.set(edition, promise);
  }
  return housesCache.get(edition);
}

// includeHidden (admin): resta in ascolto live. Pubblico: lettura singola in cache.
export function useHouses(edition, { includeHidden = false } = {}) {
  const [state, setState] = useState({ houses: [], loading: true, error: '' });
  useEffect(() => {
    setState((prev) => ({ ...prev, loading: true }));
    const fail = (err) => {
      console.error('Errore caricando le case', err);
      setState({ houses: [], loading: false, error: HOUSES_ERROR });
    };
    if (includeHidden) {
      return onSnapshot(
        housesQuery(edition),
        (snapshot) => setState({ houses: toHouses(snapshot, true), loading: false, error: '' }),
        fail,
      );
    }
    let cancelled = false;
    loadHouses(edition).then(
      (snapshot) => !cancelled && setState({ houses: toHouses(snapshot, false), loading: false, error: '' }),
      (err) => !cancelled && fail(err),
    );
    return () => {
      cancelled = true;
    };
  }, [edition, includeHidden]);
  return state;
}
