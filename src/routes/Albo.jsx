import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import PageHeader from '../components/PageHeader.jsx';
import { db } from '../firebase.js';

const formatAvg = (avg) => avg.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// undefined = in caricamento; altrimenti le edizioni pubblicate, dalla piu' recente.
function useResults() {
  const [state, setState] = useState({ results: undefined, error: '' });
  useEffect(
    () =>
      onSnapshot(
        collection(db, 'results'),
        (snapshot) =>
          setState({ results: snapshot.docs.map((docSnap) => docSnap.data()).sort((a, b) => b.edition - a.edition), error: '' }),
        (err) => {
          console.error('Errore caricando l’albo d’oro', err);
          setState({ results: [], error: 'Impossibile caricare l’albo d’oro, riprova più tardi.' });
        },
      ),
    [],
  );
  return state;
}

function Albo() {
  const { results, error } = useResults();

  return (
    <div className="app-shell app-shell--narrow albo-page">
      <PageHeader title="Albo d’oro" />

      {error && (
        <div className="notice notice--error" role="alert">
          {error}
        </div>
      )}
      {results === undefined && <p className="empty-state">Caricamento…</p>}
      {results?.length === 0 && !error && (
        <p className="empty-state">Nessuna classifica pubblicata, torna dopo la serata.</p>
      )}

      {results?.map(({ edition, top3 }) => (
        <section key={edition} className="panel ranking">
          <h2>Edizione {edition}</h2>
          <ol className="ranking-list">
            {top3.map((row, index) => (
              <li key={row.number} data-podium="true" style={{ '--order': index }}>
                <span className="ranking-list__pos">{index + 1}°</span>
                <span className="ranking-list__text">
                  <strong>
                    Casa {row.number}
                    {row.title ? `: ${row.title}` : ''}
                  </strong>
                  <span className="ranking-list__title">Voto medio {formatAvg(row.avg)}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

export default Albo;
