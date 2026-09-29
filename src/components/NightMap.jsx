import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FilePdfIcon, FlashlightIcon, LightbulbIcon } from '@phosphor-icons/react';

// In produzione public/mappa-2026.webp; in sviluppo .env.emulator punta alla mappa segnaposto.
const MAP_IMAGE = import.meta.env.VITE_MAP_IMAGE || '/mappa-2026.webp';
const MAP_PDF = import.meta.env.VITE_MAP_URL || '/map.pdf';

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const hasPosition = (house) => Number.isFinite(house.x) && Number.isFinite(house.y);

/**
 * Mappa del quartiere al buio con torcia che segue dito o puntatore.
 * - ranking: numeri delle case in ordine di classifica (se pubblicata): si accendono in quell'ordine.
 * - onPick({x, y}): modalita' admin, un click posiziona la casa `pickedNumber` (coordinate in %).
 */
function NightMap({ houses, ranking = null, onPick, pickedNumber }) {
  const picking = Boolean(onPick);
  const frameRef = useRef(null);
  const litRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const [lightsOn, setLightsOn] = useState(() => picking || reducedMotion());
  const rankOf = new Map((ranking ?? []).map((number, index) => [number, index]));

  const moveTorch = (event) => {
    if (lightsOn || !litRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    const size = Math.min(300, rect.width * 0.6);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    // Stile scritto sul solo strato illuminato: niente re-render, niente ricalcolo sui figli.
    const { style } = litRef.current;
    style.webkitMaskSize = style.maskSize = `${size}px ${size}px`;
    style.webkitMaskPosition = style.maskPosition = `${x}px ${y}px`;
  };

  const pick = (event) => {
    const rect = frameRef.current.getBoundingClientRect();
    const round = (value) => Math.round(Math.min(100, Math.max(0, value)) * 10) / 10;
    onPick({
      x: round(((event.clientX - rect.left) / rect.width) * 100),
      y: round(((event.clientY - rect.top) / rect.height) * 100),
    });
  };

  if (failed) {
    return (
      <div className="night-map night-map--missing">
        <p>La mappa illustrata non è ancora disponibile.</p>
        {picking ? (
          <p className="muted">Carica public/mappa-2026.webp per posizionare le case cliccando.</p>
        ) : (
          <a className="secondary-btn" href={MAP_PDF} target="_blank" rel="noopener noreferrer">
            <FilePdfIcon aria-hidden="true" weight="bold" /> Apri la mappa in PDF
          </a>
        )}
      </div>
    );
  }

  const placed = houses.filter(hasPosition);

  return (
    <div className="night-map" data-lights={lightsOn ? 'on' : 'off'} data-picking={picking}>
      {!picking && (
        <div className="night-map__toolbar">
          <button
            type="button"
            className="chip-btn"
            aria-pressed={lightsOn}
            onClick={() => setLightsOn((value) => !value)}
          >
            {lightsOn ? (
              <>
                <FlashlightIcon aria-hidden="true" weight="bold" /> Usa la torcia
              </>
            ) : (
              <>
                <LightbulbIcon aria-hidden="true" weight="bold" /> Accendi le luci
              </>
            )}
          </button>
          <p className="night-map__hint" aria-live="polite">
            {lightsOn ? 'Luci accese: tocca una casa per votarla.' : 'Muovi il dito sulla mappa per fare luce.'}
          </p>
        </div>
      )}

      <div
        ref={frameRef}
        className="night-map__frame"
        onPointerMove={moveTorch}
        onPointerDown={moveTorch}
        onClick={picking ? pick : undefined}
      >
        <img
          className="night-map__base"
          src={MAP_IMAGE}
          alt="Mappa del percorso delle case di Halloween"
          onError={() => setFailed(true)}
          draggable="false"
        />
        <img ref={litRef} className="night-map__lit" src={MAP_IMAGE} alt="" aria-hidden="true" draggable="false" />

        <div className="night-map__markers">
          {placed.map((house) => {
            const rank = rankOf.get(house.number);
            const ranked = rank !== undefined;
            const style = { left: `${house.x}%`, top: `${house.y}%`, '--order': rank ?? 0 };
            const content = (
              <>
                <span className="map-marker__plate">{house.number}</span>
                {ranked && rank < 3 && <span className="map-marker__rank">{rank + 1}°</span>}
              </>
            );
            if (picking) {
              return (
                <span
                  key={house.id ?? house.number}
                  className="map-marker"
                  data-picked={house.number === pickedNumber}
                  style={style}
                  aria-hidden="true"
                >
                  {content}
                </span>
              );
            }
            return (
              <Link
                key={house.id ?? house.number}
                className="map-marker"
                data-ranked={ranked}
                data-podium={ranked && rank < 3}
                style={style}
                to={`/vote?casa=${house.number}`}
                aria-label={`Casa ${house.number}${house.title ? `, ${house.title}` : ''}${
                  ranked ? `, ${rank + 1}° in classifica` : ''
                }: vota`}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </div>

      {!picking && placed.length === 0 && (
        <p className="muted">Le case compariranno sulla mappa appena l’organizzazione le posiziona.</p>
      )}
    </div>
  );
}

export default NightMap;
