function MyVotes({ houses, votesMap, loading, onHouseSelect }) {
  if (loading) {
    return (
      <div className="card">
        <h2>I miei voti</h2>
        <p className="empty-state">Caricamento case in corso…</p>
      </div>
    );
  }

  if (!houses?.length) {
    return (
      <div className="card">
        <h2>I miei voti</h2>
        <p className="empty-state">Nessuna casa disponibile al momento.</p>
      </div>
    );
  }

  const sortedHouses = [...houses].sort((a, b) => a.number - b.number);

  return (
    <div className="card">
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
              onClick={() => onHouseSelect?.(house.number)}
              disabled={!onHouseSelect}
            >
              <div className="my-vote-details">
                <strong>Casa {house.number}</strong>
                {house.title ? <span className="my-vote-title">– {house.title}</span> : null}
              </div>
              <span className="my-vote-score">{hasVote ? `${vote.score}/10` : '—'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default MyVotes;
