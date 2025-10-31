import PumpkinRating from './PumpkinRating.jsx';

function HouseCard({ house, vote, onVoteChange, votingOpen }) {
  const currentScore = vote?.score ?? 0;

  const handleVote = (score) => {
    onVoteChange?.(house.number, score);
  };

  return (
    <article id={`house-${house.number}`} className="house-card">
      <div className="house-header">
        <h3>
          Casa {house.number}: {house.title || 'Senza titolo'}
        </h3>
        {!votingOpen && <span className="inline-status">Votazioni chiuse</span>}
      </div>

      <div className="house-meta">
        <p>{house.description || 'Nessuna descrizione disponibile.'}</p>
      </div>

      <PumpkinRating
        label="Vota la casa (6-10)"
        value={currentScore}
        onChange={handleVote}
        disabled={!votingOpen}
      />
    </article>
  );
}

export default HouseCard;
