import PumpkinRating from './PumpkinRating.jsx';

function HouseCard({ house, vote, onVoteChange, votingOpen }) {
  const currentDecoration = vote?.decorationVote ?? 0;
  const currentShow = vote?.showVote ?? 0;

  const handleVote = (field) => (score) => {
    onVoteChange?.(house.number, {
      ...vote,
      [field]: score,
    });
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

      <div className="rating-group">
        <PumpkinRating
          label="Vota addobbi"
          value={currentDecoration}
          onChange={handleVote('decorationVote')}
          disabled={!votingOpen}
        />
        <PumpkinRating
          label="Vota spettacolo"
          value={currentShow}
          onChange={handleVote('showVote')}
          disabled={!votingOpen}
        />
      </div>
    </article>
  );
}

export default HouseCard;
