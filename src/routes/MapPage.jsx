import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BackHomeLink from '../components/BackHomeLink.jsx';
import HouseMap from '../components/HouseMap.jsx';
import HouseRow from '../components/HouseRow.jsx';
import { Chip, KindTag } from '../components/MapGlyph.jsx';
import Sheet from '../components/Sheet.jsx';
import { hasPosition, houseAddress, useAppConfig, useHouses, usePublishedRanking } from '../data.js';
import { KIND_LABELS, POINT_LABELS, ROAD_LABEL } from '../mapKinds.js';
import { usePoints } from '../points.js';

function MapPage() {
  const { edition } = useAppConfig();
  const { houses, error } = useHouses(edition);
  const ranking = usePublishedRanking(edition);
  const services = usePoints(edition);
  const [selected, setSelected] = useState(null);
  const placed = useMemo(() => houses.filter(hasPosition), [houses]);
  const unplaced = houses.filter((house) => !hasPosition(house));
  const shows = houses.filter((house) => house.kind === 'spettacolo');
  const entertainment = services.points.filter((point) => point.type === 'intrattenimento');
  // Legenda: solo i tipi che ci sono sulla mappa.
  const legend = [
    ...Object.keys(KIND_LABELS).filter((kind) => placed.some((house) => house.kind === kind)).map((kind) => [kind, KIND_LABELS[kind]]),
    ...Object.keys(POINT_LABELS).filter((type) => services.points.some((point) => point.type === type)).map((type) => [type, POINT_LABELS[type]]),
    ...(services.closedRoads.length > 0 ? [['strada', ROAD_LABEL]] : []),
  ];

  return (
    <div className="app-shell map-page">
      <BackHomeLink />
      <header className="page-head">
        <h1>Mappa del quartiere</h1>
        <p>
          {ranking ? (
            <>
              Le prime tre case {edition} sono sulla mappa. Tutte le classifiche sono nell’<Link to="/albo">albo d’oro</Link>.
            </>
          ) : (
            'Il percorso delle case addobbate. Tocca una casa per votarla.'
          )}
        </p>
      </header>

      {error && (
        <div className="notice notice--error" role="alert">
          {error}
        </div>
      )}

      <HouseMap houses={placed} ranking={ranking} services={services} onSelect={setSelected} />

      {(legend.length > 0 || services.note) && (
        <section className="panel map-legend">
          <h2>Legenda</h2>
          {legend.length > 0 && (
            <ul className="map-legend__list">
              {legend.map(([t, label]) => (
                <li key={t}>
                  <Chip t={t} />
                  {label}
                </li>
              ))}
            </ul>
          )}
          {services.note && <p className="muted">{services.note}</p>}
        </section>
      )}

      {(shows.length > 0 || entertainment.length > 0) && (
        <section className="panel">
          <h2>Spettacoli</h2>
          <ul className="house-list">
            {shows.map((house) => (
              <HouseRow key={house.id} house={house} />
            ))}
            {entertainment.map((point) => (
              <li key={`${point.name}-${point.lat}-${point.lng}`} className="house-row">
                <Chip t="intrattenimento" />
                <div className="house-row__text">
                  <h3>{point.name}</h3>
                  {point.address && <p>{point.address}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {unplaced.length > 0 && (
        <section className="panel">
          <h2>Altre case</h2>
          <p className="muted">Queste case non sono ancora sulla mappa, ma si votano lo stesso.</p>
          <ul className="house-list">
            {unplaced.map((house) => (
              <HouseRow key={house.id} house={house} />
            ))}
          </ul>
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
            <KindTag kind={selected.kind} />
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
