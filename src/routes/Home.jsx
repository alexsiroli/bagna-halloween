import { Link } from 'react-router-dom';
import { ArrowRightIcon, CameraIcon, MapTrifoldIcon } from '@phosphor-icons/react';
import Skyline from '../components/Skyline.jsx';
import { useAppConfig } from '../data.js';
import { formatEnd } from '../votingTime.js';

function Home() {
  const { edition, votingOpen, votingEndsAt, loaded } = useAppConfig();

  return (
    <div className="app-shell home">
      <section className="home-hero">
        <h1 className="display home-hero__title">
          Halloween <span>di Bagnarola</span>
        </h1>
        <p className="home-hero__lead">
          Vivi il percorso delle case addobbate, partecipa al contest fotografico e assegna il tuo voto
          alle case.
        </p>
        <p className="status-line home-hero__status" data-open={loaded ? votingOpen : undefined}>
          <span className="status-bulb" aria-hidden="true" />
          Edizione {edition}
          {loaded && <> · {votingOpen ? 'votazioni aperte' : 'votazioni chiuse'}</>}
          {votingOpen && votingEndsAt && <> · si vota fino alle {formatEnd(votingEndsAt)}</>}
        </p>
        <div className="home-hero__scene">
          <Skyline />
          {/* Candele nelle due zucche grandi (x 46 e 170 su 240) e nebbia: livelli HTML, l'SVG resta fermo */}
          <span className="fiamma" style={{ '--x': 19.2 }} aria-hidden="true" />
          <span className="fiamma" style={{ '--x': 70.8, '--d': '4.1s' }} aria-hidden="true" />
          <span className="banco-nebbia" aria-hidden="true" />
        </div>
        <Link className="primary-btn primary-btn--xl home-hero__cta" to="/vote">
          Vota le case <ArrowRightIcon aria-hidden="true" weight="bold" />
        </Link>
      </section>

      <nav className="home-links" aria-label="Altre sezioni">
        <Link className="home-link" to="/mappa">
          <MapTrifoldIcon className="home-link__icon" aria-hidden="true" weight="duotone" />
          <span className="home-link__text">
            <strong>Mappa del quartiere</strong>
            <span>Trova le case sulla mappa.</span>
          </span>
          <ArrowRightIcon className="home-link__arrow" aria-hidden="true" weight="bold" />
        </Link>
        <Link className="home-link" to="/contest">
          <CameraIcon className="home-link__icon" aria-hidden="true" weight="duotone" />
          <span className="home-link__text">
            <strong>Contest foto</strong>
            <span>Racconta la notte con #BagnaHalloween{edition}.</span>
          </span>
          <ArrowRightIcon className="home-link__arrow" aria-hidden="true" weight="bold" />
        </Link>
      </nav>
    </div>
  );
}

export default Home;
