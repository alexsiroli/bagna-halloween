import { Link } from 'react-router-dom';

const mapUrl = import.meta.env.VITE_MAP_URL || '/map.pdf';

function Home() {
  return (
    <div className="app-shell">
      <header>
        <p className="badge">Edizione 2025</p>
        <h1>Halloween di Bagnarola 🎃</h1>
        <p>
          Vivi il percorso delle case addobbate, partecipa al contest fotografico
          e assegna il tuo voto alle case.
        </p>
      </header>

      <div className="feature-grid">
        <Link className="feature-card feature-card--vote" to="/vote">
          <div>
            <h2>Votazioni</h2>
          </div>
          <span className="feature-emoji" role="img" aria-hidden="true">
            👻
          </span>
        </Link>

        <a
          className="feature-card feature-card--map"
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <div>
            <h2>Mappa</h2>
          </div>
          <span className="feature-emoji" role="img" aria-hidden="true">
            🗺️
          </span>
        </a>

        <Link className="feature-card feature-card--contest" to="/contest">
          <div>
            <h2>Contest foto</h2>
          </div>
          <span className="feature-emoji" role="img" aria-hidden="true">
            📸
          </span>
        </Link>
      </div>
    </div>
  );
}

export default Home;
