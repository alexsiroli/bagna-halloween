import Casetta from './Casetta.jsx';
import { isVoted } from '../myVotes.js';

// Griglia piena e a righe pareggiate: al massimo 5 colonne (sotto i 360 px, 4: vedi CSS), come il filo di lampadine.
const MAX_COLS = 5;
const columns = (count) => Math.ceil(count / Math.ceil(count / MAX_COLS)) || 1;

// I miei voti: una casetta per casa, accesa quando l'hai votata, il voto sotto. Tocco = scheda della casa.
function MyVotes({ houses, votesMap, loading, onHouseSelect, highlight }) {
  if (loading) {
    return (
      <section className="my-votes" aria-labelledby="my-votes-title">
        <h2 id="my-votes-title" className="sr-only">I miei voti</h2>
        <div className="my-votes-grid" aria-busy="true">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="my-vote--skeleton" />
          ))}
        </div>
        <p className="sr-only">Caricamento case in corso…</p>
      </section>
    );
  }

  if (!houses?.length) return <p className="empty-state">Nessuna casa disponibile al momento.</p>;

  const sortedHouses = [...houses].sort((a, b) => a.number - b.number);

  return (
    <section className="my-votes" aria-labelledby="my-votes-title">
      <h2 id="my-votes-title" className="sr-only">I miei voti</h2>
      <div className="my-votes-grid" style={{ '--cols': columns(sortedHouses.length) }}>
        {sortedHouses.map((house) => {
          const vote = votesMap?.get(house.number);
          const voted = isVoted(vote);
          const show = house.kind === 'spettacolo' ? ', spettacolo' : '';
          return (
            <button
              key={house.id || house.number}
              type="button"
              className="my-vote"
              data-just-saved={highlight === house.number}
              onClick={() => onHouseSelect?.(house.number)}
              disabled={!onHouseSelect}
              aria-label={`Casa ${house.number}${house.title ? `, ${house.title}` : ''}${show}, ${voted ? `votata ${vote.score} su 10` : 'da votare'}`}
            >
              <Casetta number={house.number} lit={voted} kind={house.kind === 'spettacolo' ? 'spettacolo' : undefined} />
              <span className="my-vote__score" aria-hidden="true">
                {voted ? vote.score : ''}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default MyVotes;
