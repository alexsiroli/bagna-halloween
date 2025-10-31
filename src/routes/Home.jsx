import { Link } from 'react-router-dom';

const mapUrl = import.meta.env.VITE_MAP_URL || '/map.pdf';

function Home() {
  return (
    <div className="app-shell">
      <header>
        <p className="badge">Edizione 2025</p>
        <h1>Vota la casa di Halloween 🎃</h1>
        <p>
          Vivi il percorso delle case addobbate, partecipa al contest fotografico
          e assegna i tuoi voti per addobbi e spettacoli.
        </p>
      </header>

      <div className="feature-grid">
        <a
          className="feature-card"
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <div>
            <h2>Scarica la mappa</h2>
            <p>Scarica il PDF con tutte le case partecipanti.</p>
          </div>
          <span role="img" aria-hidden="true">
            🗺️
          </span>
        </a>

        <Link className="feature-card" to="/contest">
          <div>
            <h2>Contest foto</h2>
            <p>Leggi le istruzioni per condividere i tuoi scatti più spaventosi.</p>
          </div>
          <span role="img" aria-hidden="true">
            📸
          </span>
        </Link>

        <Link className="feature-card" to="/vote">
          <div>
            <h2>Vota una casa</h2>
            <p>Accedi con Google e lascia il tuo voto alle case visibili.</p>
          </div>
          <span role="img" aria-hidden="true">
            👻
          </span>
        </Link>
      </div>
    </div>
  );
}

export default Home;
