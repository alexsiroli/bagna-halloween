import { useEffect, useState } from 'react';
import { collection, doc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { countRead, db } from './firebase.js';

// Edizione mostrata finche' config/app non risponde. Quella vera arriva da config/app.edition.
export const FALLBACK_EDITION = 2026;

export const houseId = (edition, number) => `${edition}_${number}`;
export const voteId = (edition, uid, houseNumber) => `${edition}_${uid}_${houseNumber}`;

export const houseAddress = (house) => [house.street, house.civic].filter(Boolean).join(' ');
export const hasPosition = (house) => Number.isFinite(house.lat) && Number.isFinite(house.lng);

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

// setTimeout oltre ~24,8 giorni va in overflow: si riprogramma a tappe.
const MAX_TIMEOUT = 2 ** 31 - 1;

// votingOpen e' l'apertura effettiva (flag acceso e orario di fine non passato); votingFlag e' il flag grezzo.
export function useAppConfig() {
  const data = useConfigDoc('app');
  const [tick, setTick] = useState(0);
  const votingEndsAt = data?.votingEndsAt?.toDate?.() ?? null;
  const endsMs = votingEndsAt?.getTime();
  const votingFlag = data?.votingOpen === true;
  const votingOpen = votingFlag && !(endsMs <= Date.now());
  // Allo scadere (o a ogni tappa) si ricalcola da solo, senza ricaricare.
  useEffect(() => {
    const wait = endsMs - Date.now();
    if (!(wait > 0)) return undefined;
    const timer = setTimeout(() => setTick((n) => n + 1), Math.min(wait, MAX_TIMEOUT));
    return () => clearTimeout(timer);
  }, [endsMs, tick]);
  return {
    loaded: data !== undefined,
    votingOpen,
    votingFlag,
    votingEndsAt,
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
    countRead('houses');
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
