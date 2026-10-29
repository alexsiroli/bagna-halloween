import { Link } from 'react-router-dom';
import { ArrowRightIcon, CameraIcon, MapTrifoldIcon, TrophyIcon } from '@phosphor-icons/react';
import AlxMark from '../components/AlxMark.jsx';
import Profile from '../components/Profile.jsx';
import Scene from '../components/Scene.jsx';
import { useAppConfig } from '../data.js';
import { formatEnd } from '../votingTime.js';

function Home() {
  const { edition, votingOpen, votingEndsAt, loaded } = useAppConfig();

  return (
    <div className="app-shell app-shell--fit home">
      <div className="home-bar">
        <Link className="icon-btn" to="/albo" aria-label="Albo d’oro" title="Albo d’oro">
          <TrophyIcon aria-hidden="true" weight="duotone" />
        </Link>
        <div className="topbar__end">
          <Profile />
          <AlxMark />
        </div>
      </div>

      <section className="home-hero">
        <h1 className="display home-hero__title">
          Halloween <span>di Bagnarola</span>
        </h1>
        <p className="status-line home-hero__status" data-open={loaded ? votingOpen : undefined}>
          <span className="status-bulb" aria-hidden="true" />
          <span>
            Edizione {edition}
            {loaded && <> · {votingOpen ? 'votazioni aperte' : 'votazioni chiuse'}</>}
            {/* La scadenza va a capo intera, senza il punto che resterebbe appeso a fine riga */}
            {votingOpen && votingEndsAt && <span className="status-end">fino alle {formatEnd(votingEndsAt)}</span>}
          </span>
        </p>
        <Scene className="home-hero__scene" />
        <Link className="primary-btn primary-btn--xl home-hero__cta" to="/vote">
          Vota le case <ArrowRightIcon aria-hidden="true" weight="bold" />
        </Link>
        <nav className="home-links" aria-label="Altre sezioni">
          <Link className="secondary-btn home-link" to="/mappa">
            <MapTrifoldIcon aria-hidden="true" weight="duotone" /> Mappa
          </Link>
          <Link className="secondary-btn home-link" to="/contest">
            <CameraIcon aria-hidden="true" weight="duotone" /> Contest foto
          </Link>
        </nav>
      </section>
    </div>
  );
}

export default Home;
