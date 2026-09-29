import BackHomeLink from '../components/BackHomeLink.jsx';
import NightMap from '../components/NightMap.jsx';
import { useAppConfig, useHouses, usePublishedRanking } from '../data.js';

function MapPage() {
  const { edition } = useAppConfig();
  const { houses, error } = useHouses(edition);
  const ranking = usePublishedRanking(edition);
  const byNumber = new Map(houses.map((house) => [house.number, house]));

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

      <NightMap houses={houses} ranking={ranking} />

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
    </div>
  );
}

export default MapPage;
