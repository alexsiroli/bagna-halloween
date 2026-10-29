import { useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import HouseMap from '../components/HouseMap.jsx';
import { Chip } from '../components/MapGlyph.jsx';
import VoteSheet from '../components/VoteSheet.jsx';
import { useAuthUser } from '../auth.js';
import { hasPosition, useAppConfig, useHouses, usePublishedRanking } from '../data.js';
import { KIND_LABELS, POINT_LABELS, ROAD_LABEL } from '../mapKinds.js';
import { isVoted, useMyVotes } from '../myVotes.js';
import { usePoints } from '../points.js';

// Solo mappa e legenda, in una schermata. Tocco su una casa = la stessa scheda di voto di /vote.
function MapPage() {
  const user = useAuthUser();
  const config = useAppConfig();
  const { edition } = config;
  const { houses, error } = useHouses(edition);
  const { votesMap, ready } = useMyVotes(user, edition);
  const ranking = usePublishedRanking(edition);
  const services = usePoints(edition);
  const [selected, setSelected] = useState(null);
  const [saved, setSaved] = useState(null);
  const placed = useMemo(() => houses.filter(hasPosition), [houses]);
  // Numero -> voto delle case votate; null senza accesso (le casette restano spente, senza stato nel nome).
  const votes = useMemo(() => {
    if (!user || !ready) return null;
    const map = new Map();
    votesMap.forEach((vote, number) => isVoted(vote) && map.set(number, vote.score));
    return map;
  }, [user, ready, votesMap]);
  // Legenda: solo i tipi che ci sono sulla mappa.
  const legend = [
    ...Object.keys(KIND_LABELS).filter((kind) => placed.some((house) => house.kind === kind)).map((kind) => [kind, KIND_LABELS[kind]]),
    ...Object.keys(POINT_LABELS).filter((type) => services.points.some((point) => point.type === type)).map((type) => [type, POINT_LABELS[type]]),
    ...(services.closedRoads.length > 0 ? [['strada', ROAD_LABEL]] : []),
  ];

  return (
    <div className="app-shell app-shell--fit map-page">
      <PageHeader title="Mappa" />

      {error && (
        <div className="notice notice--error" role="alert">
          {error}
        </div>
      )}
      {saved && (
        <p className="sr-only" role="status">
          {saved.deleted ? `Voto cancellato: casa ${saved.number}.` : `Voto salvato: casa ${saved.number}, ${saved.score} su 10.`}
        </p>
      )}

      <HouseMap houses={placed} votes={votes} ranking={ranking} services={services} onSelect={setSelected} />

      {(legend.length > 0 || services.note) && (
        <section className="map-legend" aria-label="Legenda">
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

      <VoteSheet
        house={selected}
        user={user}
        config={config}
        onClose={() => setSelected(null)}
        onSaved={(result) => {
          setSaved(result);
          setSelected(null);
        }}
      />
    </div>
  );
}

export default MapPage;
