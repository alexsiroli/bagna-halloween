const MIN_SCORE = 6;
const MAX_SCORE = 10;
const pumpkins = Array.from({ length: MAX_SCORE - MIN_SCORE + 1 }, (_, index) => MIN_SCORE + index);

function PumpkinRating({ label, value = 0, onChange, disabled = false }) {
  const handleClick = (score) => {
    if (disabled || !onChange) return;
    onChange(score === value ? 0 : score);
  };

  return (
    <div className="rating-group" aria-label={label}>
      <strong>{label}</strong>
      <div className="pumpkin-rating" role="radiogroup" aria-disabled={disabled}>
        {pumpkins.map((score) => {
          const active = score <= value;
          return (
            <div key={score} className="pumpkin-option">
              <button
                type="button"
                className="pumpkin"
                data-active={active}
                aria-pressed={active}
                aria-label={`${score} su ${MAX_SCORE}`}
                aria-disabled={disabled}
                onClick={() => handleClick(score)}
              >
                {active ? '🎃' : '🕯️'}
              </button>
              <span className="pumpkin-score">{score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PumpkinRating;
