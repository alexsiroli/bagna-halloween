import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
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

export function useHouses(edition, { includeHidden = false } = {}) {
  const [state, setState] = useState({ houses: [], loading: true, error: '' });
  useEffect(() => {
    setState((prev) => ({ ...prev, loading: true }));
    return onSnapshot(
      query(collection(db, 'houses'), where('edition', '==', edition)),
      (snapshot) => {
        const houses = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((house) => includeHidden || house.visible !== false)
          .sort((a, b) => a.number - b.number);
        setState({ houses, loading: false, error: '' });
      },
      (err) => {
        console.error('Errore caricando le case', err);
        setState({ houses: [], loading: false, error: 'Impossibile caricare le case, riprova più tardi.' });
      },
    );
  }, [edition, includeHidden]);
  return state;
}
