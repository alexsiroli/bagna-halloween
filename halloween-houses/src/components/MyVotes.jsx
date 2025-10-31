function MyVotes({ votes, houses }) {
  if (!votes?.length) {
    return (
      <div className="card">
        <h2>I miei voti</h2>
        <p className="empty-state">Non hai ancora espresso nessun voto.</p>
      </div>
    );
  }

  const votesSorted = [...votes].sort((a, b) => a.houseNumber - b.houseNumber);

  return (
    <div className="card">
      <h2>I miei voti</h2>
      <div className="my-votes-list">
        {votesSorted.map((vote) => {
          const house = houses?.find((item) => item.number === vote.houseNumber);
          return (
            <div key={vote.id || `${vote.userId}_${vote.houseNumber}`}>
              <strong>
                Casa {vote.houseNumber}
                {house?.title ? ` – ${house.title}` : ''}
              </strong>
              <p>
                Addobbi: {vote.decorationVote || '—'} · Spettacoli: {vote.showVote || '—'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MyVotes;
