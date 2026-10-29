import { CaretRightIcon } from '@phosphor-icons/react';

function MyVotes({ houses, votesMap, loading, onHouseSelect, highlight }) {
  if (loading) {
    return (
      <section className="panel my-votes">
        <h2>I miei voti</h2>
        <div className="my-votes-list" aria-busy="true">
          {[0, 1, 2].map((index) => (
            <div key={index} className="my-vote-item my-vote-item--skeleton" />
          ))}
        </div>
        <p className="sr-only">Caricamento case in corso…</p>
      </section>
    );
  }

  if (!houses?.length) {
    return (
      <section className="panel my-votes">
        <h2>I miei voti</h2>
        <p className="empty-state">Nessuna casa disponibile al momento.</p>
      </section>
    );
  }

  const sortedHouses = [...houses].sort((a, b) => a.number - b.number);

  return (
    <section className="panel my-votes">
      <h2>I miei voti</h2>
      <div className="my-votes-list">
        {sortedHouses.map((house) => {
          const vote = votesMap?.get(house.number);
          const hasVote = (vote?.score || 0) >= 6;
          return (
            <button
              key={house.id || house.number}
              type="button"
              className="my-vote-item"
              data-rated={hasVote ? 'true' : 'false'}
              data-just-saved={highlight === house.number}
              onClick={() => onHouseSelect?.(house.number)}
              disabled={!onHouseSelect}
            >
              <span className="plate" aria-hidden="true">
                {house.number}
              </span>
              <span className="my-vote-details">
                <strong>Casa {house.number}</strong>
                {house.title ? <span className="my-vote-title">{house.title}</span> : null}
              </span>
              <span className="my-vote-score">
                {hasVote ? (
                  <>
                    <span className="my-vote-score__value">{vote.score}</span>
                    <span className="my-vote-score__max">/10</span>
                  </>
                ) : (
                  <span className="my-vote-score__todo">Da votare</span>
                )}
              </span>
              <CaretRightIcon className="my-vote-caret" aria-hidden="true" weight="bold" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default MyVotes;
