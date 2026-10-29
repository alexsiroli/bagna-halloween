import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListChecksIcon } from '@phosphor-icons/react';
import BackHomeLink from '../components/BackHomeLink.jsx';
import HouseMap from '../components/HouseMap.jsx';
import HouseRow from '../components/HouseRow.jsx';
import { Chip } from '../components/MapGlyph.jsx';
import VoteSheet from '../components/VoteSheet.jsx';
import { useAuthUser } from '../auth.js';
import { hasPosition, useAppConfig, useHouses, usePublishedRanking } from '../data.js';
import { KIND_LABELS, POINT_LABELS, ROAD_LABEL } from '../mapKinds.js';
import { countVoted, isVoted, useMyVotes } from '../myVotes.js';
import { usePoints } from '../points.js';

// Filtro per stato (solo con il login): «Da votare» e' la partenza, dopo il login si cerca da li.
const FILTERS = [
  ['all', 'Tutte'],
  ['todo', 'Da votare'],
  ['done', 'Votate'],
];

function MapPage() {
  const user = useAuthUser();
  const config = useAppConfig();
  const { edition } = config;
  const { votesMap, ready } = useMyVotes(user, edition);
  const [filter, setFilter] = useState('todo');
  const [savedHouse, setSavedHouse] = useState(null);
  const { houses, error } = useHouses(edition);
  const ranking = usePublishedRanking(edition);
  const services = usePoints(edition);
  const [selected, setSelected] = useState(null);
  const byNumber = new Map(houses.map((house) => [house.number, house]));
  const placed = useMemo(() => houses.filter(hasPosition), [houses]);
  // Stato dei segnaposto solo con il login e a voti letti: prima, tutte le case come senza login.
  const scores = useMemo(() => (user && ready ? new Map([...votesMap].filter(([, vote]) => isVoted(vote)).map(([number, vote]) => [number, vote.score])) : null), [user, ready, votesMap]);
  const shown = useMemo(
    () => (scores && filter !== 'all' ? placed.filter((house) => scores.has(house.number) === (filter === 'done')) : placed),
    [placed, scores, filter],
  );
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
        <Link className="chip-btn page-head__link" to="/vote">
          <ListChecksIcon aria-hidden="true" weight="bold" /> I miei voti
        </Link>
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

      {scores && (
        <div className="map-toolbar">
          <div className="map-filter" role="group" aria-label="Mostra le case">
            {FILTERS.map(([value, label]) => (
              <button key={value} type="button" className="chip-btn" aria-pressed={filter === value} onClick={() => setFilter(value)}>
                {label}
              </button>
            ))}
          </div>
          <p className="map-progress">
            <strong>{countVoted(houses, votesMap)}</strong> su {houses.length} votate
          </p>
        </div>
      )}

      {savedHouse && (
        <p className="notice notice--saved" role="status" key={`${savedHouse.number}-${savedHouse.score}`}>
          Voto salvato: casa {savedHouse.number}, {savedHouse.score} su 10.
        </p>
      )}

      {scores && placed.length > 0 && shown.length === 0 && (
        <p className="empty-state" role="status">
          {filter === 'todo' ? 'Hai votato tutte le case!' : 'Nessuna casa votata ancora.'}
        </p>
      )}

      <HouseMap houses={shown} votes={scores} ranking={ranking} services={services} onSelect={setSelected} />

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

      <VoteSheet
        house={selected}
        user={user}
        config={config}
        onClose={() => setSelected(null)}
        onSaved={(saved) => {
          setSavedHouse(saved);
          setSelected(null);
        }}
      />
    </div>
  );
}

export default MapPage;
