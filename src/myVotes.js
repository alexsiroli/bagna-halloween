import { useEffect, useSyncExternalStore } from 'react';
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { countRead, db } from './firebase.js';
import { voteId } from './data.js';
import { clampScore } from './voteScore.js';

export { clampScore, countVoted, isVoted } from './voteScore.js';

// I miei voti: un solo ascolto per utente ed edizione, a livello di modulo.
// Resta aperto passando da /vote a /mappa; si chiude solo quando cambia utente o edizione (logout compreso).
const EMPTY = { key: null, votesMap: new Map(), ready: false, error: '' };
let state = EMPTY;
let unsubscribe = null;
const listeners = new Set();

const publish = (next) => {
  state = next;
  listeners.forEach((listener) => listener());
};

function follow(uid, edition) {
  const key = uid ? `${uid}_${edition}` : null;
  if (key === state.key) return;
  unsubscribe?.();
  unsubscribe = null;
  publish(key ? { ...EMPTY, key } : EMPTY);
  if (!key) return;
  countRead('votes');
  unsubscribe = onSnapshot(
    query(collection(db, 'votes'), where('userId', '==', uid), where('edition', '==', edition)),
    (snapshot) => {
      const votesMap = new Map(snapshot.docs.map((docSnap) => [docSnap.data().houseNumber, { id: docSnap.id, ...docSnap.data() }]));
      publish({ key, votesMap, ready: true, error: '' });
    },
    (err) => {
      console.error('Errore caricando i voti', err);
      publish({ key, votesMap: new Map(), ready: true, error: 'Impossibile recuperare i tuoi voti.' });
    },
  );
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// user: undefined = login in controllo (lo stato non si tocca), null = nessun login (si chiude).
export function useMyVotes(user, edition) {
  const uid = user === undefined ? undefined : (user?.uid ?? null);
  useEffect(() => {
    if (uid !== undefined) follow(uid, edition);
  }, [uid, edition]);
  const current = useSyncExternalStore(subscribe, () => state);
  // Finche' l'effetto non ha agganciato l'utente giusto, mai i voti di un altro.
  return !uid || current.key !== `${uid}_${edition}` ? EMPTY : current;
}

// La scrittura di un voto: stesso id, stesso payload, createdAt solo sul voto nuovo (le regole vietano di cambiarlo).
// Lancia se la scrittura fallisce; chi chiama mostra l'errore.
export function saveVote({ user, edition, houseNumber, score, existing }) {
  const payload = {
    userId: user.uid,
    houseNumber,
    score: clampScore(score),
    edition,
    updatedAt: serverTimestamp(),
  };
  // Voto esistente (anche se ancora in attesa): createdAt non si invia e il merge lascia quello originale.
  if (!existing) payload.createdAt = serverTimestamp();
  return setDoc(doc(db, 'votes', voteId(edition, user.uid, houseNumber)), payload, { merge: true });
}
