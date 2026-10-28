import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BackHomeLink from '../components/BackHomeLink.jsx';
import HouseMap from '../components/HouseMap.jsx';
import Sheet from '../components/Sheet.jsx';
import { hasPosition, houseAddress, useAppConfig, useHouses, usePublishedRanking } from '../data.js';

function MapPage() {
  const { edition } = useAppConfig();
  const { houses, error } = useHouses(edition);
  const ranking = usePublishedRanking(edition);
  const [selected, setSelected] = useState(null);
  const byNumber = new Map(houses.map((house) => [house.number, house]));
  const placed = useMemo(() => houses.filter(hasPosition), [houses]);
  const unplaced = houses.filter((house) => !hasPosition(house));

  return (
    <div className="app-shell map-page">
      <BackHomeLink />
      <header className="page-head">
        <h1>Mappa del quartiere</h1>
        <p>
          {ranking
            ? `La classifica ${edition} è pubblica: le case si accendono in ordine.`
            : 'Il percorso delle case addobbate. Tocca una casa per votarla.'}
        </p>
      </header>

      {error && (
        <div className="notice notice--error" role="alert">
          {error}
        </div>
      )}

      <HouseMap houses={placed} ranking={ranking} onSelect={setSelected} />

      {unplaced.length > 0 && (
        <section className="panel">
          <h2>Altre case</h2>
          <p className="muted">Queste case non sono ancora sulla mappa, ma si votano lo stesso.</p>
          <ul className="house-list">
            {unplaced.map((house) => (
              <li key={house.id} className="house-row">
                <span className="plate" aria-hidden="true">
                  {house.number}
                </span>
                <div className="house-row__text">
                  <h3>
                    Casa {house.number}: {house.title || 'Senza titolo'}
                  </h3>
                  {houseAddress(house) && <p>{houseAddress(house)}</p>}
                </div>
                <Link className="primary-btn" to={`/vota/${house.number}`} aria-label={`Vota la casa ${house.number}`}>
                  Vota
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {ranking && ranking.length > 0 && (
        <section className="panel ranking">
          <h2>Classifica {edition}</h2>
          <ol className="ranking-list">
            {ranking.map((number, index) => (
              <li key={number} data-podium={index < 3} style={{ '--order': index }}>
                <span className="ranking-list__pos">{index + 1}°</span>
                <span className="plate" aria-hidden="true">
                  {number}
                </span>
                <span className="ranking-list__text">
                  <strong>Casa {number}</strong>
                  {byNumber.get(number)?.title && (
                    <span className="ranking-list__title">{byNumber.get(number).title}</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <Sheet open={Boolean(selected)} onClose={() => setSelected(null)} labelledBy="map-dialog-title" className="vote-dialog">
        {selected && (
          <div className="map-dialog">
            <div className="vote-dialog-header">
              <span className="plate plate--lg" aria-hidden="true">
                {selected.number}
              </span>
              <div className="vote-dialog-headings">
                <h2 id="map-dialog-title">Casa {selected.number}</h2>
                <p className="vote-dialog-house-title">{selected.title || 'Senza titolo'}</p>
              </div>
            </div>
            {houseAddress(selected) && <p className="map-dialog__address">{houseAddress(selected)}</p>}
            {selected.description && <p className="vote-dialog-description">{selected.description}</p>}
            <div className="dialog-actions">
              <button type="button" className="secondary-btn" onClick={() => setSelected(null)}>
                Chiudi
              </button>
              <Link className="primary-btn" to={`/vota/${selected.number}`}>
                Vota
              </Link>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

export default MapPage;
