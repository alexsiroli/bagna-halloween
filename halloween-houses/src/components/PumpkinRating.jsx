const pumpkins = Array.from({ length: 10 }, (_, index) => index + 1);

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
            <button
              key={score}
              type="button"
              className="pumpkin"
              data-active={active}
              aria-pressed={active}
              aria-label={`${score} su 10`}
              aria-disabled={disabled}
              onClick={() => handleClick(score)}
            >
              {active ? '🎃' : '🕯️'}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PumpkinRating;
