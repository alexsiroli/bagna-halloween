import { useId, useRef } from 'react';

const MIN_SCORE = 6;
const MAX_SCORE = 10;
const pumpkins = Array.from({ length: MAX_SCORE - MIN_SCORE + 1 }, (_, index) => MIN_SCORE + index);
const WORDS = { 6: 'Carina', 7: 'Bella', 8: 'Bellissima', 9: 'Da brividi', 10: 'Da paura!' };

function PumpkinArt() {
  return (
    <svg className="pumpkin__art" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path className="pumpkin__stem" d="M22.5 13.5c-.2-4 .8-7.6 4.6-9.5l1.9 2.6c-2.7 1.4-3.4 3.6-3.2 6.9z" />
      <g className="pumpkin__body">
        <ellipse cx="14.5" cy="29" rx="10" ry="12.5" />
        <ellipse cx="33.5" cy="29" rx="10" ry="12.5" />
        <ellipse cx="24" cy="28.5" rx="10.5" ry="14" />
      </g>
      <path
        className="pumpkin__face"
        d="M14.5 26.5l3.8-5.2 3.8 5.2zM25.9 26.5l3.8-5.2 3.8 5.2zM13 32c3.4 5.6 18.6 5.6 22 0l-3.2 1.2-1.9 2.6-2.8-1.9-3.1 2.6-3.1-2.6-2.8 1.9-1.9-2.6z"
      />
    </svg>
  );
}

function PumpkinRating({ label, value = 0, onChange, disabled = false }) {
  const labelId = useId();
  const buttons = useRef([]);

  const select = (score) => {
    if (disabled || !onChange) return;
    onChange(score === value ? 0 : score);
  };

  // Frecce come in un gruppo di radio: spostano voto e focus.
  const handleKeyDown = (event) => {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
    if (!step || disabled || !onChange) return;
    event.preventDefault();
    const next = Math.min(MAX_SCORE, Math.max(MIN_SCORE, (value || MIN_SCORE - step) + step));
    onChange(next);
    buttons.current[next - MIN_SCORE]?.focus();
  };

  const focusable = value >= MIN_SCORE ? value : MIN_SCORE;

  return (
    <div className="rating-group">
      <div className="rating-head">
        <strong id={labelId}>{label}</strong>
        <output className="rating-readout" aria-live="polite" data-empty={value < MIN_SCORE}>
          {value >= MIN_SCORE ? (
            <>
              <span className="rating-readout__score">{value}</span>
              <span className="rating-readout__word">{WORDS[value]}</span>
            </>
          ) : (
            'Tocca una zucca'
          )}
        </output>
      </div>
      <div
        className="pumpkin-rating"
        role="radiogroup"
        aria-labelledby={labelId}
        aria-disabled={disabled}
        onKeyDown={handleKeyDown}
      >
        {pumpkins.map((score, index) => (
          <button
            key={score}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="radio"
            className="pumpkin"
            style={{ '--i': index }}
            data-lit={score <= value}
            data-selected={score === value}
            aria-checked={score === value}
            aria-label={`${score} su ${MAX_SCORE}`}
            aria-disabled={disabled}
            tabIndex={score === focusable ? 0 : -1}
            onClick={() => select(score)}
          >
            <PumpkinArt />
            <span className="pumpkin-score" aria-hidden="true">
              {score}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default PumpkinRating;
